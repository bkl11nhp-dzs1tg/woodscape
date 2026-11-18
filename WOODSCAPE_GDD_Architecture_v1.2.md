# WOODSCAPE

## Game Design Document & Technical Architecture

**Version:** 1.2\
**Status:** Updated design baseline\
**Genre:** Creative Sandbox / Building / World Design\
**Platform:** Web browser, desktop-first\
**Mode:** Single-player, free creative mode\
**Camera:** Free 360° camera in a 3D construction space\
**Visual direction:** Anime-inspired hand-painted 2D art applied to real 3D geometry; hybrid 2.5D environment\
**Technology direction:** React, TypeScript, Three.js, React Three Fiber, Zustand, Rapier

------------------------------------------------------------------------

## Version 1.2 change summary

This revision keeps the original freeform construction gameplay and
feature requirements, but changes the visual/technical direction:

- Buildable parts are real 3D parametric geometry, not 2D house-part sprites.
- Box-shaped parts have six actual faces and optional face-specific materials.
- Anime-inspired hand-painted 2D textures provide the surface appearance.
- The environment may combine simple 3D terrain/props with 2D billboard scenery.
- The core content pipeline uses AI-generated 2D art plus code-generated geometry;
  Blender and external 3D modeling are not required.
- The free 360° camera and measurement-based building workflow remain.

# 1. Product vision

WOODSCAPE is a relaxing creative construction sandbox. The player enters
a beautiful, hand-painted-looking natural environment, creates or chooses
parametric 3D materials, then builds anything they imagine: a cabin,
bridge, greenhouse, treehouse, furniture, playground, cat village, or an
entire small settlement. The construction remains genuinely three-dimensional:
players place, rotate, resize, cut, and join geometric objects in space.
The anime-inspired look comes from the art direction, painted textures,
lighting, and scenery—not from replacing buildable objects with flat house sprites.

The game is not about survival, combat, resource grinding, or mandatory
objectives. Its challenge comes from creative decisions: proportions,
shapes, layout, material combinations, and how a design fits into its
environment.

## 1.1 Design principles

1.  **Creative freedom first:** templates are optional starting points,
    never mandatory blueprints.
2.  **Easy actions, meaningful outcomes:** most operations use
    selection, numeric inputs, snapping, and clear previews rather than
    demanding precise manual gestures.
3.  **Real dimensions:** objects have measurable dimensions and
    consistent scale.
4.  **Editable construction:** parts remain individually selectable and
    editable after assembly.
5.  **A beautiful world at rest:** the environment should be enjoyable
    even before the player builds anything.
6.  **Progressive complexity:** simple tools are easy to discover;
    advanced controls are available when wanted.
7.  **Safe experimentation:** undo, redo, duplicate, and save-as make it
    easy to try ideas without losing work.
8.  **Hand-painted presentation, real 3D construction:** materials look
    illustrated and warm, while their geometry, dimensions, transforms,
    and connections remain editable in 3D.

# 2. Core gameplay loop

1.  Choose a map and starting location.
2.  Explore the build area with the free camera.
3.  Open the material or object library.
4.  Place a primitive, prepared part, or reference object.
5.  Move, rotate, resize, recolor, or reshape it.
6.  Cut, split, combine, or join parts when needed.
7.  Add functional and decorative components.
8.  Check dimensions, fit, collisions, and optional physics.
9.  Decorate the surrounding environment.
10. Save the world and continue later.

There are no mandatory win or lose conditions.

# 3. World and environment

## 3.1 Initial map: Coastal Valley

The first map is a broad coastal valley with: - A river crossing the
buildable area. - A beach and coastline. - Grassland and open
clearings. - Trees and shrubs. - Rocky patches and sandy areas. - Low
hills and distant mountains. - Several naturally flat areas suitable for
construction.

The environment should feel spacious, with enough room to build without
constant terrain obstruction. Its visual treatment should resemble a
bright Japanese slice-of-life anime background: soft painted colors,
clear silhouettes, leafy vegetation, gentle shadows, and a welcoming
suburban/coastal atmosphere. This is a broad art-direction reference;
do not copy specific copyrighted characters, scenes, or franchise assets.

## 3.2 Future map themes

-   **Forest Lake:** woodland, lake shore, clearings.
-   **Mountain Valley:** slopes, streams, rock formations.
-   **Rocky Coast:** cliffs, coves, beach and sea.
-   **Open Meadow:** broad grassland and scattered trees.
-   **Desert Canyon:** dry terrain, rock and sand.

