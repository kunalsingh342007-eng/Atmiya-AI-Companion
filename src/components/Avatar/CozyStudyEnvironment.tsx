import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AvatarState, RoomConfig, RoomEnvironmentId } from '../../types/companion';

interface CozyStudyEnvironmentProps {
  roomConfig?: RoomConfig;
  theme?: 'dark' | 'light';
  avatarState: AvatarState;
  isSoftwareGl?: boolean;
}

interface RoomPalette {
  wallMain: string;
  wallTrim: string;
  floorWood: string;
  rugMain: string;
  rugBorder: string;
  chairFabric: string;
  chairShell: string;
  chairMetal: string;
  woodFurniture: string;
  windowSky: string;
  windowSkyEmissive: string;
  curtain: string;
  bedFrame: string;
  bedLinen: string;
  bedThrow: string;
  lampShade: string;
  lampGlow: string;
  lampLightColor: string;
  lampLightIntensity: number;
  potCeramic: string;
  leafDark: string;
  leafLight: string;
}

function getRoomPalette(
  env: RoomEnvironmentId,
  theme: 'dark' | 'light'
): RoomPalette {
  const isDark = theme === 'dark';

  switch (env) {
    case 'evening-lounge':
      return {
        wallMain: isDark ? '#1a2438' : '#3a495e',
        wallTrim: isDark ? '#111827' : '#263344',
        floorWood: isDark ? '#2a1f1a' : '#5b4335',
        rugMain: isDark ? '#273549' : '#64748b',
        rugBorder: isDark ? '#1e293b' : '#475569',
        chairFabric: '#1e2c44',
        chairShell: '#111927',
        chairMetal: '#475569',
        woodFurniture: isDark ? '#3a2a20' : '#574032',
        windowSky: '#16284c',
        windowSkyEmissive: '#274680',
        curtain: isDark ? '#28364d' : '#475569',
        bedFrame: '#33251d',
        bedLinen: isDark ? '#475569' : '#cbd5e1',
        bedThrow: '#1e3a5f',
        lampShade: '#fef3c7',
        lampGlow: '#f59e0b',
        lampLightColor: '#ffcf87',
        lampLightIntensity: 1.5,
        potCeramic: '#9a6b52',
        leafDark: '#234f38',
        leafLight: '#316a4c',
      };
    case 'indigo-loft':
      return {
        wallMain: isDark ? '#1a1d3a' : '#2e335c',
        wallTrim: isDark ? '#111329' : '#1f2342',
        floorWood: isDark ? '#231c24' : '#4a3a45',
        rugMain: isDark ? '#2a2d54' : '#4c4f82',
        rugBorder: isDark ? '#1c1f3d' : '#383b66',
        chairFabric: '#1c2544',
        chairShell: '#0f1526',
        chairMetal: '#52607a',
        woodFurniture: isDark ? '#2d2438' : '#453854',
        windowSky: '#1e1b4b',
        windowSkyEmissive: '#3b3785',
        curtain: isDark ? '#2e315e' : '#464a85',
        bedFrame: '#292238',
        bedLinen: isDark ? '#4c527a' : '#c7d2fe',
        bedThrow: '#3730a3',
        lampShade: '#fde68a',
        lampGlow: '#f59e0b',
        lampLightColor: '#ffd394',
        lampLightIntensity: 1.45,
        potCeramic: '#64748b',
        leafDark: '#1e4a3b',
        leafLight: '#2c6652',
      };
    case 'cream-solarium':
      return {
        wallMain: isDark ? '#3a342c' : '#e6dac8',
        wallTrim: isDark ? '#29241e' : '#cbbca7',
        floorWood: isDark ? '#4a3828' : '#8c6b4d',
        rugMain: isDark ? '#594f43' : '#dfd5c7',
        rugBorder: isDark ? '#3f372e' : '#c2b4a1',
        chairFabric: '#2c3d59',
        chairShell: '#1b2434',
        chairMetal: '#64748b',
        woodFurniture: isDark ? '#5c4430' : '#947152',
        windowSky: '#fef3c7',
        windowSkyEmissive: '#fde68a',
        curtain: isDark ? '#6e6456' : '#f1e7d8',
        bedFrame: '#73573d',
        bedLinen: isDark ? '#9e9282' : '#f8f2e8',
        bedThrow: '#b08968',
        lampShade: '#fffbeb',
        lampGlow: '#fbbf24',
        lampLightColor: '#ffe0a8',
        lampLightIntensity: 1.15,
        potCeramic: '#b87654',
        leafDark: '#2c5e3b',
        leafLight: '#3f7d52',
      };
    case 'sunlit-study':
    default:
      return {
        wallMain: isDark ? '#162235' : '#cdd6c7',
        wallTrim: isDark ? '#0e1726' : '#aeb9a6',
        floorWood: isDark ? '#2a221d' : '#735741',
        rugMain: isDark ? '#243146' : '#d5d9cf',
        rugBorder: isDark ? '#1a2436' : '#b2b9ab',
        chairFabric: '#1e2c45',
        chairShell: '#111928',
        chairMetal: '#526178',
        woodFurniture: isDark ? '#3c2d23' : '#7a5a42',
        windowSky: isDark ? '#26426e' : '#dbeafe',
        windowSkyEmissive: isDark ? '#355c96' : '#eff6ff',
        curtain: isDark ? '#26354d' : '#e5e7eb',
        bedFrame: isDark ? '#32261e' : '#6c4f3a',
        bedLinen: isDark ? '#3e4d63' : '#f1efe9',
        bedThrow: isDark ? '#213a5c' : '#8da290',
        lampShade: '#fef3c7',
        lampGlow: '#f59e0b',
        lampLightColor: '#ffd494',
        lampLightIntensity: isDark ? 1.45 : 1.05,
        potCeramic: '#a86b4c',
        leafDark: '#24543a',
        leafLight: '#347350',
      };
  }
}

