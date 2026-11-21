import {f, SIXTEENTH, FPS} from './timing';

/**
 * ============ DATA EDIT (ubah di sini) ============
 * Semua waktu dalam "sixteenth" (n) dari awal drop, 4 sixteenth = 1 beat (96 BPM).
 * 18 beat = 72 sixteenth = 11.25 dtk; sisanya ekor lagu fade-out.
 */

export type ShotFx = {
  /** kilat putih saat potongan (0..1) */
  flash?: number;
  /** kilat negatif (invert) 2 frame saat potongan */
  invert?: boolean;
  /** pemisahan RGB (px) yang meluruh setelah potongan */
  rgb?: number;
  /** punch zoom awal potongan (mis. 0.12 = +12%) */
  punch?: number;
  /** guncangan awal potongan (px) */
  shake?: number;
  /** putar sedikit (derajat) yang meluruh */
  roll?: number;
  /** zoom blur awal potongan (px) */
  zb?: number;
  /** 3 frame pertama hitam-putih (kilat B&W seperti referensi) */
  bwFlash?: boolean;
  /** seluruh shot jadi halftone hitam-putih */
  halftone?: boolean;
  /** bingkai menyusut di dalam hitam (0..1, 1 = penuh) */
  inset?: number;
};

export type Shot = {
  n0: number;
  n1: number;
  /** zoom relatif crop 4:5 (1 = isi bingkai) */
  z: number;
  /** posisi titik fokus di bingkai (0..1) */
  at: [number, number];
  /** fokus: 'face' = ikut lacak wajah, atau [u,v] koordinat sumber 0..1 */
  focus?: 'face' | [number, number];
  fx?: ShotFx;
};

export type ClipPlan = {
  id: 'c1' | 'c2' | 'c3' | 'c4';
  src: string;
  /** rentang di timeline drop */
  n0: number;
  n1: number;
  /** rentang sumber yang dipakai (detik); kecepatan = (srcTo-srcFrom) / durasi */
  srcFrom: number;
  srcTo: number;
  shots: Shot[];
};

// Lacak wajah (dari deteksi YuNet, koordinat sumber 0..1): [detik, u, v]
export const FACE: Record<ClipPlan['id'], [number, number, number][]> = {
  c1: [
    [0, 0.54, 0.25],
    [0.5, 0.544, 0.277],
    [1, 0.536, 0.289],
    [1.5, 0.544, 0.275],
    [2, 0.533, 0.245],
    [2.5, 0.473, 0.235],
    [3, 0.439, 0.216],
    [3.55, 0.41, 0.19],
  ],
  c2: [
    [0, 0.52, 0.49],
    [1.88, 0.52, 0.485],
  ],
  c3: [
    [0, 0.436, 0.385],
    [0.5, 0.477, 0.388],
    [1, 0.544, 0.444],
    [1.5, 0.506, 0.484],
    [2, 0.491, 0.494],
    [2.5, 0.432, 0.455],
    [3, 0.505, 0.486],
    [3.5, 0.502, 0.474],
    [3.95, 0.496, 0.461],
  ],
  c4: [
    [0, 0.466, 0.157],
    [1, 0.473, 0.168],
    [1.5, 0.498, 0.146],
    [2, 0.501, 0.141],
    [2.67, 0.409, 0.13],
    [3.5, 0.468, 0.139],
  ],
};

const sh = (
  n0: number,
  n1: number,
  z: number,
  at: [number, number],
  fx?: ShotFx,
  focus?: Shot['focus'],
): Shot => ({n0, n1, z, at, fx, focus});