Each map defines its terrain, water, vegetation palette, lighting
defaults, ambient sounds, and suggested build zones.

## 3.3 Camera and navigation

The camera is free and independent of a player character in the initial
release. Although the art direction is 2D-painted, the construction scene
is a real 3D coordinate space; the player can orbit around objects and
inspect their front, back, sides, and top.

Required controls: - Orbit 360° around a target. - Pan horizontally and
vertically. - Zoom in and out. - Fly/navigation mode using WASD. - Q/E
for vertical movement. - F to focus the selected object. - Top, front,
side, and perspective view presets. - Optional camera speed settings. -
ESC to cancel the current tool operation.

The camera must not unexpectedly steal input while the player is typing
in a text or numeric field.

## 3.4 Visual direction: anime-inspired hand-painted 3D

The intended look is close to a warm, bright, hand-painted Japanese anime
background: clear blue skies, soft clouds, rich green trees, warm sunlight,
painted surfaces, gentle gradients, and slightly simplified shapes. Use
this as a broad visual direction only; do not reproduce an existing
franchise's characters, exact scenes, logos, or protected designs.

The visual system has three layers:

1. **Real 3D construction:** all player-built beams, bricks, panels,
   blocks, roofs, furniture, and assemblies use genuine 3D geometry.
2. **2D-painted surface art:** AI-created or artist-created textures are
   applied to the geometry through UVs/materials. A texture is an image
   painted for a material, not a preassembled image of a whole building.
3. **Hybrid 2.5D scenery:** terrain, water, major rocks, and nearby props
   can use simple 3D geometry; distant trees, bushes, flowers, and small
   decorative scenery may use transparent 2D billboard planes or layered
   cards to reduce asset-production cost.

### Visual quality rules

- Prefer soft painted colors, readable silhouettes, and restrained detail.
- Use stylized shadows and ambient lighting; avoid a photorealistic PBR look.
- Keep texture scale consistent across objects of different dimensions.
- Use subtle hand-painted highlights, grain, edge wear, and color variation.
- Avoid thick black cartoon outlines on every object; outlines are optional
  and should be used selectively for readability.
- Preserve enough contrast between object edges and the environment so
  selection, snapping, and measurements remain easy to see.
- The editor UI should be clean and modern, visually quieter than the world.

### What is 2D and what is 3D?

| Element | Representation |
|---|---|
| Bricks, beams, boards, walls, roof pieces | Editable 3D parametric geometry |
| Windows and doors | 3D geometry with painted textures/materials |
| Wood, stone, brick, paper, metal, glass appearance | 2D textures/material maps applied to 3D surfaces |
| Distant trees and some shrubs | Transparent 2D billboard planes are allowed |
| Main terrain, water, buildable ground | Simple 3D geometry with painted/stylized materials |
| Construction tools, gizmos, measurement lines | 2D editor overlays in the 3D viewport |
| UI icons and thumbnails | 2D images/SVGs |

Do not make the construction system depend on flat 2D sprites for walls,
roof sections, or complete houses. These can exist as optional references
or decorative thumbnails, but must not replace freeform construction.

# 4. Material and object library

The library is organized by category. Each asset has a thumbnail, name,
category, default dimensions, material properties, and supported
operations.

## 4.0 Core construction rule

The player must continue to build freely from geometric pieces. **Do not
replace the building workflow with selecting and snapping together
pre-drawn 2D pictures of walls, doors, windows, or complete houses.**

Every buildable part is real, editable 3D geometry with dimensions,
position, rotation, and its own object ID. The anime-inspired visual style
comes from 2D-painted textures/materials applied to those 3D surfaces.

Examples:
- A brick is a rectangular 3D box with six actual faces.
- A timber beam is a long rectangular prism.
- A glass pane is a thin 3D object with thickness.
- A roof board is a panel rotated to the desired slope.
- A wall can be assembled from individual blocks, boards, beams, and panels.

A box may use six material slots—front, back, left, right, top, and
bottom—so each face can have a different texture or finish. It can also
use one shared material across all faces. Use procedural Three.js geometry
for core building pieces; Blender and external 3D modeling software are
not required.

## 4.1 Wood

Initial shapes: - Round log. - Square beam. - Rectangular beam. - Long
plank. - Flat board. - Post. - Panel. - Laminated wood part.

Wood types: - Pine. - Oak. - Walnut. - Cedar. - Birch.

