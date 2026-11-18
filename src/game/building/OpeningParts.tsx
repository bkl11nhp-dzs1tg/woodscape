import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WorldObject } from '../../types/world'
import { FaceBuilder } from '../geometry/FaceBuilder'
import { getGeometry } from '../geometry/GeometryFactory'
import { getMaterial } from '../materials/MaterialFactory'

/**
 * The parts of a door or window, built from the object's parameters:
 * a fixed frame, and a leaf / sashes on hinges that swing toward local +Z
 * (the outside) when the object is open.
 */

export const DOOR_FRAME = 0.06
const DOOR_LEAF_THICKNESS = 0.045
const DOOR_OPEN_ANGLE = (100 * Math.PI) / 180
const WINDOW_FRAME = 0.05
const SASH_BORDER = 0.045
const SASH_THICKNESS = 0.035
const WINDOW_OPEN_ANGLE = (80 * Math.PI) / 180
const GLASS_MATERIAL = 'glass_tinted_painted'
const HARDWARE_MATERIAL = 'metal_dark'

function useDisposable<T extends THREE.BufferGeometry>(create: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(create, deps)
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

/** Eases hinge groups toward `angle * sign` whenever `open` changes. */
function useSwing(open: boolean, maxAngle: number) {
  const hinges = useRef<(THREE.Group | null)[]>([])
  const amount = useRef(open ? 1 : 0)
  useFrame((_, delta) => {
    const target = open ? 1 : 0
    if (amount.current !== target) {
      const step = Math.min(1, delta * 5)
      amount.current += (target - amount.current) * step
      if (Math.abs(target - amount.current) < 0.002) amount.current = target
    }
    hinges.current.forEach((hinge) => {
      if (hinge) hinge.rotation.y = amount.current * maxAngle * (hinge.userData.swing as number)
    })
  })
  return hinges
}

/** Thin ink line along the hard edges of a part. */
function Ink({ geometry }: { geometry: THREE.BufferGeometry }) {
  const edges = useDisposable(() => new THREE.EdgesGeometry(geometry, 28), [geometry])
  return (
    <lineSegments geometry={edges} raycast={() => null}>
      <lineBasicMaterial color="#3d2f22" transparent opacity={0.65} />
    </lineSegments>
  )
}

function Door({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'door' }>
  const { width: w, height: h, thickness: t } = g
  const material = getMaterial(obj.materialId, { paint: obj.paint, opacity: obj.opacity })
  const leafWidth = w - DOOR_FRAME * 2 - 0.01
  const leafHeight = h - DOOR_FRAME - 0.01
  const leafY = -h / 2 + 0.005 + leafHeight / 2
  const side = g.hinge === 'left' ? -1 : 1
  const hinges = useSwing(Boolean(obj.open), DOOR_OPEN_ANGLE)

  const frame = useDisposable(() => {
    const builder = new FaceBuilder([-w / 2, -h / 2, -t / 2], [true, true, false, false, false, false])
    builder.boxAt([-(w - DOOR_FRAME) / 2, 0, 0], [DOOR_FRAME, h, t])
    builder.boxAt([(w - DOOR_FRAME) / 2, 0, 0], [DOOR_FRAME, h, t])
    builder.boxAt([0, (h - DOOR_FRAME) / 2, 0], [w - DOOR_FRAME * 2, DOOR_FRAME, t])
    return builder.build()
  }, [w, h, t])
  const leaf = getGeometry({ shape: 'box', width: leafWidth, height: leafHeight, depth: DOOR_LEAF_THICKNESS }, true)
  const knob = getGeometry({ shape: 'sphere', radius: 0.035 })

  return (
    <>
      <mesh geometry={frame} material={material} castShadow receiveShadow />
      <Ink geometry={frame} />
      <group
        ref={(node) => {
          hinges.current[0] = node
        }}
        position={[side * (w / 2 - DOOR_FRAME), 0, 0]}
        userData={{ swing: side }}
      >
        <mesh geometry={leaf} material={material} position={[-side * (leafWidth / 2 + 0.005), leafY, 0]} castShadow receiveShadow />
        {[-1, 1].map((face) => (
          <mesh
            key={face}
            geometry={knob}
            material={getMaterial(HARDWARE_MATERIAL)}
            position={[-side * (leafWidth - 0.08), -h / 2 + 1, face * (DOOR_LEAF_THICKNESS / 2 + 0.03)]}
            castShadow
          />
        ))}
      </group>
    </>
  )
}

function Window({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'window' }>
  const { width: w, height: h, thickness: t } = g
  const material = getMaterial(obj.materialId, { paint: obj.paint })
  const sashCount = w >= 1 ? 2 : 1
  const innerWidth = w - WINDOW_FRAME * 2
  const innerHeight = h - WINDOW_FRAME * 2
  const sashWidth = innerWidth / sashCount - 0.006
  const sashHeight = innerHeight - 0.01
  const hinges = useSwing(Boolean(obj.open), WINDOW_OPEN_ANGLE)

  const frame = useDisposable(() => {
    const builder = new FaceBuilder([-w / 2, -h / 2, -t / 2], [true, true, false, false, false, false])
    builder.boxAt([-(w - WINDOW_FRAME) / 2, 0, 0], [WINDOW_FRAME, h, t])
    builder.boxAt([(w - WINDOW_FRAME) / 2, 0, 0], [WINDOW_FRAME, h, t])
    builder.boxAt([0, (h - WINDOW_FRAME) / 2, 0], [innerWidth, WINDOW_FRAME, t])
    builder.boxAt([0, -(h - WINDOW_FRAME) / 2, 0], [innerWidth, WINDOW_FRAME, t])
    return builder.build()
  }, [w, h, t])

  const sashFrame = useDisposable(() => {
    const builder = new FaceBuilder([-sashWidth / 2, -sashHeight / 2, 0], [true, true, false, false, false, false])
    const side = (sashWidth - SASH_BORDER) / 2
    const rail = (sashHeight - SASH_BORDER) / 2
    builder.boxAt([-side, 0, 0], [SASH_BORDER, sashHeight, SASH_THICKNESS])
    builder.boxAt([side, 0, 0], [SASH_BORDER, sashHeight, SASH_THICKNESS])
    builder.boxAt([0, rail, 0], [sashWidth - SASH_BORDER * 2, SASH_BORDER, SASH_THICKNESS])
    builder.boxAt([0, -rail, 0], [sashWidth - SASH_BORDER * 2, SASH_BORDER, SASH_THICKNESS])
    return builder.build()
  }, [sashWidth, sashHeight])
  const glass = getGeometry({
    shape: 'panel',
    width: sashWidth - SASH_BORDER * 2,
    height: sashHeight - SASH_BORDER * 2,
    thickness: 0.012,
  })

  return (
    <>
      <mesh geometry={frame} material={material} castShadow receiveShadow />
      <Ink geometry={frame} />
      {Array.from({ length: sashCount }, (_, i) => {
        // The first sash hinges on the left jamb, the second on the right.
        const side = i === 0 ? -1 : 1
        return (
          <group
            key={i}
            ref={(node) => {
              hinges.current[i] = node
            }}
            position={[side * (innerWidth / 2), 0, 0]}
            userData={{ swing: side }}
          >
            <group position={[-side * (sashWidth / 2 + 0.003), 0, 0]}>
              <mesh geometry={sashFrame} material={material} castShadow receiveShadow />
              <mesh geometry={glass} material={getMaterial(GLASS_MATERIAL, { opacity: obj.opacity })} />
            </group>
          </group>
        )
      })}
    </>
  )
}

/** A plain opening has no parts: an unseen box to click on, and a faint outline so it can be found. */
function PlainOpening({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'opening' }>
  const box = getGeometry({ shape: 'box', width: g.width, height: g.height, depth: g.thickness })
  const edges = useDisposable(() => new THREE.EdgesGeometry(box), [box])
  return (
    <>
      <mesh geometry={box}>
        <meshBasicMaterial visible={false} />
      </mesh>
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </lineSegments>
    </>
  )
}

export function OpeningParts({ obj }: { obj: WorldObject }) {
  if (obj.geometry.shape === 'door') return <Door obj={obj} />
  if (obj.geometry.shape === 'window') return <Window obj={obj} />
  return <PlainOpening obj={obj} />
}