const BOOK_COLORS = [
  '#3b82f6',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#cbd5e1',
  '#475569',
];

const DEFAULT_COZY_ROOM: RoomConfig = {
  environment: 'sunlit-study',
  lightingMood: 'natural',
};

export const CozyStudyEnvironment: React.FC<CozyStudyEnvironmentProps> = React.memo(
  ({
    roomConfig = DEFAULT_COZY_ROOM,
    theme = 'dark',
    avatarState,
    isSoftwareGl = false,
  }) => {
    const envId: RoomEnvironmentId = roomConfig.environment || 'sunlit-study';
    const palette = useMemo(
      () => getRoomPalette(envId, theme),
      [envId, theme]
    );

    // State-reactive subtle ambient desk-lamp warmth tint
    const accentGlowColor = useMemo(() => {
      if (avatarState === 'listening') return '#7dd3fc';
      if (avatarState === 'thinking') return '#fcd34d';
      if (avatarState === 'speaking') return '#93c5fd';
      return palette.lampLightColor;
    }, [avatarState, palette.lampLightColor]);

    // Shared procedural materials (disposed cleanly on change/unmount)
    const materials = useMemo(() => {
      const wallMat = new THREE.MeshStandardMaterial({
        color: palette.wallMain,
        roughness: 0.92,
        metalness: 0.02,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: palette.wallTrim,
        roughness: 0.85,
        metalness: 0.04,
      });
      const floorMat = new THREE.MeshStandardMaterial({
        color: palette.floorWood,
        roughness: 0.78,
        metalness: 0.05,
      });
      const rugMat = new THREE.MeshStandardMaterial({
        color: palette.rugMain,
        roughness: 0.95,
        metalness: 0.0,
      });
      const rugRimMat = new THREE.MeshStandardMaterial({
        color: palette.rugBorder,
        roughness: 0.92,
        metalness: 0.0,
      });
      const chairFabricMat = new THREE.MeshStandardMaterial({
        color: palette.chairFabric,
        roughness: 0.86,
        metalness: 0.04,
      });
      const chairShellMat = new THREE.MeshStandardMaterial({
        color: palette.chairShell,
        roughness: 0.48,
        metalness: 0.25,
      });
      const chairMetalMat = new THREE.MeshStandardMaterial({
        color: palette.chairMetal,
        roughness: 0.28,
        metalness: 0.82,
      });
      const woodMat = new THREE.MeshStandardMaterial({
        color: palette.woodFurniture,
        roughness: 0.65,
        metalness: 0.06,
      });
      const windowGlassMat = new THREE.MeshStandardMaterial({
        color: palette.windowSky,
        emissive: palette.windowSkyEmissive,
        emissiveIntensity: 0.62,
        roughness: 0.2,
        metalness: 0.05,
      });
      const curtainMat = new THREE.MeshStandardMaterial({
        color: palette.curtain,
        roughness: 0.9,
        metalness: 0.02,
      });
      const bedLinenMat = new THREE.MeshStandardMaterial({
        color: palette.bedLinen,
        roughness: 0.92,
        metalness: 0.0,
      });
      const bedThrowMat = new THREE.MeshStandardMaterial({
        color: palette.bedThrow,
        roughness: 0.9,
        metalness: 0.02,
      });
      const lampShadeMat = new THREE.MeshStandardMaterial({
        color: palette.lampShade,
        emissive: palette.lampGlow,
        emissiveIntensity: 0.55,
        roughness: 0.75,
        metalness: 0.02,
      });
      const potMat = new THREE.MeshStandardMaterial({
        color: palette.potCeramic,
        roughness: 0.62,
        metalness: 0.06,
      });
      const soilMat = new THREE.MeshStandardMaterial({
        color: '#2b211a',
        roughness: 0.96,
        metalness: 0.0,
      });
      const leafDarkMat = new THREE.MeshStandardMaterial({
        color: palette.leafDark,
        roughness: 0.68,
        metalness: 0.04,
      });
      const leafLightMat = new THREE.MeshStandardMaterial({
        color: palette.leafLight,
        roughness: 0.62,
        metalness: 0.04,
      });
      const paperMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.85,
        metalness: 0.0,
      });
      const bookMats = BOOK_COLORS.map(
        (hex) =>
          new THREE.MeshStandardMaterial({
            color: hex,
            roughness: 0.72,
            metalness: 0.05,
          })
      );

      return {
        wallMat,
        trimMat,
        floorMat,
        rugMat,
        rugRimMat,
        chairFabricMat,
        chairShellMat,
        chairMetalMat,
        woodMat,
        windowGlassMat,
        curtainMat,
        bedLinenMat,
        bedThrowMat,
        lampShadeMat,
        potMat,
        soilMat,
        leafDarkMat,
        leafLightMat,
        paperMat,
        bookMats,
      };
    }, [palette]);

    useEffect(() => {
      return () => {
        Object.values(materials).forEach((val) => {
          if (Array.isArray(val)) {
            val.forEach((m) => m.dispose());
          } else {
            val.dispose();
          }
        });
      };
    }, [materials]);

    const starAngles = useMemo(() => [0, 1, 2, 3, 4].map((i) => (i * Math.PI * 2) / 5), []);

    const plantLeaves = useMemo(
      () => [
        { pos: [0, 0.56, 0] as [number, number, number], rot: [0.18, 0.1, 0] as [number, number, number], scale: [0.065, 0.14, 0.014] as [number, number, number], light: true },
        { pos: [-0.09, 0.50, 0.06] as [number, number, number], rot: [0.45, 0.4, 0.52] as [number, number, number], scale: [0.07, 0.15, 0.014] as [number, number, number], light: false },
        { pos: [0.10, 0.49, 0.05] as [number, number, number], rot: [0.38, -0.35, -0.55] as [number, number, number], scale: [0.068, 0.145, 0.014] as [number, number, number], light: true },
        { pos: [-0.07, 0.47, -0.09] as [number, number, number], rot: [-0.42, -0.3, 0.48] as [number, number, number], scale: [0.072, 0.15, 0.014] as [number, number, number], light: false },
        { pos: [0.08, 0.48, -0.08] as [number, number, number], rot: [-0.36, 0.3, -0.48] as [number, number, number], scale: [0.065, 0.14, 0.014] as [number, number, number], light: true },
        { pos: [0.0, 0.43, 0.11] as [number, number, number], rot: [0.68, 0.0, 0.06] as [number, number, number], scale: [0.068, 0.135, 0.014] as [number, number, number], light: false },
        { pos: [-0.12, 0.42, -0.01] as [number, number, number], rot: [0.08, 0.2, 0.72] as [number, number, number], scale: [0.062, 0.13, 0.014] as [number, number, number], light: true },
      ],
      []
    );

    const shelfBooks = useMemo(
      () => [
        // Top shelf (y = 1.30 + bookH/2)
        { x: -0.28, y: 1.375, w: 0.048, h: 0.21, d: 0.18, matIdx: 0, tilt: 0 },
        { x: -0.22, y: 1.385, w: 0.044, h: 0.23, d: 0.18, matIdx: 1, tilt: 0 },
        { x: -0.16, y: 1.37, w: 0.052, h: 0.20, d: 0.18, matIdx: 2, tilt: 0 },
        { x: -0.09, y: 1.375, w: 0.046, h: 0.21, d: 0.18, matIdx: 6, tilt: 0.14 },
        // Middle shelf (y = 0.88)
        { x: 0.10, y: 0.96, w: 0.05, h: 0.22, d: 0.18, matIdx: 3, tilt: 0 },
        { x: 0.16, y: 0.955, w: 0.046, h: 0.21, d: 0.18, matIdx: 4, tilt: 0 },
        { x: 0.22, y: 0.97, w: 0.052, h: 0.24, d: 0.18, matIdx: 5, tilt: 0 },
        { x: 0.28, y: 0.95, w: 0.045, h: 0.20, d: 0.18, matIdx: 7, tilt: -0.08 },
        // Lower shelf (y = 0.46)
        { x: -0.26, y: 0.54, w: 0.05, h: 0.22, d: 0.18, matIdx: 5, tilt: 0 },
        { x: -0.20, y: 0.535, w: 0.045, h: 0.21, d: 0.18, matIdx: 0, tilt: 0 },
        { x: -0.14, y: 0.545, w: 0.048, h: 0.23, d: 0.18, matIdx: 6, tilt: 0 },
      ],
      []
    );

    const castShadow = !isSoftwareGl;

    return (
      <group name="CozyStudyEnvironment">
        {/* 1. Room Floor, Circular Woven Rug, Back & Left Walls */}
        <group name="RoomStageBase">
          {/* Floor top face exactly at y = 0 */}
          <mesh
            position={[0, -0.025, -0.4]}
            material={materials.floorMat}
            receiveShadow
          >
            <boxGeometry args={[6.2, 0.05, 5.2]} />
          </mesh>

          {/* Circular woven area rug (top face at y = 0.008, supporting chair & avatar shoes) */}
          <mesh
            position={[0, 0.004, 0.24]}
            material={materials.rugMat}
            receiveShadow
          >
            <cylinderGeometry args={[1.08, 1.1, 0.008, 48]} />
          </mesh>
          <mesh
            position={[0, 0.003, 0.24]}
            material={materials.rugRimMat}
            receiveShadow
          >
            <cylinderGeometry args={[1.14, 1.15, 0.006, 48]} />
          </mesh>

          {/* Back wall */}
          <mesh
            position={[0.1, 1.5, -2.42]}
            material={materials.wallMat}
            receiveShadow
          >
            <boxGeometry args={[6.2, 3.2, 0.08]} />
          </mesh>
          {/* Back wall baseboard */}
          <mesh position={[0.1, 0.055, -2.37]} material={materials.trimMat} receiveShadow>
            <boxGeometry args={[6.2, 0.11, 0.03]} />
          </mesh>

          {/* Left wall */}
          <mesh
            position={[-2.75, 1.5, -0.25]}
            material={materials.wallMat}
            receiveShadow
          >
            <boxGeometry args={[0.08, 3.2, 4.8]} />
          </mesh>
          {/* Left wall baseboard */}
          <mesh position={[-2.7, 0.055, -0.25]} material={materials.trimMat} receiveShadow>
            <boxGeometry args={[0.03, 0.11, 4.8]} />
          </mesh>
        </group>

        {/* 2. Ergonomic Study Chair (centered at x=0, z=0; seat top at y=0.525; armrests at y=0.715) */}
        <group name="StudyChair">
          {/* 5-star caster base */}
          <mesh position={[0, 0.055, -0.02]} material={materials.chairShellMat} castShadow={castShadow}>
            <cylinderGeometry args={[0.042, 0.052, 0.04, 16]} />
          </mesh>
          {starAngles.map((ang, idx) => (
            <group key={idx} position={[0, 0.042, -0.02]} rotation={[0, ang, 0]}>
              <mesh position={[0, 0, 0.15]} material={materials.chairShellMat} castShadow={castShadow}>
                <boxGeometry args={[0.034, 0.024, 0.29]} />
              </mesh>
              <mesh position={[0, -0.022, 0.27]} material={materials.chairShellMat}>
                <cylinderGeometry args={[0.018, 0.018, 0.02, 10]} />
              </mesh>
            </group>
          ))}

          {/* Pneumatic column */}
          <mesh position={[0, 0.24, -0.02]} material={materials.chairMetalMat} castShadow={castShadow}>
            <cylinderGeometry args={[0.026, 0.03, 0.38, 16]} />
          </mesh>
          {/* Under-seat bracket */}
          <mesh position={[0, 0.43, 0.01]} material={materials.chairShellMat}>
            <boxGeometry args={[0.2, 0.04, 0.22]} />
          </mesh>

          {/* Sculpted upholstered seat cushion (top face = 0.485 + 0.04 = 0.525) */}
          <mesh
            position={[0, 0.485, 0.085]}
            material={materials.chairFabricMat}
            castShadow={castShadow}
            receiveShadow
          >
            <boxGeometry args={[0.5, 0.08, 0.47]} />
          </mesh>
          {/* Front waterfall lip */}
          <mesh
            position={[0, 0.48, 0.315]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.chairFabricMat}
            castShadow={castShadow}
          >
            <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
          </mesh>
          {/* Side trim bolsters */}
          <mesh position={[0, 0.448, 0.08]} material={materials.chairShellMat}>
            <boxGeometry args={[0.515, 0.02, 0.46]} />
          </mesh>

          {/* Curved backrest spine support */}
          <mesh
            position={[0, 0.54, -0.165]}
            rotation={[0.22, 0, 0]}
            material={materials.chairShellMat}
            castShadow={castShadow}
          >
            <boxGeometry args={[0.11, 0.22, 0.038]} />
          </mesh>

          {/* Contoured backrest cushion + outer shell (front face ~ z = -0.155) */}
          <group position={[0, 0.8, -0.185]} rotation={[-0.07, 0, 0]}>
            <mesh
              position={[0, 0, 0.012]}
              material={materials.chairFabricMat}
              castShadow={castShadow}
              receiveShadow
            >
              <boxGeometry args={[0.45, 0.52, 0.062]} />
            </mesh>
            {/* Outer rounded shell */}
            <mesh
              position={[0, 0, -0.025]}
              material={materials.chairShellMat}
              castShadow={castShadow}
            >
              <boxGeometry args={[0.47, 0.54, 0.024]} />
            </mesh>
            {/* Headrest / top bolster */}
            <mesh
              position={[0, 0.275, 0.01]}
              rotation={[0, 0, Math.PI / 2]}
              material={materials.chairFabricMat}
              castShadow={castShadow}
            >
              <cylinderGeometry args={[0.032, 0.032, 0.36, 16]} />
            </mesh>
          </group>

          {/* Left & Right Armrests (top face at y = 0.715, x = ±0.295) */}
          {([-1, 1] as const).map((dir) => (
            <group key={dir}>
              {/* Horizontal stem under seat */}
              <mesh position={[dir * 0.24, 0.46, 0.06]} material={materials.chairMetalMat}>
                <boxGeometry args={[0.13, 0.026, 0.036]} />
              </mesh>
              {/* Vertical armrest post */}
              <mesh
                position={[dir * 0.295, 0.585, 0.06]}
                material={materials.chairMetalMat}
                castShadow={castShadow}
              >
                <boxGeometry args={[0.03, 0.24, 0.038]} />
              </mesh>
              {/* Soft top armrest pad */}
              <mesh
                position={[dir * 0.295, 0.702, 0.1]}
                material={materials.chairShellMat}
                castShadow={castShadow}
                receiveShadow
              >
                <boxGeometry args={[0.068, 0.026, 0.25]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 3. Back-Left Window & Draped Curtains */}
        <group name="WindowAndCurtains" position={[-1.42, 1.56, -2.37]}>
          {/* Glowing window sky pane */}
          <mesh position={[0, 0, 0.01]} material={materials.windowGlassMat}>
            <planeGeometry args={[1.18, 1.38]} />
          </mesh>
          {/* Outer frame top/bottom/left/right */}
          <mesh position={[0, 0.72, 0.03]} material={materials.woodMat}>
            <boxGeometry args={[1.3, 0.07, 0.06]} />
          </mesh>
          <mesh position={[0, -0.72, 0.03]} material={materials.woodMat}>
            <boxGeometry args={[1.34, 0.06, 0.1]} />
          </mesh>
          <mesh position={[-0.61, 0, 0.03]} material={materials.woodMat}>
            <boxGeometry args={[0.07, 1.46, 0.06]} />
          </mesh>
          <mesh position={[0.61, 0, 0.03]} material={materials.woodMat}>
            <boxGeometry args={[0.07, 1.46, 0.06]} />
          </mesh>
          {/* Cross mullions */}
          <mesh position={[0, 0, 0.025]} material={materials.woodMat}>
            <boxGeometry args={[0.03, 1.38, 0.03]} />
          </mesh>
          <mesh position={[0, 0.08, 0.025]} material={materials.woodMat}>
            <boxGeometry args={[1.18, 0.03, 0.03]} />
          </mesh>
          {/* Soft curtain panels */}
          <mesh position={[-0.71, -0.14, 0.06]} material={materials.curtainMat}>
            <boxGeometry args={[0.24, 1.85, 0.06]} />
          </mesh>
          <mesh position={[0.71, -0.14, 0.06]} material={materials.curtainMat}>
            <boxGeometry args={[0.24, 1.85, 0.06]} />
          </mesh>
        </group>

        {/* 4. Cozy Daybed Corner (left-back, subtle background warmth) */}
        <group name="CozyDaybed" position={[-1.78, 0, -1.48]}>
          {/* Bed base */}
          <mesh position={[0, 0.18, 0]} material={materials.woodMat} receiveShadow>
            <boxGeometry args={[1.05, 0.16, 1.65]} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 0.32, 0]} material={materials.bedLinenMat} receiveShadow>
            <boxGeometry args={[0.98, 0.16, 1.58]} />
          </mesh>
          {/* Folded throw blanket */}
          <mesh position={[0.02, 0.36, 0.34]} material={materials.bedThrowMat} receiveShadow>
            <boxGeometry args={[1.0, 0.12, 0.72]} />
          </mesh>
          {/* Headboard & Pillows */}
          <mesh position={[0, 0.56, -0.8]} material={materials.woodMat}>
            <boxGeometry args={[1.05, 0.62, 0.06]} />
          </mesh>
          <mesh position={[-0.22, 0.47, -0.58]} rotation={[0.22, 0.08, 0]} material={materials.bedLinenMat}>
            <boxGeometry args={[0.38, 0.14, 0.28]} />
          </mesh>
          <mesh position={[0.22, 0.47, -0.58]} rotation={[0.22, -0.08, 0]} material={materials.bedThrowMat}>
            <boxGeometry args={[0.36, 0.13, 0.27]} />
          </mesh>
        </group>

        {/* 5. Indoor Potted Plant (left midground) */}
        <group name="PottedPlantProp" position={[-1.08, 0, -0.84]}>
          <mesh position={[0, 0.17, 0]} material={materials.potMat} castShadow={castShadow} receiveShadow>
            <cylinderGeometry args={[0.16, 0.12, 0.34, 20]} />
          </mesh>
          {/* Ceramic rim */}
          <mesh position={[0, 0.33, 0]} material={materials.potMat}>
            <cylinderGeometry args={[0.17, 0.17, 0.032, 20]} />
          </mesh>
          {/* Soil disc */}
          <mesh position={[0, 0.32, 0]} material={materials.soilMat}>
            <cylinderGeometry args={[0.148, 0.148, 0.02, 16]} />
          </mesh>
          {/* Botanical stem */}
          <mesh position={[0, 0.42, 0]} material={materials.leafDarkMat}>
            <cylinderGeometry args={[0.012, 0.018, 0.22, 8]} />
          </mesh>
          {/* 7 curved matte leaves */}
          {plantLeaves.map((leaf, i) => (
            <mesh
              key={i}
              position={leaf.pos}
              rotation={leaf.rot}
              scale={leaf.scale}
              material={leaf.light ? materials.leafLightMat : materials.leafDarkMat}
              castShadow={castShadow}
            >
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
          ))}
        </group>

        {/* 6. Right-Back Timber Bookshelf with Books */}
        <group name="BookshelfProp" position={[1.52, 0, -2.06]}>
          {/* Left & right side panels */}
          <mesh position={[-0.42, 0.9, 0]} material={materials.woodMat} receiveShadow>
            <boxGeometry args={[0.04, 1.8, 0.34]} />
          </mesh>
          <mesh position={[0.42, 0.9, 0]} material={materials.woodMat} receiveShadow>
            <boxGeometry args={[0.04, 1.8, 0.34]} />
          </mesh>
          {/* Back panel */}
          <mesh position={[0, 0.9, -0.155]} material={materials.trimMat}>
            <boxGeometry args={[0.84, 1.78, 0.02]} />
          </mesh>
          {/* 5 horizontal shelves */}
          {[0.08, 0.44, 0.86, 1.28, 1.74].map((sy, idx) => (
            <mesh key={idx} position={[0, sy, 0]} material={materials.woodMat} receiveShadow>
              <boxGeometry args={[0.82, 0.032, 0.32]} />
            </mesh>
          ))}
          {/* Hardcover books */}
          {shelfBooks.map((bk, idx) => (
            <mesh
              key={idx}
              position={[bk.x, bk.y, 0.02]}
              rotation={[0, 0, bk.tilt]}
              material={materials.bookMats[bk.matIdx]}
            >
              <boxGeometry args={[bk.w, bk.h, bk.d]} />
            </mesh>
          ))}
        </group>

        {/* 7. Right-Midground Compact Side Desk + Notebook, Mug & Warm Table Lamp */}
        <group name="DeskAndLampProp" position={[1.08, 0, -0.84]}>
          {/* Desk tabletop (top at y = 0.65) */}
          <mesh position={[0, 0.635, 0]} material={materials.woodMat} castShadow={castShadow} receiveShadow>
            <boxGeometry args={[0.66, 0.032, 0.48]} />
          </mesh>
          {/* 4 desk legs */}
          {[
            [-0.28, -0.19],
            [0.28, -0.19],
            [-0.28, 0.19],
            [0.28, 0.19],
          ].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.315, lz]} material={materials.chairShellMat}>
              <cylinderGeometry args={[0.016, 0.012, 0.63, 10]} />
            </mesh>
          ))}

          {/* Open notebook */}
          <mesh position={[-0.14, 0.66, 0.08]} rotation={[0, 0.18, 0]} material={materials.paperMat}>
            <boxGeometry args={[0.2, 0.016, 0.15]} />
          </mesh>
          {/* Ceramic mug */}
          <mesh position={[-0.22, 0.695, -0.09]} material={materials.potMat}>
            <cylinderGeometry args={[0.034, 0.03, 0.086, 14]} />
          </mesh>

          {/* Warm Glowing Table Lamp */}
          <group position={[0.14, 0.651, -0.06]}>
            <mesh position={[0, 0.014, 0]} material={materials.chairMetalMat}>
              <cylinderGeometry args={[0.068, 0.074, 0.028, 16]} />
            </mesh>
            <mesh position={[0, 0.13, 0]} material={materials.chairMetalMat}>
              <cylinderGeometry args={[0.012, 0.014, 0.22, 12]} />
            </mesh>
            <mesh position={[0, 0.27, 0]} material={materials.lampShadeMat}>
              <cylinderGeometry args={[0.092, 0.135, 0.17, 20]} />
            </mesh>
            {!isSoftwareGl && (
              <pointLight
                position={[0, 0.24, 0.04]}
                color={accentGlowColor}
                intensity={palette.lampLightIntensity}
                distance={4.2}
                decay={2}
              />
            )}
          </group>
        </group>
      </group>
    );
  }
);

CozyStudyEnvironment.displayName = 'CozyStudyEnvironment';