Properties may include grain, base color, hand-painted texture variant,
roughness, density, and a gameplay strength value. Physical values are
simplified game parameters, not certified engineering data. The texture
should look illustrated rather than photorealistic: visible but controlled
wood grain, soft painted highlights, and subtle edge variation.

## 4.2 Glass

Types: - Clear glass. - Frosted glass. - Tinted glass. -
Textured/decorative glass.

Editable properties: - Width, height, and thickness. - Tint/color. -
Transparency. - Roughness or frosting amount. - Optional frame or edge
style.

Glass should be represented by thin geometry with an appropriate
material. Use a painted edge/highlight treatment and restrained
transparency so glass remains readable in the anime art direction. Avoid
expensive real-time transmission on every pane; provide a
performance-friendly visual mode for large numbers of windows.

## 4.3 Stone and rock

Types: - Cut stone block. - Stone slab. - Rounded rock. - Decorative
boulder. - Gravel patch.

Editable properties: - Dimensions. - Color tint. - Surface roughness. -
Shape preset or irregularity amount.

## 4.4 Brick and masonry

Types: - Rectangular brick. - Square paver. - Hollow block. - Stone
brick. - Decorative tile.

For the simple construction workflow, the player primarily changes: -
Color. - Length and width. - Thickness/height. - Optional surface
pattern.

Provide optional repeated placement and row alignment for walls and
paths.

## 4.5 Paper and sheet materials

Types: - Paper sheet. - Cardboard sheet. - Corrugated board. - Thin
craft panel.

Editable properties: - Width and height. - Thickness. - Color. - Pattern
or printed texture.

These materials are useful for mock-ups, templates, signs, lightweight
decorations, and craft-style builds. They do not need complex physical
simulation in the first version.

## 4.6 Adhesives and connectors

Types: - Wood glue. - General-purpose adhesive. - Nails. - Screws. -
Brackets. - Hinges. - Simple joint pieces.

Glue is primarily a connection operation rather than a large solid
object. The player selects two or more compatible surfaces, chooses the
adhesive or connector, previews the connection, and confirms it.

Connection metadata must be saved independently from the meshes so parts
remain editable.

## 4.7 Insulation and winter comfort materials

Types: - Insulation board. - Insulation roll/panel. - Weather sealing
strip. - Roofing insulation layer. - Wall insulation layer.

Editable properties: - Thickness. - Color or surface finish. - Coverage
dimensions. - Simplified insulation rating.

Gameplay uses: - Add insulation to walls, floors, ceilings, and roofs. -
Show a simple warmth/comfort indicator for enclosed spaces. - Compare a
structure before and after insulation. - Provide visual overlays to show
insulated surfaces.

This is a creative simulation, not a real building energy certification
tool.

## 4.8 Renewable energy and ventilation components

**Solar panels** - Place on roofs, stands, or the ground. - Change
dimensions, tilt, and orientation. - Connect to a simplified power
network in a later phase. - Show a basic sunlight/exposure indicator.

**Small wind turbines and wind-powered devices** - Place on poles or
roofs where appropriate. - Adjust height and orientation. - Animate
rotor movement according to wind intensity.

**Fans and ventilation** - Ceiling fan. - Wall fan. - Ventilation
grille. - Exhaust fan. - Air duct segments.

These components can be decorative at first, then gain simple functional
simulation: fan on/off, rotation speed, airflow direction, and a room
ventilation indicator.

## 4.9 Other construction materials

Future categories: - Metal profiles and sheets. - Concrete blocks and
slabs. - Plastic panels. - Fabric, canvas, and awnings. - Roofing sheets
and shingles. - Flooring. - Pipes and ducts. - Lighting and electrical
props.

Do not attempt to ship every category in the first prototype. The data
model should make new categories easy to add.

# 5. Shape creation and geometry system

Players create common 3D shapes and parametric building parts, not only
select pre-made wood pieces. This core feature is named **Shape Studio**.
The shapes are genuine geometry; the 2D anime look is supplied by
textures, material settings, lighting, and selected environmental art.
A cube is never just a flat picture of a cube.

## 5.1 Primitive shapes

The first shape library should include: - Cube and rectangular cuboid. -
Sphere. - Cylinder. - Cone. - Capsule. - Plane and thin panel. -
Triangular prism. - Wedge. - Torus/ring. - Rounded box.