export const PLANS: ClipPlan[] = [
  // ---- botak + jubah: "Apa sih otak udang" ----
  {
    id: 'c2',
    src: 'Video/lv_0_20261121012256.mp4',
    n0: 0,
    n1: 12,
    srcFrom: 0,
    srcTo: 1.88,
    shots: [
      sh(0, 4, 1.4, [0.5, 0.3], {flash: 0.95, rgb: 22, punch: 0.14, shake: 16, roll: -1.5}),
      sh(4, 8, 1.25, [0.62, 0.32], {rgb: 8, punch: 0.07, roll: 1.2}),
      sh(8, 10, 1.9, [0.5, 0.28], {rgb: 14, punch: 0.1, zb: 30}),
      sh(10, 12, 1.25, [0.4, 0.32], {rgb: 10, punch: 0.08, roll: -1}),
    ],
  },
  // ---- gym pamer otot: "Iwa iwi ewe ewe ewe / Kocak lu dikit-dikit ewe x4" ----
  {
    id: 'c1',
    src: 'Video/lv_0_20261121012119.mp4',
    n0: 12,
    n1: 32,
    srcFrom: 0,
    srcTo: 3.55,
    shots: [
      sh(12, 13, 1.0, [0.5, 0.3], {flash: 0.5, rgb: 12, punch: 0.08}),
      sh(13, 14, 1.7, [0.5, 0.3], {invert: true, rgb: 16, punch: 0.1}),
      sh(14, 16, 1.15, [0.5, 0.3], {rgb: 10, punch: 0.08, shake: 8}),
      sh(16, 20, 1.35, [0.5, 0.36], {flash: 0.6, rgb: 14, punch: 0.1, shake: 10, roll: 1.4}),
      sh(20, 22, 1.8, [0.46, 0.3], {rgb: 12, punch: 0.1}),
      sh(22, 24, 1.1, [0.55, 0.3], {rgb: 8, punch: 0.07, roll: -1}),
      sh(24, 25, 2.0, [0.5, 0.3], {bwFlash: true, rgb: 18, punch: 0.1}),
      sh(25, 26, 1.2, [0.5, 0.3], {invert: true, rgb: 14, punch: 0.08}),
      sh(26, 27, 1.9, [0.5, 0.3], {bwFlash: true, rgb: 18, punch: 0.1}),
      sh(27, 28, 1.25, [0.5, 0.3], {rgb: 14, punch: 0.08}),
      sh(28, 32, 1.5, [0.38, 0.3], {flash: 0.5, rgb: 12, punch: 0.09, roll: -1.2}),
    ],
  },
  // ---- sisir rambut: "Otak lu coli mulu bocil-bocil / Ga jelas lho gooner-gooner ini" ----
  {
    id: 'c3',
    src: 'Video/lv_0_20261121012416.mp4',
    n0: 32,
    n1: 56,
    srcFrom: 0,
    srcTo: 3.95,
    shots: [
      sh(32, 34, 1.35, [0.5, 0.36], {flash: 0.9, rgb: 20, punch: 0.14, shake: 14}),
      sh(34, 36, 1.8, [0.46, 0.32], {rgb: 10, punch: 0.09, roll: 1.2}),
      sh(36, 38, 1.2, [0.5, 0.38], {rgb: 10, punch: 0.08}),
      sh(38, 40, 2.1, [0.5, 0.32], {rgb: 14, punch: 0.1, zb: 24}),
      sh(40, 44, 1.4, [0.5, 0.34], {halftone: true, flash: 0.7, punch: 0.1}),
      sh(44, 46, 1.3, [0.58, 0.36], {rgb: 10, punch: 0.08, roll: -1.2}),
      sh(46, 47, 2.2, [0.5, 0.3], {rgb: 24, punch: 0.12, bwFlash: true}),
      sh(47, 48, 1.5, [0.5, 0.34], {rgb: 14, punch: 0.08}),
      sh(48, 50, 2.0, [0.5, 0.3], {invert: true, rgb: 22, punch: 0.12}),
      sh(50, 52, 1.2, [0.5, 0.38], {rgb: 10, punch: 0.08}),
      sh(52, 54, 1.5, [0.5, 0.34], {flash: 0.9, zb: 40, rgb: 20, punch: 0.14, shake: 14}),
      sh(54, 56, 1.9, [0.5, 0.32], {rgb: 16, punch: 0.12, roll: 1.4}),
    ],
  },
  // ---- pamer otot jins: "nggak sih dari channel ini guys" ----
  {
    id: 'c4',
    src: 'Video/lv_0_20261121012555.mp4',
    n0: 56,
    n1: 72,
    srcFrom: 0,
    srcTo: 2.75,
    shots: [
      sh(56, 58, 1.0, [0.5, 0.2], {flash: 0.6, rgb: 12, punch: 0.1}),
      sh(58, 60, 1.6, [0.5, 0.42], {rgb: 12, punch: 0.1}, [0.47, 0.4]),
      sh(60, 62, 2.2, [0.5, 0.3], {rgb: 16, punch: 0.1, zb: 24}),
      sh(62, 64, 1.3, [0.5, 0.34], {rgb: 10, punch: 0.08, roll: -1.2}, [0.48, 0.3]),
      sh(64, 66, 1.7, [0.5, 0.38], {flash: 0.5, rgb: 14, punch: 0.1}, [0.5, 0.33]),
      sh(66, 68, 2.3, [0.5, 0.3], {rgb: 24, punch: 0.12, bwFlash: true}),
      sh(68, 72, 1.0, [0.5, 0.5], {flash: 1, rgb: 26, punch: 0.1, shake: 18, inset: 0.9}),
    ],
  },
];

