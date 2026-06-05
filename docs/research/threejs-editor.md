# Research: Three.js editor patterns (snapping, gizmos, port picking)

Status: researched 2026-06-06 against Three.js r160+ docs and the official
examples. Markers: "confirmed" = from official docs/examples, "pattern" =
community/standard editor practice, not a turnkey Three.js API.

Warren's viewport uses Three.js only for interactive editing with lightweight
proxy meshes. See [ARCHITECTURE.md](../ARCHITECTURE.md).

## TransformControls (translate / rotate / scale gizmo)

Confirmed import (it is an addon):

```js
import { TransformControls } from 'three/addons/controls/TransformControls.js'
```

Confirmed, important for r160+: you add the control's helper to the scene, not
the control itself.

```js
const control = new TransformControls(camera, renderer.domElement)
scene.add(control.getHelper()) // NOT scene.add(control) (that is outdated)
control.attach(object) // start editing; control.detach() to stop
control.setMode('translate') // 'translate' | 'rotate' | 'scale'
```

Confirmed snapping API (value enables, null disables):

```js
control.setTranslationSnap(1) // world units
control.setRotationSnap(THREE.MathUtils.degToRad(15)) // radians
control.setScaleSnap(0.25)
```

Confirmed events:

- `change`: fires on any change; commonly bound to `render`.
- `objectChange`: the controlled object's transform actually changed (use to
  mark the model dirty and recompute connections).
- `dragging-changed`: user started/stopped dragging. `event.value` is a boolean.
  This is the canonical hook to disable OrbitControls during a drag. Note:
  `dragging-changed` is confirmed in the official example but is not listed on
  the API doc page.

Confirmed coexistence pattern with OrbitControls:

```js
control.addEventListener('dragging-changed', (e) => {
  orbit.enabled = !e.value // freeze camera orbit only while dragging the gizmo
})
```

## Raycasting for picking ports / connection points

Confirmed pointer to ray (coords are Normalized Device Coordinates, each in
-1..1):

```js
pointer.x = (event.clientX / window.innerWidth) * 2 - 1
pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
raycaster.setFromCamera(pointer, camera)
const hits = raycaster.intersectObjects(pickables, true) // sorted nearest first
```

Each hit contains `distance`, `point` (world), `object`, `face`, `faceIndex`,
`uv`, `normal`, and `instanceId` (when hitting an `InstancedMesh`).

Confirmed: layers isolate what the ray tests.

```js
raycaster.layers.set(1) // ray only tests layer 1
portMarker.layers.set(1) // put port proxies on layer 1
```

Confirmed: `raycaster.params` thresholds (world units) enlarge Points/Line hit
regions. For Warren this matters only if ports are rendered as `Points`.

Best practice for picking small ports:

- Pattern: give each port an oversized invisible hit proxy (for example a sphere
  with `material.visible = false`) on a dedicated pickable layer, while the
  visible marker stays small. Raycast against the proxies. This decouples visual
  size from hit area.
- Pattern: prefer real (instanced) hit geometry over relying on a `Points`
  threshold; a maintainer recommends this for reliable picking across zoom.

## Snap-to-grid and snap-to-point

- Confirmed: `setTranslationSnap` / `setRotationSnap` give axis grid snapping for
  free with the gizmo.
- Pattern (snap-to-point, the core Warren interaction) is implemented manually,
  typically in the drag / `objectChange` handler:
  1. Gather candidate target ports (world positions of all open ports on other
     modules) via `port.getWorldPosition(v)`.
  2. Find the nearest candidate to the moving part's active port; compute the
     distance.
  3. If `distance < snapRadius`, override the part's transform so its active port
     aligns to the target port (and align orientation, see Ports as frames).
     Otherwise leave it at the free-drag pose.
  4. Visual feedback: highlight the candidate port, show a ghost at the snapped
     pose, commit on pointer-up. The snap radius is often defined in screen space
     (pixels) so it feels consistent across zoom (project candidates to NDC).

Manual grid snap is plain rounding:

```js
obj.position.set(
  Math.round(obj.position.x / step) * step,
  Math.round(obj.position.y / step) * step,
  Math.round(obj.position.z / step) * step,
)
```

## Ports as oriented frames (position + orientation)

- Confirmed: model each port as an empty `Object3D` (or `Group`) added as a
  child of its module, with a local `position` and `quaternion`. It inherits the
  module's transform.
- Confirmed world readouts (require a target argument):
  ```js
  port.getWorldPosition(new THREE.Vector3())
  port.getWorldQuaternion(new THREE.Quaternion())
  port.getWorldDirection(new THREE.Vector3()) // forward (+Z) axis in world space
  ```
- Confirmed: call `updateMatrixWorld()` before reading world transforms outside
  the render loop after moving objects.
- Confirmed: `attach(object)` reparents while preserving world transform;
  `add(object)` does not. Use `attach()` when snapping/parenting a placed module
  so it does not jump.
- Confirmed: `Matrix4.compose(position, quaternion, scale)` / `decompose(...)`
  for composing and reading port frames. The mating math (compute the rigid
  transform that maps one world frame onto another and apply it) is Warren's own
  logic; Three.js provides the primitives.

A note on Warren's convention: Three.js port frames are the editor-side mirror
of the `Port.transform` (Mat4) in the data model. See
[DATA_MODEL.md](../DATA_MODEL.md) and [CONNECTOR_SPEC.md](../CONNECTOR_SPEC.md)
for the mating rule (a male port's +axis meets a female port's opposing axis).

## Performance for many modules

- Confirmed: `InstancedMesh` for many identical parts/markers. Set per-instance
  matrices with `setMatrixAt(i, m)` then `instanceMatrix.needsUpdate = true`.
  Raycasting returns `instanceId`.
- Confirmed: dispose explicitly. `geometry.dispose()`, `material.dispose()` (and
  textures), `instancedMesh.dispose()`. Removing from the scene does not free GPU
  memory. `geometry.dispose()` does not free `instanceMatrix`; the InstancedMesh
  needs its own `dispose()`.
- Pattern: raycast against lightweight proxy geometry (bounding boxes / hulls /
  invisible hit volumes on a dedicated layer), not the heavy preview meshes.
  Combine with layers so the ray only traverses the proxy set.

## Sources

- https://threejs.org/docs/#examples/en/controls/TransformControls
- https://threejs.org/examples/#misc_controls_transform (source has
  `dragging-changed`, `getHelper()`, Shift-snap)
- https://threejs.org/docs/#api/en/core/Raycaster
- https://threejs.org/docs/#api/en/core/Object3D
- https://threejs.org/docs/#api/en/core/Layers
- https://threejs.org/docs/#api/en/objects/InstancedMesh
- https://threejs.org/docs/#api/en/math/Matrix4
- https://discourse.threejs.org/t/how-raycaster-threshold-works/34961
- https://discourse.threejs.org/t/proper-cleanup-dispose-of-instancedmesh-instancematrix/21205