Each primitive supports numeric dimensions, rotation, position, color,
and material assignment. Box-like objects must support six independently
assignable face materials/textures when the player needs different
finishes on the top, bottom, front, back, left, or right face. For the
standard workflow, one material can be applied to all six faces.

## 5.1.1 Six-face box construction

A box is a first-class parametric object. Its geometry is defined by
width, height, and depth and has six actual faces. The renderer may use
one mesh with six material groups (or an equivalent efficient approach).
The object data must not store six separate flat pictures as a fake 3D
model.

Face slots are identified consistently: `right`, `left`, `top`,
`bottom`, `front`, and `back`. A face slot may use the same material as
other faces or a different material/texture. The player can:

- Apply one material to all faces.
- Apply a selected texture to one face or a group of faces.
- Change the tint of a face without changing its geometry.
- Reset all faces to the object's default material.
- Rotate/scale UVs if the editor exposes texture alignment controls.

A brick preset can therefore be created by choosing a box, entering its
dimensions, and applying a painted brick material. A wood block or timber
beam follows the same geometry workflow with a different material preset.

## 5.2 Shape Studio workflow

1.  Select **Create Shape**.
2.  Choose a primitive.
3.  Enter dimensions or drag handles.
4.  Preview the shape in the world.
5.  Confirm placement.
6.  Continue editing it like any other object.

For example: - Cube: width, height, depth. - Sphere: radius or
diameter. - Cylinder: radius and height. - Cone: base radius and
height. - Panel: width, height, thickness.

## 5.3 Custom shapes

Later versions may support: - Extruding a 2D outline into a 3D object. -
Drawing a polygon profile. - Editing control points. - Bevel/chamfer
edges. - Creating arches and curved beams. - Revolving a profile around
an axis. - Combining or subtracting supported solids.

Custom geometry must be introduced progressively. The first release
should prioritize stable primitives and parametric parts rather than
unrestricted mesh sculpting or arbitrary Boolean operations.

## 5.4 Reusable components

Players can group objects into a reusable component: - Save as a custom
asset. - Give it a name and thumbnail. - Place copies elsewhere. - Edit
an instance or edit the source component. - Keep internal dimensions and
connections.

Examples: a window frame, cat shelter, chair, bridge segment, fence
panel, or solar-panel stand.

# 6. Cutting, editing, moving, and crafting

## 6.1 Selection and transform

-   Select one object or multiple objects.
-   Move along X, Y, and Z.
-   Rotate around each axis.
-   Resize by dimensions.
-   Duplicate and mirror.
-   Group and ungroup.
-   Lock, hide, and delete.
-   Snap to grid, surface, edge, endpoint, or another object.
-   Toggle local/world transform axes.

Use visual transform gizmos and numeric fields together.

## 6.2 Cutting

Supported operations: - Cross-cut a beam. - Split lengthwise. - Cut to a
specified length. - Cut at an angle. - Split a panel into sections. -
Divide a supported primitive into parts.

Workflow: 1. Select an object. 2. Choose a cut type. 3. Enter a
position, length, or angle. 4. Show a cut preview. 5. Confirm. 6.
Replace the original with resulting parts. 7. Play a short cutting
animation.

For the MVP, use parametric geometry splitting for beams, panels, and
boxes. General-purpose arbitrary mesh cutting is a later feature.

## 6.3 Joining and adhesives

Supported operations: - Place side by side. - Stack. - Align end to
end. - Join at an angle. - Join perpendicular surfaces. - Attach using
glue, nails, screws, brackets, or a simple wood joint.

The connection is stored as a separate relationship between object IDs.
Do not merge all joined meshes into one irreversible mesh.

Players must be able to select, move, detach, or replace individual
parts.

## 6.4 Crafting and relocating finished objects

The player can create an object or assembly, then: - Select the whole
assembly. - Group its components. - Move it to another location. -
Rotate or reposition it. - Save it to the personal component library. -
Duplicate it in the same world or another world. - Export/import it as a
reusable design file.

Moving a finished assembly should preserve its internal part positions
and connections. The player should not need to rebuild it piece by
piece.

The term **Craft** means assembling and saving a reusable creation, not
collecting resources or waiting for timers.

# 7. Reference objects and scale checking

Reference categories: - Human mannequins in standing and seated poses. -
Cats and dogs, with multiple sizes/poses. - Other animals. - Furniture:
tables, chairs, beds, cabinets. - Vehicles and everyday objects. -
Plants and decorative props.

Important use case: building a home for cats.

