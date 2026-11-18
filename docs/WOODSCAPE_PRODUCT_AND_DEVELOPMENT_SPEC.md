# WOODSCAPE — Product Vision & Development Specification

> **Purpose:** This document is the product and implementation brief for developing WOODSCAPE. Use it as the guiding specification when planning and implementing features. Preserve the existing project architecture and code conventions unless a change is necessary and justified.
>
> **Product direction:** A creative 3D woodworking and building sandbox, supported by a marketplace where players can discover, buy, build from, customize, and eventually sell architectural designs.

---

## 1. Product vision

WOODSCAPE is not intended to be another survival game or a block-based Minecraft clone. It is a **creative building sandbox** in which players can design and construct their own structures from individual wooden components, in a calm and beautiful natural environment.

The commercial model extends the sandbox into a **digital design marketplace**. Players can pay for inspiration, ready-made designs, complete editable structures, decorative collections, and optional advanced tools. In a later phase, players can publish their own creations and earn revenue when other players buy them.

### Core promise

**Build freely. Learn from designs. Make every structure your own.**

### Product pillars

1. **Creative freedom** — Players can build without mandatory missions, survival pressure, or a prescribed final result.
2. **Tactile woodworking** — Wood is a material to select, measure, resize, cut, position, and join, rather than just a decorative block.
3. **Beautiful places** — Natural environments make the player's creations feel meaningful and worth sharing.
4. **Editable content** — A purchased structure is not a sealed 3D model. It remains a collection of editable construction parts.
5. **Creator economy** — The platform can grow through official content and, later, community-created designs.

---

## 2. Target player experience

### First session

When a new player enters the game:

1. They arrive in a peaceful, spacious natural environment with a buildable plot.
2. The environment feels intentionally open, not broken or unfinished. It should contain a small amount of landscape detail, a few points of visual interest, scale references, and a clear build area.
3. The player can immediately experiment with the free basic building tools.
4. The game introduces a small selection of free sample designs and clearly marked premium designs as inspiration.
5. The player can inspect a design before deciding whether to build it themselves or acquire a complete structure.
6. The player can ignore the marketplace and continue building freely. Paid content must never be required to access the core creative loop.

### Main player paths

- **Build from scratch:** Choose wood, set dimensions, cut pieces, position them, join them, and save the result.
- **Build from a blueprint:** Follow a sequence of construction steps and use the included materials and dimensions as a guide.
- **Place a complete build:** Acquire a ready-made structure and place it in the world, then edit its parts.
- **Decorate:** Add furniture, lighting, landscape objects, and detail packs.
- **Create and share:** In a later phase, package a finished structure or blueprint and publish it to the marketplace.

### Design principle

A new player should understand what they can do within the first few minutes, but should not be forced into a tutorial or quest chain. Use optional contextual hints, sample projects, and short interactive demonstrations.

---

## 3. Visual and world direction

### Art direction

- Stylized 3D with an anime-inspired, semi-realistic feel.
- Calm, attractive natural lighting and readable material surfaces.
- Strong silhouettes and clear construction details.
- Attractive without becoming childish, excessively saturated, or visually noisy.
- Wood should visibly communicate its type, grain, color, finish, and dimensions.
- UI should feel like a polished creative tool, not a generic survival-game HUD.

### Environment

The world should support relaxed building and presentation. Potential environments include:

- Forest clearings.
- Lakesides and riversides.
- Gentle hills and valleys.
- Coastal or meadow plots.
- Later: additional themed biomes and community showcase spaces.

### World features already established as desired direction

- Free 360-degree camera control.
- Open natural environments.
- Reference objects or guides that help players understand the scale of their structures.
- Physics where it improves the building experience.
- Changes in weather and time of day.
- Saving and loading player designs.

Do not overbuild the environment before the construction loop is satisfying. The building system and editable content format are the product foundation.

---

## 4. Core building gameplay

### 4.1 Wood and material selection

Players should be able to select from a material library. Start with a small, well-presented selection and expand it later.

Each material should be able to define:

- Stable material ID.
- Display name and description.
- Visual/texture reference.
- Base color and surface properties.
- Optional physical properties such as density, weight, or durability, if used by the simulation.
- Availability status: default, unlockable, or marketplace content.

