import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  StudioFocusPreset,
  StudioLightingMood,
  VideoGenre,
} from '../types/portfolio';

interface CreatorStage3DProps {
  activePreset: StudioFocusPreset;
  lightingMood: StudioLightingMood;
  onPresetChange: (preset: StudioFocusPreset) => void;
  onLightingMoodChange: (mood: StudioLightingMood) => void;
  onJumpToGenre: (genre: VideoGenre) => void;
}

interface CameraPresetConfig {
  id: StudioFocusPreset;
  label: string;
  propTitle: string;
  propCaption: string;
  targetGenre: VideoGenre;
  position: [number, number, number];
  target: [number, number, number];
}

interface LightingMoodConfig {
  id: StudioLightingMood;
  label: string;
  keyHex: number;
  rimHex: number;
  fillHex: number;
  bgHex: number;
  accentCss: string;
}

const CAMERA_PRESETS: Record<StudioFocusPreset, CameraPresetConfig> = {
  overview: {
    id: 'overview',
    label: 'Studio Overview',
    propTitle: 'Creator Desk & Production Rig',
    propCaption:
      'Drag to orbit, click any 3D prop to inspect it, switch studio lighting moods, or snap the clapperboard.',
    targetGenre: 'All',
    position: [0.3, 2.35, 5.15],
    target: [0, 0.58, 0],
  },
  'voice-comedy': {
    id: 'voice-comedy',
    label: 'Voice & Comedy',
    propTitle: 'Broadcast & Stand-Up Microphone',
    propCaption:
      'Used for atmospheric horror voiceovers, comedic timing, and live stand-up stage delivery.',
    targetGenre: 'Comedy',
    position: [-2.15, 1.55, 2.55],
    target: [-1.45, 0.85, 0.2],
  },
  'video-editing': {
    id: 'video-editing',
    label: 'Video Editing',
    propTitle: 'Timeline Monitor & Rotary Jog Deck',
    propCaption:
      'Intermediate video editing workflow for Valorant & Minecraft highlights, food trails, and vlogs.',
    targetGenre: 'Gaming',
    position: [0.25, 1.68, 2.75],
    target: [0.1, 0.72, -0.35],
  },
  'horror-storytelling': {
    id: 'horror-storytelling',
    label: 'Horror Slate',
    propTitle: 'Cinema Director’s Clapperboard',
    propCaption:
      'Story-led horror reels, suspense narration, and on-ground convention coverage at Horror Con & Comic Con.',
    targetGenre: 'Horror',
    position: [2.15, 1.48, 2.48],
    target: [1.36, 0.56, 0.44],
  },
};

const LIGHTING_MOODS: Record<StudioLightingMood, LightingMoodConfig> = {
  'warm-stage': {
    id: 'warm-stage',
    label: 'Warm Stage',
    keyHex: 0xffe8c8,
    rimHex: 0xe53935,
    fillHex: 0x93c5fd,
    bgHex: 0x0c0c10,
    accentCss: '#F59E0B',
  },
  'horror-noir': {
    id: 'horror-noir',
    label: 'Horror Noir',
    keyHex: 0xcbd5e1,
    rimHex: 0xdc2626,
    fillHex: 0x450a0a,
    bgHex: 0x08070a,
    accentCss: '#E53935',
  },
  'edit-suite': {
    id: 'edit-suite',
    label: 'Edit Suite',
    keyHex: 0xe2e8f0,
    rimHex: 0x3b82f6,
    fillHex: 0x60a5fa,
    bgHex: 0x0a0d14,
    accentCss: '#3B82F6',
  },
};

function playClapperSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Crisp woody clap transient using filtered short noise burst + body thump
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 220);
  } catch {
    // Ignore audio context restrictions
  }
}

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createDeskWoodTexture(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b191d';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.045) * 6 + Math.cos(y * 0.13) * 3;
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, y + (wave % 2), 512, 1.5);
  }

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(2, 1);
  colorMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 1);
  bumpMap.anisotropy = maxAnisotropy;

  return { colorMap, bumpMap };
}

function createMicGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6c7078';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1f2126';
  for (let y = 6; y < 256; y += 12) {
    for (let x = 6; x < 256; x += 12) {
      ctx.beginPath();
      ctx.arc(x + ((y / 12) % 2) * 6, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function drawClapperSlateCanvas(canvas: HTMLCanvasElement, takeNumber: number) {
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#151519';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = 'rgba(244, 242, 236, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, 348);

  ctx.beginPath();
  ctx.moveTo(18, 92);
  ctx.lineTo(494, 92);
  ctx.moveTo(18, 184);
  ctx.lineTo(494, 184);
  ctx.moveTo(18, 274);
  ctx.lineTo(494, 274);
  ctx.moveTo(256, 184);
  ctx.lineTo(256, 274);
  ctx.stroke();

  ctx.fillStyle = '#E53935';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('BHUVI CHAUHAN', 36, 64);

  ctx.fillStyle = '#F4F2EC';
  ctx.font = '600 18px monospace';
  ctx.fillText('PROD: CREATOR SHOWREEL', 36, 146);

  ctx.fillStyle = '#A6A4AE';
  ctx.font = '500 15px monospace';
  ctx.fillText('SCENE', 36, 212);
  ctx.fillText('TAKE', 276, 212);

  ctx.fillStyle = '#F4F2EC';
  ctx.font = '700 32px monospace';
  ctx.fillText('05', 36, 256);
  ctx.fillText(String(takeNumber).padStart(2, '0'), 276, 256);

  ctx.fillStyle = '#D0CEC8';
  ctx.font = '500 16px sans-serif';
  ctx.fillText('HORROR · COMEDY · GAMING · VLOGS', 36, 326);
}

function createClapperStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181D';
  ctx.fillRect(0, 0, 512, 64);

  for (let i = -1; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#F4F2EC' : '#E53935';
    ctx.beginPath();
    ctx.moveTo(i * 64, 0);
    ctx.lineTo(i * 64 + 30, 0);
    ctx.lineTo(i * 64 + 10, 64);
    ctx.lineTo(i * 64 - 20, 64);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function drawTimelineCanvas(
  canvas: HTMLCanvasElement,
  preset: StudioFocusPreset,
  mood: StudioLightingMood,
  wavePhase = 0,
) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0D0E13';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#151720';
  ctx.fillRect(18, 18, w - 36, 148);

  const accent = LIGHTING_MOODS[mood].accentCss;

  // Dynamic acoustic / voice waveform inside monitor
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 36; x < w - 36; x += 6) {
    const t = (x - 36) / (w - 72);
    const amp =
      Math.sin(t * 22 + wavePhase) * 26 * Math.sin(t * Math.PI) +
      Math.cos(t * 9 - wavePhase * 0.6) * 10;
    const y = 98 + amp;
    if (x === 36) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Monitor header label (left-aligned) & timecode (right-aligned, zero overlap)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F4F2EC';
  ctx.font = '600 13px monospace';
  const label =
    preset === 'voice-comedy'
      ? 'VO TRACK · STAND-UP & MIC'
      : preset === 'video-editing'
        ? 'TIMELINE · GAMING & VLOG CUT'
        : preset === 'horror-storytelling'
          ? 'STORY REEL · HORROR AUDIO'
          : 'BHUVI STUDIO · MASTER REEL';
  ctx.fillText(label, 28, 44);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9E9CA8';
  ctx.font = '500 13px monospace';
  ctx.fillText('00:42:18 · 24FPS', w - 28, 44);
  ctx.textAlign = 'left';

  // Timeline tracks bottom half
  const trackY = [184, 218, 252];
  const clips = [
    [
      { x: 24, w: 140, c: accent },
      { x: 172, w: 196, c: '#2E3242' },
      { x: 376, w: 112, c: accent },
    ],
    [
      { x: 48, w: 220, c: '#3B82F6' },
      { x: 280, w: 184, c: '#272A38' },
    ],
    [{ x: 24, w: 464, c: '#10B981' }],
  ];

  trackY.forEach((y, row) => {
    ctx.fillStyle = '#14161D';
    ctx.fillRect(18, y, w - 36, 24);
    clips[row].forEach((clip) => {
      ctx.fillStyle = clip.c;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(clip.x, y + 3, clip.w, 18);
      ctx.globalAlpha = 1;
    });
  });

  // Playhead
  const playheadX =
    preset === 'voice-comedy'
      ? 150
      : preset === 'video-editing'
        ? 296
        : preset === 'horror-storytelling'
          ? 395
          : 230;
  ctx.strokeStyle = '#F4F2EC';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, 174);
  ctx.lineTo(playheadX, 286);
  ctx.stroke();
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export function CreatorStage3D({
  activePreset,
  lightingMood,
  onPresetChange,
  onLightingMoodChange,
  onJumpToGenre,
}: CreatorStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<StudioFocusPreset>(activePreset);
  const moodRef = useRef<StudioLightingMood>(lightingMood);
  const onPresetChangeRef = useRef(onPresetChange);
  onPresetChangeRef.current = onPresetChange;

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredProp, setHoveredProp] = useState<StudioFocusPreset | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [takeCount, setTakeCount] = useState(1);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const triggerUpdateRef = useRef<
    ((preset: StudioFocusPreset, mood: StudioLightingMood, clap?: boolean) => void) | null
  >(null);

  useEffect(() => {
    presetRef.current = activePreset;
    moodRef.current = lightingMood;
    triggerUpdateRef.current?.(activePreset, lightingMood, false);
  }, [activePreset, lightingMood]);

  const handleClapAction = () => {
    setTakeCount((t) => (t >= 99 ? 1 : t + 1));
    if (soundEnabledRef.current) {
      playClapperSound();
    }
    triggerUpdateRef.current?.(presetRef.current, moodRef.current, true);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 520;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const initialMood = LIGHTING_MOODS[moodRef.current];
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(initialMood.bgHex);
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(initialMood.bgHex, 0.068);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    const initialCfg = CAMERA_PRESETS[presetRef.current];
    camera.position.set(...initialCfg.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialCfg.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 7.4;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.update();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Three-point warm/cool studio lighting rig
    const hemiLight = new THREE.HemisphereLight(0xcbd5e1, 0x16141a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialMood.keyHex, 2.2);
    keyLight.position.set(3.8, 5.6, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -4.2;
      keyLight.shadow.camera.right = 4.2;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -3.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(initialMood.rimHex, 1.45);
    rimLight.position.set(-4.2, 2.8, -3.5);
    scene.add(rimLight);

    const fillPoint = new THREE.PointLight(initialMood.fillHex, 1.15, 10);
    fillPoint.position.set(2.5, 2.2, -2.5);
    scene.add(fillPoint);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      textures.push(t);
      return t;
    };

    const darkAnodizedMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1f2026,
        roughness: 0.42,
        metalness: 0.72,
      }),
    );
    const matteRubberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x141418,
        roughness: 0.88,
        metalness: 0.08,
      }),
    );
    const brushedChromeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd4d6dc,
        roughness: 0.22,
        metalness: 0.94,
      }),
    );
    const warmBrassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd9a452,
        roughness: 0.28,
        metalness: 0.88,
      }),
    );
    const vermilionAccentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe53935,
        emissive: 0x6b1111,
        emissiveIntensity: 0.55,
        roughness: 0.34,
        metalness: 0.22,
      }),
    );

    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0e0e13,
        roughness: 0.9,
        metalness: 0.05,
      }),
    );
    const floorMesh = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(18, 48)), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.68;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const shadowTex = trackTex(createContactShadowTexture());
    const contactShadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    const deskShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.2, 4.0)), contactShadowMat);
    deskShadow.rotation.x = -Math.PI / 2;
    deskShadow.position.set(0, -0.66, 0);
    scene.add(deskShadow);

    // === 1. STUDIO DESK ===
    const deskGroup = new THREE.Group();
    const { colorMap: woodColor, bumpMap: woodBump } = createDeskWoodTexture(maxAnisotropy);
    trackTex(woodColor);
    trackTex(woodBump);
    const deskTopMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: woodColor,
        bumpMap: woodBump,
        bumpScale: 0.015,
        roughness: 0.72,
        metalness: 0.08,
      }),
    );

    const deskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 0.14, 2.35)), deskTopMat);
    deskTop.position.set(0, -0.07, 0);
    deskTop.receiveShadow = true;
    deskTop.castShadow = true;
    deskGroup.add(deskTop);

    const deskTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.22, 0.025, 0.03)), warmBrassMat);
    deskTrim.position.set(0, -0.02, 1.175);
    deskGroup.add(deskTrim);

    const deskMat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.02, 1.45)), matteRubberMat);
    deskMat.position.set(0, 0.012, 0.08);
    deskMat.receiveShadow = true;
    deskGroup.add(deskMat);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.62, 1.75));
    const leftLeg = new THREE.Mesh(legGeo, darkAnodizedMat);
    leftLeg.position.set(-2.25, -0.44, 0);
    const rightLeg = new THREE.Mesh(legGeo, darkAnodizedMat);
    rightLeg.position.set(2.25, -0.44, 0);
    deskGroup.add(leftLeg, rightLeg);
    scene.add(deskGroup);

    // === 2. BROADCAST & STAND-UP MICROPHONE ===
    const micGroup = new THREE.Group();
    micGroup.position.set(-1.5, 0.02, 0.2);

    const micBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 32)), darkAnodizedMat);
    micBase.position.y = 0.04;
    micBase.castShadow = true;
    micGroup.add(micBase);

    const micRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.32, 0.014, 12, 32)), warmBrassMat);
    micRing.rotation.x = Math.PI / 2;
    micRing.position.y = 0.08;
    micGroup.add(micRing);

    const micStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.045, 0.54, 20)), brushedChromeMat);
    micStem.position.y = 0.35;
    micStem.castShadow = true;
    micGroup.add(micStem);

    const yokeBottom = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.04, 0.06)), brushedChromeMat);
    yokeBottom.position.y = 0.62;
    micGroup.add(yokeBottom);

    const yokeArmGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.34, 0.05));
    const yokeL = new THREE.Mesh(yokeArmGeo, brushedChromeMat);
    yokeL.position.set(-0.16, 0.78, 0);
    const yokeR = new THREE.Mesh(yokeArmGeo, brushedChromeMat);
    yokeR.position.set(0.16, 0.78, 0);
    micGroup.add(yokeL, yokeR);

    const screwGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16));
    const screwL = new THREE.Mesh(screwGeo, warmBrassMat);
    screwL.rotation.z = Math.PI / 2;
    screwL.position.set(-0.2, 0.9, 0);
    const screwR = new THREE.Mesh(screwGeo, warmBrassMat);
    screwR.rotation.z = Math.PI / 2;
    screwR.position.set(0.2, 0.9, 0);
    micGroup.add(screwL, screwR);

    const micCapsuleGroup = new THREE.Group();
    micCapsuleGroup.position.set(0, 0.9, 0);
    micCapsuleGroup.rotation.x = 0.16;

    const micBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.115, 0.11, 0.26, 24)), darkAnodizedMat);
    micBody.position.y = -0.05;
    micBody.castShadow = true;
    micCapsuleGroup.add(micBody);

    const grilleTex = trackTex(createMicGrilleTexture(maxAnisotropy));
    const micGrilleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: grilleTex,
        roughness: 0.35,
        metalness: 0.82,
      }),
    );
    const micHead = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.114, 0.15, 10, 24)), micGrilleMat);
    micHead.position.y = 0.17;
    micHead.castShadow = true;
    micCapsuleGroup.add(micHead);

    const tallyRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.118, 0.014, 12, 28)), vermilionAccentMat);
    tallyRing.rotation.x = Math.PI / 2;
    tallyRing.position.y = 0.075;
    micCapsuleGroup.add(tallyRing);

    micGroup.add(micCapsuleGroup);

    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, -0.05),
      new THREE.Vector3(-0.2, 0.05, -0.42),
      new THREE.Vector3(0.32, 0.03, -0.68),
      new THREE.Vector3(0.75, 0.03, -0.58),
    ]);
    const cableMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(cableCurve, 24, 0.02, 8, false)),
      matteRubberMat,
    );
    micGroup.add(cableMesh);
    scene.add(micGroup);

    // === 3. VIDEO EDITING MONITOR & ROTARY JOG DECK ===
    const editorGroup = new THREE.Group();
    editorGroup.position.set(0.08, 0.02, -0.35);

    const monBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.04, 0.44)), darkAnodizedMat);
    monBase.position.set(0, 0.02, -0.15);
    editorGroup.add(monBase);

    const monNeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.56, 0.08)), brushedChromeMat);
    monNeck.position.set(0, 0.3, -0.25);
    monNeck.rotation.x = -0.12;
    editorGroup.add(monNeck);

    const monBezel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.92, 1.08, 0.08)), darkAnodizedMat);
    monBezel.position.set(0, 0.88, -0.2);
    monBezel.castShadow = true;
    editorGroup.add(monBezel);

    const timelineCanvas = document.createElement('canvas');
    timelineCanvas.width = 512;
    timelineCanvas.height = 304;
    drawTimelineCanvas(timelineCanvas, presetRef.current, moodRef.current, 0);
    const timelineTex = trackTex(new THREE.CanvasTexture(timelineCanvas));
    timelineTex.colorSpace = THREE.SRGBColorSpace;
    timelineTex.anisotropy = maxAnisotropy;

    const screenMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: timelineTex,
        emissive: 0xffffff,
        emissiveMap: timelineTex,
        emissiveIntensity: 0.52,
        roughness: 0.18,
        metalness: 0.05,
      }),
    );
    const screenPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.82, 0.98)), screenMat);
    screenPlane.position.set(0, 0.88, -0.156);
    editorGroup.add(screenPlane);

    const deckBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.26, 0.08, 0.56)), darkAnodizedMat);
    deckBody.position.set(0, 0.04, 0.56);
    deckBody.rotation.x = 0.08;
    deckBody.castShadow = true;
    editorGroup.add(deckBody);

    const jogGroup = new THREE.Group();
    jogGroup.position.set(0.32, 0.1, 0.56);
    jogGroup.rotation.x = 0.08;

    const jogWheel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.17, 0.18, 0.06, 32)), brushedChromeMat);
    jogGroup.add(jogWheel);

    const jogDimple = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.065, 16)), vermilionAccentMat);
    jogDimple.position.set(0.07, 0.005, 0);
    jogGroup.add(jogDimple);
    editorGroup.add(jogGroup);

    const keyGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.04, 0.11));
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const isCutKey = row === 1 && col === 2;
        const keyMesh = new THREE.Mesh(keyGeo, isCutKey ? vermilionAccentMat : matteRubberMat);
        keyMesh.position.set(-0.42 + col * 0.16, 0.095 - row * 0.01, 0.48 + row * 0.16);
        keyMesh.rotation.x = 0.08;
        editorGroup.add(keyMesh);
      }
    }
    scene.add(editorGroup);

    // === 4. CINEMA DIRECTOR'S CLAPPERBOARD ===
    const clapperGroup = new THREE.Group();
    clapperGroup.position.set(1.36, 0.02, 0.44);
    clapperGroup.rotation.y = -0.38;

    const slateCanvas = document.createElement('canvas');
    slateCanvas.width = 512;
    slateCanvas.height = 384;
    drawClapperSlateCanvas(slateCanvas, 1);
    const slateTex = trackTex(new THREE.CanvasTexture(slateCanvas));
    slateTex.colorSpace = THREE.SRGBColorSpace;
    slateTex.anisotropy = maxAnisotropy;

    const slateFaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: slateTex,
        roughness: 0.55,
        metalness: 0.1,
      }),
    );

    const slateStand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 0.05, 0.32)), matteRubberMat);
    slateStand.position.set(0, 0.025, 0);
    clapperGroup.add(slateStand);

    const slateBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.72, 0.045)), [
      darkAnodizedMat,
      darkAnodizedMat,
      darkAnodizedMat,
      darkAnodizedMat,
      slateFaceMat,
      darkAnodizedMat,
    ]);
    slateBody.position.set(0, 0.4, 0);
    slateBody.rotation.x = -0.14;
    slateBody.castShadow = true;
    clapperGroup.add(slateBody);

    const stripeTex = trackTex(createClapperStripeTexture(maxAnisotropy));
    const stripeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: stripeTex,
        roughness: 0.45,
        metalness: 0.12,
      }),
    );
    const lowerClap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.1, 0.052)), stripeMat);
    lowerClap.position.set(0, 0.8, -0.055);
    lowerClap.rotation.x = -0.14;
    clapperGroup.add(lowerClap);

    const upperClapPivot = new THREE.Group();
    upperClapPivot.position.set(-0.48, 0.85, -0.062);
    upperClapPivot.rotation.x = -0.14;
    upperClapPivot.rotation.z = 0.24;

    const upperClap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.1, 0.052)), stripeMat);
    upperClap.position.set(0.49, 0.05, 0);
    upperClap.castShadow = true;
    upperClapPivot.add(upperClap);

    const hingeBolt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.075, 16)), warmBrassMat);
    hingeBolt.rotation.x = Math.PI / 2;
    upperClapPivot.add(hingeBolt);

    clapperGroup.add(upperClapPivot);
    scene.add(clapperGroup);

    // === 5. STUDIO HEADPHONES ON STAND ===
    const hpGroup = new THREE.Group();
    hpGroup.position.set(2.05, 0.02, -0.42);
    hpGroup.rotation.y = -0.52;

    const hpBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.23, 0.04, 24)), darkAnodizedMat);
    hpBase.position.y = 0.02;
    hpGroup.add(hpBase);

    const hpStandRod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.86, 14)), brushedChromeMat);
    hpStandRod.position.y = 0.45;
    hpGroup.add(hpStandRod);

    const bandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.52, 0),
      new THREE.Vector3(-0.22, 0.84, 0),
      new THREE.Vector3(0, 0.94, 0),
      new THREE.Vector3(0.22, 0.84, 0),
      new THREE.Vector3(0.24, 0.52, 0),
    ]);
    const bandMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bandCurve, 24, 0.03, 10, false)),
      matteRubberMat,
    );
    hpGroup.add(bandMesh);

    const cupOuterGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.13, 0.07, 24));
    const cupPadGeo = trackGeo(new THREE.TorusGeometry(0.115, 0.038, 12, 24));
    [-1, 1].forEach((side) => {
      const cup = new THREE.Mesh(cupOuterGeo, darkAnodizedMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.25, 0.48, 0);
      hpGroup.add(cup);

      const pad = new THREE.Mesh(cupPadGeo, matteRubberMat);
      pad.rotation.y = Math.PI / 2;
      pad.position.set(side * 0.21, 0.48, 0);
      hpGroup.add(pad);
    });
    scene.add(hpGroup);

    // === INVISIBLE RAYCAST PROXIES ===
    const proxyMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
    const createProxy = (
      preset: StudioFocusPreset,
      size: [number, number, number],
      pos: [number, number, number],
    ) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(...size)), proxyMat);
      mesh.position.set(...pos);
      mesh.userData.preset = preset;
      scene.add(mesh);
      return mesh;
    };

    const interactables = [
      createProxy('voice-comedy', [0.85, 1.35, 0.85], [-1.5, 0.68, 0.2]),
      createProxy('video-editing', [2.1, 1.45, 1.35], [0.08, 0.72, 0.05]),
      createProxy('horror-storytelling', [1.2, 1.15, 0.9], [1.36, 0.56, 0.44]),
    ];

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // === COALESCED ON-DEMAND RENDERING + SMOOTH DAMPING ===
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let transitionActive = false;
    let clapAnimTime = 0;
    let wavePhase = 0;
    let currentTake = 1;

    const desiredPos = new THREE.Vector3(...initialCfg.position);
    const desiredTarget = new THREE.Vector3(...initialCfg.target);
    const desiredKeyColor = new THREE.Color(initialMood.keyHex);
    const desiredRimColor = new THREE.Color(initialMood.rimHex);
    const desiredFillColor = new THREE.Color(initialMood.fillHex);
    const desiredBgColor = new THREE.Color(initialMood.bgHex);
    const lastTimeRef = { current: performance.now() };
    let targetJogY = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const now = performance.now();
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.08);
        lastTimeRef.current = now;

        if (transitionActive || clapAnimTime > 0) {
          const factor = isSoftwareGl ? 0.5 : 1 - Math.exp(-6.8 * Math.max(dt, 0.016));
          camera.position.lerp(desiredPos, factor);
          controls.target.lerp(desiredTarget, factor);
          keyLight.color.lerp(desiredKeyColor, factor);
          rimLight.color.lerp(desiredRimColor, factor);
          fillPoint.color.lerp(desiredFillColor, factor);
          bgColor.lerp(desiredBgColor, factor);
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.copy(bgColor);
          }
          jogGroup.rotation.y = THREE.MathUtils.lerp(jogGroup.rotation.y, targetJogY, factor);

          // Clapperboard snap pulse animation
          if (clapAnimTime > 0) {
            clapAnimTime = Math.max(0, clapAnimTime - Math.max(dt, 0.05));
            const snapProgress = Math.sin((1 - clapAnimTime / 0.45) * Math.PI);
            upperClapPivot.rotation.z = THREE.MathUtils.lerp(0.24, 0.01, snapProgress);
          } else {
            const restAngle = presetRef.current === 'horror-storytelling' ? 0.06 : 0.24;
            upperClapPivot.rotation.z = THREE.MathUtils.lerp(
              upperClapPivot.rotation.z,
              restAngle,
              factor,
            );
          }

          const distPos = camera.position.distanceTo(desiredPos);
          const distTarget = controls.target.distanceTo(desiredTarget);
          const colorDiff =
            Math.abs(rimLight.color.r - desiredRimColor.r) +
            Math.abs(rimLight.color.g - desiredRimColor.g) +
            Math.abs(rimLight.color.b - desiredRimColor.b);

          if (distPos < 0.015 && distTarget < 0.015 && colorDiff < 0.01 && clapAnimTime <= 0) {
            camera.position.copy(desiredPos);
            controls.target.copy(desiredTarget);
            keyLight.color.copy(desiredKeyColor);
            rimLight.color.copy(desiredRimColor);
            fillPoint.color.copy(desiredFillColor);
            bgColor.copy(desiredBgColor);
            transitionActive = false;
          } else {
            renderDirty = true;
          }
        }

        const dampingMoved = controls.update();
        if (!isSoftwareGl && dampingMoved) {
          renderDirty = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && renderDirty) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    triggerUpdateRef.current = (
      preset: StudioFocusPreset,
      mood: StudioLightingMood,
      clap = false,
    ) => {
      const cfg = CAMERA_PRESETS[preset];
      const moodCfg = LIGHTING_MOODS[mood];
      desiredPos.set(...cfg.position);
      desiredTarget.set(...cfg.target);
      desiredKeyColor.setHex(moodCfg.keyHex);
      desiredRimColor.setHex(moodCfg.rimHex);
      desiredFillColor.setHex(moodCfg.fillHex);
      desiredBgColor.setHex(moodCfg.bgHex);

      wavePhase += 1.4;
      targetJogY += preset === 'video-editing' ? 1.8 : 0.4;

      if (clap) {
        clapAnimTime = 0.45;
        currentTake = currentTake >= 99 ? 1 : currentTake + 1;
        drawClapperSlateCanvas(slateCanvas, currentTake);
        slateTex.needsUpdate = true;
      }

      drawTimelineCanvas(timelineCanvas, preset, mood, wavePhase);
      timelineTex.needsUpdate = true;
      transitionActive = true;
      lastTimeRef.current = performance.now();
      requestRender();
    };

    const handleControlStart = () => {
      transitionActive = false;
    };
    const handleControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', handleControlChange);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let lastHoverCheck = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updateNdc = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 60) return;
      lastHoverCheck = now;

      updateNdc(event);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      const hitPreset = (hits[0]?.object.userData.preset as StudioFocusPreset | undefined) ?? null;
      renderer.domElement.style.cursor = hitPreset ? 'pointer' : 'grab';
      setHoveredProp((prev) => (prev === hitPreset ? prev : hitPreset));
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(
        event.clientX - pointerDownPos.x,
        event.clientY - pointerDownPos.y,
      );
      if (moved > 6) return;

      updateNdc(event);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      const hitPreset = hits[0]?.object.userData.preset as StudioFocusPreset | undefined;
      if (hitPreset) {
        if (hitPreset === 'horror-storytelling') {
          if (soundEnabledRef.current) playClapperSound();
          setTakeCount((t) => (t >= 99 ? 1 : t + 1));
          triggerUpdateRef.current?.(hitPreset, moodRef.current, true);
        }
        onPresetChangeRef.current(hitPreset);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setWebglUnavailable(true);
    };
    const handleContextRestored = () => {
      setWebglUnavailable(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('change', handleControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      triggerUpdateRef.current = null;
    };
  }, []);

  const currentInfo = CAMERA_PRESETS[activePreset];
  const hoveredInfo = hoveredProp ? CAMERA_PRESETS[hoveredProp] : null;
  const presetOrder: StudioFocusPreset[] = [
    'overview',
    'voice-comedy',
    'video-editing',
    'horror-storytelling',
  ];
  const moodOrder: StudioLightingMood[] = ['warm-stage', 'horror-noir', 'edit-suite'];

  return (
    <div
      className="relative w-full h-[480px] sm:h-[540px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#0C0C10]"
      data-testid="creator-3d-stage"
      data-active-preset={activePreset}
      data-lighting-mood={lightingMood}
      data-take-count={takeCount}
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {webglUnavailable && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-[#101014]">
          <p className="text-lg font-semibold text-[#F4F2EC] mb-2">
            3D Studio Preview Unavailable
          </p>
          <p className="text-sm text-[#A6A4AE] max-w-md mb-5">
            Your browser temporarily disabled 3D graphics. You can still browse Bhuvi’s showreel and experience below.
          </p>
          <button
            type="button"
            onClick={() => onJumpToGenre('All')}
            className="px-4 py-2 rounded-lg bg-[#E53935] text-white text-sm font-medium"
          >
            Jump to Showreel
          </button>
        </div>
      )}

      {/* Minimal Top-Left Contextual Caption */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 sm:right-auto sm:max-w-sm z-10">
        <div className="rounded-xl bg-[#111116]/92 border border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-medium text-[#E53935]">
              {hoveredInfo ? `Click to focus: ${hoveredInfo.label}` : currentInfo.label}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#8C8A94]">
              Take {String(takeCount).padStart(2, '0')}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#F4F2EC] leading-snug">
            {currentInfo.propTitle}
          </p>
          <p className="text-xs text-[#A6A4AE] leading-relaxed mt-1">
            {currentInfo.propCaption}
          </p>
          {activePreset !== 'overview' && (
            <button
              type="button"
              onClick={() => onJumpToGenre(currentInfo.targetGenre)}
              className="pointer-events-auto mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#F4F2EC] hover:text-[#E53935] transition-colors"
            >
              Jump to {currentInfo.targetGenre} Reels
              <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[96%] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          className="mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#141419]/95 border border-b-0 border-white/10 text-[11px] font-medium text-[#B8B6C0] hover:text-[#F4F2EC] transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              Show Studio Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              Hide Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            role="toolbar"
            aria-label="3D Studio Controls"
            className="max-w-full rounded-xl bg-[#141419]/95 border border-white/12 px-2 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-center gap-1.5"
          >
            {/* Camera Focus Presets */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 shrink-0">
              {presetOrder.map((presetId) => {
                const cfg = CAMERA_PRESETS[presetId];
                const isActive = activePreset === presetId;
                return (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => onPresetChange(presetId)}
                    aria-pressed={isActive}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#E53935] text-white'
                        : 'text-[#C2C0CA] hover:text-white hover:bg-white/8'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <span aria-hidden="true" className="hidden lg:block w-px h-5 bg-white/12 mx-0.5 shrink-0" />

            {/* Interactive Lighting Moods + Clap Slate + Sound + Reset */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 shrink-0">
              {moodOrder.map((moodId) => {
                const m = LIGHTING_MOODS[moodId];
                const active = lightingMood === moodId;
                return (
                  <button
                    key={moodId}
                    type="button"
                    onClick={() => onLightingMoodChange(moodId)}
                    aria-pressed={active}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white/14 text-[#F4F2EC]'
                        : 'text-[#8C8A94] hover:text-[#F4F2EC] hover:bg-white/6'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleClapAction}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/12 bg-white/5 hover:bg-[#E53935] hover:border-[#E53935] text-[11px] font-medium text-[#F4F2EC] transition-colors whitespace-nowrap shrink-0"
              >
                <Clapperboard className="w-3.5 h-3.5" aria-hidden="true" />
                Clap Slate
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                aria-label={soundEnabled ? 'Mute studio sound effects' : 'Unmute studio sound effects'}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A6A4AE] hover:text-white hover:bg-white/8 transition-colors shrink-0"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onPresetChange('overview');
                  onLightingMoodChange('warm-stage');
                }}
                aria-label="Reset 3D camera view"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A6A4AE] hover:text-white hover:bg-white/8 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