// ---------------- Caption kata-per-kata ----------------
export type Word = {
  t: string;
  /** sixteenth saat kata masuk (boleh pecahan) */
  n: number;
  size: number;
  row: number;
  tone?: 'w' | 'gold' | 'red';
  font?: 'main' | 'script';
  from?: 'L' | 'R' | 'T' | 'B' | 'Z';
  blink?: boolean;
  rot?: number;
};

export type Phrase = {
  n0: number;
  n1: number;
  words: Word[];
  /** jarak lockup dari tepi bawah (px) */
  bottom?: number;
};

const SMALL = 104;
const MID = 170;
const BIG = 250;

export const PHRASES: Phrase[] = [
  {
    n0: 0,
    n1: 8,
    words: [
      {t: 'apa', n: 0, size: SMALL, row: 0, from: 'L'},
      {t: 'sih', n: 2, size: SMALL, row: 0, from: 'R'},
      {t: 'otak', n: 4, size: BIG, row: 1, from: 'T', tone: 'gold'},
      {t: 'udang', n: 6, size: BIG, row: 2, from: 'Z', tone: 'red', blink: true},
    ],
  },
  {
    n0: 8,
    n1: 16,
    words: [
      {t: 'iwa', n: 8, size: MID, row: 0, from: 'L'},
      {t: 'iwi', n: 10, size: MID, row: 0, from: 'R'},
      {t: 'ewe', n: 12, size: MID, row: 1, from: 'B', tone: 'gold'},
      {t: 'ewe', n: 13, size: MID, row: 1, from: 'Z', tone: 'gold'},
      {t: 'ewe', n: 14, size: MID, row: 1, from: 'T', tone: 'red', blink: true},
    ],
  },
  {
    n0: 16,
    n1: 28,
    words: [
      {t: 'kocak', n: 16, size: SMALL, row: 0, from: 'L'},
      {t: 'lu', n: 18, size: SMALL, row: 0, from: 'R'},
      {t: 'dikit', n: 20, size: MID, row: 1, from: 'T', tone: 'gold'},
      {t: 'dikit', n: 22, size: MID, row: 2, from: 'B', tone: 'gold'},
      {t: 'ewe', n: 24, size: 110, row: 3, from: 'L'},
      {t: 'ewe', n: 25, size: 110, row: 3, from: 'R'},
      {t: 'ewe', n: 26, size: 110, row: 3, from: 'Z'},
      {t: 'ewe', n: 27, size: 110, row: 3, from: 'T', tone: 'red', blink: true},
    ],
  },
  {
    n0: 28,
    n1: 40,
    words: [
      {t: 'otak', n: 28, size: SMALL, row: 0, from: 'L'},
      {t: 'lu', n: 30, size: SMALL, row: 0, from: 'R'},
      {t: 'coli', n: 32, size: BIG, row: 1, from: 'Z', tone: 'red', blink: true},
      {t: 'mulu', n: 34, size: BIG, row: 1, from: 'B', tone: 'gold'},
      {t: 'bocil', n: 36, size: MID, row: 2, from: 'L'},
      {t: 'bocil', n: 38, size: MID, row: 3, from: 'R'},
    ],
  },
  {
    n0: 40,
    n1: 52,
    words: [
      {t: 'ga', n: 40, size: SMALL, row: 0, from: 'L'},
      {t: 'jelas', n: 42, size: SMALL, row: 0, from: 'T'},
      {t: 'lho', n: 44, size: SMALL, row: 0, from: 'R'},
      {t: 'gooner', n: 46, size: 200, row: 1, from: 'Z', tone: 'gold'},
      {t: 'gooner', n: 48, size: 200, row: 2, from: 'B', tone: 'red', blink: true},
      {t: 'ini', n: 50, size: SMALL, row: 3, from: 'R'},
    ],
  },
  {
    n0: 52,
    n1: 72,
    bottom: 100,
    words: [
      {t: 'bumi', n: 52, size: MID, row: 0, from: 'L'},
      {t: 'hanguskan', n: 54, size: 190, row: 1, from: 'Z', tone: 'red', blink: true},
      {t: 'nggak', n: 58, size: SMALL, row: 2, from: 'L'},
      {t: 'sih', n: 60, size: SMALL, row: 2, from: 'T'},
      {t: 'dari', n: 62, size: SMALL, row: 2, from: 'R'},
      {t: 'channel', n: 64, size: MID, row: 3, from: 'B', tone: 'gold'},
      {t: 'ini', n: 66, size: SMALL, row: 3, from: 'R'},
      {t: 'guys', n: 68, size: 170, row: 4, from: 'Z', font: 'script', rot: -4},
    ],
  },
];

