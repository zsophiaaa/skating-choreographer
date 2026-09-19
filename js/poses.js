/* ============================================================
   poses.js — skeleton, pose library, blending, and "line" metrics
   ------------------------------------------------------------
   Body-local frame:  +x = forward (direction the body faces)
                      +y = body-LEFT
                      +z = up   (0 = ice surface)
   Units: metres. Model is ~1.70 m to the top of the head.

   CONVENTION: every pose is authored with the LEFT foot as the
   skating foot. If an element skates on the right foot, the pose
   is mirrored (y negated, L/R joint names swapped).
   ============================================================ */

const JOINTS = [
  'pelvis', 'chest', 'neck', 'head',
  'shL', 'shR', 'elL', 'elR', 'haL', 'haR',
  'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR', 'toL', 'toR', 'heL', 'heR',
];

/** bones: [a, b, group]  group drives colour/width */
const BONES = [
  ['pelvis', 'chest', 'torso'], ['chest', 'neck', 'torso'], ['neck', 'head', 'head'],
  ['neck', 'shL', 'torso'], ['neck', 'shR', 'torso'],
  ['shL', 'elL', 'armL'], ['elL', 'haL', 'armL'],
  ['shR', 'elR', 'armR'], ['elR', 'haR', 'armR'],
  ['pelvis', 'hipL', 'torso'], ['pelvis', 'hipR', 'torso'],
  ['hipL', 'knL', 'legL'], ['knL', 'anL', 'legL'],
  ['hipR', 'knR', 'legR'], ['knR', 'anR', 'legR'],
  ['heL', 'toL', 'bladeL'], ['anL', 'toL', 'bootL'], ['anL', 'heL', 'bootL'],
  ['heR', 'toR', 'bladeR'], ['anR', 'toR', 'bootR'], ['anR', 'heR', 'bootR'],
];

const BASE = {
  pelvis: [0, 0, 0.95], chest: [0, 0, 1.25], neck: [0, 0, 1.44], head: [0, 0, 1.62],
  shL: [0, 0.19, 1.40], shR: [0, -0.19, 1.40],
  elL: [0, 0.25, 1.14], elR: [0, -0.25, 1.14],
  haL: [0, 0.27, 0.88], haR: [0, -0.27, 0.88],
  hipL: [0, 0.10, 0.92], hipR: [0, -0.10, 0.92],
  knL: [0, 0.10, 0.50], knR: [0, -0.10, 0.50],
  anL: [0, 0.10, 0.09], anR: [0, -0.10, 0.09],
  toL: [0.16, 0.10, 0.02], toR: [0.16, -0.10, 0.02],
  heL: [-0.09, 0.10, 0.02], heR: [-0.09, -0.10, 0.02],
};

/** build a full pose from partial overrides on BASE */
function P(over, meta = {}) {
  const p = {};
  for (const j of JOINTS) p[j] = over[j] ? over[j].slice() : BASE[j].slice();
  p._meta = Object.assign({ free: 'R', onIce: ['L'] }, meta);
  return p;
}

/* ============================================================
   THE POSE LIBRARY
   ============================================================ */
