/**
 * The editing viewport: a framework-agnostic Three.js controller. It owns the
 * scene, camera, OrbitControls, the TransformControls gizmo, raycast picking,
 * and a pool of module proxy objects reconciled against the domain graph.
 *
 * It knows nothing about Vue. The UI calls syncModules / setSelected /
 * setGizmoMode and receives onSelect / onTransform callbacks. Everything is in
 * the domain's Z-up convention (camera up = +Z) so module Mat4s map directly.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { applyTransform, buildModuleObject, readTransform, type ModuleObject } from './proxy'
import {
  computeSnap,
  openLocalPorts,
  openTargetPorts,
  type Mat4,
  type Module,
  type PortRef,
  type Project,
  type SnapResult,
} from '../domain'

export type GizmoMode = 'translate' | 'rotate'

export interface ViewportCallbacks {
  onSelect(id: string | null): void
  onTransform(id: string, transform: Mat4): void
  onConnect(a: PortRef, b: PortRef): void
  getProject(): Project
}

const CLICK_SLOP = 4 // px of movement under which a pointerup counts as a click
const SNAP_RADIUS = 30 // mm; how close a port must get to snap

export class Viewport {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly orbit: OrbitControls
  private readonly gizmo: TransformControls
  private readonly pickRoot = new THREE.Group()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly objects = new Map<string, ModuleObject>()

  private selectedId: string | null = null
  private snap: SnapResult | null = null
  private frame = 0
  private downX = 0
  private downY = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: ViewportCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1d22)
    this.scene.add(this.pickRoot)

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(1, container.clientHeight),
      1,
      8000,
    )
    this.camera.up.set(0, 0, 1)
    this.camera.position.set(360, -360, 320)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.1))
    const dir = new THREE.DirectionalLight(0xffffff, 1.4)
    dir.position.set(200, -150, 400)
    this.scene.add(dir)

    const grid = new THREE.GridHelper(2000, 80, 0x3a3f47, 0x2a2e34)
    grid.rotation.x = Math.PI / 2 // GridHelper is XZ by default; rotate into XY (Z-up)
    this.scene.add(grid)

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbit.enableDamping = true

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement)
    this.gizmo.setMode('translate')
    this.gizmo.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !e.value
      if (e.value === false) this.commitSnap()
    })
    this.gizmo.addEventListener('objectChange', () => {
      if (this.selectedId === null) return
      const obj = this.objects.get(this.selectedId)
      if (obj === undefined) return
      const live = readTransform(obj.group)
      this.callbacks.onTransform(this.selectedId, live)
      this.updateSnap(this.selectedId, live)
    })
    this.scene.add(this.gizmo.getHelper())

    const dom = this.renderer.domElement
    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('resize', this.resize)

    this.loop()
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    this.downX = e.clientX
    this.downY = e.clientY
  }

  private readonly onPointerUp = (e: PointerEvent) => {
    if (this.gizmo.dragging) return
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > CLICK_SLOP) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.pickRoot.children, true)
    const id = hits.length > 0 ? moduleIdOf(hits[0]!.object) : null
    this.callbacks.onSelect(id)
  }

  private readonly resize = () => {
    const w = this.container.clientWidth
    const h = Math.max(1, this.container.clientHeight)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private readonly loop = () => {
    this.frame = requestAnimationFrame(this.loop)
    this.orbit.update()
    this.renderer.render(this.scene, this.camera)
  }

  /** Reconcile the proxy objects with the current modules. */
  syncModules(modules: readonly Module[]): void {
    const seen = new Set<string>()
    for (const module of modules) {
      seen.add(module.id)
      const existing = this.objects.get(module.id)
      if (existing === undefined) {
        const obj = buildModuleObject(module)
        this.objects.set(module.id, obj)
        this.pickRoot.add(obj.group)
      } else if (!(this.gizmo.dragging && module.id === this.selectedId)) {
        // Keep the live transform while the user is dragging this one.
        applyTransform(existing.group, module.transform)
      }
    }
    for (const [id, obj] of this.objects) {
      if (!seen.has(id)) {
        this.pickRoot.remove(obj.group)
        obj.dispose()
        this.objects.delete(id)
        if (this.selectedId === id) this.setSelected(null)
      }
    }
  }

  setSelected(id: string | null): void {
    this.selectedId = id
    for (const [oid, obj] of this.objects) obj.setSelected(oid === id)
    const target = id === null ? undefined : this.objects.get(id)
    if (target) this.gizmo.attach(target.group)
    else this.gizmo.detach()
  }

  setGizmoMode(mode: GizmoMode): void {
    this.gizmo.setMode(mode)
  }

  /** During a drag: find a snap candidate and highlight its target port. */
  private updateSnap(movingId: string, live: Mat4): void {
    const project = this.callbacks.getProject()
    const snap = computeSnap(
      live,
      openLocalPorts(project, movingId),
      openTargetPorts(project, movingId),
      SNAP_RADIUS,
    )
    this.clearSnapHighlight()
    if (snap !== null) this.objects.get(snap.target.moduleId)?.highlightPort(snap.target.portId)
    this.snap = snap
  }

  /** On drop: if a snap candidate exists, snap into place and connect. */
  private commitSnap(): void {
    const snap = this.snap
    this.snap = null
    this.clearSnapHighlight()
    if (snap === null || this.selectedId === null) return
    this.callbacks.onTransform(this.selectedId, snap.transform)
    this.callbacks.onConnect({ moduleId: this.selectedId, portId: snap.movingPortId }, snap.target)
  }

  private clearSnapHighlight(): void {
    for (const obj of this.objects.values()) obj.highlightPort(null)
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    const dom = this.renderer.domElement
    dom.removeEventListener('pointerdown', this.onPointerDown)
    dom.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('resize', this.resize)
    for (const obj of this.objects.values()) obj.dispose()
    this.objects.clear()
    this.gizmo.dispose()
    this.orbit.dispose()
    this.renderer.dispose()
    dom.remove()
  }
}

function moduleIdOf(object: THREE.Object3D): string | null {
  let node: THREE.Object3D | null = object
  while (node) {
    const id = node.userData?.moduleId
    if (typeof id === 'string') return id
    node = node.parent
  }
  return null
}
