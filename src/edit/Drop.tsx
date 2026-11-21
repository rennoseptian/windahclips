import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {FACE, PLANS, SFX, planFrames, planRate, type ClipPlan, type Shot} from './data';
import {BEAT, DROP_FRAMES, FPS, GRID_OFFSET, HEIGHT, WIDTH, f} from './timing';
import {Words} from './Words';

const SRC = HEIGHT; // sumber 1:1 di-cover ke tinggi 1350 -> 1350x1350
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const faceAt = (id: ClipPlan['id'], t: number): [number, number] => {
  const pts = FACE[id];
  if (t <= pts[0][0]) return [pts[0][1], pts[0][2]];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, u0, v0] = pts[i - 1];
      const [t1, u1, v1] = pts[i];
      const k = (t - t0) / (t1 - t0);
      return [u0 + (u1 - u0) * k, v0 + (v1 - v0) * k];
    }
  }
  const last = pts[pts.length - 1];
  return [last[1], last[2]];
};

type ShotInfo = {shot: Shot; index: number; f0: number; f1: number};

const shotAt = (plan: ClipPlan, fd: number): ShotInfo => {
  for (let i = 0; i < plan.shots.length; i++) {
    const s = plan.shots[i];
    const f0 = f(s.n0);
    const f1 = f(s.n1);
    if (fd >= f0 && fd < f1) return {shot: s, index: i, f0, f1};
  }
  const i = plan.shots.length - 1;
  const s = plan.shots[i];
  return {shot: s, index: i, f0: f(s.n0), f1: f(s.n1)};
};

const ClipLayer: React.FC<{plan: ClipPlan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const {from: planFrom} = planFrames(plan);
  const rate = planRate(plan);
  const fd = frame + planFrom; // frame relatif awal drop
  const {shot, index, f0, f1} = shotAt(plan, fd);
  const lf = fd - f0;
  const fx = shot.fx ?? {};

  // --- kamera: titik fokus diletakkan di posisi `at` pada bingkai ---
  const srcMid = plan.srcFrom + (((f0 + f1) / 2 - planFrom) / FPS) * rate;
  const focus = shot.focus && shot.focus !== 'face' ? shot.focus : faceAt(plan.id, srcMid);
  const S = SRC * shot.z;
  const L = clamp(shot.at[0] * WIDTH - focus[0] * S, WIDTH - S, 0);
  const T = clamp(shot.at[1] * HEIGHT - focus[1] * S, HEIGHT - S, 0);

  // --- gerak per potongan ---
  const punch = fx.punch ?? 0;
  const punchScale = interpolate(lf, [0, 9], [1 + punch, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const beatPhase = (((fd - GRID_OFFSET) % BEAT) + BEAT) % BEAT;
  const pulse = 1 + 0.016 * Math.exp(-beatPhase / 4);
  const insetScale = fx.inset
    ? interpolate(lf, [0, 8], [1, fx.inset], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.exp),
      })
    : 1;
  const decay = Math.exp(-lf / 5);
  const shakeX = (hash(fd) - 0.5) * 2 * (fx.shake ?? 0) * decay;
  const shakeY = (hash(fd + 7) - 0.5) * 2 * (fx.shake ?? 0) * decay;
  const roll = (fx.roll ?? 0) * Math.exp(-lf / 7);

  // --- efek (CSS/SVG filter; @remotion/effects tidak stabil di Chrome headless) ---
  const bw = fx.halftone || (fx.bwFlash && lf < 3);
  const rgb = (fx.rgb ?? 0) * Math.exp(-lf / 5);
  const split = rgb > 0.8 && !bw;
  const dx = (index % 2 === 0 ? 1 : 0.0) * rgb;
  const dy = (index % 2 === 0 ? 0.0 : 1) * rgb;
  const gray = bw ? `grayscale(1) contrast(${fx.halftone ? 1.7 : 1.5})` : undefined;

  const layer = (key: string, filter: string | undefined, tx: number, ty: number, blend?: 'screen') => (
    <Video
      key={key}
      name={`${plan.id} ${key}`}
      src={staticFile(plan.src)}
      muted
      playbackRate={rate}
      trimBefore={Math.round(plan.srcFrom * FPS)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: SRC,
        height: SRC,
        transformOrigin: '0 0',
        translate: `${L + tx}px ${T + ty}px`,
        scale: shot.z,
        filter,
        mixBlendMode: blend,
      }}
    />
  );

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        backgroundColor: '#000',
        translate: `${shakeX}px ${shakeY}px`,
        rotate: `${roll}deg`,
        scale: punchScale * pulse * insetScale,
      }}
    >
      {split ? (
        <>
          {layer('r', 'url(#fxR)', dx, dy)}
          {layer('cb', 'url(#fxCB)', -dx, -dy, 'screen')}
        </>
      ) : (
        layer('v', gray, 0, 0)
      )}
      {fx.halftone ? (
        <AbsoluteFill
          style={{
            mixBlendMode: 'multiply',
            backgroundImage: 'radial-gradient(circle, #fff 0%, #fff 34%, #000 62%)',
            backgroundSize: '10px 10px',
            transform: 'rotate(45deg) scale(2)',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const FxDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="fxR" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
    </filter>
    <filter id="fxCB" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
    </filter>
  </svg>
);

const ALL_SHOTS = PLANS.flatMap((p) => p.shots);

/** Kilat putih (meluruh 3 frame) dan kilat negatif (2 frame) di awal potongan. */
const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  const current = ALL_SHOTS.find((s) => frame >= f(s.n0) && frame < f(s.n1));
  if (!current) return null;
  const lf = frame - f(current.n0);
  const white = (current.fx?.flash ?? 0) * Math.max(0, 1 - lf / 3);
  const inv = current.fx?.invert && lf < 2;
  return (
    <>
      {white > 0.02 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: white}} /> : null}
      {inv ? <AbsoluteFill style={{backgroundColor: '#fff', mixBlendMode: 'difference'}} /> : null}
    </>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: 0.16}}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={frame % 24} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const Scrim: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(to top, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.34) 28%, rgba(0,0,0,0) 54%)',
    }}
  />
);

/** Setelah beat ke-18 layar hitam sampai lagu habis. */
const Tail: React.FC = () => {
  const frame = useCurrentFrame();
  return frame >= f(72) ? <AbsoluteFill style={{backgroundColor: '#000'}} /> : null;
};

const SfxTrack: React.FC = () => (
  <>
    {SFX.map((s, i) => (
      <Sequence
        key={i}
        from={f(s.n)}
        durationInFrames={Math.ceil(s.dur * FPS)}
        name={`SFX ${s.file}`}
      >
        <Audio src={staticFile(`Sfx/${s.file}`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);

/** Dipasang di Sequence yang mulai di HOOK_END. Frame lokal = frame drop. */
export const Drop: React.FC = () => (
  <AbsoluteFill>
    <FxDefs />
    {PLANS.map((p) => {
      const {from, to} = planFrames(p);
      return (
        <Sequence key={p.id} from={from} durationInFrames={to - from} name={`Klip ${p.id}`}>
          <ClipLayer plan={p} />
        </Sequence>
      );
    })}
    <Scrim />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}} />
    <Grain />
    <Flashes />
    <Words />
    <Tail />
    <SfxTrack />
  </AbsoluteFill>
);

export const DROP_LENGTH = DROP_FRAMES;