const POSES = {

  /* ---------- basic travelling ---------- */
  stand: P({}, { free: null, onIce: ['L', 'R'] }),

  glide: P({
    knL: [0.03, 0.10, 0.48],
    hipR: [-0.02, -0.10, 0.92], knR: [-0.24, -0.12, 0.46],
    anR: [-0.46, -0.13, 0.13], toR: [-0.60, -0.13, 0.08], heR: [-0.37, -0.13, 0.12],
    elL: [0.08, 0.31, 1.12], haL: [0.18, 0.42, 0.98],
    elR: [0.08, -0.31, 1.12], haR: [0.18, -0.42, 0.98],
  }),

  glide_deep: P({
    pelvis: [-0.04, 0, 0.80], chest: [0.06, 0, 1.11], neck: [0.10, 0, 1.30], head: [0.14, 0, 1.48],
    hipL: [-0.03, 0.10, 0.78], knL: [0.18, 0.11, 0.44], anL: [0.0, 0.10, 0.09],
    hipR: [-0.05, -0.10, 0.78], knR: [-0.22, -0.13, 0.42],
    anR: [-0.48, -0.14, 0.12], toR: [-0.62, -0.14, 0.07], heR: [-0.39, -0.14, 0.11],
    shL: [0.06, 0.19, 1.26], shR: [0.06, -0.19, 1.26],
    elL: [0.20, 0.33, 1.02], haL: [0.34, 0.44, 0.86],
    elR: [0.20, -0.33, 1.02], haR: [0.34, -0.44, 0.86],
  }),

  stroke_push: P({
    pelvis: [-0.04, 0, 0.86], chest: [0.06, 0, 1.17],
    knL: [0.14, 0.11, 0.46], anL: [0.0, 0.10, 0.09],
    hipR: [-0.06, -0.11, 0.84], knR: [-0.34, -0.20, 0.44],
    anR: [-0.68, -0.30, 0.20], toR: [-0.82, -0.34, 0.13], heR: [-0.58, -0.28, 0.19],
    elL: [0.14, 0.36, 1.14], haL: [0.30, 0.50, 1.06],
    elR: [0.02, -0.36, 1.10], haR: [-0.14, -0.50, 1.00],
  }),

  swing_forward: P({
    knL: [0.02, 0.10, 0.48],
    hipR: [0.02, -0.10, 0.92], knR: [0.42, -0.12, 0.74],
    anR: [0.82, -0.13, 0.52], toR: [0.96, -0.13, 0.44], heR: [0.72, -0.13, 0.53],
    elL: [0.10, 0.34, 1.16], haL: [0.24, 0.50, 1.10],
    elR: [0.10, -0.34, 1.16], haR: [0.24, -0.50, 1.10],
  }),

  swing_back: P({
    knL: [0.02, 0.10, 0.48],
    hipR: [-0.04, -0.10, 0.92], knR: [-0.42, -0.12, 0.86],
    anR: [-0.84, -0.13, 0.80], toR: [-0.98, -0.13, 0.86], heR: [-0.74, -0.13, 0.75],
    chest: [0.06, 0, 1.25],
    elL: [0.06, 0.36, 1.18], haL: [0.10, 0.54, 1.14],
    elR: [0.06, -0.36, 1.18], haR: [0.10, -0.54, 1.14],
  }),

  // The free foot has to finish clearly on the far side of the skating foot,
  // with a deep knee — a 0.14 m overlap reads as a stumble, not a crossover.
  crossover_cross: P({
    pelvis: [0, 0.07, 0.83], knL: [0.10, 0.15, 0.41],
    hipR: [0, -0.09, 0.83], knR: [0.21, 0.19, 0.41],
    anR: [0.27, 0.43, 0.13], toR: [0.43, 0.51, 0.05], heR: [0.14, 0.37, 0.09],
    elL: [0.10, 0.38, 1.07], haL: [0.25, 0.57, 0.97],
    elR: [0.06, -0.34, 1.05], haR: [0.12, -0.51, 0.91],
  }, { onIce: ['L', 'R'] }),

  crossroll: P({
    knL: [0.08, 0.12, 0.47],
    hipR: [-0.02, -0.10, 0.90], knR: [-0.16, 0.02, 0.46],
    anR: [-0.30, 0.14, 0.12], toR: [-0.44, 0.18, 0.06], heR: [-0.22, 0.11, 0.10],
    elL: [0.10, 0.34, 1.14], haL: [0.26, 0.48, 1.06],
    elR: [0.10, -0.34, 1.14], haR: [0.26, -0.48, 1.06],
  }),

  /* ---------- turns ---------- */
  turn_entry: P({
    pelvis: [-0.02, 0, 0.88], chest: [0.04, 0.02, 1.19],
    knL: [0.12, 0.10, 0.45],
    hipR: [-0.04, -0.10, 0.86], knR: [-0.26, -0.12, 0.44],
    anR: [-0.50, -0.13, 0.14], toR: [-0.64, -0.13, 0.09], heR: [-0.41, -0.13, 0.13],
    shL: [0.04, 0.20, 1.34], shR: [-0.04, -0.18, 1.34],
    elL: [0.24, 0.32, 1.10], haL: [0.42, 0.40, 1.02],
    elR: [-0.10, -0.32, 1.10], haR: [-0.26, -0.40, 1.00],
  }),

  turn_exit: P({
    pelvis: [-0.02, 0, 0.90], chest: [-0.03, -0.02, 1.21],
    knL: [0.06, 0.10, 0.47],
    hipR: [-0.03, -0.10, 0.88], knR: [-0.22, -0.13, 0.46],
    anR: [-0.44, -0.15, 0.16], toR: [-0.58, -0.15, 0.11], heR: [-0.35, -0.15, 0.15],
    elL: [-0.08, 0.34, 1.12], haL: [-0.22, 0.44, 1.04],
    elR: [0.22, -0.34, 1.12], haR: [0.40, -0.42, 1.04],
  }),

  twizzle: P({
    pelvis: [0, 0, 0.94], knL: [0.04, 0.08, 0.49], anL: [0, 0.06, 0.09],
    hipR: [0, -0.08, 0.92], knR: [0.06, -0.06, 0.46],
    anR: [0.04, 0.02, 0.15], toR: [0.18, 0.04, 0.10], heR: [-0.05, 0.01, 0.13],
    elL: [0.10, 0.22, 1.16], haL: [0.16, 0.10, 1.10],
    elR: [0.10, -0.22, 1.16], haR: [0.16, -0.10, 1.10],
  }),

  /* ---------- field moves / highlights ---------- */
  arabesque: P({
    pelvis: [0.02, 0, 0.90],
    chest: [0.30, 0, 1.04], neck: [0.50, 0, 1.10], head: [0.66, 0, 1.13],
    shL: [0.44, 0.18, 1.08], shR: [0.44, -0.18, 1.08],
    elL: [0.30, 0.44, 1.05], haL: [0.12, 0.64, 1.02],
    elR: [0.30, -0.44, 1.05], haR: [0.12, -0.64, 1.02],
    hipL: [0.04, 0.07, 0.88], knL: [0.01, 0.09, 0.47], anL: [0, 0.10, 0.09],
    hipR: [-0.05, -0.08, 0.92], knR: [-0.54, -0.10, 1.14],
    anR: [-1.02, -0.12, 1.34], toR: [-1.17, -0.12, 1.42], heR: [-0.92, -0.12, 1.29],
  }),

  arabesque_low: P({
    pelvis: [0.02, 0, 0.90],
    chest: [0.22, 0, 1.10], neck: [0.36, 0, 1.20], head: [0.48, 0, 1.26],
    shL: [0.32, 0.18, 1.16], shR: [0.32, -0.18, 1.16],
    elL: [0.24, 0.42, 1.10], haL: [0.12, 0.58, 1.02],
    elR: [0.24, -0.42, 1.10], haR: [0.12, -0.58, 1.02],
    knL: [0.02, 0.10, 0.48],
    hipR: [-0.05, -0.09, 0.92], knR: [-0.44, -0.12, 0.82],
    anR: [-0.82, -0.14, 0.78], toR: [-0.96, -0.14, 0.80], heR: [-0.72, -0.14, 0.74],
  }),

  y_spiral: P({
    pelvis: [0, 0.02, 0.92],
    chest: [0.06, -0.06, 1.24], neck: [0.08, -0.08, 1.43], head: [0.10, -0.10, 1.60],
    knL: [0.01, 0.09, 0.48],
    hipR: [-0.02, -0.10, 0.94], knR: [-0.10, -0.44, 1.36],
    anR: [-0.16, -0.62, 1.86], toR: [-0.18, -0.66, 2.00], heR: [-0.14, -0.58, 1.74],
    shL: [0.02, 0.20, 1.39], shR: [0.02, -0.20, 1.39],
    elR: [-0.06, -0.44, 1.56], haR: [-0.12, -0.58, 1.78],
    elL: [0.06, 0.40, 1.22], haL: [0.10, 0.58, 1.06],
  }),

  catchfoot: P({
    pelvis: [0.02, 0, 0.90],
    chest: [0.18, 0, 1.16], neck: [0.26, 0, 1.34], head: [0.30, 0, 1.50],
    knL: [0.02, 0.10, 0.48],
    hipR: [-0.05, -0.09, 0.92], knR: [-0.46, -0.11, 1.16],
    anR: [-0.52, -0.10, 1.66], toR: [-0.48, -0.10, 1.81], heR: [-0.56, -0.10, 1.53],
    shL: [0.22, 0.19, 1.30], shR: [0.22, -0.19, 1.30],
    elL: [-0.02, 0.30, 1.44], haL: [-0.36, 0.14, 1.62],
    elR: [-0.02, -0.30, 1.44], haR: [-0.36, -0.14, 1.62],
  }),

  charlotte: P({
    pelvis: [0.04, 0, 0.86],
    chest: [0.36, 0, 0.80], neck: [0.52, 0, 0.68], head: [0.62, 0, 0.56],
    shL: [0.46, 0.18, 0.80], shR: [0.46, -0.18, 0.80],
    elL: [0.44, 0.34, 0.50], haL: [0.42, 0.44, 0.18],
    elR: [0.44, -0.34, 0.50], haR: [0.42, -0.44, 0.18],
    hipL: [0.02, 0.08, 0.84], knL: [0.01, 0.09, 0.46], anL: [0, 0.10, 0.09],
    hipR: [-0.06, -0.08, 0.90], knR: [-0.36, -0.09, 1.36],
    anR: [-0.66, -0.10, 1.82], toR: [-0.76, -0.10, 1.96], heR: [-0.60, -0.10, 1.72],
  }),

  attitude: P({
    pelvis: [0.02, 0, 0.92],
    chest: [0.10, 0, 1.24], neck: [0.14, 0, 1.43], head: [0.18, 0, 1.60],
    knL: [0.02, 0.10, 0.48],
    hipR: [-0.04, -0.10, 0.92], knR: [-0.46, -0.26, 1.10],
    anR: [-0.34, -0.44, 1.42], toR: [-0.28, -0.50, 1.54], heR: [-0.38, -0.40, 1.34],
    elL: [0.10, 0.40, 1.30], haL: [0.14, 0.56, 1.44],
    elR: [0.02, -0.40, 1.24], haR: [-0.06, -0.56, 1.34],
  }),

  spread_eagle: P({
    pelvis: [0, 0, 0.94], chest: [0, 0.05, 1.25], neck: [0, 0.06, 1.44], head: [0, 0.07, 1.61],
    shL: [0.19, 0.05, 1.40], shR: [-0.19, 0.05, 1.40],
    elL: [0.45, 0.05, 1.33], haL: [0.70, 0.03, 1.27],
    elR: [-0.45, 0.05, 1.33], haR: [-0.70, 0.03, 1.27],
    hipL: [0.11, 0.03, 0.92], hipR: [-0.11, -0.03, 0.92],
    knL: [0.15, 0.06, 0.50], anL: [0.20, 0.06, 0.09], toL: [0.37, 0.11, 0.02], heL: [0.07, 0.03, 0.02],
    knR: [-0.15, -0.06, 0.50], anR: [-0.20, -0.06, 0.09], toR: [-0.37, -0.11, 0.02], heR: [-0.07, -0.03, 0.02],
  }, { free: null, onIce: ['L', 'R'] }),

  ina_bauer: P({
    pelvis: [0, 0, 0.92],
    chest: [-0.16, 0, 1.21], neck: [-0.28, 0, 1.37], head: [-0.40, 0, 1.48],
    shL: [-0.24, 0.19, 1.34], shR: [-0.24, -0.19, 1.34],
    elL: [-0.30, 0.36, 1.52], haL: [-0.34, 0.50, 1.70],
    elR: [-0.30, -0.36, 1.52], haR: [-0.34, -0.50, 1.70],
    hipL: [0.10, 0.11, 0.90], knL: [0.30, 0.12, 0.50],
    anL: [0.36, 0.13, 0.09], toL: [0.52, 0.15, 0.02], heL: [0.24, 0.12, 0.02],
    hipR: [-0.08, -0.11, 0.90], knR: [-0.36, -0.13, 0.50],
    anR: [-0.44, -0.14, 0.09], toR: [-0.52, -0.31, 0.02], heR: [-0.36, 0.02, 0.02],
  }, { free: null, onIce: ['L', 'R'] }),

  lunge: P({
    pelvis: [-0.06, 0, 0.46],
    chest: [0.06, 0, 0.78], neck: [0.14, 0, 0.96], head: [0.22, 0, 1.12],
    shL: [0.10, 0.19, 0.92], shR: [0.10, -0.19, 0.92],
    elL: [0.34, 0.34, 0.78], haL: [0.58, 0.44, 0.66],
    elR: [0.34, -0.34, 0.78], haR: [0.58, -0.44, 0.66],
    hipL: [-0.02, 0.11, 0.44], knL: [0.36, 0.12, 0.36], anL: [0.30, 0.12, 0.09],
    toL: [0.46, 0.12, 0.02], heL: [0.20, 0.12, 0.02],
    hipR: [-0.08, -0.11, 0.44], knR: [-0.52, -0.15, 0.24],
    anR: [-0.96, -0.17, 0.08], toR: [-1.10, -0.17, 0.03], heR: [-0.86, -0.17, 0.06],
  }, { onIce: ['L', 'R'] }),

  shoot_duck: P({
    pelvis: [-0.04, 0, 0.32],
    chest: [0.04, 0, 0.62], neck: [0.10, 0, 0.80], head: [0.16, 0, 0.96],
    shL: [0.06, 0.18, 0.76], shR: [0.06, -0.18, 0.76],
    elL: [0.34, 0.28, 0.66], haL: [0.62, 0.30, 0.54],
    elR: [0.34, -0.28, 0.66], haR: [0.62, -0.30, 0.54],
    hipL: [-0.04, 0.10, 0.30], knL: [0.22, 0.11, 0.26], anL: [0.02, 0.10, 0.09],
    toL: [0.18, 0.10, 0.02], heL: [-0.07, 0.10, 0.02],
    hipR: [-0.04, -0.10, 0.30], knR: [0.44, -0.11, 0.24],
    anR: [0.88, -0.11, 0.17], toR: [1.02, -0.11, 0.23], heR: [0.78, -0.11, 0.13],
  }),

  hydroblade: P({
    pelvis: [0, 0.04, 0.34],
    chest: [0.32, 0.10, 0.44], neck: [0.54, 0.14, 0.50], head: [0.70, 0.17, 0.54],
    shL: [0.46, 0.24, 0.50], shR: [0.46, -0.06, 0.44],
    elL: [0.52, 0.46, 0.32], haL: [0.56, 0.62, 0.10],
    elR: [0.30, -0.24, 0.28], haR: [0.16, -0.38, 0.12],
    hipL: [0.02, 0.14, 0.34], knL: [0.24, 0.18, 0.32], anL: [0.04, 0.16, 0.09],
    toL: [0.20, 0.18, 0.02], heL: [-0.05, 0.15, 0.02],
    hipR: [-0.04, -0.08, 0.32], knR: [-0.32, -0.34, 0.26],
    anR: [-0.60, -0.62, 0.14], toR: [-0.72, -0.70, 0.09], heR: [-0.50, -0.55, 0.12],
  }, { onIce: ['L'] }),

  cantilever: P({
    pelvis: [0.12, 0, 0.72],
    chest: [-0.06, 0, 0.94], neck: [-0.22, 0, 1.02], head: [-0.40, 0, 1.04],
    shL: [-0.18, 0.19, 1.00], shR: [-0.18, -0.19, 1.00],
    elL: [-0.20, 0.40, 1.10], haL: [-0.22, 0.60, 1.16],
    elR: [-0.20, -0.40, 1.10], haR: [-0.22, -0.60, 1.16],
    hipL: [0.12, 0.11, 0.70], knL: [0.36, 0.13, 0.46], anL: [0.08, 0.12, 0.09],
    toL: [0.24, 0.12, 0.02], heL: [-0.01, 0.12, 0.02],
    hipR: [0.12, -0.11, 0.70], knR: [0.36, -0.13, 0.46], anR: [0.08, -0.12, 0.09],
    toR: [0.24, -0.12, 0.02], heR: [-0.01, -0.12, 0.02],
  }, { free: null, onIce: ['L', 'R'] }),

  pivot: P({
    pelvis: [-0.10, 0, 0.88],
    chest: [-0.04, 0, 1.19], neck: [0, 0, 1.38], head: [0.04, 0, 1.55],
    hipL: [-0.10, 0.10, 0.86], knL: [-0.02, 0.16, 0.46],
    anL: [0.08, 0.20, 0.14], toL: [0.22, 0.22, 0.01], heL: [-0.02, 0.19, 0.16],
    hipR: [-0.10, -0.10, 0.86], knR: [-0.24, -0.30, 0.44],
    anR: [-0.40, -0.52, 0.10], toR: [-0.30, -0.66, 0.03], heR: [-0.46, -0.44, 0.09],
    elL: [0.06, 0.32, 1.12], haL: [0.14, 0.44, 0.98],
    elR: [0.06, -0.32, 1.12], haR: [0.14, -0.44, 0.98],
  }, { onIce: ['L', 'R'] }),

  drag: P({
    pelvis: [-0.02, 0, 0.86], chest: [0.06, 0, 1.17],
    knL: [0.16, 0.11, 0.44], anL: [0, 0.10, 0.09],
    hipR: [-0.06, -0.10, 0.84], knR: [-0.40, -0.13, 0.36],
    anR: [-0.76, -0.14, 0.14], toR: [-0.90, -0.14, 0.01], heR: [-0.66, -0.14, 0.16],
    elL: [0.14, 0.34, 1.10], haL: [0.28, 0.48, 1.00],
    elR: [0.14, -0.34, 1.10], haR: [0.28, -0.48, 1.00],
  }, { onIce: ['L', 'R'] }),

  knee_slide: P({
    pelvis: [-0.10, 0, 0.42],
    chest: [-0.02, 0, 0.74], neck: [0.04, 0, 0.92], head: [0.10, 0, 1.08],
    hipL: [-0.10, 0.11, 0.40], knL: [0.20, 0.12, 0.14], anL: [0.02, 0.12, 0.30],
    toL: [0.14, 0.12, 0.40], heL: [-0.08, 0.12, 0.26],
    hipR: [-0.12, -0.11, 0.40], knR: [-0.44, -0.13, 0.22],
    anR: [-0.82, -0.14, 0.10], toR: [-0.96, -0.14, 0.04], heR: [-0.72, -0.14, 0.08],
    elL: [0.16, 0.36, 0.74], haL: [0.34, 0.52, 0.86],
    elR: [0.16, -0.36, 0.74], haR: [0.34, -0.52, 0.86],
  }, { onIce: ['L', 'R'] }),

  /* ---------- spins ---------- */
  spin_upright: P({
    pelvis: [0, 0, 0.96], chest: [0, 0, 1.27], neck: [0, 0, 1.46], head: [0, 0, 1.64],
    knL: [0.02, 0.06, 0.50], anL: [0, 0.04, 0.09], toL: [0.16, 0.04, 0.02], heL: [-0.09, 0.04, 0.02],
    hipR: [0, -0.09, 0.94], knR: [0.06, -0.05, 0.48],
    anR: [0.04, 0.06, 0.16], toR: [0.18, 0.08, 0.11], heR: [-0.05, 0.05, 0.14],
    shL: [0, 0.18, 1.42], shR: [0, -0.18, 1.42],
    elL: [0.10, 0.24, 1.20], haL: [0.16, 0.08, 1.14],
    elR: [0.10, -0.24, 1.20], haR: [0.16, -0.08, 1.14],
  }),

  spin_scratch: P({
    pelvis: [0, 0, 0.98], chest: [0, 0, 1.29], neck: [0, 0, 1.48], head: [0, 0, 1.66],
    knL: [0.01, 0.04, 0.51], anL: [0, 0.02, 0.09], toL: [0.16, 0.02, 0.02], heL: [-0.09, 0.02, 0.02],
    hipR: [0, -0.08, 0.96], knR: [0.03, -0.02, 0.50],
    anR: [0.02, 0.05, 0.19], toR: [0.16, 0.07, 0.14], heR: [-0.07, 0.04, 0.17],
    shL: [0, 0.17, 1.44], shR: [0, -0.17, 1.44],
    elL: [0.04, 0.16, 1.56], haL: [0.02, 0.05, 1.74],
    elR: [0.04, -0.16, 1.56], haR: [0.02, -0.05, 1.74],
  }),

  spin_sit: P({
    pelvis: [-0.04, 0, 0.36],
    chest: [0.06, 0, 0.66], neck: [0.12, 0, 0.84], head: [0.18, 0, 1.00],
    shL: [0.08, 0.18, 0.80], shR: [0.08, -0.18, 0.80],
    elL: [0.36, 0.26, 0.70], haL: [0.62, 0.16, 0.60],
    elR: [0.36, -0.26, 0.70], haR: [0.62, -0.16, 0.60],
    hipL: [-0.04, 0.10, 0.34], knL: [0.24, 0.11, 0.28], anL: [0.02, 0.10, 0.09],
    toL: [0.18, 0.10, 0.02], heL: [-0.07, 0.10, 0.02],
    hipR: [-0.04, -0.10, 0.34], knR: [0.42, -0.12, 0.28],
    anR: [0.84, -0.12, 0.22], toR: [0.98, -0.12, 0.28], heR: [0.74, -0.12, 0.18],
  }),

  spin_camel: P({
    pelvis: [0.02, 0, 0.88],
    chest: [0.32, 0, 0.98], neck: [0.52, 0, 1.02], head: [0.68, 0, 1.04],
    shL: [0.46, 0.18, 1.00], shR: [0.46, -0.18, 1.00],
    elL: [0.60, 0.34, 0.86], haL: [0.72, 0.44, 0.66],
    elR: [0.60, -0.34, 0.86], haR: [0.72, -0.44, 0.66],
    hipL: [0.04, 0.07, 0.86], knL: [0.02, 0.09, 0.46], anL: [0, 0.10, 0.09],
    hipR: [-0.05, -0.08, 0.90], knR: [-0.52, -0.10, 1.06],
    anR: [-1.00, -0.11, 1.16], toR: [-1.15, -0.11, 1.22], heR: [-0.90, -0.11, 1.12],
  }),

  spin_layback: P({
    pelvis: [0, 0, 0.94],
    chest: [-0.16, 0, 1.22], neck: [-0.32, 0, 1.34], head: [-0.50, 0, 1.38],
    shL: [-0.28, 0.19, 1.32], shR: [-0.28, -0.19, 1.32],
    elL: [-0.30, 0.38, 1.50], haL: [-0.30, 0.44, 1.72],
    elR: [-0.30, -0.38, 1.50], haR: [-0.30, -0.44, 1.72],
    knL: [0.02, 0.06, 0.50], anL: [0, 0.04, 0.09],
    hipR: [-0.04, -0.10, 0.94], knR: [-0.46, -0.28, 1.04],
    anR: [-0.36, -0.46, 1.36], toR: [-0.30, -0.52, 1.48], heR: [-0.40, -0.42, 1.28],
  }),

  spin_biellmann: P({
    pelvis: [0, 0, 0.92],
    chest: [-0.12, 0, 1.21], neck: [-0.24, 0, 1.36], head: [-0.36, 0, 1.44],
    shL: [-0.20, 0.19, 1.34], shR: [-0.20, -0.19, 1.34],
    elL: [-0.26, 0.26, 1.62], haL: [-0.30, 0.14, 1.92],
    elR: [-0.26, -0.26, 1.62], haR: [-0.30, -0.14, 1.92],
    knL: [0.02, 0.06, 0.50], anL: [0, 0.04, 0.09],
    hipR: [-0.04, -0.10, 0.92], knR: [-0.46, -0.10, 1.36],
    anR: [-0.34, -0.10, 1.86], toR: [-0.28, -0.10, 2.00], heR: [-0.38, -0.10, 1.74],
  }),

  spin_broken_leg: P({
    pelvis: [-0.04, 0, 0.38],
    chest: [0.06, 0, 0.68], neck: [0.12, 0, 0.86], head: [0.18, 0, 1.02],
    hipL: [-0.04, 0.10, 0.36], knL: [0.24, 0.11, 0.30], anL: [0.02, 0.10, 0.09],
    hipR: [-0.04, -0.12, 0.36], knR: [0.30, -0.40, 0.32],
    anR: [0.62, -0.62, 0.14], toR: [0.76, -0.66, 0.09], heR: [0.52, -0.58, 0.16],
    elL: [0.34, 0.30, 0.72], haL: [0.60, 0.34, 0.62],
    elR: [0.34, -0.30, 0.72], haR: [0.60, -0.34, 0.62],
  }),

  spin_pancake: P({
    pelvis: [-0.04, 0, 0.34],
    chest: [0.18, 0, 0.48], neck: [0.34, 0, 0.52], head: [0.48, 0, 0.52],
    hipL: [-0.06, 0.10, 0.32], knL: [0.22, 0.11, 0.26], anL: [0.02, 0.10, 0.09],
    hipR: [-0.06, -0.10, 0.32], knR: [0.34, -0.22, 0.30],
    anR: [0.56, -0.06, 0.34], toR: [0.70, -0.02, 0.36], heR: [0.46, -0.09, 0.32],
    shL: [0.30, 0.18, 0.50], shR: [0.30, -0.18, 0.50],
    elL: [0.52, 0.24, 0.44], haL: [0.72, 0.16, 0.40],
    elR: [0.52, -0.24, 0.44], haR: [0.72, -0.16, 0.40],
  }),

  illusion: P({
    pelvis: [0, 0.06, 0.86],
    chest: [0.24, 0.30, 0.86], neck: [0.40, 0.46, 0.80], head: [0.54, 0.60, 0.74],
    shL: [0.34, 0.56, 0.84], shR: [0.34, 0.30, 0.72],
    elL: [0.40, 0.76, 0.60], haL: [0.44, 0.90, 0.34],
    elR: [0.30, 0.14, 0.50], haR: [0.26, 0.00, 0.28],
    hipL: [0.02, 0.14, 0.84], knL: [0.02, 0.12, 0.46], anL: [0, 0.10, 0.09],
    hipR: [-0.04, -0.04, 0.90], knR: [-0.28, -0.32, 1.30],
    anR: [-0.52, -0.62, 1.68], toR: [-0.62, -0.74, 1.80], heR: [-0.46, -0.54, 1.60],
  }),

  /* ---------- jumps ---------- */
  jump_setup: P({
    pelvis: [-0.06, 0, 0.80], chest: [0.02, 0, 1.11], neck: [0.06, 0, 1.30], head: [0.10, 0, 1.48],
    hipL: [-0.05, 0.10, 0.78], knL: [0.22, 0.11, 0.42], anL: [0, 0.10, 0.09],
    hipR: [-0.07, -0.10, 0.78], knR: [-0.28, -0.14, 0.40],
    anR: [-0.58, -0.16, 0.14], toR: [-0.72, -0.16, 0.08], heR: [-0.49, -0.16, 0.13],
    shL: [0.04, 0.19, 1.26], shR: [0.04, -0.19, 1.26],
    elL: [-0.14, 0.34, 1.06], haL: [-0.34, 0.42, 0.92],
    elR: [0.20, -0.34, 1.06], haR: [0.40, -0.42, 0.94],
  }),

  jump_takeoff: P({
    pelvis: [0, 0, 1.00], chest: [0, 0, 1.31], neck: [0, 0, 1.50], head: [0, 0, 1.68],
    hipL: [0, 0.10, 0.98], knL: [0.06, 0.10, 0.54], anL: [0.02, 0.10, 0.12],
    toL: [0.18, 0.10, 0.05], heL: [-0.07, 0.10, 0.05],
    hipR: [0, -0.10, 0.98], knR: [0.32, -0.12, 0.72],
    anR: [0.64, -0.13, 0.42], toR: [0.78, -0.13, 0.34], heR: [0.54, -0.13, 0.44],
    shL: [0, 0.19, 1.46], shR: [0, -0.19, 1.46],
    elL: [0.06, 0.30, 1.62], haL: [0.10, 0.36, 1.80],
    elR: [0.06, -0.30, 1.62], haR: [0.10, -0.36, 1.80],
  }, { onIce: [] }),

  jump_air: P({
    pelvis: [0, 0, 0.94], chest: [0, 0, 1.25], neck: [0, 0, 1.44], head: [0, 0, 1.62],
    hipL: [0, 0.08, 0.92], knL: [0.02, 0.06, 0.50], anL: [0, 0.03, 0.10],
    toL: [0.16, 0.03, 0.03], heL: [-0.09, 0.03, 0.03],
    hipR: [0, -0.08, 0.92], knR: [0.03, -0.02, 0.49],
    anR: [0.01, 0.05, 0.17], toR: [0.15, 0.07, 0.12], heR: [-0.08, 0.04, 0.15],
    shL: [0, 0.16, 1.41], shR: [0, -0.16, 1.41],
    elL: [0.10, 0.18, 1.22], haL: [0.14, 0.02, 1.16],
    elR: [0.10, -0.18, 1.22], haR: [0.14, -0.02, 1.16],
  }, { onIce: [] }),

  jump_air_split: P({
    pelvis: [0, 0, 0.94], chest: [0, 0, 1.25],
    hipL: [0.06, 0.10, 0.92], knL: [0.52, 0.12, 0.92], anL: [1.00, 0.13, 0.90],
    toL: [1.15, 0.13, 0.88], heL: [0.90, 0.13, 0.91],
    hipR: [-0.06, -0.10, 0.92], knR: [-0.52, -0.12, 0.92], anR: [-1.00, -0.13, 0.90],
    toR: [-1.15, -0.13, 0.88], heR: [-0.90, -0.13, 0.91],
    elL: [0.30, 0.42, 1.24], haL: [0.68, 0.52, 1.14],
    elR: [-0.30, -0.42, 1.24], haR: [-0.68, -0.52, 1.14],
  }, { free: null, onIce: [] }),

  jump_air_stag: P({
    pelvis: [0, 0, 0.94], chest: [0.04, 0, 1.25], head: [0.10, 0, 1.62],
    hipL: [0.06, 0.10, 0.92], knL: [0.56, 0.12, 0.96], anL: [0.52, 0.13, 0.50],
    toL: [0.66, 0.13, 0.42], heL: [0.42, 0.13, 0.52],
    hipR: [-0.06, -0.10, 0.92], knR: [-0.52, -0.12, 0.90], anR: [-1.00, -0.13, 0.86],
    toR: [-1.14, -0.13, 0.82], heR: [-0.90, -0.13, 0.87],
    elL: [0.34, 0.40, 1.30], haL: [0.70, 0.46, 1.30],
    elR: [-0.26, -0.42, 1.22], haR: [-0.60, -0.52, 1.12],
  }, { free: null, onIce: [] }),

  jump_landing: P({
    pelvis: [-0.04, 0, 0.84],
    chest: [-0.06, 0, 1.15], neck: [-0.06, 0, 1.34], head: [-0.06, 0, 1.52],
    hipL: [-0.04, 0.10, 0.82], knL: [0.12, 0.11, 0.44], anL: [0, 0.10, 0.09],
    hipR: [-0.06, -0.10, 0.82], knR: [-0.42, -0.14, 0.68],
    anR: [-0.84, -0.16, 0.58], toR: [-0.98, -0.16, 0.62], heR: [-0.74, -0.16, 0.54],
    shL: [-0.04, 0.19, 1.30], shR: [-0.04, -0.19, 1.30],
    elL: [-0.06, 0.40, 1.22], haL: [-0.08, 0.62, 1.14],
    elR: [-0.06, -0.40, 1.22], haR: [-0.08, -0.62, 1.14],
  }),

  hop_tuck: P({
    pelvis: [0, 0, 0.86], chest: [0.06, 0, 1.16],
    hipL: [0, 0.10, 0.84], knL: [0.34, 0.11, 0.74], anL: [0.24, 0.11, 0.34],
    toL: [0.38, 0.11, 0.28], heL: [0.15, 0.11, 0.36],
    hipR: [0, -0.10, 0.84], knR: [0.34, -0.11, 0.74], anR: [0.24, -0.11, 0.34],
    toR: [0.38, -0.11, 0.28], heR: [0.15, -0.11, 0.36],
    elL: [0.16, 0.36, 1.12], haL: [0.34, 0.50, 1.06],
    elR: [0.16, -0.36, 1.12], haR: [0.34, -0.50, 1.06],
  }, { free: null, onIce: [] }),

  /* ---------- presentation / choreo ---------- */
  presentation: P({
    pelvis: [0, 0, 0.96], chest: [-0.04, 0, 1.28], neck: [-0.06, 0, 1.47], head: [-0.02, 0, 1.65],
    shL: [-0.04, 0.20, 1.43], shR: [-0.04, -0.20, 1.43],
    elL: [0.02, 0.46, 1.44], haL: [0.10, 0.72, 1.46],
    elR: [0.02, -0.46, 1.44], haR: [0.10, -0.72, 1.46],
    knL: [0.02, 0.10, 0.49],
    hipR: [-0.02, -0.10, 0.94], knR: [-0.22, -0.14, 0.50],
    anR: [-0.46, -0.16, 0.24], toR: [-0.60, -0.16, 0.18], heR: [-0.37, -0.16, 0.23],
  }),

  reach_up: P({
    pelvis: [0, 0, 0.96], chest: [0, 0, 1.29], neck: [0, 0, 1.48], head: [0.04, 0, 1.66],
    shL: [0, 0.19, 1.44], shR: [0, -0.19, 1.44],
    elL: [0.04, 0.28, 1.72], haL: [0.06, 0.24, 2.02],
    elR: [0.04, -0.28, 1.72], haR: [0.06, -0.24, 2.02],
    knL: [0.02, 0.10, 0.49],
    hipR: [-0.02, -0.10, 0.94], knR: [-0.20, -0.13, 0.48],
    anR: [-0.42, -0.14, 0.18], toR: [-0.56, -0.14, 0.13], heR: [-0.33, -0.14, 0.17],
  }),

  contract: P({
    pelvis: [0.02, 0, 0.88],
    chest: [0.14, 0, 1.16], neck: [0.22, 0, 1.32], head: [0.30, 0, 1.44],
    shL: [0.18, 0.16, 1.28], shR: [0.18, -0.16, 1.28],
    elL: [0.34, 0.24, 1.12], haL: [0.30, 0.06, 1.02],
    elR: [0.34, -0.24, 1.12], haR: [0.30, -0.06, 1.02],
    knL: [0.10, 0.10, 0.46],
    hipR: [-0.02, -0.10, 0.86], knR: [-0.22, -0.12, 0.44],
    anR: [-0.44, -0.13, 0.14], toR: [-0.58, -0.13, 0.09], heR: [-0.35, -0.13, 0.13],
  }),

  tstop: P({
    pelvis: [0, 0, 0.90], chest: [0, 0, 1.21],
    hipL: [0, 0.11, 0.88], knL: [0.06, 0.12, 0.48], anL: [0, 0.12, 0.09],
    toL: [0.16, 0.12, 0.02], heL: [-0.09, 0.12, 0.02],
    hipR: [-0.06, -0.11, 0.88], knR: [-0.30, -0.14, 0.46],
    anR: [-0.56, -0.16, 0.09], toR: [-0.60, -0.32, 0.02], heR: [-0.52, 0.00, 0.02],
    elL: [0.08, 0.34, 1.10], haL: [0.18, 0.48, 0.98],
    elR: [0.08, -0.34, 1.10], haR: [0.18, -0.48, 0.98],
  }, { free: null, onIce: ['L', 'R'] }),

  hockey_stop: P({
    pelvis: [-0.02, 0.06, 0.78], chest: [0.02, 0.02, 1.09], head: [0.06, 0, 1.46],
    hipL: [-0.02, 0.14, 0.76], knL: [0.14, 0.20, 0.42], anL: [0.10, 0.24, 0.09],
    toL: [0.14, 0.40, 0.02], heL: [0.06, 0.08, 0.02],
    hipR: [-0.02, -0.08, 0.76], knR: [0.10, -0.14, 0.42], anR: [0.06, -0.10, 0.09],
    toR: [0.10, 0.06, 0.02], heR: [0.02, -0.26, 0.02],
    elL: [0.10, 0.32, 1.02], haL: [0.20, 0.46, 0.90],
    elR: [0.10, -0.32, 1.02], haR: [0.20, -0.46, 0.90],
  }, { free: null, onIce: ['L', 'R'] }),
};

