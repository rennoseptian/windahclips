// Drop mulai tepat 10.0 dtk (frame 300); hook visual berakhir di sini. Total 21.5 dtk = panjang lagu.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1350;

export const HOOK_END = 300;
export const TOTAL = 645;
export const DROP_FRAMES = TOTAL - HOOK_END; // 345

/** detik global -> frame relatif awal drop */
export const df = (sec: number): number => Math.round(sec * FPS) - HOOK_END;