Avoid hard-coding material identity into the mesh. A construction part should reference a material ID so that it can be changed later without rebuilding the object.

### 4.2 Dimensions and measurement

Players need to define the dimensions of a wooden piece before placing it.

Minimum expected controls:

- Length, width, and thickness.
- Unit display that is consistent throughout the game.
- Numeric input and practical drag/handle controls where suitable.
- Grid and snapping options.
- Rotation and alignment controls.
- Clear visual feedback for invalid values or placement conflicts.

Use a consistent internal unit system. Convert to display units at the UI boundary rather than storing mixed units.

### 4.3 Cutting and shaping

The player should be able to create a piece of wood from a selected material and dimensions, then cut or modify it through a clear UI action and animation.

For the MVP, prioritize reliable rectangular timber pieces and simple cuts over a complex woodworking simulator. More advanced shaping can be introduced after the basic workflow is stable.

### 4.4 Placement and joining

Players should be able to:

- Move and rotate individual pieces.
- Snap pieces together at useful points or faces.
- Align parts accurately.
- Join or group parts into a larger assembly.
- Ungroup or detach parts when appropriate.
- Select an individual piece inside a larger structure.

The interface should make it clear whether a part is merely near another part, snapped into place, or structurally joined.

### 4.5 Editing operations

Core editing operations should include:

- Select / deselect.
- Move / rotate.
- Duplicate.
- Delete.
- Undo / redo where practical.
- Change material.
- Edit dimensions.
- Group / ungroup.
- Copy and paste.
- Mirror or repeat operations where practical.

Advanced operations such as arrays, templates, precision snapping modes, and batch material replacement are candidates for premium tools, but basic building must remain usable for free.

### 4.6 Physics and structural feedback

Physics should support immersion and understandable construction, not frustrate creative play.

Recommended direction:

- Use stable placement and snapping first.
- Add gravity or physical behavior only where it creates meaningful feedback.
- Avoid allowing a minor placement error to destroy a large project.
- Consider an optional relaxed/creative mode with reduced structural restrictions.
- If structural support is simulated, communicate why a structure is unstable and offer a way to inspect it.

### 4.7 Saving and project management

Players should be able to save, load, rename, duplicate, and delete their projects.

A saved project should preserve:

- All component instances.
- Material references.
- Component dimensions and transforms.
- Connections and grouping relationships.
- Project metadata and version.
- Optional environment or plot placement data.

Autosave or recovery should be considered once the save format is reliable. Never rely only on a single flattened exported mesh for an editable project.

---

## 5. The critical technical principle: structures must remain editable

This is the most important architectural decision for the marketplace.

**Do not represent a purchased or saved structure as one opaque 3D model.** Represent it as structured construction data: a collection of individual parts and their relationships.

Each wooden part should retain its own identity, dimensions, transform, material reference, and optional connection data. A structure is an assembly of these parts.

This enables:

- Selling a complete house that players can customize.
- Selling blueprints that reveal construction steps.
- Replacing all instances of one wood type.
- Changing the dimensions or position of individual pieces.
- Removing a roof, changing a door, or extending a balcony.
- Reusing a purchased design as a starting point for a new project.
- Validating, previewing, and versioning marketplace submissions.

### Suggested conceptual data model

Adapt these concepts to the project's existing language and architecture. These are domain requirements, not a mandate to introduce a specific database or framework.

```ts
type Vec3 = { x: number; y: number; z: number };
type Rotation3 = { x: number; y: number; z: number };

type MaterialDefinition = {
  id: string;
  name: string;
  description?: string;
  assetKey: string;
  properties?: Record<string, number | string | boolean>;
};

type ConstructionPart = {
  id: string;
  kind: "timber" | "panel" | "beam" | "decoration" | "other";
  materialId: string;
  dimensions: Vec3;
  position: Vec3;
  rotation: Rotation3;
  metadata?: Record<string, unknown>;
};

type PartConnection = {
  id: string;
  fromPartId: string;
  toPartId: string;
  connectionType: string;
  anchorA?: string;
  anchorB?: string;
  metadata?: Record<string, unknown>;
};

type ConstructionGroup = {
  id: string;
  name: string;
  partIds: string[];
  parentGroupId?: string;
};

type BuildProject = {
  schemaVersion: number;
  id: string;
  name: string;
  description?: string;
  parts: ConstructionPart[];
  connections: PartConnection[];
  groups: ConstructionGroup[];
  createdAt: string;
  updatedAt: string;
};
```

