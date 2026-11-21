import {FPS, f} from './timing';

/**
 * ============ DATA EDIT (ubah di sini) ============
 * Drop: waktu dalam "sixteenth" (n) dari awal drop, 4 sixteenth = 1 beat (96 BPM), 18 beat = 72 sixteenth.
 * Caption hook: detik (dari awal video), diukur dari puncak vokal Hook&Lagu.mp4.
 */

export type ClipId = 'c1' | 'c2' | 'c3' | 'c4';

export const CLIPS: Record<ClipId, {src: string; fg: string}> = {
  c1: {src: 'Video/lv_0_20261121012119.mp4', fg: 'Matte/c1-fg.webm'},
  c2: {src: 'Video/lv_0_20261121012256.mp4', fg: 'Matte/c2-fg.webm'},
  c3: {src: 'Video/lv_0_20261121012416.mp4', fg: 'Matte/c3-fg.webm'},
  c4: {src: 'Video/lv_0_20261121012555.mp4', fg: 'Matte/c4-fg.webm'},
};

// Lacak wajah (deteksi YuNet, koordinat sumber 0..1): [detik, u, v]
export const FACE: Record<ClipId, [number, number, number][]> = {
  c1: [[0, 0.54, 0.25], [0.5, 0.544, 0.277], [1, 0.536, 0.289], [1.5, 0.544, 0.275], [2, 0.533, 0.245], [2.5, 0.473, 0.235], [3, 0.439, 0.216], [3.55, 0.41, 0.19]],
  c2: [[0, 0.52, 0.49], [1.88, 0.52, 0.485]],
  c3: [[0, 0.436, 0.385], [0.5, 0.477, 0.388], [1, 0.544, 0.444], [1.5, 0.506, 0.484], [2, 0.491, 0.494], [2.5, 0.432, 0.455], [3, 0.505, 0.486], [3.5, 0.502, 0.474], [3.95, 0.496, 0.461]],
  c4: [[0, 0.466, 0.157], [1, 0.473, 0.168], [1.5, 0.498, 0.146], [2, 0.501, 0.141], [2.67, 0.409, 0.13], [3.5, 0.468, 0.139]],
};

/**
 * Satu shot = satu potongan di beat. Kamera dibuat tenang (hanya drift pelan);
 * gerak datang dari slow motion (rate < 1) dan blur transisi yang naik-turun.
 */
export type DropShot = {
  n0: number;
  n1: number;
  clip: ClipId;
  /** detik mulai di klip sumber */
  srcFrom: number;
  /** kecepatan: 0.5 = slow motion, 1 = normal */
  rate: number;
  /** zoom relatif crop 4:5 (1 = isi bingkai) */
  z: number;
  /** posisi titik fokus (wajah) di bingkai 0..1 */
  at: [number, number];
  /** tambahan zoom pelan sepanjang shot (mis. 0.05 = lima persen) */
  drift?: number;
  /** jaring halftone hitam-putih di belakang Windah (pakai matte) */
  net?: boolean;
  /** seluruh shot hitam-putih */
  bw?: boolean;
  /** kilat putih di awal potongan (0..1) */
  flash?: number;
  /** kilat negatif 2 frame di awal */
  invert?: boolean;
  /** pemisahan RGB (px) di awal potongan */
  rgb?: number;
  /** bingkai menyusut di dalam hitam + film strip (0..1) */
  inset?: number;
};

export const SHOTS: DropShot[] = [
  {n0: 0, n1: 8, clip: 'c2', srcFrom: 0.0, rate: 0.5, z: 1.25, at: [0.5, 0.36], drift: 0.07, net: true, flash: 0.95, rgb: 14},
  {n0: 8, n1: 16, clip: 'c2', srcFrom: 0.62, rate: 1, z: 1.1, at: [0.5, 0.4], drift: 0.04},
  {n0: 16, n1: 24, clip: 'c1', srcFrom: 0.35, rate: 0.5, z: 1.0, at: [0.5, 0.3], drift: 0.06, net: true, flash: 0.5, rgb: 10},
  {n0: 24, n1: 32, clip: 'c1', srcFrom: 1.9, rate: 1, z: 1.25, at: [0.45, 0.3], drift: 0.04},
  {n0: 32, n1: 40, clip: 'c3', srcFrom: 0.2, rate: 0.5, z: 1.25, at: [0.5, 0.36], drift: 0.06, net: true, flash: 0.7, rgb: 12},
  {n0: 40, n1: 48, clip: 'c3', srcFrom: 1.0, rate: 1, z: 1.15, at: [0.5, 0.38], drift: 0.04, net: true, bw: true},
  {n0: 48, n1: 56, clip: 'c3', srcFrom: 2.3, rate: 0.6, z: 1.3, at: [0.5, 0.34], drift: 0.05, invert: true},
  {n0: 56, n1: 64, clip: 'c4', srcFrom: 0.3, rate: 0.5, z: 1.0, at: [0.5, 0.2], drift: 0.05, net: true, flash: 0.6, rgb: 10},
  {n0: 64, n1: 72, clip: 'c4', srcFrom: 1.25, rate: 1, z: 1.0, at: [0.5, 0.2], drift: 0, flash: 1, rgb: 20, inset: 0.9},
];

// ---------------- Caption kata-per-kata (HOOK, 0 - 9.9 dtk) ----------------
export type Word = {
  t: string;
  /** detik masuk (dari awal video) */
  s: number;
  size: number;
  row: number;
  tone?: 'w' | 'gold' | 'red';
  font?: 'main' | 'script';
  from?: 'L' | 'R' | 'T' | 'B' | 'Z';
  blink?: boolean;
  rot?: number;
};