/* ============================================================
   Operations on poses
   ============================================================ */

const MIRROR_MAP = {
  shL: 'shR', shR: 'shL', elL: 'elR', elR: 'elL', haL: 'haR', haR: 'haL',
  hipL: 'hipR', hipR: 'hipL', knL: 'knR', knR: 'knL',
  anL: 'anR', anR: 'anL', toL: 'toR', toR: 'toL', heL: 'heR', heR: 'heL',
};

/** mirror a pose left<->right (negate y, swap L/R joints) */
function poseMirror(p) {
  const out = {};
  for (const j of JOINTS) {
    const src = MIRROR_MAP[j] || j;
    const v = p[src];
    out[j] = [v[0], -v[1], v[2]];
  }
  const m = p._meta || {};
  out._meta = {
    free: m.free === 'L' ? 'R' : m.free === 'R' ? 'L' : null,
    onIce: (m.onIce || []).map((f) => (f === 'L' ? 'R' : 'L')),
  };
  return out;
}

/** linear blend of two poses */
function poseBlend(a, b, t) {
  const out = {};
  for (const j of JOINTS) out[j] = V.lerp(a[j], b[j], t);
  out._meta = t < 0.5 ? a._meta : b._meta;
  const h = t < 0.5 ? a._hand : b._hand;
  if (h) out._hand = h;
  return out;
}