### Data-format requirements

- Include a `schemaVersion` so old saved content can be migrated.
- Use stable IDs for parts and materials.
- Store transforms and dimensions as data, not only in geometry vertices.
- Store connections separately from visual meshes.
- Keep marketplace metadata separate from the actual construction payload.
- Validate imported content before loading it into the world.
- Plan for asset references rather than embedding large texture files in every project.
- Create a serialization/deserialization test early.

The exact implementation can differ, but these capabilities must remain possible.

---

## 6. Monetization model

The guiding rule is:

> **Do not sell the right to create. Sell convenience, inspiration, specialized content, and valuable creative tools.**

The free experience must be a real sandbox, not a restricted demo that forces payment for basic building.

### 6.1 Blueprint — guided design plans

A Blueprint is a purchasable design package that teaches or guides the player through building a structure themselves.

A Blueprint may contain:

- 3D preview of the finished structure.
- Step-by-step construction sequence.
- Per-step highlighted parts.
- Part dimensions and material requirements.
- Optional exploded view.
- Optional list of tools needed.
- Difficulty level.
- Estimated build time, clearly marked as an estimate.
- Completion preview.

**Player value:** Learn a construction technique, follow a plan, and build the structure themselves.

Blueprints should be usable as an optional guide. The player must still be able to inspect the entire design and return to free building.

### 6.2 Complete Build — ready-made editable structures

A Complete Build is a finished structure that the player can place in their world.

Requirements:

- It must be stored as editable structured construction data, not only as a single mesh.
- The player can preview it before purchase.
- It can be placed on a suitable plot or at a valid location.
- Individual components can be selected and edited after placement.
- Players can change materials and colors where compatible.
- Players can remove, replace, or extend components.
- The system should preserve the purchased original and let the player save a modified copy as their own project.

**Player value:** Get a beautiful result quickly without losing the ability to customize it.

### 6.3 Decoration Packs

Optional content packs can include:

- Furniture.
- Lamps and lighting objects.
- Garden objects and plants.
- Fences, gates, paths, and outdoor details.
- Interior decoration sets.
- Themed architectural details.

Decorations should be organized and previewable as collections. Where appropriate, individual items should remain movable and editable after placement.

### 6.4 Premium / Pro Tools

Possible advanced tools include:

- Precision measurement and alignment helpers.
- Advanced snapping and anchor tools.
- Batch material replacement.
- Mirror and repeat tools.
- Arrays or procedural repetition.
- Advanced copy/paste and component templates.
- More powerful project organization.
- Optional advanced cutting or shaping tools.

Do not make essential actions such as selecting wood, creating a basic beam, moving a part, or joining basic pieces paid-only. Premium tools should speed up or deepen workflows rather than remove basic capability from free players.

### 6.5 Creator Marketplace — later phase

Eventually, players should be able to publish their own designs.

Creator flow:

1. Player selects a saved project.
2. Player chooses a listing type: Blueprint or Complete Build.
3. The game validates the structure and all referenced assets.
4. The creator adds a title, description, screenshots, category, difficulty, tags, and price.
5. The listing enters moderation or review.
6. Once approved, it appears in the marketplace.
7. Buyers can acquire and use it.
8. The creator receives a defined share of eligible revenue, subject to platform fees and applicable payment rules.

Marketplace requirements for a later phase:

- Creator profiles.
- Listing management and version updates.
- Ratings and reviews.
- Reporting and moderation tools.
- Refund and dispute policy.
- Revenue and sales history for creators.
- Intellectual-property and ownership rules.
- Anti-spam, anti-fraud, and prohibited-content controls.
- Clear rules for assets included in a creator submission.

Do not launch user-to-user selling until ownership, moderation, payment handling, refunds, and content validation have been designed.

---

## 7. Marketplace UX and storefront

The marketplace should feel like a curated design store, not a cluttered game shop.

### Suggested categories

