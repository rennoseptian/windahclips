import {FPS} from './timing';

/**
 * ============ DATA EDIT (ubah di sini) ============
 * Drop: waktu potongan dalam DETIK GLOBAL (drop mulai 10.0 dtk), dipilih di onset lagu hasil ukur
 * (lihat measured.ts: HITS). Caption hook: detik dari awal video.
 */

export type ClipId = 'c1' | 'c2' | 'c3' | 'c4' | 'c5';

export const CLIPS: Record<ClipId, {src: string; fg: string; dur: number}> = {
  c1: {src: 'Video/lv_0_20261121012119.mp4', fg: 'Matte/c1-fg.webm', dur: 3.55},
  c2: {src: 'Video/lv_0_20261121012256.mp4', fg: 'Matte/c2-fg.webm', dur: 1.88},
  c3: {src: 'Video/lv_0_20261121012416.mp4', fg: 'Matte/c3-fg.webm', dur: 3.95},
  c4: {src: 'Video/lv_0_20261121012555.mp4', fg: 'Matte/c4-fg.webm', dur: 3.55},
  c5: {src: 'Video/lv_0_20261121012145.mp4', fg: 'Matte/c5-fg.webm', dur: 2.03},
};

// Lacak wajah (deteksi YuNet, koordinat sumber 0..1): [detik, u, v]
export const FACE: Record<ClipId, [number, number, number][]> = {
  c1: [[0, 0.54, 0.25], [0.5, 0.544, 0.277], [1, 0.536, 0.289], [1.5, 0.544, 0.275], [2, 0.533, 0.245], [2.5, 0.473, 0.235], [3, 0.439, 0.216], [3.55, 0.41, 0.19]],
  c2: [[0, 0.52, 0.49], [1.88, 0.52, 0.485]],
  c3: [[0, 0.436, 0.385], [0.5, 0.477, 0.388], [1, 0.544, 0.444], [1.5, 0.506, 0.484], [2, 0.491, 0.494], [2.5, 0.432, 0.455], [3, 0.505, 0.486], [3.5, 0.502, 0.474], [3.95, 0.496, 0.461]],
  c4: [[0, 0.466, 0.157], [1, 0.473, 0.168], [1.5, 0.498, 0.146], [2, 0.501, 0.141], [2.67, 0.409, 0.13], [3.5, 0.468, 0.139]],
  c5: [[0, 0.54, 0.58], [0.6, 0.5, 0.56], [1.2, 0.49, 0.54], [2.03, 0.52, 0.52]],
};

/** Profil kecepatan: [porsi durasi shot, rate]. sf = slow-mo -> cepat, fs = cepat -> slow-mo. */
export type Ramp = [number, number][];
export const RAMPS: Record<'n' | 'sf' | 'fs' | 'sfs', Ramp> = {
  n: [[1, 1]],
  sf: [[0.5, 0.35], [0.5, 1.9]],
  fs: [[0.45, 1.9], [0.55, 0.4]],
  sfs: [[0.35, 0.4], [0.35, 2], [0.3, 0.5]],
};

export type DropShot = {
  /** detik global shot mulai (jatuh di onset lagu) */
  t: number;
  clip: ClipId;
  /** detik mulai di klip sumber */
  srcFrom: number;
  ramp: keyof typeof RAMPS;
  /** zoom relatif crop 4:5 (1 = isi bingkai) */
  z: number;
  /** posisi titik fokus (wajah) di bingkai 0..1 */
  at: [number, number];
  /** arah hentakan geser saat potongan: 0=kiri 1=kanan 2=atas 3=bawah */
  whip: 0 | 1 | 2 | 3;
  /** jaring halftone di belakang Windah (hanya shot terpilih) */
  net?: boolean;
  bw?: boolean;
  flash?: 'w' | 'strobe' | 'inv';
  /** pemisahan RGB ekstra di awal (px) */
  rgb?: number;
  inset?: number;
};