/** look up a pose by name, mirrored if the skating foot is the right one */
function getPose(name, mirrored) {
  const p = POSES[name] || POSES.glide;
  return mirrored ? poseMirror(p) : p;
}

/**
 * Sample a keyframe track: [{t:0, pose:'glide'}, {t:0.5, pose:'arabesque'}, ...]
 * u in [0,1]. Uses smoothstep between keys so nothing pops.
 */
function samplePoseTrack(track, u, mirrored) {
  if (!track || !track.length) return getPose('glide', mirrored);
  if (track.length === 1) return getPose(track[0].pose, mirrored);
  let i = 0;
  while (i < track.length - 1 && u >= track[i + 1].t) i++;
  if (i >= track.length - 1) return getPose(track[track.length - 1].pose, mirrored);
  const a = track[i], b = track[i + 1];
  const span = Math.max(1e-6, b.t - a.t);
  const t = ease(clamp((u - a.t) / span, 0, 1));
  return poseBlend(getPose(a.pose, mirrored), getPose(b.pose, mirrored), t);
}

/* ============================================================
   ARM TRACKS
   ------------------------------------------------------------
   Upper body movement is a scored step-sequence feature in its own right
   (arms/head/torso, for at least a third of the pattern), not decoration. A
   whole-body pose can only move the arms when it hits a keyframe, so arms are
   authored as their OWN track on top of the body: `arms: [{t, pose}]` on a
   library element. Authored for the left foot skating, like every other pose,
   and mirrored the same way.

   Only the elbows and hands are overridden — shoulders stay with the torso, so
   the arm track never fights the body's line.
   ============================================================ */