- **Featured** — Curated and highlighted content.
- **Free Designs** — Free samples and starter projects.
- **Blueprints** — Guided construction plans.
- **Complete Builds** — Ready-made editable structures.
- **Furniture** — Interior and outdoor furniture.
- **Landscape** — Gardens, paths, fences, and environmental details.
- **Toolkits** — Advanced creative tools.
- **Creator Market** — Community content, once available.

### Product card

Each listing should communicate:

- Main preview image.
- Product name.
- Product type.
- Price or Free label.
- Creator or publisher.
- A concise description.
- Optional rating and popularity indicators, once trustworthy data exists.

### Product detail page

Include:

- Large preview image and interactive 3D preview where supported.
- Rotate / inspect controls.
- Product type: Blueprint, Complete Build, Decoration Pack, or Toolkit.
- Price and purchase state.
- Included contents.
- Required materials and compatible items.
- Structure dimensions or approximate footprint.
- Difficulty for Blueprints.
- Supported edit operations for Complete Builds.
- Creator/publisher information.
- Clear action: preview, acquire, or open/build, depending on ownership.

### Preview and free sampling

- Provide free examples of each major product type where feasible.
- Show paid designs as inspiration, but do not make the world feel like an advertisement.
- Allow inspection of a paid structure before purchase, within reasonable limits.
- Make the distinction between a Blueprint and a Complete Build unmistakable.
- Never imply that a preview is owned or editable unless it actually is.

---

## 8. Free and paid content policy

Suggested high-level split:

| Capability | Free baseline | Paid option |
|---|---|---|
| Enter the sandbox and use a plot | Yes | Additional environments later, if appropriate |
| Basic wood selection | Yes | Expanded material collections |
| Basic dimensions and cutting | Yes | Advanced shaping tools |
| Move, rotate, place, and join parts | Yes | Advanced precision helpers |
| Save and load projects | Yes | Optional organization or convenience features |
| Build independently | Yes | Not restricted |
| Starter Blueprints | A small curated set | Premium design collections |
| Complete Builds | A few samples | Premium editable structures |
| Basic decoration | Yes | Themed decoration packs |
| Publish marketplace listings | Not in MVP | Creator program in a later phase |

This is a product-design baseline, not a final pricing plan. Do not invent real-money prices, currency conversion, subscription tiers, or creator revenue percentages during implementation. Keep the commerce layer configurable until business decisions are finalized.

---

## 9. Suggested UI and navigation

The game should keep creation as the primary experience. The marketplace should be accessible without taking over the main world view.

Suggested top-level destinations:

- **Build** — Return to the current world and construction tools.
- **Designs** — Browse Blueprints and Complete Builds.
- **Decorate** — Browse furniture, objects, and scenery packs.
- **Tools** — Review available building tools and optional upgrades.
- **My Projects** — Saved projects and locally owned designs.
- **Library** — Acquired content and installed assets.
- **Creator Studio** — Later-phase publishing and sales management.

Suggested in-world entry points:

- A subtle Designs / Catalog panel.
- Contextual suggestions when a player opens a new plot.
- Optional showcase locations displaying sample builds.
- A project browser that can load a free example or a player's own saved design.

Avoid placing large permanent promotional banners over the building area.

---

## 10. MVP scope and implementation roadmap

The first milestone should prove that construction is enjoyable and that structures can be saved and reloaded as editable data. A fully functional real-money marketplace is not the first milestone.

### Phase 1 — Core creative sandbox

**Goal:** A player can create, edit, save, and reload a basic wooden structure.

Implement:

- Stable world entry and free camera controls.
- One polished natural build environment.
- Basic wood/material selection.
- Creation of rectangular timber parts with dimensions.
- Move, rotate, snap, and join operations.
- Select, edit, duplicate, and delete parts.
- Basic grouping where needed.
- Save/load projects using structured editable data.
- A small starter project or example build.

Acceptance criteria:

- A player can create a simple wooden frame without developer tools.
- The dimensions and material of a part can be changed after placement.
- The player can save, leave, reload, and continue editing the same structure.
- Part identity and connections survive serialization.
- No core action requires a purchase.

### Phase 2 — Blueprint experience

**Goal:** A design can guide a player through constructing a structure.

Implement:

- Blueprint data format and versioning.
- Ordered construction steps.
- Step highlighting and camera focus.
- Per-step material and dimension information.
- Progress tracking.
- At least one free Blueprint and one clearly marked sample premium Blueprint in a non-purchasable demo state if commerce is not ready.