// ---------------- SFX ----------------
export type Sfx = {
  /** sixteenth (boleh pecahan) tempat SFX mulai, relatif awal drop */
  n: number;
  file: string;
  dur: number;
  vol: number;
};

const sfx = (n: number, file: string, dur: number, vol: number): Sfx => ({n, file, dur, vol});

export const SFX: Sfx[] = [
  sfx(0, 'Glitch click.wav', 0.32, 0.7),
  sfx(6, 'ClicK fingerk.wav', 0.44, 0.4),
  sfx(12, 'Whoosh click.wav', 0.88, 0.55),
  sfx(12, 'Click.wav', 0.44, 0.35),
  sfx(13, 'Click.wav', 0.44, 0.3),
  sfx(14, 'App Click 15.wav', 0.7, 0.4),
  sfx(16, 'Cut game click.wav', 0.92, 0.4),
  sfx(20, 'ClicK fingerk.wav', 0.44, 0.4),
  sfx(24, 'Click.wav', 0.44, 0.3),
  sfx(25, 'Click.wav', 0.44, 0.3),
  sfx(26, 'Click.wav', 0.44, 0.3),
  sfx(27, 'App Click 15.wav', 0.7, 0.4),
  sfx(31, 'Click riser.wav', 3.24, 0.32),
  sfx(32, 'Glitch click.wav', 0.32, 0.7),
  sfx(36, 'ClicK fingerk.wav', 0.44, 0.35),
  sfx(40, 'Digital Text 03.mp3', 1.28, 0.3),
  sfx(46, 'Click.wav', 0.44, 0.35),
  sfx(48, 'App Click 15.wav', 0.7, 0.4),
  sfx(52, 'Whoosh click.wav', 0.88, 0.5),
  sfx(54, 'Glitch click.wav', 0.32, 0.65),
  sfx(64, 'ClicK fingerk.wav', 0.44, 0.4),
  sfx(68, 'Camera flash sound effect.mp3', 2.09, 0.45),
];

// ---------------- util turunan ----------------
export const planFrames = (p: ClipPlan) => ({from: f(p.n0), to: f(p.n1)});
export const planRate = (p: ClipPlan): number => {
  const {from, to} = planFrames(p);
  return (p.srcTo - p.srcFrom) / ((to - from) / FPS);
};

export const sixteenthSeconds = SIXTEENTH / FPS;