const ARM_JOINTS = ['elL', 'haL', 'elR', 'haR'];

const ARM_POSES = {
  // classic carriage
  second:     { elL: [0.06, 0.34, 1.12], haL: [0.14, 0.54, 1.06], elR: [0.06, -0.34, 1.12], haR: [0.14, -0.54, 1.06] },
  low:        { elL: [0.04, 0.26, 1.02], haL: [0.10, 0.40, 0.80], elR: [0.04, -0.26, 1.02], haR: [0.10, -0.40, 0.80] },
  overhead:   { elL: [0.04, 0.24, 1.62], haL: [0.04, 0.18, 1.94], elR: [0.04, -0.24, 1.62], haR: [0.04, -0.18, 1.94] },
  crossed:    { elL: [0.12, 0.18, 1.14], haL: [0.20, -0.16, 1.16], elR: [0.12, -0.18, 1.14], haR: [0.20, 0.16, 1.16] },
  press_down: { elL: [0.02, 0.30, 0.98], haL: [0.06, 0.42, 0.68], elR: [0.02, -0.30, 0.98], haR: [0.06, -0.42, 0.68] },
  // directional / asymmetric
  reach_fwd:  { elL: [0.28, 0.22, 1.20], haL: [0.54, 0.20, 1.24], elR: [0.10, -0.30, 1.06], haR: [0.06, -0.46, 0.86] },
  open_back:  { elL: [-0.18, 0.30, 1.18], haL: [-0.40, 0.40, 1.20], elR: [-0.14, -0.30, 1.16], haR: [-0.34, -0.40, 1.16] },
  one_up:     { elL: [0.04, 0.22, 1.60], haL: [0.04, 0.16, 1.92], elR: [0.06, -0.30, 1.00], haR: [0.10, -0.44, 0.74] },
  one_out:    { elL: [0.10, 0.38, 1.16], haL: [0.20, 0.64, 1.18], elR: [0.08, -0.20, 1.02], haR: [0.14, -0.22, 0.80] },
  diagonal:   { elL: [0.16, 0.30, 1.30], haL: [0.32, 0.46, 1.48], elR: [-0.10, -0.28, 1.02], haR: [-0.24, -0.40, 0.80] },
  // working positions
  wrap:       { elL: [0.10, 0.16, 1.14], haL: [0.16, -0.06, 1.12], elR: [0.10, -0.16, 1.14], haR: [0.16, 0.06, 1.12] },
  spiral_arms:{ elL: [0.30, 0.24, 1.24], haL: [0.58, 0.26, 1.30], elR: [-0.20, -0.26, 1.14], haR: [-0.44, -0.34, 1.10] },
  check:      { elL: [-0.06, 0.36, 1.14], haL: [-0.18, 0.56, 1.08], elR: [0.20, -0.32, 1.12], haR: [0.38, -0.44, 1.04] },

  // ---- ballet port de bras (Vaganova numbering) -------------------------
  bras_bas:   { elL: [0.12, 0.26, 1.10], haL: [0.20, 0.12, 0.92], elR: [0.12, -0.26, 1.10], haR: [0.20, -0.12, 0.92] },
  first:      { elL: [0.24, 0.24, 1.18], haL: [0.38, 0.08, 1.18], elR: [0.24, -0.24, 1.18], haR: [0.38, -0.08, 1.18] },
  fifth:      { elL: [0.10, 0.28, 1.62], haL: [0.14, 0.08, 1.86], elR: [0.10, -0.28, 1.62], haR: [0.14, -0.08, 1.86] },
  third:      { elL: [0.10, 0.28, 1.62], haL: [0.14, 0.08, 1.86], elR: [0.06, -0.34, 1.12], haR: [0.14, -0.54, 1.06] },
  fourth:     { elL: [0.10, 0.28, 1.62], haL: [0.14, 0.08, 1.86], elR: [0.24, -0.24, 1.18], haR: [0.38, -0.08, 1.18] },
  arabesque_arms: { elL: [0.30, 0.20, 1.40], haL: [0.58, 0.14, 1.54], elR: [-0.16, -0.30, 1.16], haR: [-0.40, -0.36, 1.06] },

  // ---- jazz / show ----------------------------------------------------
  jazz_hands: { elL: [0.10, 0.40, 1.30], haL: [0.16, 0.56, 1.54], elR: [0.10, -0.40, 1.30], haR: [0.16, -0.56, 1.54], hand: 'spread' },
  jazz_low:   { elL: [0.08, 0.32, 1.06], haL: [0.18, 0.50, 0.86], elR: [0.08, -0.32, 1.06], haR: [0.18, -0.50, 0.86], hand: 'spread' },
  jazz_side:  { elL: [0.10, 0.42, 1.30], haL: [0.16, 0.60, 1.52], elR: [0.08, -0.32, 1.06], haR: [0.18, -0.50, 0.86], hand: 'spread' },
  v_high:     { elL: [0.04, 0.36, 1.62], haL: [0.02, 0.50, 1.90], elR: [0.04, -0.36, 1.62], haR: [0.02, -0.50, 1.90], hand: 'spread' },
  hips:       { elL: [-0.08, 0.36, 1.10], haL: [0.04, 0.18, 0.96], elR: [-0.08, -0.36, 1.10], haR: [0.04, -0.18, 0.96], hand: 'flat' },
  shrug:      { elL: [0.08, 0.30, 1.06], haL: [0.30, 0.44, 1.08], elR: [0.08, -0.30, 1.06], haR: [0.30, -0.44, 1.08], hand: 'flat' },
  hat_tip:    { elL: [0.20, 0.30, 1.42], haL: [0.18, 0.12, 1.66], elR: [0.06, -0.30, 1.00], haR: [0.10, -0.44, 0.76], hand: 'flat' },
  sway_L:     { elL: [0.10, 0.44, 1.26], haL: [0.16, 0.66, 1.42], elR: [0.16, 0.02, 1.20], haR: [0.20, 0.24, 1.36] },
  sway_R:     { elL: [0.16, -0.02, 1.20], haL: [0.20, -0.24, 1.36], elR: [0.10, -0.44, 1.26], haR: [0.16, -0.66, 1.42] },
  crest_L:    { elL: [0.06, 0.30, 1.46], haL: [0.02, 0.20, 1.74], elR: [0.10, -0.30, 1.12], haR: [0.16, -0.44, 0.98] },
  crest_R:    { elL: [0.10, 0.30, 1.12], haL: [0.16, 0.44, 0.98], elR: [0.06, -0.30, 1.46], haR: [0.02, -0.20, 1.74] },

  // ---- gesture / story ------------------------------------------------
  cover_face: { elL: [0.18, 0.26, 1.30], haL: [0.16, 0.06, 1.60], elR: [0.18, -0.26, 1.30], haR: [0.16, -0.06, 1.60], hand: 'flat' },
  cover_eyes: { elL: [0.18, 0.28, 1.34], haL: [0.18, 0.04, 1.62], elR: [0.06, -0.30, 1.00], haR: [0.10, -0.44, 0.76], hand: ['flat', 'soft'] },
  heart:      { elL: [0.16, 0.24, 1.18], haL: [0.20, 0.04, 1.30], elR: [0.16, -0.24, 1.18], haR: [0.20, -0.04, 1.30], hand: 'flat' },
  prayer:     { elL: [0.18, 0.26, 1.16], haL: [0.28, 0.02, 1.30], elR: [0.18, -0.26, 1.16], haR: [0.28, -0.02, 1.30], hand: 'flat' },
  offer:      { elL: [0.24, 0.24, 1.10], haL: [0.48, 0.16, 1.14], elR: [0.24, -0.24, 1.10], haR: [0.48, -0.16, 1.14], hand: 'flat' },
  reach_side: { elL: [0.06, 0.44, 1.32], haL: [0.06, 0.72, 1.38], elR: [-0.08, -0.36, 1.10], haR: [0.04, -0.18, 0.96] },
  guard:      { elL: [0.16, 0.24, 1.08], haL: [0.28, 0.10, 1.40], elR: [0.16, -0.24, 1.08], haR: [0.28, -0.10, 1.40], hand: 'fist' },
  punch_L:    { elL: [0.32, 0.18, 1.34], haL: [0.62, 0.12, 1.40], elR: [0.16, -0.24, 1.08], haR: [0.28, -0.10, 1.40], hand: 'fist' },
  punch_R:    { elL: [0.16, 0.24, 1.08], haL: [0.28, 0.10, 1.40], elR: [0.32, -0.18, 1.34], haR: [0.62, -0.12, 1.40], hand: 'fist' },
  fists_up:   { elL: [0.04, 0.26, 1.60], haL: [0.06, 0.20, 1.90], elR: [0.04, -0.26, 1.60], haR: [0.06, -0.20, 1.90], hand: 'fist' },
  fists_down: { elL: [0.04, 0.26, 1.04], haL: [0.10, 0.30, 0.82], elR: [0.04, -0.26, 1.04], haR: [0.10, -0.30, 0.82], hand: 'fist' },
  circle_1:   { elL: [0.26, 0.22, 1.14], haL: [0.44, 0.22, 1.30], elR: [0.26, -0.22, 1.14], haR: [0.44, -0.22, 1.30] },
  circle_2:   { elL: [0.26, 0.24, 1.18], haL: [0.44, 0.36, 1.18], elR: [0.26, -0.20, 1.18], haR: [0.44, -0.08, 1.18] },
  circle_3:   { elL: [0.26, 0.22, 1.14], haL: [0.44, 0.22, 1.06], elR: [0.26, -0.22, 1.14], haR: [0.44, -0.22, 1.06] },
  circle_4:   { elL: [0.26, 0.20, 1.18], haL: [0.44, 0.08, 1.18], elR: [0.26, -0.24, 1.18], haR: [0.44, -0.36, 1.18] },
};

