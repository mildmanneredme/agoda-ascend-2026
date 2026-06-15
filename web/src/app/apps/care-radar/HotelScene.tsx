"use client";

/**
 * The 3D hotel board — five stacked architectural floorplans (per
 * docs/care-radar-floorplan.md): 14 perimeter rooms (7 north / 7 south), a
 * corridor loop, a central void, and lift / service cores. Occupied rooms glow
 * and pulse by RAG status; the room boxes themselves are the tap targets.
 *
 * Gestures (custom, not OrbitControls):
 *  · 1-finger horizontal drag → rotate (azimuth)
 *  · 1-finger vertical drag   → climb the floors (camera target rises/falls)
 *  · 2-finger drag up/down     → zoom in / out (camera distance)
 *  · tap a room                → select that guest (manual raycast on room boxes)
 *
 * Perf: frameloop="demand", capped dpr, no shadows/postprocessing.
 */

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CARE_COLOR, FLOORS, type InHouseGuest } from "@/lib/careRadar";

// ── opening sequence ─────────────────────────────────────────────────
const INTRO_MS = 2000; // total reveal length
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
/** Per-floor reveal window: lower floors ignite first, top last. */
function floorReveal(progress: number, floor: number): number {
  // floors 1..FLOORS → stagger start across the first ~70% of the intro
  const start = ((floor - 1) / FLOORS) * 0.7;
  const span = 0.45;
  return THREE.MathUtils.clamp((progress - start) / span, 0, 1);
}

// ── floorplan geometry (metres, from the design doc) ─────────────────
const PLATE_W = 44;
const PLATE_D = 32;
const VOID_W = 22;
const VOID_D = 12;
const ROOM_W = 5.6;
const ROOM_D = 8;
const ROOM_H = 3.2; // extruded room height
const PLATE_T = 0.5;
const FLOOR_GAP = 14; // metres between plates (tall stack frames well in portrait)
const MAX_Y = (FLOORS - 1) * FLOOR_GAP;

const NORTH_X = [-18, -12, -6, 0, 6, 12, 18];
const SOUTH_X = [18, 12, 6, 0, -6, -12, -18]; // doc R08…R14 order
const ROOM_Z_N = -12;
const ROOM_Z_S = 12;

/** Room centre [x,z] for a floorplan cell index (0–6 north, 7–13 south). */
function roomXZ(cell: number): [number, number] {
  return cell < 7 ? [NORTH_X[cell], ROOM_Z_N] : [SOUTH_X[cell - 7], ROOM_Z_S];
}
const ALL_CELLS = Array.from({ length: 14 }, (_, i) => i);

// world-space scale so the building frames nicely in the viewport
const S = 0.16;
const WORLD_MAX_Y = MAX_Y * S;

// ── colours / materials ──────────────────────────────────────────────
const C_PLATE = "#10183c";
const C_ROOM_EMPTY = "#222c5e";
const C_CORRIDOR = "#0c1230";
const C_VOID = "#05070f";
const C_CORE = "#3b4675";

type Controls = { az: number; focusY: number; dist: number };

/** Shared intro/animation state, mutated per-frame (no React re-renders). */
type Intro = {
  progress: number; // 0 → 1 over INTRO_MS (1 = done, immediately 1 if reduced-motion)
  startMs: number | null; // performance.now() at first frame; null until kicked off
  reduced: boolean;
  flashAt: number; // performance.now() of the last selection (drives glow spike); 0 = none
};

// ── camera rig ───────────────────────────────────────────────────────
const PHI = 0.52; // ~30° elevation (3/4 architectural)

function CameraRig({
  controls,
  intro,
  camRef,
  invalidateRef,
}: {
  controls: React.RefObject<Controls>;
  intro: React.RefObject<Intro>;
  camRef: React.RefObject<THREE.Camera | null>;
  invalidateRef: React.RefObject<(() => void) | null>;
}) {
  const { camera, invalidate } = useThree();
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    camRef.current = camera;
    invalidateRef.current = invalidate;
    invalidate();
  }, [camera, invalidate, camRef, invalidateRef]);

  useFrame(() => {
    const c = controls.current;
    // Intro camera ease: start zoomed-out + tilted-down, settle to the controls' default.
    const p = intro.current.progress;
    const cam = p < 1 ? easeOutCubic(p) : 1;
    const dist = THREE.MathUtils.lerp(c.dist * 1.9, c.dist, cam);
    const phi = THREE.MathUtils.lerp(PHI + 0.34, PHI, cam);
    const focusY = THREE.MathUtils.lerp(c.focusY * 0.35, c.focusY, cam);
    target.current.set(0, focusY, 0);
    const r = dist * Math.cos(phi);
    camera.position.set(Math.sin(c.az) * r, focusY + dist * Math.sin(phi), Math.cos(c.az) * r);
    camera.lookAt(target.current);
  });
  return null;
}