export type Phrase = {
  /** detik frasa hilang */
  end: number;
  words: Word[];
};

const SM = 66;
const MD = 96;
const BG = 124;

export const HOOK_PHRASES: Phrase[] = [
  {
    end: 1.06,
    words: [
      {t: 'apa', s: 0.39, size: SM, row: 0, from: 'L'},
      {t: 'sih', s: 0.54, size: SM, row: 0, from: 'R'},
      {t: 'otak', s: 0.7, size: MD, row: 1, from: 'T', tone: 'gold'},
      {t: 'udang', s: 0.94, size: BG, row: 2, from: 'Z', tone: 'red', blink: true},
    ],
  },
  {
    end: 2.38,
    words: [
      {t: 'iwa', s: 1.09, size: MD, row: 0, from: 'L'},
      {t: 'iwi', s: 1.4, size: MD, row: 0, from: 'R'},
      {t: 'ewe', s: 1.58, size: MD, row: 1, from: 'B', tone: 'gold'},
      {t: 'ewe', s: 1.92, size: MD, row: 1, from: 'Z', tone: 'gold'},
      {t: 'ewe', s: 2.15, size: MD, row: 1, from: 'T', tone: 'red', blink: true},
    ],
  },
  {
    end: 4.34,
    words: [
      {t: 'kocak', s: 2.4, size: SM, row: 0, from: 'L'},
      {t: 'lu', s: 2.75, size: SM, row: 0, from: 'R'},
      {t: 'dikit', s: 2.91, size: MD, row: 1, from: 'T', tone: 'gold'},
      {t: 'dikit', s: 3.13, size: MD, row: 1, from: 'B', tone: 'gold'},
      {t: 'ewe', s: 3.4, size: SM, row: 2, from: 'L'},
      {t: 'ewe', s: 3.63, size: SM, row: 2, from: 'R'},
      {t: 'ewe', s: 3.89, size: SM, row: 2, from: 'Z'},
      {t: 'ewe', s: 4.09, size: SM, row: 2, from: 'T', tone: 'red', blink: true},
    ],
  },
  {
    end: 6.9,
    words: [
      {t: 'otak', s: 4.36, size: SM, row: 0, from: 'L'},
      {t: 'lu', s: 4.66, size: SM, row: 0, from: 'R'},
      {t: 'coli', s: 4.78, size: BG, row: 1, from: 'Z', tone: 'red', blink: true},
      {t: 'mulu', s: 4.96, size: BG, row: 1, from: 'B', tone: 'gold'},
      {t: 'bocil', s: 5.33, size: MD, row: 2, from: 'L'},
      {t: 'bocil', s: 5.51, size: MD, row: 2, from: 'R'},
    ],
  },
  {
    end: 8.16,
    words: [
      {t: 'ga', s: 7.05, size: SM, row: 0, from: 'L'},
      {t: 'jelas', s: 7.17, size: SM, row: 0, from: 'T'},
      {t: 'lho', s: 7.37, size: SM, row: 0, from: 'R'},
      {t: 'gooner', s: 7.51, size: MD, row: 1, from: 'Z', tone: 'gold'},
      {t: 'gooner', s: 7.71, size: MD, row: 1, from: 'B', tone: 'red', blink: true},
      {t: 'ini', s: 7.84, size: SM, row: 2, from: 'R'},
    ],
  },
  {
    end: 9.96,
    words: [
      {t: 'bumi', s: 8.18, size: 84, row: 0, from: 'L'},
      {t: 'hanguskan', s: 8.36, size: 108, row: 1, from: 'Z', tone: 'red', blink: true},
      {t: 'nggak', s: 8.73, size: SM, row: 2, from: 'L'},
      {t: 'sih', s: 8.98, size: SM, row: 2, from: 'T'},
      {t: 'dari', s: 9.1, size: SM, row: 2, from: 'R'},
      {t: 'channel', s: 9.27, size: 82, row: 3, from: 'B', tone: 'gold'},
      {t: 'ini', s: 9.39, size: SM, row: 3, from: 'R'},
      {t: 'guys', s: 9.74, size: 96, row: 4, from: 'Z', font: 'script', rot: -4},
    ],
  },
];

// ---------------- SFX (drop) ----------------
export type Sfx = {
  /** sixteenth (boleh pecahan) relatif awal drop */
  n: number;
  file: string;
  dur: number;
  vol: number;
};

const sfx = (n: number, file: string, dur: number, vol: number): Sfx => ({n, file, dur, vol});

export const SFX: Sfx[] = [
  sfx(0, 'Glitch click.wav', 0.32, 0.7),
  sfx(7.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(15.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(23.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(31.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(34, 'Click riser.wav', 3.24, 0.3),
  sfx(39.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(47.5, 'Whoosh click.wav', 0.88, 0.45),
  sfx(55.5, 'Whoosh click.wav', 0.88, 0.5),
  sfx(63.5, 'Whoosh click.wav', 0.88, 0.5),
  sfx(64, 'Glitch click.wav', 0.32, 0.6),
  sfx(68, 'Camera flash sound effect.mp3', 2.09, 0.4),
];

export const shotFrames = (s: DropShot) => ({from: f(s.n0), to: f(s.n1)});
export const sec = (s: number) => Math.round(s * FPS);