The library should include cat-related reference and functional
objects: - Cat mannequins in several sizes/poses. - Cat beds and
cushions. - Feeding bowls. - Water bowls. - Litter trays. - Scratching
posts. - Climbing shelves. - Ramps and steps. - Tunnels. - Hideouts. -
Enclosed sleeping boxes. - Cat doors. - Window perches. - Outdoor shaded
shelters. - Fences and safe play enclosures. - Toy props.

Players can place a cat reference object to check whether an entrance,
shelf, tunnel, or sleeping space is appropriately sized.

Reference objects can be locked so they are not accidentally edited.

# 8. Functional building systems

These systems add meaning to materials without turning the game into a
demanding engineering simulator.

## 8.1. Comfort and insulation

-   Assign insulation to a wall, roof, floor, or panel.
-   Display a simplified indoor comfort indicator.
-   Let weather affect the indicator.
-   Compare insulated and uninsulated designs.
-   Keep the simulation understandable and forgiving.

## 8.2. Power and solar energy

Future simplified system: - Solar panels generate an abstract power
value based on daylight and weather. - Batteries store energy. - Lamps
and fans consume energy. - A simple connection tool links components. -
A visual panel displays generation, storage, and usage.

The system is optional and does not block creative building.

## 8.3. Ventilation

-   Place fans and vents.
-   Set airflow direction.
-   Toggle devices on/off.
-   Display simple airflow arrows.
-   Show a basic ventilation status for enclosed rooms.

## 8.4. Weather and time

Time presets: - Dawn. - Morning. - Noon. - Sunset. - Night.

Weather: - Sunny. - Cloudy. - Light rain. - Heavy rain. - Fog. - Wind.

Effects: - Lighting and shadows. - Water surface changes. - Wind-driven
vegetation. - Rain particles. - Fog. - Ambient sound. - Optional effects
on solar output and indoor comfort.

Players can manually set weather and time.

# 9. Physics and structural preview

Use Rapier 3D for: - Gravity. - Collision. - Static and dynamic
bodies. - Mass. - Friction. - Restitution. - Simple connection
constraints.

Performance rules: - Do not simulate every environmental object
continuously. - Use static colliders for terrain and scenery. - Enable
dynamic physics only for objects being tested or moved. - Provide a
**Test Physics** mode rather than constantly simulating the entire
build.

Any structural stability score is a simplified gameplay indicator, not
professional structural engineering advice.

# 10. User interface

## Top bar

-   WOODSCAPE logo.
-   World name.
-   Save.
-   Undo.
-   Redo.
-   Time.
-   Weather.
-   Settings.

## Left toolbar

-   Select.
-   Create Shape.
-   Materials.
-   Cut.
-   Join.
-   Measure.
-   Decorate.
-   Craft/Components.

## Right properties panel

Context-sensitive properties: - Object name and category. -
Dimensions. - Position and rotation. - Material and color. -
Thickness. - Transparency. - Roughness. - Connection details. -
Functional settings where applicable.

## Bottom asset shelf

-   Materials.
-   Reference objects.
-   Animals.
-   Furniture.
-   Plants.
-   Decorations.
-   Saved components.

## Optional panels

-   Scene/object hierarchy.
-   Mini-map.
-   World settings.
-   Component library.
-   Measurement and alignment tools.

The interface should remain calm and uncluttered. Advanced settings can
be collapsed.

# 11. Saving and persistence

Use IndexedDB for local worlds.

Supported actions: - Create a world. - Rename a world. - Save. -
Auto-save after meaningful operations. - Duplicate a world. - Reopen a
world. - Export world data as JSON. - Import world data from JSON. -
Export reusable components separately.

Suggested records: - Worlds. - Objects. - Connections. - Components. -
Settings. - Asset metadata.

Store parametric geometry data and asset IDs wherever possible rather
than serializing live Three.js objects.

Every save format must include a `schemaVersion` so future updates can
migrate old worlds.

# 12. MVP scope

The MVP must prove the core creative experience before expanding into
all material categories. It must also demonstrate the final visual
direction with a small, consistent set of hand-painted-style textures.
Do not use photorealistic materials for one object and flat cartoon
materials for another.

## Required for MVP

