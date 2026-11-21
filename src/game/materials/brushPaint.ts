import * as THREE from 'three'
import type { BrushStroke } from '../../types/world'

/**
 * Brush painting: strokes live in the object's data as dabs on its six faces, and are drawn into one
 * small picture per object (a 3 x 2 sheet, one square per face). The material shader looks the sheet up
 * from the object's own position and normal, so it works on boxes, walls with holes and roof slabs alike,
 * and needs no UVs. The sheet is rebuilt from the strokes whenever they change (undo, redo, loading).
 */

export interface Bounds {
  min: THREE.Vector3
  size: THREE.Vector3
}

/** Which two local axes (a, b) run across each face: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z. */
export const FACE_AXES: readonly (readonly [number, number])[] = [
  [2, 1],
  [2, 1],
  [0, 2],
  [0, 2],
  [0, 1],
  [0, 1],
]

export const MAX_DABS_PER_OBJECT = 6000
const EMPTY: readonly BrushStroke[] = []

export function boundsOf(geometry: THREE.BufferGeometry): Bounds {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const size = box.getSize(new THREE.Vector3())
  size.set(Math.max(size.x, 1e-3), Math.max(size.y, 1e-3), Math.max(size.z, 1e-3))
  return { min: box.min.clone(), size }
}

/** The face a surface normal points out of (its strongest axis). */
export function faceOfNormal(normal: THREE.Vector3): number {
  const ax = Math.abs(normal.x)
  const ay = Math.abs(normal.y)
  const az = Math.abs(normal.z)
  if (ax >= ay && ax >= az) return normal.x > 0 ? 0 : 1
  if (ay >= az) return normal.y > 0 ? 2 : 3
  return normal.z > 0 ? 4 : 5
}

/** Where a local point sits on a face, 0..1 across each of the face's two axes. */
export function faceCoords(face: number, local: THREE.Vector3, bounds: Bounds): [number, number] {
  const [a, b] = FACE_AXES[face]
  const unit = (axis: number) => THREE.MathUtils.clamp((local.getComponent(axis) - bounds.min.getComponent(axis)) / bounds.size.getComponent(axis), 0, 1)
  return [unit(a), unit(b)]
}

function tileFor(bounds: Bounds): number {
  const longest = Math.max(bounds.size.x, bounds.size.y, bounds.size.z)
  return THREE.MathUtils.clamp(2 ** Math.ceil(Math.log2(Math.max(1, longest * 64))), 128, 512)
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return [canvas, canvas.getContext('2d')!]
}

const FRAGMENT = /* glsl */ `
	{
		vec3 q = ( vBrushPos - uBrushMin ) / uBrushSize;
		vec3 an = abs( vBrushNrm );
		float bf;
		vec2 ab;
		if ( an.x >= an.y && an.x >= an.z ) { bf = vBrushNrm.x > 0.0 ? 0.0 : 1.0; ab = q.zy; }
		else if ( an.y >= an.z ) { bf = vBrushNrm.y > 0.0 ? 2.0 : 3.0; ab = q.xz; }
		else { bf = vBrushNrm.z > 0.0 ? 4.0 : 5.0; ab = q.xy; }
		ab = clamp( ab, 0.003, 0.997 );
		vec4 brush = texture2D( uBrushMap, vec2( ( floor( bf * 0.5 ) + ab.x ) / 3.0, ( mod( bf, 2.0 ) + ab.y ) / 2.0 ) );
		diffuseColor.rgb = mix( diffuseColor.rgb, brush.rgb, brush.a );
	}`

type StrokeLook = Pick<BrushStroke, 'color' | 'alpha' | 'erase'>

export class BrushLayer {
  private tile: number
  private base: CanvasRenderingContext2D
  private stroke: CanvasRenderingContext2D
  private display: CanvasRenderingContext2D
  private baseCanvas: HTMLCanvasElement
  private strokeCanvas: HTMLCanvasElement
  readonly texture: THREE.CanvasTexture
  private min = new THREE.Vector3()
  private size = new THREE.Vector3(1, 1, 1)
  private boundsKey = ''
  /** The strokes the picture currently shows (compared by identity). */
  synced: readonly BrushStroke[] | undefined
  private live: StrokeLook | null = null
  private clones = new Map<string, THREE.Material>()