Acceptance criteria:

- A player can follow a Blueprint from the first step to completion.
- The system can identify which parts belong to each step.
- The completed structure is an ordinary editable project.

### Phase 3 — Complete Build and catalog

**Goal:** Players can inspect and place ready-made editable structures.

Implement:

- Complete Build package format.
- Product catalog UI with categories and product detail pages.
- Preview mode.
- Place/import a Complete Build into the player's world.
- Save a modified copy without overwriting the original package.
- A small official content catalog with free and premium-labeled entries.

Acceptance criteria:

- A packaged structure loads with all parts, materials, groups, and connections.
- The player can modify it after placement.
- The original library item remains intact.
- Catalog metadata is separate from the construction payload.

### Phase 4 — Commerce foundations and premium tools

**Goal:** Prepare the product for real transactions without coupling commerce to building logic.

Implement:

- Ownership/entitlement model.
- Purchase-state UI and secure server-side verification when payments are introduced.
- Download or delivery of owned content.
- Configurable product prices and currency display.
- Premium tool entitlements.
- Basic purchase history and restore ownership flow where applicable.

Important:

- Never trust client-side ownership or price values.
- Do not put payment secrets in the client.
- Keep the building system functional in development/demo mode without real payment credentials.
- Exact payment provider, taxes, refunds, and regional requirements are separate business decisions.

### Phase 5 — Creator marketplace

**Goal:** Allow approved creators to publish and sell their own designs.

Implement only after content packaging and validation are stable:

- Creator profiles.
- Upload and validation pipeline.
- Listing editor.
- Moderation workflow.
- Purchase and creator attribution.
- Sales dashboard.
- Revenue share configuration.
- Reports, reviews, and dispute handling.

---

## 11. Technical architecture guidance

The current project stack and architecture should remain the source of truth. Do not rewrite the project or add major dependencies without first inspecting the existing code and explaining why a change is needed.

### Suggested domain boundaries

Keep the following responsibilities separated, even if they live in one application initially:

1. **World / Scene** — Environment, camera, lighting, time, weather, and world state.
2. **Construction Core** — Parts, dimensions, transforms, snapping, connections, grouping, and editing.
3. **Materials** — Material definitions, textures, and visual/physical properties.
4. **Project Serialization** — Save/load, schema versions, validation, and migrations.
5. **Blueprint System** — Steps, ordering, highlights, requirements, and progress.
6. **Content Packages** — Complete Builds, decoration packs, and toolkits.
7. **Catalog / Marketplace** — Listing metadata, categories, filters, previews, and ownership display.
8. **Entitlements / Commerce** — Purchase verification and access rights, introduced later.
9. **Creator System** — Uploads, moderation, publishing, and revenue accounting, introduced later.

### Keep content and commerce independent

A Blueprint or Complete Build should be a valid content package even before real payments exist. The catalog should be able to show free, sample, and premium-labeled content using local/mock data during development.

Commerce should grant an entitlement to a content package. It should not change or duplicate the construction data format.

### Asset handling

- Use stable asset keys and IDs.
- Keep large meshes and textures separate from small metadata records where appropriate.
- Validate that every referenced asset exists before loading a package.
- Consider lazy loading for catalog previews and larger content packs.
- Provide useful fallback behavior when a preview asset is unavailable.

### Reliability and performance

- Keep editing responsive when a structure contains many parts.
- Avoid rebuilding every mesh unnecessarily after a small edit.
- Use batching/instancing or other optimizations only when justified by profiling.
- Ensure selection and snapping remain accurate after optimizations.
- Test serialization with structures containing many parts and connections.
- Handle corrupted or outdated project files gracefully.

---

## 12. Blueprint and Complete Build package concepts

These two product types should share the same underlying construction project format but add different metadata.

### Blueprint package

Conceptual fields:

```ts
type BlueprintPackage = {
  packageType: "blueprint";
  packageVersion: number;
  project: BuildProject;
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    partIds: string[];
    materialRequirements?: Array<{
      materialId: string;
      quantity: number;
    }>;
  }>;
  difficulty?: "beginner" | "intermediate" | "advanced";
  estimatedMinutes?: number;
};
```

