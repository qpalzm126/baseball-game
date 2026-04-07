import * as THREE from 'three';
import type { BatterSide, PitcherHand } from '@/game/types';

/* -------------- constants -------------- */

const PLAYER_JERSEY = 0xcc2222;
const CPU_JERSEY = 0x1e40af;
const PLAYER_FIELDER_JERSEY = 0xd93636;
const CPU_FIELDER_JERSEY = 0x2563eb;

const G2T = 1 / 28;
const CANVAS_W = 900;
const CANVAS_H = 600;

const SZ = { halfW: 0.25, bottom: 0.22, top: 0.75 };
const BAT_Y_LOW = 0.42;
const BAT_Y_HIGH = 0.73;

const BBOX_HW = 0.24;
const BBOX_HD = 0.32;

const BAT_HANDLE_R = 0.016;
const BAT_BARREL_R = 0.034;
const BAT_LENGTH = 0.75;
const BAT_SWEET_LO = 0.40;
const BAT_SWEET_HI = 0.72;

const BALL_RADIUS = 0.037;

export function gameToThree(gx: number, gy: number): THREE.Vector3 {
  return new THREE.Vector3((gx - 450) * G2T, 0, (gy - 520) * G2T);
}

export function gameBallToThree(gx: number, gy: number, height: number): THREE.Vector3 {
  return new THREE.Vector3((gx - 450) * G2T, height * G2T, (gy - 520) * G2T);
}

/* -------------- helpers -------------- */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function lerpKeyframes(keys: { t: number; v: number }[], t: number): number {
  if (t <= keys[0].t) return keys[0].v;
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t);
      const ease = f * f * (3 - 2 * f);
      return lerp(keys[i].v, keys[i + 1].v, ease);
    }
  }
  return keys[keys.length - 1].v;
}

function smoothstep(t: number) { return t * t * (3 - 2 * t); }

function makeTextSprite(text: string, fg: string, bg: string, fontSize: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(8, 4, 112, 56, 10); ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.55, 0.28, 1);
  return s;
}

/* -------------- articulated player -------------- */

interface JointedPlayer {
  root: THREE.Group;
  hipJoint: THREE.Object3D;
  rShoulder: THREE.Object3D;
  lShoulder: THREE.Object3D;
  rElbow: THREE.Object3D;
  lElbow: THREE.Object3D;
  rHip: THREE.Object3D;
  lHip: THREE.Object3D;
  head: THREE.Object3D;
  jerseyMat: THREE.MeshStandardMaterial;
  helmetMat: THREE.MeshStandardMaterial;
}

const UPPER_ARM_LEN = 0.16;
const FOREARM_LEN = 0.16;

function createJointedPlayer(jersey: number, pants: number, skin: number = 0xf0c8a0): JointedPlayer {
  const root = new THREE.Group();
  const jMat = new THREE.MeshStandardMaterial({ color: jersey, roughness: 0.65 });
  const pMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.55 });
  const sMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });

  const hipJoint = new THREE.Object3D();
  hipJoint.position.y = 0.48;
  root.add(hipJoint);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.34, 8), jMat);
  torso.position.y = 0.17; torso.castShadow = true;
  hipJoint.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6), sMat);
  neck.position.y = 0.37; hipJoint.add(neck);
  const head = new THREE.Object3D(); head.position.y = 0.47; hipJoint.add(head);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), sMat);
  headMesh.castShadow = true; head.add(headMesh);
  const helmetMat = new THREE.MeshStandardMaterial({ color: jersey, roughness: 0.3 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMat);
  helmet.position.y = 0.02; helmet.castShadow = true; head.add(helmet);

  const makeArm = (xSide: number) => {
    const shoulder = new THREE.Object3D();
    shoulder.position.set(xSide * 0.16, 0.30, 0);
    hipJoint.add(shoulder);
    const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, UPPER_ARM_LEN, 6), sMat);
    upperMesh.position.y = -UPPER_ARM_LEN / 2; upperMesh.castShadow = true;
    shoulder.add(upperMesh);

    const elbow = new THREE.Object3D();
    elbow.position.y = -UPPER_ARM_LEN;
    shoulder.add(elbow);
    const foreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, FOREARM_LEN, 6), sMat);
    foreMesh.position.y = -FOREARM_LEN / 2; foreMesh.castShadow = true;
    elbow.add(foreMesh);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), sMat);
    hand.position.y = -FOREARM_LEN; hand.castShadow = true; elbow.add(hand);

    return { shoulder, elbow };
  };
  const rArm = makeArm(1);
  const lArm = makeArm(-1);

  const makeLeg = (xSide: number) => {
    const hip = new THREE.Object3D();
    hip.position.set(xSide * 0.065, 0.48, 0);
    root.add(hip);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.22, 6), pMat);
    upper.position.y = -0.11; upper.castShadow = true; hip.add(upper);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.22, 6), pMat);
    lower.position.y = -0.33; lower.castShadow = true; hip.add(lower);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    shoe.position.set(0, -0.44, 0.015); hip.add(shoe);
    return hip;
  };
  const rHip = makeLeg(1);
  const lHip = makeLeg(-1);

  return {
    root, hipJoint,
    rShoulder: rArm.shoulder, lShoulder: lArm.shoulder,
    rElbow: rArm.elbow, lElbow: lArm.elbow,
    rHip, lHip, head, jerseyMat: jMat, helmetMat,
  };
}

/* -------------- bat model -------------- */

interface BatModel { group: THREE.Group; handleMarker: THREE.Object3D; tipMarker: THREE.Object3D; }

function createBatModel(): BatModel {
  const group = new THREE.Group();
  const hMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.5 });
  const bMat = new THREE.MeshStandardMaterial({ color: 0xc49a3c, roughness: 0.35, metalness: 0.1 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.75 });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), hMat);
  knob.position.y = -0.02; group.add(knob);

  const bottomGrip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), gloveMat);
  bottomGrip.position.y = 0.04; bottomGrip.castShadow = true; group.add(bottomGrip);
  const topGrip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), gloveMat);
  topGrip.position.y = 0.12; topGrip.castShadow = true; group.add(topGrip);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(BAT_HANDLE_R, BAT_HANDLE_R, 0.28, 8), hMat);
  handle.position.y = 0.14; handle.castShadow = true; group.add(handle);
  const taper = new THREE.Mesh(new THREE.CylinderGeometry(BAT_BARREL_R, BAT_HANDLE_R, 0.12, 8), bMat);
  taper.position.y = 0.34; taper.castShadow = true; group.add(taper);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(BAT_BARREL_R, BAT_BARREL_R, 0.30, 8), bMat);
  barrel.position.y = 0.55; barrel.castShadow = true; group.add(barrel);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(BAT_BARREL_R, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), bMat);
  cap.position.y = 0.70; group.add(cap);
  const handleMarker = new THREE.Object3D(); handleMarker.position.y = 0; group.add(handleMarker);
  const tipMarker = new THREE.Object3D(); tipMarker.position.y = BAT_LENGTH; group.add(tipMarker);
  return { group, handleMarker, tipMarker };
}

/* -------------- animation keyframes -------------- */

const P_BODY_Y  = [{ t: 0, v: 0 }, { t: 0.15, v: 0.01 }, { t: 0.30, v: 0.06 }, { t: 0.50, v: 0.02 }, { t: 0.70, v: -0.02 }, { t: 0.85, v: 0 }, { t: 1, v: 0 }];
const P_R_ARM_X = [{ t: 0, v: 0 }, { t: 0.15, v: -0.6 }, { t: 0.30, v: -1.6 }, { t: 0.48, v: -2.8 }, { t: 0.60, v: -3.0 }, { t: 0.72, v: -2.0 }, { t: 0.82, v: -0.6 }, { t: 0.92, v: 0.3 }, { t: 1, v: 0 }];
const P_R_ARM_Z = [{ t: 0, v: 0 }, { t: 0.30, v: 0.3 }, { t: 0.48, v: 0.5 }, { t: 0.60, v: 0.35 }, { t: 0.72, v: 0.15 }, { t: 0.82, v: -0.2 }, { t: 0.92, v: -0.1 }, { t: 1, v: 0 }];
const P_R_ELBOW_X = [{ t: 0, v: 0 }, { t: 0.20, v: -0.8 }, { t: 0.38, v: -1.5 }, { t: 0.55, v: -1.6 }, { t: 0.66, v: -0.8 }, { t: 0.72, v: -0.15 }, { t: 0.85, v: -0.3 }, { t: 1, v: 0 }];
const P_L_LEG_X = [{ t: 0, v: 0 }, { t: 0.20, v: 0.6 }, { t: 0.35, v: 1.1 }, { t: 0.50, v: 0.4 }, { t: 0.65, v: -0.1 }, { t: 0.80, v: -0.2 }, { t: 1, v: 0 }];
const P_HIP_Y   = [{ t: 0, v: 0 }, { t: 0.40, v: 0 }, { t: 0.55, v: -0.5 }, { t: 0.70, v: -0.7 }, { t: 0.85, v: -0.3 }, { t: 1, v: 0 }];
const P_L_ARM_X = [{ t: 0, v: 0 }, { t: 0.15, v: -0.5 }, { t: 0.30, v: -1.2 }, { t: 0.55, v: -0.3 }, { t: 0.75, v: 0.2 }, { t: 1, v: 0 }];
const PITCH_RELEASE_T = 0.72;