  constructor(bounds: Bounds) {
    this.tile = tileFor(bounds)
    const w = this.tile * 3
    const h = this.tile * 2
    const [baseCanvas, base] = canvasOf(w, h)
    const [strokeCanvas, stroke] = canvasOf(w, h)
    const [displayCanvas, display] = canvasOf(w, h)
    this.baseCanvas = baseCanvas
    this.strokeCanvas = strokeCanvas
    this.base = base
    this.stroke = stroke
    this.display = display
    this.texture = new THREE.CanvasTexture(displayCanvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.flipY = false
    this.texture.generateMipmaps = false
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.setBounds(bounds)
  }

  /** Returns true when the shape changed (paint then has to be drawn again at the new proportions). */
  setBounds(bounds: Bounds): boolean {
    const key = `${bounds.size.x.toFixed(3)},${bounds.size.y.toFixed(3)},${bounds.size.z.toFixed(3)}`
    this.min.copy(bounds.min)
    this.size.copy(bounds.size)
    const changed = key !== this.boundsKey
    this.boundsKey = key
    return changed
  }

  /** Makes the picture show exactly these strokes. */
  sync(strokes: readonly BrushStroke[] | undefined, bounds?: Bounds): void {
    const list = strokes ?? EMPTY
    const reshaped = bounds ? this.setBounds(bounds) : false
    if (list === this.synced && !reshaped) return
    this.base.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height)
    for (const stroke of list) {
      this.stroke.clearRect(0, 0, this.strokeCanvas.width, this.strokeCanvas.height)
      for (let i = 0; i + 2 < stroke.dabs.length; i += 3) this.drawDab(stroke, stroke.dabs[i], stroke.dabs[i + 1], stroke.dabs[i + 2])
      this.composite(this.base, stroke)
    }
    this.stroke.clearRect(0, 0, this.strokeCanvas.width, this.strokeCanvas.height)
    this.synced = list
    this.live = null
    this.refresh()
  }

  private drawDab(stroke: Pick<BrushStroke, 'color' | 'radius' | 'erase'>, face: number, u: number, v: number): void {
    const T = this.tile
    const [ai, bi] = FACE_AXES[face]
    const sa = this.size.getComponent(ai)
    const sb = this.size.getComponent(bi)
    const col = face >> 1
    const row = face & 1
    const ctx = this.stroke
    let rgb = '0,0,0'
    if (!stroke.erase) {
      const c = new THREE.Color(stroke.color).convertLinearToSRGB()
      rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(col * T, row * T, T, T)
    ctx.clip()
    ctx.translate((col + u) * T, (row + v) * T)
    ctx.scale((stroke.radius / sa) * T, (stroke.radius / sb) * T)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    gradient.addColorStop(0, `rgba(${rgb},1)`)
    gradient.addColorStop(0.6, `rgba(${rgb},1)`)
    gradient.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private composite(target: CanvasRenderingContext2D, stroke: StrokeLook): void {
    target.save()
    target.globalAlpha = stroke.alpha
    target.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
    target.drawImage(this.strokeCanvas, 0, 0)
    target.restore()
  }

  private refresh(): void {
    this.display.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height)
    this.display.drawImage(this.baseCanvas, 0, 0)
    if (this.live) this.composite(this.display, this.live)
    this.texture.needsUpdate = true
  }

  /** Starts a stroke that is shown at once but only kept when `endStroke` is called. */
  beginStroke(stroke: StrokeLook): void {
    this.stroke.clearRect(0, 0, this.strokeCanvas.width, this.strokeCanvas.height)
    this.live = stroke
  }

  addDab(stroke: Pick<BrushStroke, 'color' | 'radius' | 'erase'>, face: number, u: number, v: number): void {
    this.drawDab(stroke, face, u, v)
    this.refresh()
  }

  /** Keeps the live stroke. The caller sets `synced` to the strokes it then stores. */
  endStroke(): void {
    if (!this.live) return
    this.composite(this.base, this.live)
    this.stroke.clearRect(0, 0, this.strokeCanvas.width, this.strokeCanvas.height)
    this.live = null
    this.refresh()
  }

  /** Copies of the object's materials that show the brush paint on top. */
  materialsFor(base: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    return Array.isArray(base) ? base.map((m) => this.cloneFor(m)) : this.cloneFor(base)
  }

  private cloneFor(source: THREE.Material): THREE.Material {
    const cached = this.clones.get(source.uuid)
    if (cached) return cached
    const clone = source.clone()
    const previous = source.onBeforeCompile
    const previousKey = source.customProgramCacheKey
    clone.onBeforeCompile = (shader, renderer) => {
      previous.call(clone, shader, renderer)
      shader.uniforms.uBrushMap = { value: this.texture }
      shader.uniforms.uBrushMin = { value: this.min }
      shader.uniforms.uBrushSize = { value: this.size }
      shader.vertexShader =
        'varying vec3 vBrushPos;\nvarying vec3 vBrushNrm;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvBrushPos = position;\n\tvBrushNrm = normal;')
      shader.fragmentShader =
        'uniform sampler2D uBrushMap;\nuniform vec3 uBrushMin;\nuniform vec3 uBrushSize;\nvarying vec3 vBrushPos;\nvarying vec3 vBrushNrm;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>' + FRAGMENT)
    }
    clone.customProgramCacheKey = () => `${previousKey.call(source)}|woodscape-brush`
    this.clones.set(source.uuid, clone)
    return clone
  }
}

export const layers = new Map<string, BrushLayer>()

export function getBrushLayer(id: string, bounds: Bounds): BrushLayer {
  let layer = layers.get(id)
  if (!layer) {
    layer = new BrushLayer(bounds)
    layers.set(id, layer)
  } else if (layer.setBounds(bounds)) {
    // Proportions changed: the picture is redrawn from the strokes the next time it syncs.
    layer.synced = undefined
  }
  return layer
}

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __brushLayers: typeof layers }).__brushLayers = layers