/* Hand shapes are drawn as small glyphs on the hand joint: 'soft' (nothing
   extra), 'spread' (jazz hands — fingers fanned), 'fist', 'flat' (hand
   extended, palm shown). One string for both hands or [L, R]. */
function handShape(a) {
  const h = a.hand;
  if (!h) return null;
  return Array.isArray(h) ? { L: h[0], R: h[1] } : { L: h, R: h };
}

function armsMirror(a) {
  const out = {};
  const swap = { elL: 'elR', elR: 'elL', haL: 'haR', haR: 'haL' };
  for (const j of ARM_JOINTS) {
    const src = a[swap[j]];
    out[j] = [src[0], -src[1], src[2]];
  }
  const h = a._hand || handShape(a);
  if (h) out._hand = { L: h.R, R: h.L };
  return out;
}

function getArms(name, mirrored) {
  const a = ARM_POSES[name] || ARM_POSES.second;
  if (mirrored) return armsMirror(a);
  const h = handShape(a);
  return h ? Object.assign({ _hand: h }, a) : a;
}

/* ============================================================
   ARM PHRASES — arms that keep moving
   ------------------------------------------------------------
   A keyframe track holds a shape and eases to the next; that is right for a
   position but wrong for "dancing hands" — a wave rolling through the arms,
   fists pumping on the beat, jazz hands shaking, a boxer's one-two. Those are
   PHRASES: a function of phase (0..1, one cycle) that returns an arm pose.
   A track entry `{ t, phrase, until, cycles }` runs the phrase from `t` to
   `until` (default: the next keyframe) for `cycles` cycles, so authors say
   "pump for four beats" as `{ t: 0, phrase: 'pump', until: 1, cycles: 4 }`.
   Every phrase starts and ends on the same shape so the track can be joined
   to a keyframe on either side without a jump.
   ============================================================ */

