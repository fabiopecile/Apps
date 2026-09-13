/**
 * The table, in three dimensions.
 *
 * Everything the game *is* stays where it was: the layout puts cups on a ground
 * plane in table points, the physics flies a parabola over it, and the gesture
 * writes to shared values. This file only decides what that looks like — it
 * holds no rules, so a change here can make the game uglier but never unfair.
 *
 * Table points become world units at 1:100, and the axes are the ones the rest
 * of the game already uses: `x` across the table, `y` away from you down it,
 * height straight up. Three's own axes are right-handed with +Z towards the
 * viewer, so `y` maps to Z and height maps to Y.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import {
  CUP_WIDTH,
  NET_Y,
  TABLE_LENGTH,
  type CupSpec,
} from '@/lib/arcadeLayout';
import { beerHeight, beerRadius, cupProfile } from '@/lib/cupGeometry';
import { DEFAULT_CUP_SKIN, cupTexture, type CupDesign } from '@/lib/cupSkins';
import { BALL_SIZE, type BallFlight } from './useBallFlight';

/** Table points to world units. */
const S = 0.01;

/** How far the table sticks out past the racks at each end. */
const TABLE_MARGIN = 90;

export interface Rack {
  cups: CupSpec[];
  aliveFlags: boolean[];
  colour: string;
  /** A country's flag wrapped round the cups, when one has been bought. */
  design?: CupDesign;
  /**
   * One cup painted differently and lit from inside — the Lucky Shot's golden
   * cup. It has to be unmistakable from the throwing end, where every cup is
   * the size of a fingernail, so it glows rather than just being a shade off.
   */
  highlight?: { index: number; colour: string } | null;
}

interface Table3DProps {
  width: number;
  /** Usually two, but a single rack is a table with one end set up. */
  racks: Rack[];
  /** Your ball first, theirs second where there is one. */
  balls: BallFlight[];
  ballColours: string[];
  /** 'far' looks up the table at their rack, 'near' looks down at yours. */
  watching: 'far' | 'near';
}

/** Table point to world unit, on each axis. */
const wx = (x: number, width: number) => (x - width / 2) * S;
const wz = (y: number) => (y - TABLE_LENGTH / 2) * S;

export function Table3D({ width, racks, balls, ballColours, watching }: Table3DProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas
        // Mobile hygiene, all of it about how many pixels get shaded rather
        // than how many triangles there are. A phone screen is three device
        // pixels to the point; this scene is chunky and stylised and gains
        // nothing from being drawn at that. Measured on a 3x screen: capping at
        // two gives 17 frames a second, capping at one and a half gives 23, and
        // side by side the only difference is slightly softer edges on the far
        // rack. A ball that moves smoothly is worth more than that. The text
        // and buttons are not drawn here and stay sharp either way.
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 34, near: 0.1, far: 60, position: [0, 5.2, 8.4] }}
        style={{ backgroundColor: 'transparent' }}
      >
        <Rig watching={watching} />
        <Lights />
        <Surface width={width} />
        {racks.map((rack, i) => (
          <CupRack key={`rack-${i}`} rack={rack} width={width} />
        ))}
        {balls.map((ball, i) => (
          <Ball key={`ball-${i}`} flight={ball} width={width} colour={ballColours[i]} />
        ))}
      </Canvas>
    </View>
  );
}

/**
 * The camera swings between the two ends rather than cutting, because a cut
 * costs you the sense of one continuous table.
 */
