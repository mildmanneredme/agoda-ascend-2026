Details of the Floorplan design to use for Care Radar

Here’s a clean **single-floor hotel plan** with **14 rooms**, a **large central void**, and a **lift bank**, designed to be easy to model in **React Three Fiber**.

## Concept

Use a rectangular floor plate with rooms around the perimeter, a circulation corridor loop inside, and a large open void in the middle.

**Recommended floor plate:** `44m x 32m`
**Coordinate system for R3F:**
`x = width`, `z = depth`, `y = height`

Floor origin is at the center: `(0, 0, 0)`.

---

## Floor Plan Layout

```text
┌────────────────────────────────────────────┐
│ R01  R02  R03  R04      R05  R06  R07      │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │                                        │ │
│ │              CORRIDOR LOOP             │ │
│ │                                        │ │
│ │       ┌────────────────────────┐       │ │
│ │       │                        │       │ │
│ │       │      CENTRAL VOID      │       │ │
│ │       │                        │       │ │
│ │       └────────────────────────┘       │ │
│ │                                        │ │
│ │  LIFT BANK     SERVICE / STAIRS        │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ R14  R13  R12  R11      R10  R09  R08      │
└────────────────────────────────────────────┘
```

This gives you:

**14 rooms total**
**7 rooms on the north side**
**7 rooms on the south side**
**Large central void**
**Loop corridor around the void**
**Lift bank and service core near the lower-left internal zone**

---

## Suggested Dimensions

| Element              |        Size |
| -------------------- | ----------: |
| Total floor plate    | `44m x 32m` |
| Standard room        | `5.6m x 8m` |
| Corridor width       |      `2.4m` |
| Central void         | `22m x 12m` |
| Lift bank            |   `8m x 4m` |
| Service / stair core |  `10m x 4m` |

Rooms sit on the outer edge. The corridor is inside the rooms, wrapping around the void.

---

## R3F-Friendly Zone Coordinates

You can model each zone as a rectangle on the `x-z` plane.

```js
const floorPlan = {
  floorPlate: {
    id: "floor-plate",
    type: "floor",
    position: [0, 0, 0],
    size: [44, 32],
  },

  centralVoid: {
    id: "central-void",
    type: "void",
    position: [0, 0.02, 0],
    size: [22, 12],
  },

  corridorZones: [
    {
      id: "corridor-north",
      type: "corridor",
      position: [0, 0.03, -8.2],
      size: [34, 2.4],
    },
    {
      id: "corridor-south",
      type: "corridor",
      position: [0, 0.03, 8.2],
      size: [34, 2.4],
    },
    {
      id: "corridor-west",
      type: "corridor",
      position: [-12.2, 0.03, 0],
      size: [2.4, 14],
    },
    {
      id: "corridor-east",
      type: "corridor",
      position: [12.2, 0.03, 0],
      size: [2.4, 14],
    },
  ],

  liftBank: {
    id: "lift-bank",
    type: "core",
    position: [-14.5, 0.05, 10.5],
    size: [8, 4],
  },

  serviceCore: {
    id: "service-core",
    type: "core",
    position: [2.5, 0.05, 10.5],
    size: [10, 4],
  },
};
```

---

## Room Coordinates

Each room is a clickable rectangle/box. These are laid out along the north and south perimeter.

```js
const rooms = [
  // North side
  { id: "R01", type: "room", position: [-18, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R02", type: "room", position: [-12, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R03", type: "room", position: [-6, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R04", type: "room", position: [0, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R05", type: "room", position: [6, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R06", type: "room", position: [12, 0.05, -12], size: [5.6, 8], doorSide: "south" },
  { id: "R07", type: "room", position: [18, 0.05, -12], size: [5.6, 8], doorSide: "south" },

  // South side
  { id: "R08", type: "room", position: [18, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R09", type: "room", position: [12, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R10", type: "room", position: [6, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R11", type: "room", position: [0, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R12", type: "room", position: [-6, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R13", type: "room", position: [-12, 0.05, 12], size: [5.6, 8], doorSide: "north" },
  { id: "R14", type: "room", position: [-18, 0.05, 12], size: [5.6, 8], doorSide: "north" },
];
```

---

## Recommended Interaction Model

For R3F, I’d separate the plan into these object types:

```js
const selectableTypes = {
  room: {
    hoverable: true,
    clickable: true,
    action: "openRoomDetail",
  },
  corridor: {
    hoverable: false,
    clickable: false,
  },
  void: {
    hoverable: true,
    clickable: true,
    action: "focusVoid",
  },
  core: {
    hoverable: true,
    clickable: true,
    action: "openCoreInfo",
  },
};
```

The **central void** can be rendered as an actual cutout, glass atrium, garden courtyard, or simply an empty shaft through the building. For a 3D building interaction, I’d make it visually prominent with a dark recessed material, railing around the edge, and perhaps subtle light spilling upward from below.

---

## Simple Visual Logic

Use different materials by type:

```js
const materials = {
  floor: "#1f1f1f",
  room: "#d8cfc0",
  corridor: "#2c2c2c",
  void: "#050505",
  core: "#6f7d8c",
  wall: "#ffffff",
};
```

For your use case, this layout is good because it is:

Clean enough to understand from top-down view
Modular enough to duplicate across floors
Easy to convert into R3F boxes/planes
Simple to make interactive room-by-room
Visually anchored by the large central void
Architecture-like without being overly complex