/* Pacing. Arms on a skater do not snap: a move from one shape to the next
   takes at least ARM_PACE.minMove seconds, and a phrase cycle at least
   ARM_PACE.minCycle. The authored track is re-timed once per element duration
   to respect both (later keyframes are pushed later, phrase cycles are
   reduced), so an author can write the shapes and the pacing is guaranteed.
   The harness reports the measured hand speed and flags anything over
   maxHandSpeed outside a jump. */
const ARM_PACE = { minMove: 0.45, minMoveJump: 0.25, minCycle: 0.9, avgHandSpeed: 3.0, maxHandSpeed: 5, maxHandSpeedJump: 8 };

/** the larger hand displacement between two arm shapes, metres */
function armMoveDist(a, b) {
  if (!a || !b) return 0;
  return Math.max(Math.hypot(a.haL[0] - b.haL[0], a.haL[1] - b.haL[1], a.haL[2] - b.haL[2]),
                  Math.hypot(a.haR[0] - b.haR[0], a.haR[1] - b.haR[1], a.haR[2] - b.haR[2]));
}
/** how long a move between two shapes needs so its eased peak stays under the cap */
function armMoveTime(a, b, fast) {
  return Math.max(fast ? ARM_PACE.minMoveJump : ARM_PACE.minMove, armMoveDist(a, b) / ARM_PACE.avgHandSpeed * (fast ? 0.6 : 1));
}


const armLerp = (a, b, t, hand) => {
  const out = {};
  for (const j of ARM_JOINTS) out[j] = V.lerp(a[j], b[j], t);
  const h = hand || (t < 0.5 ? (a._hand || handShape(a)) : (b._hand || handShape(b)));
  if (h) out._hand = h;
  return out;
};
const cycleThrough = (names, hand) => {
  const fn = (ph) => {
    // a closed loop through the named shapes, eased between neighbours
    const n = names.length, x = ph * n, i = Math.floor(x) % n, f = ease(x - Math.floor(x));
    return armLerp(ARM_POSES[names[i]], ARM_POSES[names[(i + 1) % n]], f, hand);
  };
  fn.moves = names.length;   // moves per cycle — the pacing needs it
  let d = 0; for (let i = 0; i < names.length; i++) d += armMoveDist(ARM_POSES[names[i]], ARM_POSES[names[(i + 1) % names.length]]);
  fn.cycleTime = Math.max(ARM_PACE.minCycle, names.length * ARM_PACE.minMove, d / ARM_PACE.avgHandSpeed);   // seconds one cycle needs
  return fn;
};

const ARM_PHRASES = {
  // a wave rolling from one hand, up over the head and down the other arm
  wave_roll: cycleThrough(['sway_L', 'crest_L', 'overhead', 'crest_R', 'sway_R', 'low']),
  // fists pumping down on each beat
  pump: cycleThrough(['fists_up', 'fists_down'], { L: 'fist', R: 'fist' }),
  // both hands rising and falling together, open
  rise_fall: cycleThrough(['overhead', 'low']),
  // jazz hands shaking: a fast wobble around the open shape
  jazz_shake: Object.assign((ph) => {
    const a = ARM_POSES.jazz_hands, w = Math.sin(ph * TAU * 3) * 0.05, v = Math.cos(ph * TAU * 3) * 0.03;
    const out = {};
    for (const j of ARM_JOINTS) out[j] = a[j].slice();
    out.haL[1] += w; out.haL[2] += v; out.haR[1] -= w; out.haR[2] += v;
    out._hand = { L: 'spread', R: 'spread' };
    return out;
  }, { moves: 1, cycleTime: 0.9 }),   // a wobble of a few cm, not a move
  // a boxer's one-two from the guard
  boxing: cycleThrough(['guard', 'punch_L', 'guard', 'punch_R'], { L: 'fist', R: 'fist' }),
  // hands rolling round each other in front of the chest
  roll_hands: cycleThrough(['circle_1', 'circle_2', 'circle_3', 'circle_4']),
  // a classical port de bras: bras bas, first, fifth, open to second, down
  port_de_bras: cycleThrough(['bras_bas', 'first', 'fifth', 'second', 'low']),
  // the two hands swapping high and low like a see-saw
  seesaw: cycleThrough(['crest_L', 'crest_R']),
  // one hand flicking out to the side and back, then the other
  flick: cycleThrough(['low', 'jazz_side', 'low', 'reach_side'], null),
};

/** the arm shape a track entry has at absolute element time u */
function armEntryAt(k, u, until) {
  if (k.phrase && ARM_PHRASES[k.phrase]) {
    const span = Math.max(1e-6, until - k.t);
    const ph = clamp((u - k.t) / span, 0, 1) * (k.cycles || 1);
    return ARM_PHRASES[k.phrase](ph - Math.floor(ph));
  }
  return ARM_POSES[k.pose] ? getArms(k.pose, false) : getArms('second', false);
}