1.  One attractive 3D map using anime-inspired hand-painted art direction.
2.  Free 360° camera.
3.  Primitive shape creation: cube, sphere, cylinder, cone, panel.
4.  Wood beams and boards generated from parametric 3D geometry.
5.  At least one coherent hand-painted wood texture/material set.
6.  A box/brick with six real faces and optional per-face materials.
7.  Place, select, move, rotate, and resize.
8.  Numeric dimensions and measurement labels.
9.  Basic beam and panel cutting.
10. Basic joining and snapping.
11. Group and move an assembled creation.
12. Undo and redo.
13. Save and load a world.
14. A coherent editor interface.

## Next content update

-   Glass, stone, brick, paper, glue and connectors.
-   Color and thickness controls.
-   Cat reference objects and cat-house props.
-   Reusable component library.

## Later updates

-   Insulation and winter comfort.
-   Solar panels and batteries.
-   Fans and ventilation.
-   More maps.
-   Weather effects.
-   Advanced custom shapes.
-   Expanded physics and structural preview.

## Explicitly out of scope initially

-   Multiplayer.
-   Survival and resource gathering.
-   Mandatory missions.
-   Real-world engineering certification.
-   Fully unrestricted mesh sculpting.
-   Complex electrical simulation.
-   Full fluid simulation.

# 13. MVP acceptance criteria

The MVP is successful when a player can:

1.  Open the game and enter Coastal Valley.
2.  Move the free camera around the environment.
3.  Create a cube, sphere, and cylinder.
4.  Add a wooden beam and panel.
5.  Set exact dimensions.
6.  Move, rotate, duplicate, and group objects.
7.  Cut a supported beam into two parts.
8.  Join parts while keeping them individually editable.
9.  Move the finished assembly elsewhere.
10. Measure dimensions and distances.
11. Undo and redo operations.
12. Save, close, reopen, and recover the same construction.
13. Confirm a box/brick has six actual 3D faces and supports independent face-material assignment.
14. Confirm the camera can orbit to inspect the back and sides of a placed object.
15. Confirm construction objects remain editable geometry rather than flattened sprites.

------------------------------------------------------------------------

# 14. Technical architecture

## 14.1 Technology stack

  Layer         Technology                    Responsibility
  ------------- ----------------------------- ----------------------------------
  UI            React + TypeScript            Editor interface
  Build         Vite                          Development and production build
  3D            Three.js                      Rendering
  React 3D      React Three Fiber             Scene components
  Helpers       Drei                          Camera and 3D utilities
  State         Zustand                       Editor and world state
  Physics       Rapier                        Collision and physics tests
  Persistence   IndexedDB, optionally Dexie   Local saves
  Validation    Zod                           Data validation
  Art assets    PNG/WebP textures and transparent PNG cards   Painted surfaces and optional 2.5D scenery

Install libraries progressively and verify compatible stable versions.

## 14.2 AI-assisted art and asset pipeline

WOODSCAPE should be buildable without a Blender workflow or external 3D
modeling software. The runtime creates standard geometry procedurally;
AI image generation is used primarily for 2D textures, material sheets,
scenery cards, thumbnails, and reference images.

### Responsibilities

- **Image generation:** create hand-painted-looking wood, stone, brick,
  paper, plaster, roof, ground, foliage, and sky textures; also create
  transparent scenery cards when suitable.
- **Claude Code:** implement the geometry factory, UV/material assignment,
  texture loading, asset registry, editor tools, and data persistence.
- **WOODSCAPE runtime:** construct the real 3D objects from parameter data
  and apply the selected texture/material assets.

AI-generated images are not automatically production-ready. Each asset
must be checked for seams, perspective distortion, unwanted text, visible
watermarks, inconsistent lighting, and incorrect scale before being
added to the library.

### Texture asset guidelines

- Use tileable/seamless textures for repeating surfaces such as wood,
  brick, stone, grass, plaster, and roof tiles.
- Use non-tileable textures for unique decals, labels, painted signs,
  and decorative details.
- Prefer PNG or WebP; use transparency only when required.
- Start with 512×512 or 1024×1024 textures; use larger images only when
  close-up testing demonstrates a need.
- Keep material textures neutral enough to accept an in-game color tint.
- Avoid baking strong directional shadows into a repeating texture;
  let scene lighting provide the main light and shadow.
- Create a small, coherent palette before generating many variations.
- Use texture atlases or shared texture sets when that improves draw calls.

### Suggested initial texture pack