export const SHOTS: DropShot[] = [
  {t: 10.0, clip: 'c2', srcFrom: 0.0, ramp: 'sf', z: 1.25, at: [0.5, 0.36], whip: 0, net: true, flash: 'w', rgb: 18},
  {t: 10.34, clip: 'c1', srcFrom: 0.35, ramp: 'n', z: 1.05, at: [0.5, 0.3], whip: 1},
  {t: 11.13, clip: 'c3', srcFrom: 0.2, ramp: 'sf', z: 1.25, at: [0.5, 0.36], whip: 2, flash: 'strobe', rgb: 12},
  {t: 11.45, clip: 'c3', srcFrom: 1.6, ramp: 'fs', z: 1.38, at: [0.5, 0.34], whip: 3},
  {t: 12.08, clip: 'c1', srcFrom: 1.9, ramp: 'sf', z: 1.2, at: [0.45, 0.3], whip: 0},
  {t: 12.7, clip: 'c5', srcFrom: 0.0, ramp: 'sf', z: 1.12, at: [0.5, 0.4], whip: 1, net: true, flash: 'w', rgb: 14},
  {t: 13.18, clip: 'c4', srcFrom: 0.3, ramp: 'sf', z: 1.0, at: [0.5, 0.2], whip: 2, rgb: 8},
  {t: 13.97, clip: 'c2', srcFrom: 0.2, ramp: 'fs', z: 1.2, at: [0.5, 0.38], whip: 3, bw: true, flash: 'w'},
  {t: 14.6, clip: 'c3', srcFrom: 2.3, ramp: 'sf', z: 1.3, at: [0.5, 0.34], whip: 0, flash: 'inv'},
  {t: 15.23, clip: 'c1', srcFrom: 0.4, ramp: 'n', z: 1.1, at: [0.5, 0.3], whip: 1, rgb: 10},
  {t: 15.7, clip: 'c5', srcFrom: 0.9, ramp: 'fs', z: 1.2, at: [0.5, 0.4], whip: 2, net: true, flash: 'w', rgb: 12},
  {t: 16.49, clip: 'c4', srcFrom: 1.4, ramp: 'sf', z: 1.0, at: [0.5, 0.2], whip: 3},
  {t: 17.12, clip: 'c2', srcFrom: 0.9, ramp: 'n', z: 1.25, at: [0.5, 0.36], whip: 0, bw: true, flash: 'strobe'},
  {t: 17.75, clip: 'c3', srcFrom: 0.6, ramp: 'sf', z: 1.2, at: [0.5, 0.36], whip: 1, flash: 'w', rgb: 16},
  {t: 18.22, clip: 'c1', srcFrom: 2.2, ramp: 'fs', z: 1.3, at: [0.45, 0.3], whip: 2, net: true},
  {t: 18.7, clip: 'c4', srcFrom: 2.2, ramp: 'sf', z: 1.05, at: [0.5, 0.2], whip: 3, flash: 'inv', rgb: 10},
  {t: 19.32, clip: 'c5', srcFrom: 0.3, ramp: 'n', z: 1.15, at: [0.5, 0.4], whip: 0},
  {t: 19.71, clip: 'c2', srcFrom: 1.0, ramp: 'sf', z: 1.15, at: [0.5, 0.38], whip: 1, flash: 'w', rgb: 12},
  {t: 20.27, clip: 'c3', srcFrom: 2.9, ramp: 'sfs', z: 1.0, at: [0.5, 0.34], whip: 2, flash: 'w', rgb: 22, inset: 0.9},
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

// ---------------- SFX ----------------
export type Sfx = {
  /** detik global */
  t: number;
  file: string;
  dur: number;
  vol: number;
};

const sfx = (t: number, file: string, dur: number, vol: number): Sfx => ({t, file, dur, vol});

export const SFX: Sfx[] = [
  // intro cepat (frame 0)
  sfx(0, 'Glitch click.wav', 0.32, 0.9),
  sfx(0.02, 'Camera flash sound effect.mp3', 0.9, 0.5),
  // drop
  sfx(10.0, 'Glitch click.wav', 0.32, 0.6),
  sfx(11.0, 'Whoosh click.wav', 0.88, 0.4),
  sfx(11.9, 'Whoosh click.wav', 0.88, 0.35),
  sfx(12.55, 'Whoosh click.wav', 0.88, 0.4),
  sfx(13.82, 'Whoosh click.wav', 0.88, 0.4),
  sfx(14.45, 'Whoosh click.wav', 0.88, 0.4),
  sfx(15.55, 'Whoosh click.wav', 0.88, 0.4),
  sfx(16.95, 'Whoosh click.wav', 0.88, 0.4),
  sfx(17.6, 'Whoosh click.wav', 0.88, 0.4),
  sfx(18.55, 'Whoosh click.wav', 0.88, 0.4),
  sfx(19.55, 'Whoosh click.wav', 0.88, 0.4),
  sfx(20.12, 'Whoosh click.wav', 0.88, 0.5),
  sfx(20.27, 'Camera flash sound effect.mp3', 1.4, 0.4),
];

export const sec = (s: number) => Math.round(s * FPS);
