<p align="center">
  <img src="src/assets/logo.svg" alt="Warren logo" width="96" height="96" />
</p>

<h1 align="center">Warren</h1>

<p align="center">
  Parametric editor for 3D-printable modular rodent tube networks.
</p>

Warren lets a rodent owner design a modular network of tubes that clips onto
their cage, then export it as printable parts. Enter your cage dimensions, place
and connect modules (tubes, elbows, tees, platforms, cage mounts) in a 3D
viewport, and export multi-STL plus an assembly manifest. Everything runs in the
browser; a project is a single JSON document.

> Status: early scaffold. The interactive editor is not built yet. See
> [docs/ROADMAP.md](docs/ROADMAP.md).

## How it works

Three.js renders lightweight proxy meshes for fluid editing. OpenSCAD (compiled
to WebAssembly) generates the real, printable geometry only at preview and
export, in a Web Worker. The source of truth is a graph of modules and
connections. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

- Vue 3 (`<script setup>`, Composition API) + TypeScript (strict)
- Vite, pnpm, Vitest
- Three.js (editing viewport)
- openscad-wasm (parametric geometry + STL export)
- manifold-3d (boolean operations, mesh validation, Three.js interop)

No backend.

## Getting started

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm fetch-wasm   # download the openscad-wasm binaries into public/wasm/
pnpm dev          # start the dev server
pnpm test         # run unit tests
pnpm type-check   # type-check the project
pnpm build        # type-check + production build
pnpm lint         # lint and auto-fix
```

The openscad-wasm binaries are not committed; they are vendored into
`public/wasm/` (gitignored) by `pnpm fetch-wasm`. See
[docs/research/openscad-wasm.md](docs/research/openscad-wasm.md). They are needed
for the HD preview and export (Phase 4 onward), not for the editor itself.

## Documentation

The `docs/` folder is the project's source of truth for design and decisions:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) layers and the proxies-vs-real-mesh
  principle
- [DATA_MODEL.md](docs/DATA_MODEL.md) the TypeScript interfaces and graph
  invariants
- [CONNECTOR_SPEC.md](docs/CONNECTOR_SPEC.md) the universal connector standard
- [MODULES.md](docs/MODULES.md) the module catalogue
- [ROADMAP.md](docs/ROADMAP.md) phased plan, one testable objective per phase
- [DECISIONS.md](docs/DECISIONS.md) lightweight ADR log
- [GLOSSARY.md](docs/GLOSSARY.md) shared vocabulary
- [research/](docs/research/) sourced notes on the key dependencies and
  printing constraints

## Safety note

No FDM 3D print is guaranteed chew-safe or food-safe for animals. PETG is the
recommended material, but rodents chew and layer lines harbor bacteria. Provide
ventilation in enclosed tubes, inspect for gnaw damage regularly, and treat
printed parts accordingly. See
[docs/research/printing-and-materials.md](docs/research/printing-and-materials.md).

## License

MIT. See [LICENSE](LICENSE).
