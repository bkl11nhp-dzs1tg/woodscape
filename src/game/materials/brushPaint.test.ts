import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { faceCoords, faceOfNormal, type Bounds } from './brushPaint'

const bounds: Bounds = { min: new THREE.Vector3(-1, -0.5, -0.1), size: new THREE.Vector3(2, 1, 0.2) }

describe('brush faces', () => {
  it('picks the face a normal points out of', () => {
    expect(faceOfNormal(new THREE.Vector3(1, 0, 0))).toBe(0)
    expect(faceOfNormal(new THREE.Vector3(-1, 0, 0))).toBe(1)
    expect(faceOfNormal(new THREE.Vector3(0, 1, 0))).toBe(2)
    expect(faceOfNormal(new THREE.Vector3(0, -1, 0))).toBe(3)
    expect(faceOfNormal(new THREE.Vector3(0, 0, 1))).toBe(4)
    expect(faceOfNormal(new THREE.Vector3(0.2, 0.1, -0.9))).toBe(5)
  })

  it('gives 0..1 across the face from a local point', () => {
    // front face (+Z): a runs along X, b along Y
    expect(faceCoords(4, new THREE.Vector3(0, 0, 0.1), bounds)).toEqual([0.5, 0.5])
    expect(faceCoords(4, new THREE.Vector3(-1, 0.5, 0.1), bounds)).toEqual([0, 1])
    // top face (+Y): a along X, b along Z
    expect(faceCoords(2, new THREE.Vector3(1, 0.5, 0), bounds)).toEqual([1, 0.5])
    // points outside are held on the face
    expect(faceCoords(4, new THREE.Vector3(9, -9, 0), bounds)).toEqual([1, 0])
  })
})