### Complete Build package

Conceptual fields:

```ts
type CompleteBuildPackage = {
  packageType: "complete-build";
  packageVersion: number;
  project: BuildProject;
  footprint?: Vec3;
  includedAssetKeys?: string[];
  editableFeatures?: string[];
};
```

These are conceptual examples. Adapt them to the actual implementation. Avoid maintaining separate, incompatible structure formats for Blueprints and Complete Builds.

---

## 13. Safety, moderation, and customer trust

Even if community publishing is a later milestone, plan for it early.

- Only allow content packages to reference approved game assets or properly licensed creator assets.
- Validate file size, object count, dimensions, and asset references on import.
- Prevent packages from executing arbitrary code.
- Add a reporting and moderation process before public creator uploads.
- Clearly state what a buyer receives and what they are allowed to do with it.
- Define whether purchased content is licensed for use only inside WOODSCAPE and whether the buyer may publish modified versions.
- Prevent unauthorized redistribution of paid packages where practical, without promising perfect copy protection.
- Keep a record of listing versions and content changes.

---

## 14. Product metrics to observe

Do not optimize only for purchases. The creative loop must remain healthy.

Useful early metrics:

- Time from entering the world to placing the first part.
- Percentage of new players who finish a small starter build.
- Number of parts placed per building session.
- Project save and reload success rate.
- Percentage of players who inspect a Blueprint.
- Blueprint start-to-completion rate.
- Complete Build preview-to-acquisition conversion, once purchases exist.
- Percentage of acquired structures that players customize.
- Marketplace discovery and repeat-use rate.
- Creator listing approval rate and content quality, once creator publishing exists.

Use metrics to identify friction. Do not add pressure mechanics that undermine the relaxed creative identity.

---

## 15. Decisions intentionally left open

Do not silently invent these decisions during implementation. Use sensible development placeholders and flag them for product approval:

- Final engine/rendering architecture if the current project has not settled it.
- Exact platform targets and minimum hardware.
- Real-money payment provider and supported regions.
- Whether purchases use direct money, platform currency, or both.
- Final pricing and product tiers.
- Creator revenue share and payout rules.
- Whether player-created content is available to everyone or only approved creators.
- Multiplayer or shared-world functionality.
- Final measurement units and localization.
- How much structural physics realism the game should simulate.

---

## 16. Instructions for the development agent

When using this document to work on the codebase:

1. **Inspect before changing.** Review the current project structure, stack, existing scene, controls, and data model before implementing anything.
2. **Preserve working features.** Do not replace or remove existing functionality merely to match this document. Identify conflicts and propose the smallest safe change.
3. **Prioritize the foundation.** Editable construction data and reliable save/load are more important than a polished store UI or payment integration.
4. **Build in vertical slices.** Complete one usable workflow at a time, such as create part → place part → edit part → save → reload.
5. **Avoid premature commerce.** Use mock catalog entries and local entitlement states until content formats and user flows are stable.
6. **Keep free creation complete.** Do not gate core construction actions behind premium status.
7. **Test real interactions.** Do not consider a feature complete because its UI renders. Verify that controls change the world and data correctly.
8. **Keep data versioned.** Any change to saved project or content package formats must include a versioning or migration strategy.
9. **Document assumptions.** Flag decisions that are not specified here instead of silently locking them in.
10. **Report implementation status.** At the end of each development task, summarize files changed, behavior implemented, tests run, known limitations, and the next highest-priority task.

### Recommended first development task

Start by auditing the current WOODSCAPE codebase and producing a concise implementation assessment:

- Existing stack and project structure.
- Current world/camera/building features.
- Current part/material representation.
- Current save/load implementation, if any.
- Gaps against Phase 1.
- The smallest implementation sequence that establishes editable construction data and a reliable save/load loop.

Do not start by building a payment system or a large marketplace. Establish the construction foundation first.

---

## 17. Final product principle

WOODSCAPE should feel like a beautiful creative workshop in an open natural world, with a marketplace that expands what players can make without taking away their freedom to make things themselves.

The strongest differentiator is not simply that players can buy a finished house. It is that **every purchased design can become the starting point for a personal creation** — a structure they can inspect, learn from, modify, extend, and eventually share with others.