1. Pine wood: light, medium, and weathered variants.
2. Oak/walnut wood: two darker variants.
3. Brick: red brick and pale brick, with a matching top/side treatment.
4. Stone: cut stone and rough rock.
5. Plaster: warm white and muted cream.
6. Roof: terracotta tile and simple metal sheet.
7. Glass: restrained blue tint and painted reflection treatment.
8. Ground: grass, soil, sand, and gravel.
9. Foliage cards: a few tree and shrub silhouettes with transparent edges.

Use a texture registry with stable asset IDs. Geometry data references
texture/material IDs; save files must not embed large base64 image blobs.

## 14.3 Project structure

``` text
woodscape/
├── public/
│   └── assets/
│       ├── textures/
│       │   ├── wood/
│       │   ├── brick/
│       │   ├── stone/
│       │   ├── glass/
│       │   ├── plaster/
│       │   ├── roofing/
│       │   ├── ground/
│       │   └── foliage/
│       ├── scenery-cards/
│       │   ├── trees/
│       │   ├── shrubs/
│       │   ├── flowers/
│       │   └── distant-background/
│       ├── thumbnails/
│       ├── audio/
│       └── maps/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── layout/
│   │   ├── toolbar/
│   │   ├── panels/
│   │   ├── dialogs/
│   │   └── common/
│   ├── game/
│   │   ├── core/
│   │   ├── environment/
│   │   ├── camera/
│   │   ├── geometry/
│   │   ├── building/
│   │   ├── tools/
│   │   ├── materials/
│   │   ├── crafting/
│   │   ├── components/
│   │   ├── physics/
│   │   ├── weather/
│   │   └── entities/
│   ├── stores/
│   ├── data/
│   ├── services/
│   ├── types/
│   ├── hooks/
│   └── styles/
├── docs/
│   ├── GDD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_SCHEMA.md
│   ├── DEVELOPMENT_ROADMAP.md
│   └── ASSET_GUIDELINES.md
├── CLAUDE.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 14.4 Architecture layers

1.  **UI layer:** React components, panels, dialogs, toolbar and HUD.
2.  **State layer:** Zustand stores for world, selection, tools, history
    and settings.
3.  **Game systems:** placement, transform, geometry, cutting, joining,
    measuring, crafting, physics and weather.
4.  **3D layer:** scene, camera, procedural meshes, UVs, materials,
    lighting, and environment.
5.  **Art/asset layer:** texture registry, UV/material presets, scenery cards, and asset loading.
6.  **Persistence layer:** save, load, migration, import and export.

UI components must not directly mutate Three.js scene objects. User
actions should call game commands or systems, which update canonical
state and synchronize the 3D scene.

## 14.5 Suggested modules

-   `GameCanvas`: owns the R3F canvas and scene.
-   `SceneManager`: coordinates world scene setup.
-   `CameraController`: free camera navigation.
-   `GeometryFactory`: creates supported parametric shapes and box face groups.
-   `TextureRegistry`: maps stable asset IDs to hand-painted texture files.
-   `MaterialFactory`: builds stylized Three.js materials from material presets and texture IDs.
-   `SceneryCardSystem`: manages optional 2D billboard scenery in the 3D world.
-   `MaterialRegistry`: defines material presets.
-   `PlacementSystem`: places assets in the world.
-   `TransformSystem`: move, rotate and resize.
-   `SnapSystem`: grid, surface, edge and endpoint snapping.
-   `CuttingSystem`: parametric cuts for supported geometry.
-   `JoiningSystem`: creates and removes connections.
-   `CraftingSystem`: groups, saves and places reusable assemblies.
-   `MeasurementSystem`: dimensions, distances and angles.
-   `PhysicsSystem`: on-demand physics tests.
-   `WeatherSystem`: weather and time state.
-   `SaveService`: versioned world persistence.

## 14.6 Coordinate and measurement standards

-   World up axis: Y.
-   Internal length unit: meters.
-   UI display: meters, centimeters or millimeters.
-   Internal angles: radians.
-   UI angles: degrees.
-   Object IDs: stable unique strings.
-   Dimensions are canonical geometry data; do not rely on arbitrary
    scale values for measurement.

## 14.7 Parametric object data example

``` json
{
  "id": "beam_0001",
  "type": "wood_beam",
  "name": "Oak beam",
  "materialId": "oak_painted",
  "faceMaterials": {
    "front": "oak_painted",
    "back": "oak_painted",
    "left": "oak_painted",
    "right": "oak_painted",
    "top": "oak_endgrain_painted",
    "bottom": "oak_endgrain_painted"
  },
  "geometry": {
    "shape": "box",
    "width": 0.15,
    "height": 0.10,
    "depth": 2.40
  },
  "transform": {
    "position": [0, 0.5, 0],
    "rotation": [0, 0, 0]
  },
  "connections": [],
  "locked": false
}
```

Use stable IDs for references between objects. Keep material definitions
separate from object instances.

## 14.8 Undo and redo

Use a command-based history: - AddObject. - DeleteObject. -
MoveObject. - RotateObject. - ResizeObject. - CutObject. -
JoinObjects. - DetachObjects. - ChangeMaterial. - GroupObjects. -
UngroupObjects.

Each command should support `execute` and `undo`. Redo replays the
command. Commands should store the minimum data needed to reverse an
operation safely.

## 14.9 Performance requirements

-   Reuse geometries, materials, and textures.
-   Use instancing for repeated vegetation and props.
-   Reuse texture assets through a registry; do not generate duplicate texture files per object.
-   Use billboard cards selectively for distant foliage, not for buildable structural parts.
-   Use level of detail for distant objects.
-   Lazy-load map assets.
-   Dispose unused geometries, materials and textures.
-   Use simplified colliders for physics.
-   Avoid continuous simulation for static scenery.
-   Provide quality settings for shadows, render scale and effects.
-   Profile before adding expensive post-processing.

# 15. Development roadmap

## Phase 0 -- Foundation

-   Create React + TypeScript + Vite project.
-   Configure R3F and Drei.
-   Create editor shell.
-   Create a 3D scene.
-   Establish the anime-inspired hand-painted visual target.
-   Create a small test texture pack and apply it to procedural primitives.
-   Build the first Coastal Valley blockout using simple 3D forms and selected 2D scenery cards.
-   Add free camera controls.
-   Add initial CLAUDE.md and documentation.

## Phase 1 -- Shape and placement core

-   Create cube, sphere, cylinder, cone and panel from procedural geometry.
-   Implement six-face material slots for box-shaped objects.
-   Add painted texture/material presets for the first wood blocks and beams.
-   Add wood beam and plank presets.
-   Select, move, rotate and resize.
-   Add dimension labels.
-   Add grid and basic snapping.

## Phase 2 -- Construction

-   Parametric cutting.
-   Joining and connection records.
-   Group and ungroup.
-   Move finished assemblies.
-   Undo and redo.

## Phase 3 -- Materials and crafting

-   Glass, stone, brick, paper and adhesives.
-   Expand the consistent hand-painted texture pack for the new materials.
-   Material color, face-material, and thickness controls.
-   Component library.
-   Cat reference models and cat-house props.

## Phase 4 -- Persistence

-   Save and load worlds.
-   Auto-save.
-   JSON import/export.
-   Component export/import.
-   Schema migration.

## Phase 5 -- Environment and simulation

-   Terrain, water and vegetation polish.
-   Lighting and weather.
-   Time of day.
-   On-demand physics.
-   Insulation and comfort preview.

## Phase 6 -- Functional systems and expansion

-   Solar panels and simplified power.
-   Fans and ventilation.
-   Additional maps.
-   More asset categories.
-   Advanced custom geometry.

Each phase must build successfully and be manually tested before the
next phase begins.

# 16. Working rules for Claude Code

1.  Read `CLAUDE.md` and the relevant docs before editing.
2.  Implement one phase or focused feature at a time.
3.  Do not replace working architecture without explaining why.
4.  Keep UI, state, game systems and rendering separate.
5.  Do not create fake buttons or nonfunctional controls.
6.  Use temporary procedural geometry and placeholder textures when final art is unavailable.
7.  Keep all textures and scenery assets replaceable through an asset registry.
8.  Never replace freeform 3D construction with a collection of flat house-part sprites.
9.  Do not require Blender or externally modeled meshes for core building materials; create them with code-driven geometry.
10. Apply the anime-inspired look through coherent hand-painted textures, materials, lighting, and scenery—not by flattening the construction space.
11. Add or update types when data structures change.
12. Add tests for geometry calculations, face-material assignment, cutting,
    dimensions, and save/load.
13. Run the production build after each phase.
14. Report implemented features, known limitations, and manual test steps.
15. Do not silently expand scope beyond the requested phase.

**North star:** WOODSCAPE should feel like a hand-painted anime world
that the player can physically build inside. The scenery and materials
look like carefully illustrated 2D art, but every construction part is
a real, measurable, editable 3D object. The player imagines; the tools
make the idea easy to build.