function Rig({ watching }: { watching: 'far' | 'near' }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, wz(NET_Y)));
  const wanted = useMemo(
    () =>
      watching === 'far'
        ? {
            // Behind your own end and high up — about 32 degrees above the
            // felt rather than the 12 it started at. Low down, the far rack is
            // a thin band of rims you cannot read; from up here you look into
            // the cups. Not straight down, though: without some of the side of
            // a cup showing, the ball's height stops being readable and the
            // arc goes with it.
            pos: new THREE.Vector3(0, 5.2, wz(TABLE_LENGTH) + 4.4),
            at: new THREE.Vector3(0, 0.1, wz(400)),
          }
        : {
            // Watching a ball come *at* you, which needs the far end in frame:
            // the other side's ball starts behind their rack and climbs, and
            // from closer in the whole first half of the throw happened above
            // the top of the screen. Reported from an online game as "I cannot
            // see where the opponent is throwing", and it was just as true of
            // the computer's throws — a ball that appears halfway down the
            // table reads as teleporting rather than as a throw.
            pos: new THREE.Vector3(0, 6.6, wz(TABLE_LENGTH) + 6.6),
            at: new THREE.Vector3(0, 0.1, wz(430)),
          },
    [watching]
  );

  useFrame((_, delta) => {
    // Framerate-independent easing: the same fraction of the way there per
    // second, whatever the frame rate happens to be.
    const k = 1 - Math.pow(0.002, delta);
    camera.position.lerp(wanted.pos, k);
    look.current.lerp(wanted.at, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Lights() {
  return (
    <>
      {/* Three lights, and no more. Each one is work done for every lit pixel
          on screen, and the two point lights that used to sit over the racks
          bought less than the rim light does. */}
      <ambientLight intensity={0.42} color="#9fe092" />
      <directionalLight position={[-2.4, 4.2, 2.6]} intensity={2.6} color="#e6ffd9" />
      {/* A cold rim from behind, which is what keeps the cups off the felt. */}
      <directionalLight position={[2.2, 1.8, -3.4]} intensity={1.1} color="#5effa0" />
    </>
  );
}

/** The slab, with the thickness you would see from this angle. */
function Surface({ width }: { width: number }) {
  const w = width * S;
  const l = (TABLE_LENGTH + TABLE_MARGIN * 2) * S;
  return (
    <group>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[w, 0.06, l]} />
        {/* Lambert, not standard: the felt has no sheen to lose and this is
            the largest thing on screen by a distance — every pixel of it was
            paying for a physically based shading model that only ever came out
            matte. Worth ten frames a second on its own. The colour is lifted
            from #16220f to go with it: the model it dropped was quietly adding
            light across the whole slab, and without that the felt came out
            almost black. */}
        <meshLambertMaterial color="#243a18" />
      </mesh>
      {/* The lit edge along the rails, the one line that says "table". */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * w) / 2, 0.002, 0]}>
          <boxGeometry args={[0.012, 0.012, l]} />
          <meshLambertMaterial color="#8dff6a" emissive="#8dff6a" emissiveIntensity={1.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.002, wz(NET_Y)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.96, 0.014]} />
        <meshLambertMaterial color="#8dff6a" emissive="#8dff6a" emissiveIntensity={0.9} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Lays the texture on the cup the way a label goes on: around and up.
 *
 * A lathe's own UVs run along the whole profile, which here is the outside
 * *and* the inside — so a flag mapped with them would be squeezed into the
 * outer half and mirrored down the inside. These are rebuilt from the geometry
 * instead: `u` from the angle around the axis, `v` from the height. The inside
 * gets the same flag, which is right: you see it through the beer.
 */
function wrapUvs(geometry: THREE.LatheGeometry): void {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  let highest = 0;
  for (let i = 0; i < position.count; i++) highest = Math.max(highest, position.getY(i));
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    uv.setXY(i, (angle + Math.PI) / (Math.PI * 2), highest > 0 ? position.getY(i) / highest : 0);
  }
  uv.needsUpdate = true;
}

/**
 * A whole rack, as few objects as it can be drawn with.
 *
 * It used to be one React component per cup, each with its own mesh, its own
 * beer surface and its own shadow — sixty objects on the table, sixty draw
 * calls, twenty `useFrame` callbacks. Measured, halving the number of cups
 * bought half as much time again: the cost was per cup, not in the table or the
 * lights. This is twelve draw calls for the whole scene.
 *
 * Now each rack is three instanced meshes and one shared material. The cups
 * differ only in where they stand and how far they have toppled, which is
 * exactly what an instance matrix is for. The one exception is the Lucky Shot's
 * golden cup: it pulses, and a pulse is a material property rather than an
 * instance one, so that single cup is still drawn on its own.
 */