/* -- swing keyframes -- */
/* body rotation (hip Y) */
const S_HIP_Y       = [{ t: 0, v: -0.25 }, { t: 0.12, v: -0.35 }, { t: 0.30, v: 0.25 }, { t: 0.45, v: 0.80 }, { t: 0.60, v: 1.10 }, { t: 0.80, v: 1.20 }, { t: 1, v: 1.15 }];
const S_FRONT_LEG   = [{ t: 0, v: 0 }, { t: 0.12, v: 0.15 }, { t: 0.30, v: -0.10 }, { t: 0.50, v: -0.18 }, { t: 1, v: -0.12 }];
/*
 * Bat is parented to battingGroup (world space) during swing.
 * bat.group.rotation.x = PI/2 lays it horizontal (local +Y → world +Z).
 * batPivot.rotation.y sweeps the bat in the XZ plane.
 * batPivot.rotation.x tilts the swing plane upward (uppercut angle).
 * Angle INCREASES: bat starts behind batter, sweeps forward through z=0.
 *
 * Right-handed (sign=1, bx=-0.45, pivotZ=0.20):
 *   tip direction = (sin(a), 0, cos(a)) relative to pivot.
 *   Tip crosses z=0 at angle ≈ 1.84  →  sweet spot at a ≈ 2.0.
 */
const S_BAT_ANGLE   = [{ t: 0, v: 0.40 }, { t: 0.10, v: 0.35 }, { t: 0.22, v: 0.80 }, { t: 0.33, v: 1.35 }, { t: 0.42, v: 1.80 }, { t: 0.50, v: 2.15 }, { t: 0.60, v: 2.55 }, { t: 0.75, v: 2.90 }, { t: 0.90, v: 3.10 }, { t: 1, v: 3.15 }];
/* barrel vertical path: positive = barrel below hands, negative = barrel above hands.
 * Mimics real swing: barrel drops behind the body, then rises up through the zone. */
const S_BAT_TILT    = [{ t: 0, v: 0.30 }, { t: 0.15, v: 0.38 }, { t: 0.28, v: 0.22 }, { t: 0.38, v: 0.05 }, { t: 0.48, v: -0.10 }, { t: 0.60, v: -0.22 }, { t: 0.75, v: -0.35 }, { t: 1, v: -0.42 }];
const SWING_CONTACT_LO = 0.35;
const SWING_CONTACT_HI = 0.58;
const SWING_DURATION = 0.22;

/* -------------- MAIN CLASS -------------- */

