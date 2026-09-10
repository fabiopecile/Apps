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
import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import {
  CUP_WIDTH,
  NET_Y,
  TABLE_LENGTH,
  type CupSpec,
} from '@/lib/arcadeLayout';
import { beerHeight, beerRadius, cupProfile } from '@/lib/cupGeometry';
import { BALL_SIZE, type BallFlight } from './useBallFlight';

/** Table points to world units. */
const S = 0.01;

/** How far the table sticks out past the racks at each end. */
const TABLE_MARGIN = 90;

export interface Rack {
  cups: CupSpec[];
  aliveFlags: boolean[];
  colour: string;
}

interface Table3DProps {
  width: number;
  racks: [Rack, Rack];
  /** Your ball and theirs, in that order. */
  balls: [BallFlight, BallFlight];
  ballColours: [string, string];
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
        // than how many triangles there are: a phone at 3x would shade nine
        // times the pixels of a 1x screen for no visible gain at this size, and
        // multisampling on top of that is the most expensive thing here.
        dpr={[1, 2]}
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
            pos: new THREE.Vector3(0, 5.8, wz(TABLE_LENGTH) + 5.2),
            at: new THREE.Vector3(0, 0.1, wz(540)),
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
        <meshStandardMaterial color="#16220f" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* The lit edge along the rails, the one line that says "table". */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * w) / 2, 0.002, 0]}>
          <boxGeometry args={[0.012, 0.012, l]} />
          <meshStandardMaterial color="#8dff6a" emissive="#8dff6a" emissiveIntensity={1.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.002, wz(NET_Y)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.96, 0.014]} />
        <meshStandardMaterial color="#8dff6a" emissive="#8dff6a" emissiveIntensity={0.9} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function CupRack({ rack, width }: { rack: Rack; width: number }) {
  const geometry = useMemo(() => {
    const points = cupProfile().map((p) => new THREE.Vector2(p.r * CUP_WIDTH * S, p.y * CUP_WIDTH * S));
    const lathe = new THREE.LatheGeometry(points, 26);
    lathe.computeVertexNormals();
    return lathe;
  }, []);
  const beer = useMemo(
    () => ({ r: beerRadius() * CUP_WIDTH * S, y: beerHeight() * CUP_WIDTH * S }),
    []
  );

  return (
    <group>
      {rack.cups.map((cup) => (
        <Cup
          key={cup.index}
          geometry={geometry}
          beer={beer}
          colour={rack.colour}
          alive={rack.aliveFlags[cup.index]}
          x={wx(cup.x, width)}
          z={wz(cup.y)}
        />
      ))}
    </group>
  );
}

function Cup({
  geometry,
  beer,
  colour,
  alive,
  x,
  z,
}: {
  geometry: THREE.LatheGeometry;
  beer: { r: number; y: number };
  colour: string;
  alive: boolean;
  x: number;
  z: number;
}) {
  const group = useRef<THREE.Group>(null);
  /** 0 standing, 1 fully knocked over and gone. */
  const fallen = useRef(0);
  // Which way it topples. Fixed per cup so a rack does not all fall alike.
  const tilt = useMemo(() => (Math.random() < 0.5 ? -1 : 1), []);

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
    if (body?.material) (body.material as THREE.Material).opacity = 1 - f;
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh geometry={geometry} castShadow={false}>
        <meshStandardMaterial
          color={colour}
          emissive={colour}
          emissiveIntensity={0.12}
          roughness={0.35}
          metalness={0.05}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
      <mesh position={[0, beer.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[beer.r, 20]} />
        <meshStandardMaterial color="#ffc542" emissive="#c8791a" emissiveIntensity={0.5} roughness={0.25} />
      </mesh>
      <ContactShadow radius={CUP_WIDTH * S * 0.62} />
    </group>
  );
}

/** A dark disc on the felt. Cheaper than a shadow map and, this dark, honest. */
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