function CupRack({ rack, width }: { rack: Rack; width: number }) {
  const geometry = useMemo(() => {
    const points = cupProfile().map((p) => new THREE.Vector2(p.r * CUP_WIDTH * S, p.y * CUP_WIDTH * S));
    // Twenty-four segments rather than forty-eight. A cup is a fingernail at
    // the far end of the table and the difference is invisible; the triangles
    // are not.
    const lathe = new THREE.LatheGeometry(points, 24);
    lathe.computeVertexNormals();
    wrapUvs(lathe);
    return lathe;
  }, []);
  const beer = useMemo(
    () => ({ r: beerRadius() * CUP_WIDTH * S, y: beerHeight() * CUP_WIDTH * S }),
    []
  );
  /**
   * The flag, as a texture. Built from bytes rather than loaded from a file:
   * there is no image to download, nothing to keep in step with the material,
   * and it works the same in the browser and in a native build.
   */
  const texture = useMemo(() => {
    if (!rack.design || rack.design.id === DEFAULT_CUP_SKIN) return null;
    const size = 64;
    const map = new THREE.DataTexture(cupTexture(rack.design, size), size, size, THREE.RGBAFormat);
    map.needsUpdate = true;
    // Crisp bands rather than a gradient: a flag has edges.
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearFilter;
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [rack.design]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const ordinary = rack.cups.filter((cup) => rack.highlight?.index !== cup.index);
  const golden = rack.cups.find((cup) => rack.highlight?.index === cup.index) ?? null;

  return (
    <group>
      <InstancedCups
        cups={ordinary}
        rack={rack}
        width={width}
        geometry={geometry}
        beer={beer}
        texture={texture}
      />
      {golden ? (
        <Cup
          geometry={geometry}
          beer={beer}
          colour={rack.highlight!.colour}
          texture={null}
          glow
          alive={rack.aliveFlags[golden.index]}
          x={wx(golden.x, width)}
          z={wz(golden.y)}
        />
      ) : null}
    </group>
  );
}

/** Scratch objects, so the frame loop allocates nothing. */
const SCRATCH = {
  matrix: new THREE.Matrix4(),
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  scale: new THREE.Vector3(),
  euler: new THREE.Euler(),
};

function InstancedCups({
  cups,
  rack,
  width,
  geometry,
  beer,
  texture,
}: {
  cups: CupSpec[];
  rack: Rack;
  width: number;
  geometry: THREE.LatheGeometry;
  beer: { r: number; y: number };
  texture: THREE.Texture | null;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const surfaces = useRef<THREE.InstancedMesh>(null);
  const shadows = useRef<THREE.InstancedMesh>(null);
  /** 0 standing, 1 fully knocked over and gone, one per cup. */
  const fallen = useRef<number[]>([]);
  /** Which way each topples, so a rack does not all fall alike. */
  const tilt = useMemo(() => cups.map(() => (Math.random() < 0.5 ? -1 : 1)), [cups.length]);

  if (fallen.current.length !== cups.length) {
    fallen.current = cups.map((cup) => (rack.aliveFlags[cup.index] ? 0 : 1));
  }

  useFrame((_, delta) => {
    const body = bodies.current;
    if (!body) return;
    const step = delta * 3.4;

    cups.forEach((cup, i) => {
      const target = rack.aliveFlags[cup.index] ? 0 : 1;
      const now = fallen.current[i] ?? 0;
      const f = now + Math.max(-step, Math.min(step, target - now));
      fallen.current[i] = f;

      const x = wx(cup.x, width);
      const z = wz(cup.y);
      // A cup that has finished falling is scaled to nothing rather than made
      // invisible: an instance has no `visible` of its own.
      const shrink = f > 0.98 ? 0 : 1 - f * 0.25;
      SCRATCH.euler.set(0, 0, tilt[i] * f * 1.35);
      SCRATCH.quaternion.setFromEuler(SCRATCH.euler);
      SCRATCH.position.set(x, -f * 0.06, z);
      SCRATCH.scale.setScalar(shrink);
      SCRATCH.matrix.compose(SCRATCH.position, SCRATCH.quaternion, SCRATCH.scale);
      body.setMatrixAt(i, SCRATCH.matrix);

      // The beer rides with the cup; the shadow stays flat on the felt and
      // just fades away by shrinking.
      SCRATCH.position.set(x, beer.y * shrink - f * 0.06, z);
      SCRATCH.matrix.compose(SCRATCH.position, SCRATCH.quaternion, SCRATCH.scale);
      surfaces.current?.setMatrixAt(i, SCRATCH.matrix);

      SCRATCH.euler.set(-Math.PI / 2, 0, 0);
      SCRATCH.quaternion.setFromEuler(SCRATCH.euler);
      SCRATCH.position.set(x, 0.004, z);
      SCRATCH.scale.setScalar(shrink);
      SCRATCH.matrix.compose(SCRATCH.position, SCRATCH.quaternion, SCRATCH.scale);
      shadows.current?.setMatrixAt(i, SCRATCH.matrix);
    });

    body.instanceMatrix.needsUpdate = true;
    if (surfaces.current) surfaces.current.instanceMatrix.needsUpdate = true;
    if (shadows.current) shadows.current.instanceMatrix.needsUpdate = true;
  });

  if (cups.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={bodies} args={[geometry, undefined, cups.length]} castShadow={false}>
        {/* Kept physically based, unlike the felt below it: a cheaper shading
            model was measured here too and bought nothing, because twenty cups
            cover a fraction of the screen the slab does. The sheen down their
            sides is most of what makes them read as plastic. */}
        <meshStandardMaterial
          map={texture ?? null}
          // White under a texture, or the flag comes out tinted red.
          color={texture ? '#FFFFFF' : rack.colour}
          emissive={texture ? '#FFFFFF' : rack.colour}
          emissiveIntensity={texture ? 0.06 : 0.12}
          roughness={0.35}
          metalness={0.05}
          // Single-sided: the profile is a closed loop, up the outside and
          // back down the inside, so there is no back face worth shading —
          // and shading every cup pixel twice cost a quarter of the frame.
          side={THREE.FrontSide}
        />
      </instancedMesh>
      <instancedMesh ref={surfaces} args={[undefined, undefined, cups.length]}>
        <circleGeometry args={[beer.r, 16]} />
        {/* Twenty flat discs, each a good part of a cup's area on screen, and
            not one of them catches a highlight. */}
        <meshLambertMaterial color="#ffc542" emissive="#c8791a" emissiveIntensity={0.5} />
      </instancedMesh>
      <instancedMesh ref={shadows} args={[undefined, undefined, cups.length]}>
        <circleGeometry args={[CUP_WIDTH * S * 0.62, 12]} />
        <meshBasicMaterial color="#04140a" transparent opacity={0.55} />
      </instancedMesh>
    </group>
  );
}

/**
 * One cup on its own, for the Lucky Shot's golden one.
 *
 * Kept as a separate object on purpose: it breathes, and a pulsing emissive is
 * a property of the material rather than of an instance. One extra draw call
 * for the cup that is the entire point of the shot is a trade worth making.
 */
function Cup({
  geometry,
  beer,
  colour,
  texture,
  glow = false,
  alive,
  x,
  z,
}: {
  geometry: THREE.LatheGeometry;
  beer: { r: number; y: number };
  colour: string;
  texture?: THREE.Texture | null;
  glow?: boolean;
  alive: boolean;
  x: number;
  z: number;
}) {
  const group = useRef<THREE.Group>(null);
  const fallen = useRef(0);
  const tilt = useMemo(() => (Math.random() < 0.5 ? -1 : 1), []);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const target = alive ? 0 : 1;
    const step = delta * 3.4;
    fallen.current += Math.max(-step, Math.min(step, target - fallen.current));
    const g = group.current;
    if (!g) return;
    const f = fallen.current;
    g.rotation.z = tilt * f * 1.35;
    g.position.y = -f * 0.06;
    g.scale.setScalar(1 - f * 0.25);
    g.visible = f < 0.98;
    const body = g.children[0] as THREE.Mesh | undefined;
    if (body?.material) {
      const material = body.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - f;
      if (glow) {
        // Slow enough to read as a glow rather than a warning light.
        clock.current += delta;
        material.emissiveIntensity = (0.75 + Math.sin(clock.current * 2.4) * 0.35) * (1 - f);
      }
    }
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh geometry={geometry} castShadow={false}>
        <meshStandardMaterial
          map={texture ?? null}
          color={texture ? '#FFFFFF' : colour}
          emissive={texture ? '#FFFFFF' : colour}
          emissiveIntensity={glow ? 0.9 : texture ? 0.06 : 0.12}
          roughness={glow ? 0.2 : 0.35}
          metalness={glow ? 0.35 : 0.05}
          side={THREE.FrontSide}
          transparent
        />
      </mesh>
      <mesh position={[0, beer.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[beer.r, 20]} />
        <meshStandardMaterial
          color={glow ? '#fff4c2' : '#ffc542'}
          emissive={glow ? '#ffd23f' : '#c8791a'}
          emissiveIntensity={glow ? 1.5 : 0.5}
          roughness={0.25}
        />
      </mesh>
      <ContactShadow radius={CUP_WIDTH * S * 0.62} />
      {/* A ring on the felt. At the far end of the table a cup is the size of a
          fingernail and a different shade of it is not enough — this is what
          makes the golden one findable at a glance. */}
      {glow ? <TargetRing colour={colour} /> : null}
    </group>
  );
}

function TargetRing({ colour }: { colour: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta;
    const m = mesh.current;
    if (!m) return;
    const pulse = 0.5 + Math.sin(clock.current * 2.4) * 0.5;
    m.scale.setScalar(1 + pulse * 0.16);
    (m.material as THREE.Material).opacity = 0.35 + pulse * 0.5;
  });

  return (
    <mesh ref={mesh} position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[CUP_WIDTH * S * 0.72, CUP_WIDTH * S * 0.95, 28]} />
      <meshBasicMaterial color={colour} transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ContactShadow({ radius }: { radius: number }) {
  return (
    <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 14]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.42} />
    </mesh>
  );
}

function Ball({ flight, width, colour }: { flight: BallFlight; width: number; colour: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const radius = (BALL_SIZE / 2) * S;

  useFrame(() => {
    const p = flight.sample();
    const m = mesh.current;
    const sh = shadow.current;
    if (!m || !sh) return;
    const x = wx(p.x, width);
    const z = wz(p.y);
    m.position.set(x, radius + p.height * S, z);
    m.scale.setScalar(p.scale);
    (m.material as THREE.Material).opacity = p.opacity;
    m.visible = p.opacity > 0.02;
    // The shadow stays on the felt and shrinks as the ball climbs: the two
    // apart are what make the arc readable.
    const climb = Math.min(1, (p.height * S) / 1.2);
    sh.position.set(x, 0.005, z);
    sh.scale.setScalar((1 - climb * 0.45) * p.scale);
    (sh.material as THREE.Material).opacity = p.opacity * 0.4 * (1 - climb * 0.6);
    sh.visible = m.visible;
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[radius, 18, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={colour}
          emissiveIntensity={0.5}
          roughness={0.25}
          metalness={0.1}
          transparent
        />
      </mesh>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.15, 14]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