export class ThreeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private w: number; private h: number;

  /* camera transition */
  private camPosFrom = new THREE.Vector3();
  private camPosTo = new THREE.Vector3();
  private camLookFrom = new THREE.Vector3(0, 0.40, -5);
  private camLookTo = new THREE.Vector3(0, 0.40, -5);
  private camLookCur = new THREE.Vector3(0, 0.40, -5);
  private camT = 1;
  private camSpeed = 2.0;
  private currentMode: 'batting' | 'fielding' = 'batting';

  /* batting camera orbit */
  private battingCamAngle = 0;
  private static readonly MAX_BAT_CAM_ANGLE = 0.44;
  private static readonly Y_AXIS = new THREE.Vector3(0, 1, 0);

  private battingGroup = new THREE.Group();
  private fieldGroup = new THREE.Group();

  private isPlayerBattingState = true;

  /* pitcher */
  private pitcher: JointedPlayer;
  private pitcherAnimT = 0;
  private pitcherReleased = false;
  private pitcherZ = -6.4;
  private pitcherHand: PitcherHand = 'right';
  private moundMesh: THREE.Mesh | null = null;
  private rubberMesh: THREE.Mesh | null = null;

  /* batter */
  private batter: JointedPlayer;
  private bat: BatModel;
  private batPivot: THREE.Object3D;
  private batterSide: BatterSide = 'right';
  private batterXOffset = 0;
  private batterZOffset = 0;
  private batHeightNorm = 0.5;
  private swingT = -1;
  private swingDur = SWING_DURATION;
  private prevBatTip = new THREE.Vector3();
  private batTipVel = new THREE.Vector3();
  private _bunting = false;

  /* ball */
  private ballMesh: THREE.Mesh;
  private ballTrail: THREE.Points;
  private ballTrailMat: THREE.PointsMaterial;
  private trailPositions: THREE.Vector3[] = [];
  private ballShadow: THREE.Mesh;

  /* reticle (sweet spot indicator on strike zone) */
  private reticle: THREE.Group;
  private reticleOpacityEntries: { mat: THREE.MeshBasicMaterial | THREE.LineBasicMaterial; base: number }[] = [];
  private sweetSpotTarget = new THREE.Vector2(0, 0.8);
  private chargeRing: THREE.Mesh | null = null;
  private rangeArc: THREE.Line | null = null;
  private readonly RANGE_ARC_SEGS = 40;

  /* pitch spot marker (shows where pitch crossed plate) */
  private pitchSpot: THREE.Mesh;
  private pitchSpotTimer = 0;
  private readonly PITCH_SPOT_DURATION = 1.2;

  /* pitch aim reticle (for pitcher aiming) */
  private pitchAimReticle: THREE.Group;
  private pitchAimTarget = new THREE.Vector2(0, 0.8);
  private pitchTrajectoryLine: THREE.Line | null = null;
  private readonly TRAJ_SEGS = 50;

  /* field wall & stands */
  private wallMesh: THREE.Mesh | null = null;
  private standsGroup: THREE.Group | null = null;
  private standsMaterials: THREE.Material[] = [];
  private standsTargetOpacity = 0.18;
  private standsCurrentOpacity = 0.18;
  private wallRadiusTH = 32;
  private wallHeightTH = 1.5;

  /* fielding */
  private fielderModels = new Map<number, { model: JointedPlayer; label: THREE.Sprite; hotkey: THREE.Sprite }>();
  private runnerMeshes = new Map<string, JointedPlayer>();

  constructor(container: HTMLDivElement) {
    this.w = container.clientWidth;
    this.h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.w, this.h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    const aspect = this.w / this.h;
    this.camera = new THREE.PerspectiveCamera(47, aspect, 0.1, 200);
    this.camera.position.set(0.20, 0.62, 2.5);
    this.camera.lookAt(0, 0.40, -5);

    this.buildEnvironment();
    this.buildField();
    this.buildStrikeZone();
    this.pitchSpot = this.buildPitchSpot();
    this.reticle = this.buildReticle();
    this.buildRangeArc();
    this.pitchAimReticle = this.buildPitchAimReticle();
    this.buildPitchTrajectoryLine();

    this.pitcher = createJointedPlayer(0x1e40af, 0xdcdcdc);
    this.pitcher.root.position.set(0, 0, -6.4);
    this.pitcher.root.rotation.y = Math.PI;
    this.battingGroup.add(this.pitcher.root);

    this.batter = createJointedPlayer(0xcc2222, 0xeeeeee);
    this.battingGroup.add(this.batter.root);
    this.batPivot = new THREE.Object3D();
    this.bat = createBatModel();
    this.batPivot.add(this.bat.group);
    this.attachBatToHand();
    this.positionBatter();

    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.55 }),
    );
    this.ballMesh.castShadow = true; this.ballMesh.visible = false;
    this.scene.add(this.ballMesh);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(30 * 3), 3));
    this.ballTrailMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.022, transparent: true, opacity: 0.55 });
    this.ballTrail = new THREE.Points(trailGeo, this.ballTrailMat);
    this.ballTrail.visible = false;
    this.scene.add(this.ballTrail);

    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2; this.ballShadow.visible = false;
    this.scene.add(this.ballShadow);

    this.scene.add(this.battingGroup);
    this.scene.add(this.fieldGroup);
    window.addEventListener('resize', this.onResize);
  }

  getDomElement() { return this.renderer.domElement; }
  getCamera() { return this.camera; }
  getRendererDom() { return this.renderer.domElement; }

  /* --------- environment --------- */

  private buildEnvironment() {
    const skyGeo = new THREE.SphereGeometry(95, 16, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { topColor: { value: new THREE.Color(0x3a7bd5) }, bottomColor: { value: new THREE.Color(0x87ceeb) } },
      vertexShader: `varying vec3 vWorldPos; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorldPos=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main(){ float h=normalize(vWorldPos).y; gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.0)),1.0); }`,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a6b1e, 0.45);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(10, 22, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb0d4f1, 0.3);
    fill.position.set(-6, 10, -8); this.scene.add(fill);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.006);
  }

  private buildField() {
    const fg = this.fieldGroup;

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e7d1e, roughness: 0.85 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), grassMat);
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; fg.add(grass);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x358822, roughness: 0.85 });
    for (let i = -8; i <= 8; i += 2) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(90, 0.7), stripeMat);
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.002, i * 1.6); fg.add(stripe);
    }

    const dirtMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.75 });
    const hp = gameToThree(450, 520), fb = gameToThree(600, 380);
    const sb = gameToThree(450, 260), tb = gameToThree(300, 380);

    const ds = new THREE.Shape();
    ds.moveTo(hp.x, hp.z); ds.lineTo(fb.x, fb.z); ds.lineTo(sb.x, sb.z); ds.lineTo(tb.x, tb.z); ds.closePath();
    const diamond = new THREE.Mesh(new THREE.ShapeGeometry(ds), dirtMat);
    diamond.rotation.x = -Math.PI / 2; diamond.position.y = 0.005; diamond.receiveShadow = true; fg.add(diamond);

    const homeCircle = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), dirtMat);
    homeCircle.rotation.x = -Math.PI / 2; homeCircle.position.set(hp.x, 0.006, hp.z); fg.add(homeCircle);

    const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xa0782c, roughness: 0.7 }));
    const mp = gameToThree(450, 340);
    mound.position.set(mp.x, 0.09, mp.z); mound.castShadow = true; fg.add(mound);
    this.moundMesh = mound;
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xffffff }));
    rubber.position.set(mp.x, 0.19, mp.z); fg.add(rubber);
    this.rubberMesh = rubber;

    const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    for (const b of [fb, sb, tb]) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), baseMat);
      bm.position.set(b.x, 0.02, b.z); bm.rotation.y = Math.PI / 4; bm.castShadow = true; fg.add(bm);
    }
    const hpShape = new THREE.Shape();
    const pw = 0.16, pd = 0.16;
    hpShape.moveTo(-pw, -pd);
    hpShape.lineTo(pw, -pd);
    hpShape.lineTo(pw, 0);
    hpShape.lineTo(0, pd);
    hpShape.lineTo(-pw, 0);
    hpShape.closePath();
    const hpm = new THREE.Mesh(new THREE.ShapeGeometry(hpShape), baseMat);
    hpm.rotation.x = -Math.PI / 2;
    hpm.position.set(hp.x, 0.01, hp.z);
    fg.add(hpm);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const drawLine = (a: THREE.Vector3, b: THREE.Vector3) => {
      const d = b.clone().sub(a); const len = d.length();
      const geo = new THREE.PlaneGeometry(0.04, len);
      const m = new THREE.Mesh(geo, lineMat);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      m.position.set(mid.x, 0.008, mid.z);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -Math.atan2(d.z, d.x) + Math.PI / 2;
      return m;
    };
    const foulLen = 35;
    const foulDir1 = fb.clone().sub(hp).normalize();
    const foulDir3 = tb.clone().sub(hp).normalize();
    fg.add(drawLine(hp, hp.clone().add(foulDir1.clone().multiplyScalar(foulLen))));
    fg.add(drawLine(hp, hp.clone().add(foulDir3.clone().multiplyScalar(foulLen))));
    const bp = [hp, fb, sb, tb, hp];
    for (let i = 0; i < bp.length - 1; i++) fg.add(drawLine(bp[i], bp[i + 1]));

    const boxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.50 });
    const drawBox = (cx: number, cz: number) => {
      const hw = BBOX_HW, hd = BBOX_HD, lw = 0.025;
      const sides: [number, number, number, number][] = [
        [cx, cz - hd, 2 * hw + lw, lw],
        [cx, cz + hd, 2 * hw + lw, lw],
        [cx - hw, cz, lw, 2 * hd + lw],
        [cx + hw, cz, lw, 2 * hd + lw],
      ];
      for (const [x, z, w, h] of sides) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), boxMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.009, z);
        fg.add(m);
      }
    };
    const defZ = 0.45;
    drawBox(-0.55, defZ);
    drawBox(0.55, defZ);

    this.buildWall(hp);
  }

  private buildWall(hp: { x: number; z: number }) {
    if (this.wallMesh) {
      this.fieldGroup.remove(this.wallMesh);
      this.wallMesh.geometry.dispose();
      (this.wallMesh.material as THREE.Material).dispose();
      this.wallMesh = null;
    }

    const wallR = this.wallRadiusTH;
    const wallH = this.wallHeightTH;
    const wallThick = 0.15;
    const arcStart = -Math.PI / 4 - 0.15;
    const arcEnd = Math.PI / 4 + 0.15;
    const segs = 48;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a5c1a, roughness: 0.6, side: THREE.DoubleSide });

    const verts: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = arcStart + (arcEnd - arcStart) * (i / segs);
      const sinA = Math.sin(a), cosA = Math.cos(a);
      const ox = hp.x + sinA * wallR;
      const oz = hp.z - cosA * wallR;
      const nx = sinA * wallThick * 0.5;
      const nz = -cosA * wallThick * 0.5;
      verts.push(ox - nx, 0, oz - nz);
      verts.push(ox - nx, wallH, oz - nz);
      verts.push(ox + nx, 0, oz + nz);
      verts.push(ox + nx, wallH, oz + nz);
      if (i < segs) {
        const b = i * 4;
        indices.push(b, b + 1, b + 4, b + 1, b + 5, b + 4);
        indices.push(b + 2, b + 6, b + 3, b + 3, b + 6, b + 7);
        indices.push(b + 1, b + 3, b + 5, b + 3, b + 7, b + 5);
      }
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    wallGeo.setIndex(indices);
    wallGeo.computeVertexNormals();
    const mesh = new THREE.Mesh(wallGeo, wallMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.fieldGroup.add(mesh);
    this.wallMesh = mesh;

    this.buildStands(hp);
  }

  private buildStands(hp: { x: number; z: number }) {
    if (this.standsGroup) {
      this.standsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      this.fieldGroup.remove(this.standsGroup);
      this.standsGroup = null;
    }

    const group = new THREE.Group();
    const wallR = this.wallRadiusTH;
    const wallH = this.wallHeightTH;
    const arcStart = -Math.PI / 4 - 0.15;
    const arcEnd = Math.PI / 4 + 0.15;
    const segs = 48;

    const numTiers = 6;
    const tierDepth = 1.8;
    const tierRise = wallH * 0.65;

    const tierColors = [0x5577bb, 0x4466aa, 0x6688cc, 0x5577bb, 0x4466aa, 0x6688cc];
    const seatColors = [0xbb5555, 0x5577bb, 0xbbaa55, 0xbb5555, 0x5577bb, 0xbbaa55];
    this.standsMaterials = [];

    for (let t = 0; t < numTiers; t++) {
      const innerR = wallR + t * tierDepth + 0.1;
      const outerR = wallR + (t + 1) * tierDepth;
      const baseY = wallH + t * tierRise;
      const topY = wallH + (t + 1) * tierRise;

      const initOp = this.standsCurrentOpacity;
      const tierMat = new THREE.MeshStandardMaterial({
        color: tierColors[t % tierColors.length], roughness: 0.8,
        transparent: true, opacity: initOp, depthWrite: false,
      });
      const seatMat = new THREE.MeshStandardMaterial({
        color: seatColors[t % seatColors.length], roughness: 0.7,
        transparent: true, opacity: initOp, depthWrite: false,
      });
      this.standsMaterials.push(tierMat, seatMat);

      const floorVerts: number[] = [];
      const floorIdx: number[] = [];
      const riserVerts: number[] = [];
      const riserIdx: number[] = [];

      for (let i = 0; i <= segs; i++) {
        const a = arcStart + (arcEnd - arcStart) * (i / segs);
        const sinA = Math.sin(a), cosA = Math.cos(a);
        const ix = hp.x + sinA * innerR, iz = hp.z - cosA * innerR;
        const ox = hp.x + sinA * outerR, oz = hp.z - cosA * outerR;

        floorVerts.push(ix, topY, iz);
        floorVerts.push(ox, topY, oz);

        riserVerts.push(ix, baseY, iz);
        riserVerts.push(ix, topY, iz);

        if (i < segs) {
          const b = i * 2;
          floorIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
          riserIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }

      const floorGeo = new THREE.BufferGeometry();
      floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorVerts, 3));
      floorGeo.setIndex(floorIdx);
      floorGeo.computeVertexNormals();
      const floor = new THREE.Mesh(floorGeo, tierMat);
      floor.receiveShadow = true;
      group.add(floor);

      const riserGeo = new THREE.BufferGeometry();
      riserGeo.setAttribute('position', new THREE.Float32BufferAttribute(riserVerts, 3));
      riserGeo.setIndex(riserIdx);
      riserGeo.computeVertexNormals();
      const riser = new THREE.Mesh(riserGeo, seatMat);
      group.add(riser);
    }

    const crowdCount = Math.floor(segs * numTiers * 3);
    const dotPositions = new Float32Array(crowdCount * 3);
    const dotColors = new Float32Array(crowdCount * 3);
    const skinHues = [
      [1.0, 0.85, 0.7], [0.95, 0.78, 0.6], [0.85, 0.65, 0.45],
      [0.7, 0.5, 0.3], [0.55, 0.38, 0.22],
    ];
    const shirtHues = [
      [1, 0.2, 0.2], [0.2, 0.4, 1], [1, 1, 0.3], [0.9, 0.9, 0.9],
      [1, 0.5, 0.1], [0.2, 0.8, 0.3], [0.6, 0.2, 0.8],
    ];
    let di = 0;
    for (let t = 0; t < numTiers; t++) {
      const r = wallR + (t + 0.5) * tierDepth;
      const y = wallH + (t + 0.85) * tierRise;
      const dotsPerRow = Math.floor(crowdCount / numTiers);
      for (let d = 0; d < dotsPerRow; d++) {
        const frac = (d + Math.random() * 0.6) / dotsPerRow;
        const a = arcStart + (arcEnd - arcStart) * frac;
        const rOff = r + (Math.random() - 0.5) * tierDepth * 0.7;
        dotPositions[di * 3] = hp.x + Math.sin(a) * rOff;
        dotPositions[di * 3 + 1] = y + (Math.random() - 0.3) * tierRise * 0.5;
        dotPositions[di * 3 + 2] = hp.z - Math.cos(a) * rOff;
        const col = Math.random() < 0.35
          ? skinHues[Math.floor(Math.random() * skinHues.length)]
          : shirtHues[Math.floor(Math.random() * shirtHues.length)];
        dotColors[di * 3] = col[0];
        dotColors[di * 3 + 1] = col[1];
        dotColors[di * 3 + 2] = col[2];
        di++;
      }
    }
    const crowdGeo = new THREE.BufferGeometry();
    crowdGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions.slice(0, di * 3), 3));
    crowdGeo.setAttribute('color', new THREE.BufferAttribute(dotColors.slice(0, di * 3), 3));
    const initOp = this.standsCurrentOpacity;
    const crowdMat = new THREE.PointsMaterial({
      size: 0.25, vertexColors: true, sizeAttenuation: true,
      transparent: true, opacity: initOp, depthWrite: false,
    });
    this.standsMaterials.push(crowdMat);
    group.add(new THREE.Points(crowdGeo, crowdMat));

    const backR = wallR + numTiers * tierDepth;
    const backH = wallH + numTiers * tierRise;
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a, roughness: 0.9, side: THREE.DoubleSide,
      transparent: true, opacity: initOp, depthWrite: false,
    });
    this.standsMaterials.push(backMat);
    const backVerts: number[] = [];
    const backIdx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = arcStart + (arcEnd - arcStart) * (i / segs);
      backVerts.push(hp.x + Math.sin(a) * backR, 0, hp.z - Math.cos(a) * backR);
      backVerts.push(hp.x + Math.sin(a) * backR, backH, hp.z - Math.cos(a) * backR);
      if (i < segs) {
        const b = i * 2;
        backIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const backGeo = new THREE.BufferGeometry();
    backGeo.setAttribute('position', new THREE.Float32BufferAttribute(backVerts, 3));
    backGeo.setIndex(backIdx);
    backGeo.computeVertexNormals();
    group.add(new THREE.Mesh(backGeo, backMat));

    this.fieldGroup.add(group);
    this.standsGroup = group;
  }

  setFieldSize(wallRadiusGU: number, wallHeightGU: number, moundDistanceFt = 60.5) {
    const G2T = 1 / 28;
    this.wallRadiusTH = wallRadiusGU * G2T;
    this.wallHeightTH = wallHeightGU * G2T;
    const hp = { x: 0, z: 0.6 };
    this.buildWall(hp);

    const PRO_MOUND_FT = 60.5;
    const PRO_Z = -6.4;
    this.pitcherZ = PRO_Z * (moundDistanceFt / PRO_MOUND_FT);
    this.pitcher.root.position.set(0, 0, this.pitcherZ);

    const moundZ = this.pitcherZ + 0.05;
    if (this.moundMesh) this.moundMesh.position.z = moundZ;
    if (this.rubberMesh) this.rubberMesh.position.z = moundZ;
  }

  getPitcherZ(): number { return this.pitcherZ; }

  setPitcherHand(hand: PitcherHand) {
    if (this.pitcherHand === hand) return;
    this.pitcherHand = hand;
    this.resetPitcherAnimation();
  }

  getPitcherHand(): PitcherHand { return this.pitcherHand; }

  private buildStrikeZone() {
    const szGroup = new THREE.Group();
    const w = SZ.halfW * 2, h = SZ.top - SZ.bottom;
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
    for (let r = 0; r <= 3; r++) {
      const y = SZ.bottom + (r / 3) * h;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-SZ.halfW, y, 0), new THREE.Vector3(SZ.halfW, y, 0)]);
      szGroup.add(new THREE.Line(g, mat));
    }
    for (let c = 0; c <= 3; c++) {
      const x = -SZ.halfW + (c / 3) * w;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, SZ.bottom, 0), new THREE.Vector3(x, SZ.top, 0)]);
      szGroup.add(new THREE.Line(g, mat));
    }
    this.battingGroup.add(szGroup);
  }

  private buildPitchSpot(): THREE.Mesh {
    const geo = new THREE.RingGeometry(0.015, 0.032, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.renderOrder = 10;
    this.battingGroup.add(mesh);
    return mesh;
  }

  showPitchSpot(x: number, y: number, inZone: boolean) {
    const mat = this.pitchSpot.material as THREE.MeshBasicMaterial;
    mat.color.set(inZone ? 0x22cc55 : 0xef4444);
    mat.opacity = 0.95;
    this.pitchSpot.position.set(x, y, 0.025);
    this.pitchSpot.visible = true;
    this.pitchSpotTimer = this.PITCH_SPOT_DURATION;
  }

  updatePitchSpot(dt: number) {
    if (this.pitchSpotTimer <= 0) return;
    this.pitchSpotTimer -= dt;
    if (this.pitchSpotTimer <= 0) {
      this.pitchSpot.visible = false;
      return;
    }
    const mat = this.pitchSpot.material as THREE.MeshBasicMaterial;
    const fade = Math.min(1, this.pitchSpotTimer / (this.PITCH_SPOT_DURATION * 0.4));
    mat.opacity = 0.95 * fade;
  }

  private buildReticle(): THREE.Group {
    const g = new THREE.Group();

    const hR = BAT_HANDLE_R;
    const bR = BAT_BARREL_R;
    const knobR = 0.022;
    const handleLen = 0.28;
    const taperLen = 0.12;
    const barrelLen = 0.30;
    const capR = bR;

    const sweetMid = (BAT_SWEET_LO + BAT_SWEET_HI) / 2;

    const batShape = new THREE.Shape();
    batShape.moveTo(0, -knobR);
    batShape.quadraticCurveTo(-knobR * 0.5, -knobR, 0, -hR);
    batShape.lineTo(handleLen, -hR);
    batShape.lineTo(handleLen + taperLen, -bR);
    batShape.lineTo(handleLen + taperLen + barrelLen, -bR);
    batShape.quadraticCurveTo(handleLen + taperLen + barrelLen + capR, 0,
      handleLen + taperLen + barrelLen, bR);
    batShape.lineTo(handleLen + taperLen, bR);
    batShape.lineTo(handleLen, hR);
    batShape.lineTo(0, hR);
    batShape.quadraticCurveTo(-knobR * 0.5, knobR, 0, knobR);
    batShape.quadraticCurveTo(-knobR, 0, 0, -knobR);

    const batGeo = new THREE.ShapeGeometry(batShape);
    const batMat = new THREE.MeshBasicMaterial({
      color: 0xc49a3c, transparent: true, opacity: 0.28,
      depthTest: false, side: THREE.DoubleSide,
    });
    const batMesh = new THREE.Mesh(batGeo, batMat);
    batMesh.position.x = -sweetMid;
    g.add(batMesh);

    const batOutlinePts = batShape.getPoints(48);
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(
      batOutlinePts.map(p => new THREE.Vector3(p.x - sweetMid, p.y, 0)),
    );
    g.add(new THREE.Line(outlineGeo,
      new THREE.LineBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.50 })));

    const ssLeft = BAT_SWEET_LO - sweetMid;
    const ssRight = BAT_SWEET_HI - sweetMid;
    const ssShape = new THREE.Shape();
    ssShape.moveTo(ssLeft, -bR * 0.95);
    ssShape.lineTo(ssRight, -bR * 0.95);
    ssShape.lineTo(ssRight, bR * 0.95);
    ssShape.lineTo(ssLeft, bR * 0.95);
    ssShape.closePath();
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(ssShape),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.18, depthTest: false })));

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.010, 12),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.80, depthTest: false }),
    );
    g.add(dot);

    const cMat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.5 });
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.04, 0, 0), new THREE.Vector3(0.04, 0, 0)]), cMat));
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.04, 0), new THREE.Vector3(0, 0.04, 0)]), cMat));

    const chargeGeo = new THREE.RingGeometry(0.05, 0.065, 32);
    const chargeMat = new THREE.MeshBasicMaterial({
      color: 0xffa500, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide,
    });
    this.chargeRing = new THREE.Mesh(chargeGeo, chargeMat);
    g.add(this.chargeRing);

    g.position.z = 0.02;
    g.visible = false;
    this.battingGroup.add(g);

    this.reticleOpacityEntries = [];
    g.traverse((child) => {
      if (child === this.chargeRing) return;
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        const mat = child.material;
        if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.LineBasicMaterial) {
          this.reticleOpacityEntries.push({ mat, base: mat.opacity });
        }
      }
    });

    return g;
  }

  private getMaxReachX(): number {
    const pivotZ = this.batter.root.position.z - 0.12;
    const rSq = BAT_LENGTH * BAT_LENGTH - pivotZ * pivotZ;
    return rSq > 0 ? Math.sqrt(rSq) : 0;
  }

  private buildRangeArc() {
    const n = this.RANGE_ARC_SEGS;
    const positions = new Float32Array((n + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rangeArc = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: 0xffa500, transparent: true, opacity: 0.22, dashSize: 0.018, gapSize: 0.012,
    }));
    this.rangeArc.visible = false;
    this.battingGroup.add(this.rangeArc);
  }

  private updateRangeArc(visible: boolean) {
    if (!this.rangeArc) return;
    this.rangeArc.visible = visible && this.currentMode === 'batting';
    if (!this.rangeArc.visible) return;

    const batterX = this.batter.root.position.x;
    const { front, behind } = this.getReachLimits();
    const posSign = this.batterSide === 'right' ? -1 : 1;
    const leftEdge = batterX + posSign * behind;
    const rightEdge = batterX - posSign * front;
    const armY = lerp(BAT_Y_LOW, BAT_Y_HIGH, this.batHeightNorm);

    const attr = this.rangeArc.geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = this.RANGE_ARC_SEGS;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(Math.min(leftEdge, rightEdge), Math.max(leftEdge, rightEdge), t);
      const bow = Math.sin(t * Math.PI) * 0.04;
      attr.setXYZ(i, x, armY - bow, 0.015);
    }
    attr.needsUpdate = true;
    this.rangeArc.computeLineDistances();
  }

  private screenToStrikeZone(normX: number, normY: number): { x: number; y: number } | null {
    const ndc = new THREE.Vector2(normX * 2 - 1, -(normY * 2 - 1));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const planeZ = 0;
    const denom = ray.ray.direction.z;
    if (Math.abs(denom) < 1e-6) return null;
    const t = (planeZ - ray.ray.origin.z) / denom;
    if (t < 0) return null;
    const hit = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));
    return { x: hit.x, y: hit.y };
  }

  private getReachLimits(): { front: number; behind: number } {
    const maxReachX = this.getMaxReachX();
    return { front: maxReachX, behind: maxReachX * 0.50 };
  }

  setSweetSpotFromCursor(normX: number, normY: number) {
    const hit = this.screenToStrikeZone(normX, normY);
    if (!hit) return;

    const batterX = this.batter.root.position.x;
    const { front, behind } = this.getReachLimits();
    const posSign = this.batterSide === 'right' ? -1 : 1;

    let tx = hit.x;
    const dx = tx - batterX;
    const isBehind = dx !== 0 && Math.sign(dx) === posSign;
    const limit = isBehind ? behind : front;
    if (Math.abs(dx) > limit) {
      tx = batterX + Math.sign(dx) * limit;
    }

    const yRange = SZ.top - SZ.bottom;
    const yMargin = yRange * 0.2;
    const ty = Math.max(SZ.bottom - yMargin, Math.min(SZ.top + yMargin, hit.y));

    this.sweetSpotTarget.set(tx, ty);
    const batNormY = Math.max(0, Math.min(1, (ty - SZ.bottom) / yRange));
    this.batHeightNorm = batNormY;
    if (this.swingT < 0) {
      this.setBatHeight(batNormY);
    }
  }

  private getChestPivot(): { x: number; y: number } {
    return { x: this.batter.root.position.x, y: 0.72 };
  }

  updateReticle(visible: boolean) {
    this.reticle.visible = visible && this.currentMode === 'batting';
    this.updateRangeArc(visible);
    if (!this.reticle.visible) return;
    const sign = this.batterSide === 'right' ? 1 : -1;
    this.reticle.scale.x = sign;

    const batY = lerp(BAT_Y_LOW, BAT_Y_HIGH, this.batHeightNorm);
    const ghostY = this.sweetSpotTarget.y;

    const batterX = this.batter.root.position.x;
    const sweetMid = (BAT_SWEET_LO + BAT_SWEET_HI) / 2;
    const handleExtent = sweetMid;
    const posSign = this.batterSide === 'right' ? -1 : 1;
    const bodyEdge = batterX - posSign * 0.08;
    let sx = this.sweetSpotTarget.x;
    const handleEnd = sx - sign * handleExtent;
    if (sign > 0 && handleEnd < bodyEdge) sx = bodyEdge + sign * handleExtent;
    if (sign < 0 && handleEnd > bodyEdge) sx = bodyEdge + sign * handleExtent;

    this.reticle.position.set(sx, ghostY, 0.02);

    const chest = this.getChestPivot();
    const dx = this.sweetSpotTarget.x - chest.x;

    /* Tilt derived from the bat pivot-to-target height difference:
     * the bat barrel must dip/rise from batY to reach ghostY. */
    const yDiff = ghostY - batY;
    const tiltAngle = Math.asin(Math.max(-1, Math.min(1, yDiff / sweetMid)));
    const reticleTilt = Math.max(-0.55, Math.min(0.30, tiltAngle));
    this.reticle.rotation.z = reticleTilt;

    const { front, behind } = this.getReachLimits();
    const isBehind = dx !== 0 && Math.sign(dx) === posSign;
    const limit = isBehind ? behind : front;
    const reachRatio = limit > 0 ? Math.abs(dx) / limit : 1;
    const reachFade = reachRatio < 0.75 ? 1.0 : lerp(1.0, 0.45, (reachRatio - 0.75) / 0.25);

    for (const { mat, base } of this.reticleOpacityEntries) {
      mat.opacity = base * reachFade;
    }
  }

  setChargeLevel(level: number) {
    if (!this.chargeRing) return;
    const mat = this.chargeRing.material as THREE.MeshBasicMaterial;
    if (level <= 0) { mat.opacity = 0; return; }
    const s = 0.8 + level * 1.4;
    this.chargeRing.scale.set(s, s, 1);
    mat.opacity = 0.3 + level * 0.5;
    mat.color.setRGB(1.0, 1.0 - level * 0.8, 0);
  }

  /* --------- pitch aim reticle --------- */

  private buildPitchAimReticle(): THREE.Group {
    const g = new THREE.Group();
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0));
    }
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x22cc55, transparent: true, opacity: 0.9 }),
    ));
    const cMat = new THREE.LineBasicMaterial({ color: 0x22cc55, transparent: true, opacity: 0.7 });
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(0.05, 0, 0)]), cMat));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, 0.05, 0)]), cMat));
    g.add(new THREE.Mesh(
      new THREE.CircleGeometry(0.008, 12),
      new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.8, depthTest: false }),
    ));
    g.position.z = 0.02;
    g.visible = false;
    this.battingGroup.add(g);
    return g;
  }

  setPitchAimFromCursor(normX: number, normY: number) {
    const hit = this.screenToStrikeZone(normX, normY);
    if (!hit) return;
    const margin = 0.15;
    const clampedX = Math.max(-SZ.halfW - margin, Math.min(SZ.halfW + margin, hit.x));
    const clampedY = Math.max(SZ.bottom - margin, Math.min(SZ.top + margin, hit.y));
    this.pitchAimTarget.set(clampedX, clampedY);
  }

  getPitchAimPos(): { x: number; y: number } { return { x: this.pitchAimTarget.x, y: this.pitchAimTarget.y }; }

  updatePitchAimReticle(visible: boolean) {
    this.pitchAimReticle.visible = visible && this.currentMode === 'batting';
    if (!this.pitchAimReticle.visible) return;
    this.pitchAimReticle.position.set(this.pitchAimTarget.x, this.pitchAimTarget.y, 0.02);
  }

  /* --------- pitch trajectory preview --------- */

  private buildPitchTrajectoryLine() {
    const n = this.TRAJ_SEGS;
    const positions = new Float32Array((n + 1) * 3);
    const colors = new Float32Array((n + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.pitchTrajectoryLine = new THREE.Line(geo, new THREE.LineDashedMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      dashSize: 0.12,
      gapSize: 0.06,
    }));
    this.pitchTrajectoryLine.visible = false;
    this.battingGroup.add(this.pitchTrajectoryLine);
  }

  updatePitchTrajectory(visible: boolean, breakXAmt: number, breakYAmt: number, pitchFlightSpeed = 2.2) {
    if (!this.pitchTrajectoryLine) return;
    this.pitchTrajectoryLine.visible = visible && this.currentMode === 'batting';
    if (!this.pitchTrajectoryLine.visible) return;

    const rp = this.getPitcherReleasePosSim();
    const startX = rp.x, startY = rp.y, startZ = rp.z;
    const endX = this.pitchAimTarget.x;
    const endY = this.pitchAimTarget.y;
    const endZ = 0;

    const flightTime = 1.0 / Math.max(pitchFlightSpeed, 0.5);
    const PITCH_G = 5.0;

    const posAttr = this.pitchTrajectoryLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.pitchTrajectoryLine.geometry.getAttribute('color') as THREE.BufferAttribute;
    const n = this.TRAJ_SEGS;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const gravityArc = 0.5 * PITCH_G * flightTime * flightTime * t * (1 - t);
      const x = lerp(startX, endX, t) + Math.sin(t * Math.PI) * breakXAmt;
      const y = lerp(startY, endY, t) + Math.sin(t * Math.PI) * breakYAmt * 0.5 + gravityArc;
      const z = lerp(startZ, endZ, t);
      posAttr.setXYZ(i, x, y, z);
      const bright = 0.4 + 0.6 * t;
      colAttr.setXYZ(i, bright, bright, bright);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.pitchTrajectoryLine.computeLineDistances();
  }

  /* --------- camera --------- */

  private getBattingCamPos(): THREE.Vector3 {
    const sideSign = this.batterSide === 'right' ? 1 : -1;
    const base = new THREE.Vector3(sideSign * 0.20, 0.62, 2.5);
    if (this.battingCamAngle !== 0) base.applyAxisAngle(ThreeScene.Y_AXIS, this.battingCamAngle);
    return base;
  }

  private getBattingCamLookAt(): THREE.Vector3 {
    const base = new THREE.Vector3(0, 0.40, -5);
    if (this.battingCamAngle !== 0) base.applyAxisAngle(ThreeScene.Y_AXIS, this.battingCamAngle);
    return base;
  }

  rotateBattingCam(delta: number) {
    this.battingCamAngle = Math.max(
      -ThreeScene.MAX_BAT_CAM_ANGLE,
      Math.min(ThreeScene.MAX_BAT_CAM_ANGLE, this.battingCamAngle + delta),
    );
    if (this.currentMode === 'batting') {
      this.camPosTo.copy(this.getBattingCamPos());
      this.camLookTo.copy(this.getBattingCamLookAt());
      this.camera.position.copy(this.camPosTo);
      this.camLookCur.copy(this.camLookTo);
      this.camera.lookAt(this.camLookCur);
    }
  }

  getBattingCamAngle(): number { return this.battingCamAngle; }

  switchToBattingView(instant = false) {
    if (this.currentMode === 'batting') {
      if (instant && this.camT < 1) { this.camT = 1; this.applyCam(1); }
      return;
    }
    this.currentMode = 'batting';
    this.pitcher.root.visible = true;
    this.camPosFrom.copy(this.camera.position);
    this.camLookFrom.copy(this.camLookCur);
    this.camPosTo.copy(this.getBattingCamPos());
    this.camLookTo.copy(this.getBattingCamLookAt());
    this.camSpeed = 8.0;
    this.camT = instant ? 1 : 0;
    if (instant) this.applyCam(1);
    this.fielderLabelsVisible = false;
    this.applyFielderVisibility();
    this.standsTargetOpacity = 0.18;
    if (instant) this.applyStandsOpacity(0.18);
  }

  switchToFieldingView(instant = false) {
    if (this.currentMode === 'fielding') {
      if (instant && this.camT < 1) { this.camT = 1; this.applyCam(1); }
      return;
    }
    this.currentMode = 'fielding';
    this.pitcher.root.visible = false;
    this.camPosFrom.copy(this.camera.position);
    this.camLookFrom.copy(this.camLookCur);
    this.camPosTo.set(0, 50, 2);
    this.camLookTo.set(0, 0, -14);
    this.camSpeed = 1.8;
    this.camT = instant ? 1 : 0;
    if (instant) this.applyCam(1);
    this.fielderLabelsVisible = true;
    this.applyFielderVisibility();
    this.standsTargetOpacity = 0.85;
    if (instant) this.applyStandsOpacity(0.85);
  }

  private fielderLabelsVisible = false;

  setFielderLabelsVisible(v: boolean) {
    this.fielderLabelsVisible = v;
    this.applyFielderVisibility();
  }

  private applyFielderVisibility() {
    const show = this.fielderLabelsVisible;
    for (const [id, entry] of this.fielderModels) {
      entry.label.visible = show;
      entry.hotkey.visible = show;
      if (id <= 2) entry.model.root.visible = show;
    }
  }

  updateCamera(dt: number) {
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt * this.camSpeed);
      this.applyCam(smoothstep(this.camT));
    }
    if (Math.abs(this.standsCurrentOpacity - this.standsTargetOpacity) > 0.005) {
      const speed = 3.0;
      const diff = this.standsTargetOpacity - this.standsCurrentOpacity;
      this.standsCurrentOpacity += diff * Math.min(1, dt * speed);
      this.applyStandsOpacity(this.standsCurrentOpacity);
    }
  }

  private applyCam(t: number) {
    this.camera.position.lerpVectors(this.camPosFrom, this.camPosTo, t);
    this.camLookCur.lerpVectors(this.camLookFrom, this.camLookTo, t);
    this.camera.lookAt(this.camLookCur);
  }

  private applyStandsOpacity(opacity: number) {
    this.standsCurrentOpacity = opacity;
    for (const mat of this.standsMaterials) {
      mat.opacity = opacity;
    }
  }

  isCameraTransitioning(): boolean { return this.camT < 1; }

  /* --------- team colors --------- */

  setTeamSides(isPlayerBatting: boolean) {
    this.isPlayerBattingState = isPlayerBatting;
    const batterJersey = isPlayerBatting ? PLAYER_JERSEY : CPU_JERSEY;
    const pitcherJersey = isPlayerBatting ? CPU_JERSEY : PLAYER_JERSEY;
    const fielderJersey = isPlayerBatting ? CPU_FIELDER_JERSEY : PLAYER_FIELDER_JERSEY;
    const runnerJersey = isPlayerBatting ? PLAYER_JERSEY : CPU_JERSEY;

    this.batter.jerseyMat.color.setHex(batterJersey);
    this.batter.helmetMat.color.setHex(batterJersey);
    this.pitcher.jerseyMat.color.setHex(pitcherJersey);
    this.pitcher.helmetMat.color.setHex(pitcherJersey);

    for (const [, entry] of this.fielderModels) {
      entry.model.jerseyMat.color.setHex(fielderJersey);
      entry.model.helmetMat.color.setHex(fielderJersey);
    }
    for (const [, m] of this.runnerMeshes) {
      m.jerseyMat.color.setHex(runnerJersey);
      m.helmetMat.color.setHex(runnerJersey);
    }
  }

  /* --------- batter positioning --------- */

  setBatterSide(side: BatterSide) {
    this.batterSide = side;
    this.positionBatter();
  }

  private attachBatToHand() {
    const leadElbow = this.batterSide === 'right' ? this.batter.rElbow : this.batter.lElbow;
    if (this.batPivot.parent) this.batPivot.parent.remove(this.batPivot);
    leadElbow.add(this.batPivot);
    this.batPivot.position.set(0, -FOREARM_LEN, 0);
    const sign = this.batterSide === 'right' ? 1 : -1;
    this.bat.group.rotation.set(0.4, sign * -0.3, 0.75);
    this.batPivot.rotation.set(0, sign * -0.40, 0);
  }

  positionBatter() {
    const posSign = this.batterSide === 'right' ? -1 : 1;
    const bx = posSign * 0.55 + this.batterXOffset;
    this.batter.root.position.set(bx, 0, 0.45 + this.batterZOffset);
    this.batter.root.rotation.y = posSign * 0.3;
    this.attachBatToHand();

    if (this.currentMode === 'batting') {
      this.camPosTo.copy(this.getBattingCamPos());
      this.camLookTo.copy(this.getBattingCamLookAt());
      this.camera.position.copy(this.camPosTo);
      this.camLookCur.copy(this.camLookTo);
      this.camera.lookAt(this.camLookCur);
    }
    this.resetBatterPose();
  }

  private static readonly FOOT_HW = 0.09;

  moveBatterX(dx: number) {
    const limX = BBOX_HW - ThreeScene.FOOT_HW;
    this.batterXOffset = Math.max(-limX, Math.min(limX, this.batterXOffset + dx));
    const posSign = this.batterSide === 'right' ? -1 : 1;
    const bx = posSign * 0.55 + this.batterXOffset;
    this.batter.root.position.x = bx;
    if (this._bunting) this.applyBuntPose();
  }

  moveBatterZ(dz: number) {
    const limZ = BBOX_HD - ThreeScene.FOOT_HW;
    this.batterZOffset = Math.max(-limZ, Math.min(limZ, this.batterZOffset + dz));
    this.batter.root.position.z = 0.45 + this.batterZOffset;
    if (this._bunting) this.applyBuntPose();
  }

  getBatterBodyPos(): { x: number; y: number; z: number } {
    const p = this.batter.root.position;
    return { x: p.x, y: 0.50, z: p.z };
  }

  checkHitByPitch(ballPos: THREE.Vector3): boolean {
    const p = this.batter.root.position;
    const dx = ballPos.x - p.x;
    const dz = ballPos.z - p.z;
    const distXZ = dx * dx + dz * dz;
    const bodyR = 0.18;
    if (distXZ > bodyR * bodyR) return false;
    return ballPos.y > 0.05 && ballPos.y < 1.0;
  }

  resetBatter(visible = true) {
    this.batterXOffset = 0;
    this.batterZOffset = 0;
    this.batHeightNorm = 0.5;
    this.swingT = -1;
    this._bunting = false;
    this.positionBatter();
    this.setBatterVisible(visible);
  }

  resetSwing() {
    this.swingT = -1;
    this._bunting = false;
    this.attachBatToHand();
  }

  setBatterVisible(visible: boolean) {
    this.batter.root.visible = visible;
    this.batPivot.visible = visible;
  }

  setBatHeight(normY: number) {
    this.batHeightNorm = normY;
    if (this._bunting) {
      this.applyBuntPose();
      return;
    }
    if (this.swingT < 0) {
      const sign = this.batterSide === 'right' ? 1 : -1;
      this.batter.rShoulder.rotation.x = lerp(-0.35, -0.60, normY);
      this.batter.lShoulder.rotation.x = lerp(-0.45, -0.70, normY);
      this.batter.rShoulder.rotation.z = sign * lerp(-0.42, -0.62, normY);
      this.batter.lShoulder.rotation.z = sign * lerp(0.32, 0.52, normY);
      this.batter.rElbow.rotation.x = lerp(-1.50, -1.85, normY);
      this.batter.lElbow.rotation.x = lerp(-1.30, -1.65, normY);
    }
  }

  private resetBatterPose() {
    if (this._bunting) { this.applyBuntPose(); return; }
    const sign = this.batterSide === 'right' ? 1 : -1;
    this.batter.hipJoint.rotation.y = sign * -0.25;
    this.batter.hipJoint.rotation.x = 0;
    this.batter.rShoulder.rotation.x = -0.50;
    this.batter.rShoulder.rotation.z = sign * -0.60;
    this.batter.lShoulder.rotation.x = -0.60;
    this.batter.lShoulder.rotation.z = sign * 0.50;
    this.batter.rElbow.rotation.x = -1.80;
    this.batter.lElbow.rotation.x = -1.60;
    this.batPivot.rotation.set(0, sign * -0.40, 0);
    this.batter.rHip.rotation.x = 0.08;
    this.batter.lHip.rotation.x = 0.08;
  }

  private static readonly BUNT_Y_LOW = 0.20;
  private static readonly BUNT_Y_HIGH = 0.78;

  private applyBuntPose() {
    const sign = this.batterSide === 'right' ? 1 : -1;
    this.batter.hipJoint.rotation.y = 0;

    if (this.batPivot.parent !== this.battingGroup) {
      if (this.batPivot.parent) this.batPivot.parent.remove(this.batPivot);
      this.battingGroup.add(this.batPivot);
    }
    const bx = this.batter.root.position.x;
    const bz = this.batter.root.position.z;
    const batY = lerp(ThreeScene.BUNT_Y_LOW, ThreeScene.BUNT_Y_HIGH, this.batHeightNorm);
    this.batPivot.position.set(bx, batY, bz - 0.10);
    this.bat.group.rotation.set(Math.PI / 2, 0, 0);
    this.batPivot.rotation.set(0, sign * 1.57, 0);

    const armLower = lerp(-0.30, -0.90, this.batHeightNorm);
    this.batter.rShoulder.rotation.x = armLower;
    this.batter.rShoulder.rotation.z = sign * -0.20;
    this.batter.lShoulder.rotation.x = armLower;
    this.batter.lShoulder.rotation.z = sign * 0.20;
    this.batter.rElbow.rotation.x = lerp(-0.80, -1.40, this.batHeightNorm);
    this.batter.lElbow.rotation.x = lerp(-0.80, -1.40, this.batHeightNorm);
    this.batter.rHip.rotation.x = 0.12;
    this.batter.lHip.rotation.x = 0.12;
  }

  setBunting(active: boolean) {
    if (this.swingT >= 0) return;
    this._bunting = active;
    if (active) {
      this.applyBuntPose();
    } else {
      this.attachBatToHand();
      this.resetBatterPose();
    }
  }

  isBunting() { return this._bunting; }

  checkBuntBallCollision(ballPos: THREE.Vector3, collisionScale = 1.8): { hit: boolean; contactPoint: THREE.Vector3; contactT: number } {
    if (!this._bunting) return { hit: false, contactPoint: new THREE.Vector3(), contactT: 0 };
    const { handle, tip } = this.getBatWorldEndpoints();
    const ab = tip.clone().sub(handle);
    const ac = ballPos.clone().sub(handle);
    const abLenSq = ab.lengthSq();
    if (abLenSq < 0.0001) return { hit: false, contactPoint: handle, contactT: 0 };
    const t = Math.max(0, Math.min(1, ac.dot(ab) / abLenSq));
    const closest = handle.clone().add(ab.clone().multiplyScalar(t));
    const dist = ballPos.distanceTo(closest);
    const collisionR = BALL_RADIUS + lerp(BAT_HANDLE_R, BAT_BARREL_R, t);
    return { hit: dist <= collisionR * collisionScale, contactPoint: closest, contactT: t };
  }

  /* --------- pitcher animation --------- */

  updatePitcherAnimation(dt: number, speed: number = 1.3): boolean {
    if (this.pitcherAnimT >= 1) return true;
    this.pitcherAnimT += dt * speed;
    if (this.pitcherAnimT > 1) this.pitcherAnimT = 1;
    const t = this.pitcherAnimT;
    const lhp = this.pitcherHand === 'left';
    this.pitcher.root.position.y = lerpKeyframes(P_BODY_Y, t);
    const throwShoulder = lhp ? this.pitcher.lShoulder : this.pitcher.rShoulder;
    const throwElbow = lhp ? this.pitcher.lElbow : this.pitcher.rElbow;
    const gloveShoulder = lhp ? this.pitcher.rShoulder : this.pitcher.lShoulder;
    const strideLeg = lhp ? this.pitcher.rHip : this.pitcher.lHip;
    throwShoulder.rotation.x = lerpKeyframes(P_R_ARM_X, t);
    throwShoulder.rotation.z = lerpKeyframes(P_R_ARM_Z, t) * (lhp ? -1 : 1);
    throwElbow.rotation.x = lerpKeyframes(P_R_ELBOW_X, t);
    gloveShoulder.rotation.x = lerpKeyframes(P_L_ARM_X, t);
    strideLeg.rotation.x = lerpKeyframes(P_L_LEG_X, t);
    this.pitcher.hipJoint.rotation.y = lerpKeyframes(P_HIP_Y, t) * (lhp ? -1 : 1);
    if (!this.pitcherReleased && t >= PITCH_RELEASE_T) {
      this.pitcherReleased = true;
      return true;
    }
    return false;
  }

  resetPitcherAnimation() {
    this.pitcherAnimT = 0; this.pitcherReleased = false;
    this.pitcher.root.position.y = 0;
    this.pitcher.rShoulder.rotation.set(0, 0, 0);
    this.pitcher.lShoulder.rotation.set(0, 0, 0);
    this.pitcher.rElbow.rotation.set(0, 0, 0);
    this.pitcher.lElbow.rotation.set(0, 0, 0);
    this.pitcher.rHip.rotation.set(0, 0, 0);
    this.pitcher.lHip.rotation.set(0, 0, 0);
    this.pitcher.hipJoint.rotation.set(0, 0, 0);
  }

  isPitchReleased() { return this.pitcherReleased; }

  getPitcherReleasePos(): THREE.Vector3 {
    const elbow = this.pitcherHand === 'left' ? this.pitcher.lElbow : this.pitcher.rElbow;
    elbow.updateWorldMatrix(true, false);
    const handLocal = new THREE.Vector3(0, -FOREARM_LEN, 0);
    return elbow.localToWorld(handLocal);
  }

  private getPitcherReleasePosSim(): THREE.Vector3 {
    const t = PITCH_RELEASE_T;
    const lhp = this.pitcherHand === 'left';
    const bodyY = lerpKeyframes(P_BODY_Y, t);
    const hipY = 0.48;
    const shoulderLocalY = 0.30;
    const shoulderLocalX = lhp ? -0.16 : 0.16;

    const armRotX = lerpKeyframes(P_R_ARM_X, t);
    const armRotZ = lerpKeyframes(P_R_ARM_Z, t) * (lhp ? -1 : 1);
    const elbowRotX = lerpKeyframes(P_R_ELBOW_X, t);
    const hipRotY = lerpKeyframes(P_HIP_Y, t) * (lhp ? -1 : 1);

    const totalForearmAngle = armRotX + elbowRotX;
    const handX = 0;
    const handY = -UPPER_ARM_LEN * Math.cos(armRotX) - FOREARM_LEN * Math.cos(totalForearmAngle);
    const handZ = UPPER_ARM_LEN * Math.sin(armRotX) + FOREARM_LEN * Math.sin(totalForearmAngle);

    const cosZ = Math.cos(armRotZ), sinZ = Math.sin(armRotZ);
    const rx = handX * cosZ - handY * sinZ;
    const ry = handX * sinZ + handY * cosZ;

    const sx = shoulderLocalX + rx;
    const sy = shoulderLocalY + ry;
    const sz = handZ;

    const cosH = Math.cos(hipRotY), sinH = Math.sin(hipRotY);
    const hx = sx * cosH + sz * sinH;
    const hy = sy;
    const hz = -sx * sinH + sz * cosH;

    const worldY = bodyY + hipY + hy;
    const cosR = Math.cos(Math.PI), sinR = Math.sin(Math.PI);
    const worldX = hx * cosR + hz * sinR;
    const worldZ = this.pitcherZ + (-hx * sinR + hz * cosR);

    return new THREE.Vector3(worldX, worldY, worldZ);
  }

  /* --------- swing animation --------- */

  startSwing(chargePower = 1, swingSpeedMul = 1) {
    if (this.swingT >= 0) return;
    this.swingDur = (SWING_DURATION / Math.max(0.5, swingSpeedMul)) * lerp(1.5, 1.0, Math.max(0, Math.min(1, chargePower)));
    this.swingT = 0;
    if (this.batPivot.parent) this.batPivot.parent.remove(this.batPivot);
    this.battingGroup.add(this.batPivot);

    const bx = this.batter.root.position.x;
    const bz = this.batter.root.position.z;
    const batY = lerp(BAT_Y_LOW, BAT_Y_HIGH, this.batHeightNorm);
    this.batPivot.position.set(bx, batY, bz - 0.12);
    this.bat.group.rotation.set(Math.PI / 2, 0, 0);
    this.batPivot.rotation.set(0, 0, 0);

    const tip = new THREE.Vector3();
    this.bat.tipMarker.getWorldPosition(tip);
    this.prevBatTip.copy(tip);
  }

  updateSwing(dt: number): { active: boolean; inContactZone: boolean } {
    if (this.swingT < 0) return { active: false, inContactZone: false };
    this.swingT += dt / this.swingDur;
    if (this.swingT >= 1) {
      this.swingT = -1;
      this.attachBatToHand();
      this.resetBatterPose();
      return { active: false, inContactZone: false };
    }
    const t = this.swingT;
    const sign = this.batterSide === 'right' ? 1 : -1;

    /* body rotation */
    this.batter.hipJoint.rotation.y = sign * lerpKeyframes(S_HIP_Y, t);
    const leanFwd = Math.max(0, 0.5 - this.batHeightNorm) * 0.25;
    this.batter.hipJoint.rotation.x = leanFwd;
    const kneeBend = Math.max(0, 0.5 - this.batHeightNorm) * 0.15;
    this.batter.rHip.rotation.x = kneeBend;
    this.batter.lHip.rotation.x = kneeBend;
    const frontLeg = this.batterSide === 'right' ? this.batter.lHip : this.batter.rHip;
    frontLeg.rotation.x = lerpKeyframes(S_FRONT_LEG, t) + kneeBend;

    /* bat arc in world space — tilt derived from pivot-to-target height difference */
    const angle = lerpKeyframes(S_BAT_ANGLE, t);
    const baseTiltRaw = lerpKeyframes(S_BAT_TILT, t);
    const tiltScale = lerp(1.0, 0.2, this.batHeightNorm);
    const baseTilt = baseTiltRaw * tiltScale;
    const pivotY = lerp(BAT_Y_LOW, BAT_Y_HIGH, this.batHeightNorm);
    const targetY = this.sweetSpotTarget.y;
    const sweetMid = (BAT_SWEET_LO + BAT_SWEET_HI) / 2;
    const heightTilt = Math.asin(Math.max(-1, Math.min(1, (pivotY - targetY) / sweetMid)));

    /* uppercut: tilt the swing plane upward — more for low pitches, less for high */
    const uppercutBase = lerp(0.18, 0.02, this.batHeightNorm);
    const uppercutRamp = Math.min(1, t / 0.25);
    const uppercut = uppercutBase * uppercutRamp;

    this.batPivot.rotation.set(uppercut, sign * angle, 0);
    const diag = sign * lerp(0.30, 0.08, t);
    this.bat.group.rotation.set(Math.PI / 2 + baseTilt + heightTilt, 0, diag);

    /* arms follow the bat — adjust for bat height */
    const armT = Math.max(0, Math.min(1, (t - 0.08) / 0.72));
    const hOff = (this.batHeightNorm - 0.5) * 0.50;
    const armFwd = lerp(-0.50, 0.15, armT) - hOff;
    const armSpread = lerp(-0.60, 0.05, armT) - Math.abs(hOff) * 0.22;
    const elbowBend = lerp(-1.80, -0.15, Math.max(0, Math.min(1, (t - 0.12) / 0.55))) + hOff * 0.40;
    this.batter.rShoulder.rotation.x = armFwd;
    this.batter.lShoulder.rotation.x = armFwd - 0.10;
    this.batter.rShoulder.rotation.z = sign * armSpread;
    this.batter.lShoulder.rotation.z = sign * -armSpread;
    this.batter.rElbow.rotation.x = elbowBend;
    this.batter.lElbow.rotation.x = elbowBend + 0.15;

    const tipNow = new THREE.Vector3();
    this.bat.tipMarker.getWorldPosition(tipNow);
    this.batTipVel.copy(tipNow).sub(this.prevBatTip).divideScalar(Math.max(dt, 0.001));
    this.prevBatTip.copy(tipNow);
    return { active: true, inContactZone: t >= SWING_CONTACT_LO && t <= SWING_CONTACT_HI };
  }

  isSwinging() { return this.swingT >= 0; }
  getBatHeightNorm(): number { return this.batHeightNorm; }
  getBatWorldEndpoints(): { handle: THREE.Vector3; tip: THREE.Vector3 } {
    const handle = new THREE.Vector3(); const tip = new THREE.Vector3();
    this.bat.handleMarker.getWorldPosition(handle); this.bat.tipMarker.getWorldPosition(tip);
    return { handle, tip };
  }
  getBatTipVelocity(): THREE.Vector3 { return this.batTipVel.clone(); }

  /* --------- ball --------- */

  updateBall3D(pos: THREE.Vector3, visible: boolean) {
    this.ballMesh.visible = visible; this.ballShadow.visible = visible;
    if (!visible) { this.ballTrail.visible = false; return; }
    this.ballMesh.position.copy(pos);
    this.ballShadow.position.set(pos.x, 0.005, pos.z);
    const shadowScale = Math.max(0.3, 1 - pos.y * 0.08);
    this.ballShadow.scale.setScalar(shadowScale);
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.15 * shadowScale;
    this.trailPositions.push(pos.clone());
    if (this.trailPositions.length > 30) this.trailPositions.shift();
    const arr = (this.ballTrail.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < 30; i++) {
      const p = this.trailPositions[i] || pos;
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
    }
    (this.ballTrail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.ballTrail.visible = this.trailPositions.length > 2;
  }

  clearTrail() { this.trailPositions.length = 0; this.ballTrail.visible = false; this.setTrailColor('white'); }

  setTrailColor(color: 'flight' | 'landed' | 'white') {
    if (color === 'flight') {
      this.ballTrailMat.color.setHex(0xff8c00);
      this.ballTrailMat.opacity = 0.75;
      this.ballTrailMat.size = 0.026;
    } else if (color === 'landed') {
      this.ballTrailMat.color.setHex(0xffffff);
      this.ballTrailMat.opacity = 0.55;
      this.ballTrailMat.size = 0.022;
    } else {
      this.ballTrailMat.color.setHex(0xffffff);
      this.ballTrailMat.opacity = 0.55;
      this.ballTrailMat.size = 0.022;
    }
  }

  updateBallFromGameCoords(gx: number, gy: number, height: number) {
    this.updateBall3D(gameBallToThree(gx, gy, height), true);
  }

  hideBall() { this.ballMesh.visible = false; this.ballShadow.visible = false; this.ballTrail.visible = false; }

  /* --------- 3D pitch ball position --------- */

  getPitchBallPos(progress: number, startX: number, startY: number, startZ: number,
    endX: number, endY: number, endZ: number, breakXAmt: number, breakYAmt: number,
    pitchFlightSpeed = 2.2): THREE.Vector3 {
    const t = progress;
    const flightTime = 1.0 / Math.max(pitchFlightSpeed, 0.5);
    const PITCH_G = 5.0;
    const gravityArc = 0.5 * PITCH_G * flightTime * flightTime * t * (1 - t);
    return new THREE.Vector3(
      lerp(startX, endX, t) + Math.sin(t * Math.PI) * breakXAmt,
      lerp(startY, endY, t) + Math.sin(t * Math.PI) * breakYAmt * 0.5 + gravityArc,
      lerp(startZ, endZ, t),
    );
  }

  projectToGameCoords(worldPos: THREE.Vector3): { x: number; y: number } {
    const v = worldPos.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * CANVAS_W, y: (-v.y + 1) / 2 * CANVAS_H };
  }

  /* --------- 3D checks --------- */

  checkBallCrossedPlate3D(prev: THREE.Vector3, curr: THREE.Vector3): { crossed: boolean; inZone: boolean; cx: number; cy: number } | null {
    if (prev.z < 0 && curr.z >= 0) {
      const t = (0 - prev.z) / (curr.z - prev.z);
      const cx = prev.x + (curr.x - prev.x) * t;
      const cy = prev.y + (curr.y - prev.y) * t;
      return { crossed: true, inZone: cx >= -SZ.halfW && cx <= SZ.halfW && cy >= SZ.bottom && cy <= SZ.top, cx, cy };
    }
    return null;
  }

  checkBatBallCollision3D(ballPos: THREE.Vector3, collisionScale: number = 1.8): { hit: boolean; contactT: number; contactPoint: THREE.Vector3 } {
    const { handle, tip } = this.getBatWorldEndpoints();
    const ab = tip.clone().sub(handle);
    const ac = ballPos.clone().sub(handle);
    const abLenSq = ab.lengthSq();
    if (abLenSq < 0.0001) return { hit: false, contactT: 0, contactPoint: handle };
    const t = Math.max(0, Math.min(1, ac.dot(ab) / abLenSq));
    const closest = handle.clone().add(ab.clone().multiplyScalar(t));
    const dist = ballPos.distanceTo(closest);
    const collisionR = BALL_RADIUS + lerp(BAT_HANDLE_R, BAT_BARREL_R, t);
    return { hit: dist <= collisionR * collisionScale, contactT: t, contactPoint: closest };
  }

  getSwingContactQuality(contactT: number): number {
    if (contactT >= BAT_SWEET_LO && contactT <= BAT_SWEET_HI) return 1.0;
    if (contactT < BAT_SWEET_LO) return 0.3 + 0.7 * (contactT / BAT_SWEET_LO);
    return 0.5 + 0.5 * (1 - (contactT - BAT_SWEET_HI) / (1 - BAT_SWEET_HI));
  }

  /* --------- fielding objects --------- */

  ensureFielder(id: number, label: string, hotkey: string) {
    if (this.fielderModels.has(id)) return;
    const fColor = this.isPlayerBattingState ? CPU_FIELDER_JERSEY : PLAYER_FIELDER_JERSEY;
    const model = createJointedPlayer(fColor, 0xeeeeee);
    const ls = makeTextSprite(label, '#fff', 'rgba(37,99,235,0.75)', 46);
    ls.position.y = 1.45; model.root.add(ls);
    const hs = makeTextSprite(hotkey, '#facc15', 'rgba(0,0,0,0.7)', 50);
    hs.position.y = 1.75; model.root.add(hs);
    ls.visible = this.fielderLabelsVisible;
    hs.visible = this.fielderLabelsVisible;
    if (id <= 2) model.root.visible = this.fielderLabelsVisible;
    this.fieldGroup.add(model.root);
    this.fielderModels.set(id, { model, label: ls, hotkey: hs });
  }

  updateFielder(id: number, gx: number, gy: number, selected: boolean, diving: boolean) {
    const entry = this.fielderModels.get(id);
    if (!entry) return;
    const p = gameToThree(gx, gy);
    entry.model.root.position.set(p.x, diving ? 0.04 : 0, p.z);
    if (diving) { entry.model.root.rotation.x = Math.PI / 5; entry.model.root.scale.set(1.15, 0.5, 1.15); }
    else { entry.model.root.rotation.x = 0; entry.model.root.scale.set(1, 1, 1); }
    const torso = entry.model.hipJoint.children[0] as THREE.Mesh;
    if (torso?.material instanceof THREE.MeshStandardMaterial)
      torso.material.emissive.setHex(selected ? 0x443300 : 0x000000);
  }

  ensureRunner(id: string) {
    if (this.runnerMeshes.has(id)) return;
    const runnerColor = this.isPlayerBattingState ? PLAYER_JERSEY : CPU_JERSEY;
    const m = createJointedPlayer(runnerColor, 0xeeeeee);
    this.fieldGroup.add(m.root);
    this.runnerMeshes.set(id, m);
  }
  updateRunner(id: string, gx: number, gy: number) {
    const m = this.runnerMeshes.get(id); if (!m) return;
    const p = gameToThree(gx, gy); m.root.position.set(p.x, 0, p.z);
  }
  removeRunner(id: string) {
    const m = this.runnerMeshes.get(id);
    if (m) { this.fieldGroup.remove(m.root); this.runnerMeshes.delete(id); }
  }
  clearRunners() { for (const [, m] of this.runnerMeshes) this.fieldGroup.remove(m.root); this.runnerMeshes.clear(); }

  /* --------- render --------- */

  private disposed = false;
  render() { if (this.disposed) return; this.renderer.render(this.scene, this.camera); }

  private onResize = () => {
    const p = this.renderer.domElement.parentElement;
    if (!p) return;
    this.w = p.clientWidth; this.h = p.clientHeight;
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.w, this.h);
  };

  dispose() {
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const m = obj.material; if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m.dispose(); }
    });
    this.renderer.domElement.remove();
  }
}