function RenderPump() {
  const invalidate = useThree((s) => s.invalidate);
  const active = useRef(true);
  useEffect(() => {
    const onVis = () => {
      active.current = document.visibilityState === "visible";
      if (active.current) invalidate();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [invalidate]);
  useFrame(() => {
    if (active.current) invalidate();
  });
  return null;
}


// ── one floor plate (plan + rooms) ───────────────────────────────────
function Floor({
  floor,
  occupants,
  selectedId,
  registerRoom,
  registerPlate,
  registerFloorGroup,
}: {
  floor: number;
  occupants: Map<number, InHouseGuest>;
  selectedId: string | null;
  registerRoom: (id: string, obj: THREE.Object3D | null) => void;
  registerPlate: (floor: number, mat: THREE.MeshStandardMaterial | null) => void;
  registerFloorGroup: (floor: number, obj: THREE.Group | null) => void;
}) {
  return (
    <group
      position={[0, (floor - 1) * FLOOR_GAP, 0]}
      ref={(g) => registerFloorGroup(floor, g)}
    >
      {/* floor plate */}
      <mesh position={[0, -PLATE_T / 2, 0]}>
        <boxGeometry args={[PLATE_W, PLATE_T, PLATE_D]} />
        <meshStandardMaterial
          ref={(m) => registerPlate(floor, m)}
          color={C_PLATE}
          emissive="#4beaea"
          emissiveIntensity={0.06}
          transparent
          opacity={0.4}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>

      {/* corridor loop (thin inset ring, drawn as 4 strips) */}
      <Strip x={0} z={-8.2} w={34} d={2.4} />
      <Strip x={0} z={8.2} w={34} d={2.4} />
      <Strip x={-12.2} z={0} w={2.4} d={14} />
      <Strip x={12.2} z={0} w={2.4} d={14} />

      {/* central void — dark recess with a faint upward glow */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[VOID_W, 0.3, VOID_D]} />
        <meshStandardMaterial color={C_VOID} emissive="#102046" emissiveIntensity={0.5} roughness={1} />
      </mesh>

      {/* lift bank + service core */}
      <Core x={-14.5} z={10.5} w={8} d={4} />
      <Core x={2.5} z={10.5} w={10} d={4} />

      {/* rooms */}
      {ALL_CELLS.map((cell) => {
        const [x, z] = roomXZ(cell);
        const guest = occupants.get(cell);
        if (!guest) {
          return (
            <mesh key={cell} position={[x, ROOM_H / 2 / 4, z]}>
              <boxGeometry args={[ROOM_W - 0.6, ROOM_H / 4, ROOM_D - 0.6]} />
              <meshStandardMaterial color={C_ROOM_EMPTY} transparent opacity={0.32} roughness={0.9} />
            </mesh>
          );
        }
        const c = CARE_COLOR[guest.status];
        const sel = guest.id === selectedId;
        return (
          <group key={cell} position={[x, 0, z]}>
            {/* occupied room volume (the tap target) */}
            <mesh
              position={[0, ROOM_H / 2, 0]}
              userData={{ guestId: guest.id }}
              ref={(o) => registerRoom(guest.id, o)}
            >
              <boxGeometry args={[ROOM_W - 0.4, ROOM_H, ROOM_D - 0.4]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={sel ? 1.4 : 0.8} transparent opacity={0.55} roughness={0.35} toneMapped={false} />
            </mesh>
            {/* glowing crown so occupants read from any angle */}
            <mesh position={[0, ROOM_H + 0.5, 0]}>
              <sphereGeometry args={[0.9, 18, 18]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Strip({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, 0.04, z]}>
      <boxGeometry args={[w, 0.08, d]} />
      <meshStandardMaterial color={C_CORRIDOR} transparent opacity={0.5} roughness={1} />
    </mesh>
  );
}

function Core({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, 1.1, z]}>
      <boxGeometry args={[w, 2.2, d]} />
      <meshStandardMaterial color={C_CORE} emissive={C_CORE} emissiveIntensity={0.12} roughness={0.7} metalness={0.3} />
    </mesh>
  );
}

// ── the building: stacks the floors + drives the per-frame pulse ─────
function Building({
  guests,
  selectedId,
  registerRoom,
  controls,
  intro,
}: {
  guests: InHouseGuest[];
  selectedId: string | null;
  registerRoom: (id: string, obj: THREE.Object3D | null) => void;
  controls: React.RefObject<Controls>;
  intro: React.RefObject<Intro>;
}) {
  const rooms = useRef<Map<string, THREE.Mesh>>(new Map());
  const plates = useRef<Map<number, THREE.MeshStandardMaterial>>(new Map());
  const floorGroups = useRef<Map<number, THREE.Group>>(new Map());

  // group occupants per floor → cell
  const byFloor = new Map<number, Map<number, InHouseGuest>>();
  for (let f = 1; f <= FLOORS; f++) byFloor.set(f, new Map());
  for (const g of guests) byFloor.get(g.floor)?.set(g.cell, g);
  // which floor each guest sits on (for room-ignition timing during the intro)
  const floorOf = new Map<string, number>();
  for (const g of guests) floorOf.set(g.id, g.floor);

  function regRoom(id: string, obj: THREE.Object3D | null) {
    if (obj) rooms.current.set(id, obj as THREE.Mesh);
    else rooms.current.delete(id);
    registerRoom(id, obj);
  }
  function regPlate(floor: number, mat: THREE.MeshStandardMaterial | null) {
    if (mat) plates.current.set(floor, mat);
  }
  function regFloorGroup(floor: number, obj: THREE.Group | null) {
    if (obj) floorGroups.current.set(floor, obj);
    else floorGroups.current.delete(floor);
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const it = intro.current;
    const p = it.progress;
    const introing = p < 1;

    // ── cinematic reveal: floors fade + scale in, bottom-to-top ──
    for (const [floor, grp] of floorGroups.current) {
      const rv = introing ? floorReveal(p, floor) : 1;
      const e = easeOutCubic(rv);
      // settle from slightly-below + scaled-down to the rest pose
      grp.scale.setScalar(0.86 + 0.14 * e);
      grp.position.y = (floor - 1) * FLOOR_GAP - (1 - e) * 5;
      grp.visible = rv > 0.001 || !introing;
    }

    // ── room pulse + intro ignition + selection glow-flash ──
    for (const g of guests) {
      const mesh = rooms.current.get(g.id);
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // rooms ignite AFTER their floor has mostly arrived (second half of that floor's reveal)
      const fr = introing ? floorReveal(p, floorOf.get(g.id) ?? 1) : 1;
      const ignite = THREE.MathUtils.clamp((fr - 0.5) / 0.5, 0, 1);

      // amplified pulse — high-intensity (esp. red >80) rooms visibly throb
      const norm = g.intensity / 100;
      const hot = g.status === "red" && g.intensity > 80;
      const amp = 0.55 + norm * 1.7 + (hot ? 0.6 : 0); // bigger emissive swing
      const speed = 1.3 + norm * 2.2 + (hot ? 0.6 : 0);
      const pulse = 0.5 + 0.5 * Math.sin(t * speed + g.cell);
      const sel = g.id === selectedId;

      // selection glow-flash: brief spike on tap, decays over ~0.9s
      let flash = 0;
      if (sel && it.flashAt > 0) {
        const dt = (performance.now() - it.flashAt) / 900;
        if (dt < 1) flash = (1 - dt) * 2.4;
      }

      const baseE = (sel ? 1.4 : 0.7) + amp * pulse + flash;
      const baseO = (sel ? 0.72 : 0.5) + (0.22 + norm * 0.12) * pulse;
      mat.emissiveIntensity = baseE * ignite;
      mat.opacity = baseO * ignite;
      mesh.visible = ignite > 0.001;
    }

    const focusY = controls.current.focusY / S; // back to metres
    for (const [floor, mat] of plates.current) {
      const rv = introing ? floorReveal(p, floor) : 1;
      const slabY = (floor - 1) * FLOOR_GAP;
      const near = 1 - Math.min(1, Math.abs(slabY - focusY) / (FLOOR_GAP * 1.4));
      mat.opacity = (0.16 + near * 0.34) * rv;
      mat.emissiveIntensity = (0.04 + near * 0.18) * rv;
    }
  });

  return (
    <group scale={S}>
      {Array.from({ length: FLOORS }, (_, i) => (
        <Floor
          key={i + 1}
          floor={i + 1}
          occupants={byFloor.get(i + 1)!}
          selectedId={selectedId}
          registerRoom={regRoom}
          registerPlate={regPlate}
          registerFloorGroup={regFloorGroup}
        />
      ))}
    </group>
  );
}

// ── WebGL capability check (used by the page to decide the fallback) ──
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// ── exported scene + gesture surface ─────────────────────────────────
const TAP_SLOP = 14; // px of movement still counted as a tap (touch jitter)
const TAP_MS = 700;

export default function HotelScene({
  guests,
  selectedId,
  onSelect,
}: {
  guests: InHouseGuest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const controls = useRef<Controls>({ az: 0.62, focusY: WORLD_MAX_Y / 2, dist: 18 });
  const reduced = prefersReducedMotion();
  const intro = useRef<Intro>({ progress: reduced ? 1 : 0, startMs: null, reduced, flashAt: 0 });
  const camRef = useRef<THREE.Camera | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const roomsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const wrapRef = useRef<HTMLDivElement | null>(null);

  function registerRoom(id: string, obj: THREE.Object3D | null) {
    if (obj) roomsRef.current.set(id, obj);
    else roomsRef.current.delete(id);
  }
  function bump() {
    invalidateRef.current?.();
  }

  // Opening-sequence + selection-flash driver. Runs OUTSIDE the render loop (a
  // bounded rAF) so intro state advances without tripping the React-compiler
  // immutability rule on useFrame, and only while there's something to animate —
  // once the intro is done and no flash is decaying it stops (battery-safe). The
  // scene's `useFrame` readers consume `intro.current` read-only. `kickDrive` is
  // re-armed on tap so a glow-flash restarts a fresh bounded burst.
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const kickDrive = useRef<() => void>(() => {});
  useEffect(() => {
    const it = intro.current;
    if (it.reduced) {
      it.progress = 1;
      invalidateRef.current?.();
      return;
    }
    const tick = () => {
      const now = performance.now();
      if (it.startMs === null) it.startMs = now;
      it.progress = Math.min(1, (now - it.startMs) / INTRO_MS);
      const flashing = it.flashAt > 0 && now - it.flashAt < 900;
      if (it.flashAt > 0 && !flashing) it.flashAt = 0;
      invalidateRef.current?.();
      if (it.progress < 1 || flashing) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };
    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    };
    kickDrive.current = start;
    start();
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
    // intro is a stable ref; run once on mount.
  }, []);

  // pointer / gesture bookkeeping (refs only — no re-renders during a drag)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const single = useRef<{ x: number; y: number; t: number; az0: number; focusY0: number; axis: "rot" | "floor" | null; moved: boolean } | null>(null);
  const pinch = useRef<{ avgY: number; dist0: number } | null>(null);

  function startSingle(p: { x: number; y: number }) {
    single.current = { x: p.x, y: p.y, t: performance.now(), az0: controls.current.az, focusY0: controls.current.focusY, axis: null, moved: false };
  }

  function tapRaycast(clientX: number, clientY: number) {
    const cam = camRef.current;
    const wrap = wrapRef.current;
    if (!cam || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(Array.from(roomsRef.current.values()), true);
    const id = hits[0]?.object.userData?.guestId as string | undefined;
    if (id) {
      // glow-flash spike on the selected room (skipped under reduced-motion)
      if (!intro.current.reduced) {
        intro.current.flashAt = performance.now();
        kickDrive.current(); // re-arm the bounded rAF so the flash actually decays
      }
      bump();
      onSelect(id);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      startSingle({ x: e.clientX, y: e.clientY });
      pinch.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { avgY: (a.y + b.y) / 2, dist0: controls.current.dist };
      single.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const avgY = (a.y + b.y) / 2;
      controls.current.dist = THREE.MathUtils.clamp(pinch.current.dist0 + (avgY - pinch.current.avgY) * 0.04, 7, 22);
      bump();
      return;
    }

    const s = single.current;
    if (!s) return;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    if (!s.axis && Math.hypot(dx, dy) > TAP_SLOP) {
      s.axis = Math.abs(dx) > Math.abs(dy) ? "rot" : "floor";
      s.moved = true;
    }
    if (s.axis === "rot") {
      controls.current.az = s.az0 - dx * 0.006;
      bump();
    } else if (s.axis === "floor") {
      controls.current.focusY = THREE.MathUtils.clamp(s.focusY0 - dy * 0.012, -0.4, WORLD_MAX_Y + 0.4);
      bump();
    }
  }

  function endPointer(e: React.PointerEvent) {
    const wasSingle = pointers.current.size === 1 && single.current;
    const tap = wasSingle && !single.current!.moved && performance.now() - single.current!.t < TAP_MS;
    if (tap) tapRaycast(e.clientX, e.clientY);

    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [only] = Array.from(pointers.current.values());
      startSingle(only);
      pinch.current = null;
    } else if (pointers.current.size === 0) {
      single.current = null;
      pinch.current = null;
    }
  }

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      className="absolute inset-0"
      style={{ touchAction: "none", cursor: "grab" }}
    >
      <Canvas frameloop="demand" dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 38, near: 0.1, far: 100, position: [6, 5, 6] }}>
        <color attach="background" args={["#0a0e24"]} />
        <fog attach="fog" args={["#0a0e24", 15, 36]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 10, 4]} intensity={0.85} />
        <directionalLight position={[-7, 3, -4]} intensity={0.35} color="#4beaea" />
        <CameraRig controls={controls} intro={intro} camRef={camRef} invalidateRef={invalidateRef} />
        <RenderPump />
        <Building guests={guests} selectedId={selectedId} registerRoom={registerRoom} controls={controls} intro={intro} />
      </Canvas>
    </div>
  );
}
