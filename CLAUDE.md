# WOODSCAPE

Creative building sandbox for the browser. Real parametric 3D construction with an
anime-inspired hand-painted look. Single-player, no survival/combat.

## Source documents

- `WOODSCAPE_GDD_Architecture_v1.2.md` — design baseline and roadmap. **This wins when documents disagree.**
- `WOODSCAPE_GRAPHICS_MASTER_PROMPT.md` — asset workflow and how to work with the user. Its
  "semi-realistic / PBR / GLB" wording predates GDD v1.2; follow v1.2 (painted textures on
  code-generated geometry, no Blender/GLB needed for building parts).
- `docs/GRAPHICS_ASSET_AUDIT.md` — current asset state and what art is still needed.
- `WOODSCAPE_Graphics_Kit/` — the user's original kit. Read-only source; runtime copies live in `public/assets/`.

## Commands (Windows PowerShell)

```powershell
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # typecheck + production build
```

Run `npm test` from PowerShell. From Git Bash vitest fails with
`Cannot read properties of undefined (reading 'config')` (drive-letter casing).

## Status

`docs/PROGRESS.md` is the current done / not-done list against the GDD and the user's later
requests, with the agreed next steps. Read it first; update it when a feature lands.

Built so far: shape shelf and click-to-place, move/rotate gizmo, numeric resize, per-face
materials, paint coats, opacity, straight cuts, doors/windows/plain openings that cut their own
holes in walls, layout marking, grid + face snapping, arrow-key nudging, undo/redo, auto-save
and snapshots (localStorage), walk and orbit cameras with collision, touch controls, minimap,
time of day and weather, multi-select and groups, free-form cuts (`extrude` shape, see
`src/game/building/cutting.ts`), ink edge lines. Patch scripts must be safe to re-run: a
replacement whose new text contains the old text gets applied twice otherwise.

## Architecture rules

- `src/types/world.ts` is the canonical data model: meters, radians, Y up, stable string IDs.
  Dimensions live in `geometry` params — never use mesh scale for size.
- Stores (`src/stores/`) hold plain serializable data only, never Three.js objects.
- UI components never touch the scene. They update stores or emit through
  `src/game/camera/cameraCommands.ts`; game code reacts.
- All buildable geometry comes from `src/game/geometry/GeometryFactory.ts`. UVs are in meters;
  textures set `repeat = 1 / tileSize`. Box material groups follow `BOX_FACES`
  (right, left, top, bottom, front, back).
- Textures and materials are referenced by ID through `src/data/materials.ts`. Never hard-code
  asset paths elsewhere; replacing art must not change IDs.
- Materials are stylized (`MeshToonMaterial`, no tone mapping), not PBR.
- Terrain is the pure function `getTerrainHeight(x, z)` in `src/game/environment/terrain.ts`;
  mesh, scenery and placement all use it.
- Every world edit goes through `src/game/building/commands.ts` so it is undoable. Do not call
  `applyPatch` from UI or tools directly.
- Box textures stay upright unless the object's main material is wood (`alignGrain`), which
  runs the grain along the longer edge. Brick turned sideways on wall ends before this rule.
- Doors, windows and plain openings never bake holes: `src/game/building/openings.ts` derives
  wall holes from object data on every change, and camera collision uses the same data.
- The starting world is generated in `src/data/showcaseObjects.ts` from ordinary objects. A saved
  world in localStorage wins over it; bump `SCHEMA_VERSION` in `saveService.ts` when the object
  format changes so stale saves are ignored.
- The user wants to move as a character: `walk` is the default camera mode, `orbit` the alternative.
- Two app modes (`appMode` in `editorStore`): `view` (default; walk around, click a door to open it, nothing is
  selectable or editable) and `edit` (click objects to select; tools, panels and shortcuts exist only here).
  Anything that edits must check `appMode === 'edit'`.
- Cat and dog are imported Tripo 3D models (`model` shape, ids `model_cat`, `model_dog` in
  `src/data/models.json`, sources in `art_inbox/models/`). People (standing and seated) are 2D sprites (`card`
  shape, `src/data/references.ts`, `CardObject.tsx`: always faces the camera, the drawing changes with the viewer's
  angle, eight directions). The user judged the Tripo 3D person ugly and wanted the 2D sprite back; do not swap
  people to 3D unless asked. Solid figures built from drawings by `tools/build-figures.mjs` (`figure` shape) were
  rejected too; that code is kept but NOT offered or used.
  Trees (`tree` shape, wild and placed) share one builder in `game/environment/Scenery.tsx`; never use plain
  spheres for foliage.
- Imported 3D models (Tripo, Meshy…, `model` shape): the user drops a .glb in `art_inbox/models/` and runs
  `node tools/optimize-model.mjs <file> <id> "<name>" --height <m>`, which decimates it, shrinks textures, compresses
  it into `public/assets/models/` and registers it in `src/data/models.json` (never edit that file by hand). Guide for
  the user: `docs/TRIPO_WORKFLOW.md`. Do not call `scene.clear()` or dispose shared parts in effect cleanups of
  model components: React StrictMode runs them in dev and leaves the model empty.
- Draw tool (`draw`, key T): geometry is pure in `src/game/building/drawing.ts` (walls, fences, paths from a polyline),
  roofs in `roof.ts`, store-touching actions in `drawActions.ts`. `roof.ts` must not import `snapping.ts`/stores: the
  demo world imports it and a cycle crashes startup.
- Apply multi-line patches with a script file or the Edit tool. Bash heredocs holding TSX have
  failed here several times with shell quoting errors.
- The Vite dev server sometimes caches an empty module when a script rewrites a file while it
  is being read (page then fails with "does not provide an export named ..."). Touch the files
  under `src/` to make it re-read them.
- No fake controls: only tools that work are shown. The user asked for few buttons on the bars.
- UI text is Vietnamese; code, IDs and comments are English.
- File names must differ by more than case (Windows): e.g. `terrain.ts` vs `CoastalValley.tsx`.

## Working with the user

The user is not a 3D/graphics specialist. Reply in Vietnamese, plain wording, PowerShell
commands, and never ask them to do Blender/UV/shader work by hand.