function pacedTrack(track, dur, fast) {
  if (!dur || dur <= 0) return track;
  if (!track.__paced) Object.defineProperty(track, '__paced', { value: new Map(), enumerable: false });
  const key = Math.round(dur * 20) + (fast ? 'j' : '');
  if (track.__paced.has(key)) return track.__paced.get(key);

  const shapeOf = (k) => (k.phrase ? (ARM_PHRASES[k.phrase] ? ARM_PHRASES[k.phrase](0) : null) : ARM_POSES[k.pose]);
  const needU = (a, b) => armMoveTime(shapeOf(a), shapeOf(b), fast) / dur;
  const cycleU = (k) => { const fn = ARM_PHRASES[k.phrase]; return ((fn && fn.cycleTime) || ARM_PACE.minCycle) / dur; };

  // Each keyframe is a start t and a length (phrases run for `len`); between
  // consecutive keyframes the hands need `need` to travel. Feasible when
  // t0 = 0 and everything fits before 1. Place each key as close to its
  // authored time as the constraints allow; if it cannot fit, first shorten
  // the phrases, then drop middle keyframes.
  let keys = track.map((k) => Object.assign({}, k));
  const lenOf = (k, next) => (k.phrase ? Math.max(0, (k.until != null ? k.until : (next ? next.t - Math.min(0.12, 0.25 * (next.t - k.t)) : 1)) - k.t) : 0);
  let lens = keys.map((k, i) => lenOf(k, keys[i + 1]));
  const minLen = (k) => (k.phrase ? cycleU(k) * 0.5 : 0);

  const solve = () => {
    const n = keys.length;
    if (n === 1) return true;
    const need = keys.slice(1).map((k, i) => needU(keys[i], k));
    // earliest starts
    const E = [0]; for (let i = 1; i < n; i++) E.push(E[i - 1] + lens[i - 1] + need[i - 1]);
    if (E[n - 1] + lens[n - 1] > 1 + 1e-9) return false;
    // latest starts
    const L = new Array(n); L[n - 1] = 1 - lens[n - 1];
    for (let i = n - 2; i >= 0; i--) L[i] = L[i + 1] - need[i] - lens[i];
    keys[0].t = 0;
    for (let i = 1; i < n; i++) keys[i].t = Math.min(L[i], Math.max(E[i], track[track.indexOf(keys[i].__src) >= 0 ? track.indexOf(keys[i].__src) : i] ? keys[i].t : keys[i].t));
    for (let i = 1; i < n; i++) keys[i].t = Math.min(L[i], Math.max(E[i], keys[i].t));
    // keep order sane
    for (let i = 1; i < n; i++) keys[i].t = Math.max(keys[i].t, keys[i - 1].t + lens[i - 1] + need[i - 1]);
    keys.forEach((k, i) => { if (k.phrase) { k.until = k.t + lens[i]; k.cycles = Math.max(0.5, Math.min(k.cycles || 1, lens[i] / cycleU(k))); } });
    return true;
  };

  if (!solve()) {
    lens = keys.map((k) => minLen(k));                     // shortest phrases
    while (!solve() && keys.length > 2) {
      const mid = Math.floor(keys.length / 2);             // drop a middle keyframe
      keys.splice(mid, 1); lens.splice(mid, 1);
    }
    if (keys.length === 2 && !solve()) { keys[1].t = 1; }  // two shapes and no time: the move takes the whole element
  }
  track.__paced.set(key, keys);
  return keys;
}

function sampleArmTrack(track, u, mirrored, dur, fast) {
  if (!track || !track.length) return null;
  const fin = (a) => (mirrored ? armsMirror(a) : a);
  if (dur) track = pacedTrack(track, dur, fast);
  if (track.length === 1) return fin(armEntryAt(track[0], u, 1));
  let i = 0;
  while (i < track.length - 1 && u >= track[i + 1].t) i++;
  const k = track[i], next = track[i + 1] || null;
  // a phrase with no `until` runs up to the next keyframe, leaving a short
  // window to ease into it
  const until = k.phrase ? (k.until != null ? k.until : (next ? next.t - Math.min(0.12, 0.25 * (next.t - k.t)) : 1)) : k.t;
  if (!next) return fin(armEntryAt(k, u, until));
  if (k.phrase && u <= until) return fin(armEntryAt(k, u, until));
  // ease from where this entry ends to where the next one starts
  const a = armEntryAt(k, until, until), b = armEntryAt(next, next.t, next.until != null ? next.until : 1);
  const span = Math.max(1e-6, next.t - until);
  const t = ease(clamp((u - until) / span, 0, 1));
  return fin(armLerp(a, b, t));
}

/** lay an arm track over a body pose, leaving the torso alone */
function applyArms(pose, arms) {
  if (!arms) return pose;
  const out = {};
  for (const j of JOINTS) out[j] = pose[j].slice();
  for (const j of ARM_JOINTS) out[j] = arms[j].slice();
  out._meta = pose._meta;
  if (arms._hand) out._hand = arms._hand;
  return out;
}

/**
 * A pose track only moves the arms when it hits a keyframe, so between
 * keyframes the hands sit dead still and the skater looks frozen from the
 * waist up. Layer a small continuous port de bras over the arms, phased to the
 * musical beat, so the hands are always doing something. Amplitude is per
 * category: none during jumps and spins, where the arms have a real job.
 */
const ARM_BREATH = {
  edges: 1, turns: 1, steps: 1.15, choreo: 1.2, field: 0.45, stops: 0.35, jumps: 0, spins: 0,
};

function armBreath(pose, beat, amount) {
  if (!amount) return pose;
  const a = TAU * (beat / 4);             // one cycle every four beats
  const rise = Math.sin(a) * 0.055 * amount;
  const open = Math.cos(a * 0.5) * 0.045 * amount;
  const drift = Math.sin(a * 0.5 + 0.9) * 0.035 * amount;
  const out = {};
  for (const j of JOINTS) out[j] = pose[j].slice();
  out.haL[1] += open; out.haL[2] += rise; out.haL[0] += drift;
  out.haR[1] -= open; out.haR[2] += rise; out.haR[0] += drift;
  out.elL[1] += open * 0.45; out.elL[2] += rise * 0.55;
  out.elR[1] -= open * 0.45; out.elR[2] += rise * 0.55;
  out._meta = pose._meta;
  if (pose._hand) out._hand = pose._hand;
  return out;
}

/* ============================================================
   LINE / EXTENSION METRICS  ("Extension Lab")
   Built for the persona: the thing she says she struggles with.
   ============================================================ */

function angleAt(a, b, c) {
  const u = V.norm(V.sub(a, b)), v = V.norm(V.sub(c, b));
  return Math.acos(clamp(V.dot(u, v), -1, 1)) / DEG; // degrees, 180 = straight
}

/**
 * Score the "line" of a pose. Returns 0..100 sub-scores + notes.
 *  - free leg height above the hip
 *  - free knee straightness
 *  - toe point (ankle->toe continuing the shin line)
 *  - skating knee bend (too straight = "penguin")
 *  - upper body carriage (shoulders level & open, head up)
 */
function lineMetrics(pose) {
  const m = pose._meta || {};
  const free = m.free;
  const out = { hasFree: !!free, notes: [] };

  if (free) {
    const hip = pose['hip' + free], kn = pose['kn' + free], an = pose['an' + free], to = pose['to' + free];
    const skHip = pose['hip' + (free === 'L' ? 'R' : 'L')];

    // height of free ankle relative to the skating hip
    const rise = an[2] - skHip[2];
    out.height = clamp((rise + 0.55) / 1.05, 0, 1) * 100;

    // knee straightness: 180 deg is straight
    out.knee = clamp((angleAt(hip, kn, an) - 100) / 80, 0, 1) * 100;

    // toe point: how well ankle->toe continues knee->ankle
    const shin = V.norm(V.sub(an, kn)), foot = V.norm(V.sub(to, an));
    out.toe = clamp((V.dot(shin, foot) + 0.2) / 1.2, 0, 1) * 100;

    if (out.knee < 65) out.notes.push('free knee is bent — think of pressing it straight from the back of the thigh');
    if (out.toe < 55) out.notes.push('toe is not pointed through — finish the line all the way past the blade');
    if (out.height < 40) out.notes.push('free leg is low — lift from the glute, not by collapsing the chest');
  } else {
    out.height = null; out.knee = null; out.toe = null;
  }

  // skating knee bend: a totally straight skating leg is the "penguin" signature
  const skate = free === 'L' ? 'R' : free === 'R' ? 'L' : 'L';
  const bend = angleAt(pose['hip' + skate], pose['kn' + skate], pose['an' + skate]);
  out.skatingKnee = clamp((180 - bend) / 55, 0, 1) * 100;
  if (out.skatingKnee < 18 && free) out.notes.push('skating knee is locked — soften it, the edge comes from the knee');

  // carriage: shoulders level, arms away from the body, head not dropped
  const shTilt = Math.abs(pose.shL[2] - pose.shR[2]);
  const armSpan = Math.abs(pose.haL[1] - pose.haR[1]);
  const headUp = pose.head[2] - pose.chest[2];
  out.carriage = clamp(
    (1 - clamp(shTilt / 0.25, 0, 1)) * 0.35 +
    clamp(armSpan / 1.1, 0, 1) * 0.35 +
    clamp((headUp - 0.05) / 0.4, 0, 1) * 0.30, 0, 1) * 100;
  if (out.carriage < 45) out.notes.push('carriage is closed — open the chest, lengthen through the top of the head');

  const parts = [out.height, out.knee, out.toe, out.skatingKnee * 0.9, out.carriage].filter((v) => v !== null);
  out.overall = parts.reduce((a, b) => a + b, 0) / parts.length;
  return out;
}

/** "Penguin meter": high = stiff, upright, arms glued down, no knee bend */
function penguinScore(pose) {
  const lm = lineMetrics(pose);
  const armSpan = Math.abs(pose.haL[1] - pose.haR[1]);
  const stiff = 100 - lm.skatingKnee;
  const tucked = clamp(1 - armSpan / 0.9, 0, 1) * 100;
  const short = lm.hasFree ? 100 - (lm.height * 0.5 + lm.knee * 0.5) : 40;
  return clamp(stiff * 0.4 + tucked * 0.3 + short * 0.3, 0, 100);
}
