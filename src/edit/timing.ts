// Grid beat lagu di bagian drop (diukur dari Hook&Lagu.mp4):
// 96 BPM, beat pertama jatuh di 10.02 dtk. Hook visual berakhir tepat di 10.0 dtk.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1350;

export const HOOK_END = 300; // frame (10.0 dtk): visual hook selesai, drop mulai
export const TOTAL = 645; // 21.5 dtk = panjang Hook&Lagu.mp4
export const DROP_FRAMES = TOTAL - HOOK_END; // 345

export const BPM = 96;
export const BEAT = (FPS * 60) / BPM; // 18.75 frame
export const SIXTEENTH = BEAT / 4; // 4.6875 frame
export const GRID_OFFSET = 0.6; // frame setelah HOOK_END tempat beat 0 jatuh (10.02 dtk)

/**
 * Frame (relatif awal drop) untuk indeks sixteenth `n`.
 * n = 4 -> beat 1, n = 8 -> beat 2, dst. Boleh pecahan (mis. 21.5).
 */
export const f = (n: number): number =>
  n <= 0 ? 0 : Math.round(GRID_OFFSET + n * SIXTEENTH);

export const globalFrame = (n: number): number => HOOK_END + f(n);
