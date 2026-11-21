import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {CLIPS, FACE, SFX, SHOTS, shotFrames, type ClipId, type DropShot} from './data';
import {BEAT, DROP_FRAMES, FPS, GRID_OFFSET, HEIGHT, WIDTH, f} from './timing';

const SRC = HEIGHT; // sumber 1:1 di-cover ke tinggi 1350 -> 1350x1350
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const faceAt = (id: ClipId, t: number): [number, number] => {
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

const R_ONLY = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
const GB_ONLY = '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

const ShotView: React.FC<{shot: DropShot; index: number}> = ({shot, index}) => {
  const lf = useCurrentFrame(); // frame sejak shot mulai
  const {from, to} = shotFrames(shot);
  const dur = to - from;
  const fd = from + lf; // frame relatif awal drop
  const rem = dur - 1 - lf; // frame tersisa sampai potongan

  // --- kamera tenang: posisi tetap, hanya drift pelan ---
  const drift = interpolate(lf, [0, dur], [1, 1 + (shot.drift ?? 0)], {extrapolateRight: 'clamp'});
  const srcMid = shot.srcFrom + (dur / 2 / FPS) * shot.rate;
  const [fu, fv] = faceAt(shot.clip, srcMid);
  const Z = shot.z;
  const S = SRC * Z;
  const L = clamp(shot.at[0] * WIDTH - fu * S, WIDTH - S, 0);
  const T = clamp(shot.at[1] * HEIGHT - fv * S, HEIGHT - S, 0);

  // --- transisi blur yang naik-turun (masuk 7 frame, keluar 5 frame) ---
  const kIn = Easing.out(Easing.cubic)(clamp(1 - lf / 7, 0, 1));
  const kOut = Easing.in(Easing.cubic)(clamp(1 - rem / 5, 0, 1));
  const k = Math.max(kIn, kOut);
  const horizontal = index % 2 === 0;
  const bx = (horizontal ? 34 : 6) * k;
  const by = (horizontal ? 6 : 34) * k;
  const trScale = 1 + 0.07 * kIn + 0.05 * kOut;

  const rgbIn = (shot.rgb ?? 0) * Math.exp(-lf / 6);
  const d = rgbIn + 6 * k;
  const beatPhase = (((fd - GRID_OFFSET) % BEAT) + BEAT) % BEAT;
  const bright = 1 + 0.12 * Math.exp(-beatPhase / 3.5);

  const insetScale = shot.inset
    ? interpolate(lf, [0, 9], [1, shot.inset], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.exp),
      })
    : 1;

  const fid = `fx-${index}`;
  const needFilter = bx + by > 0.6 || d > 0.8;
  const gray = shot.bw ? 'grayscale(1) contrast(1.25) ' : '';
  const wrapFilter = `${needFilter ? `url(#${fid}) ` : ''}${gray}brightness(${bright})`;

  const vidStyle = (hiddenFilter?: string): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: SRC,
    height: SRC,
    transformOrigin: '0 0',
    translate: `${L}px ${T}px`,
    scale: Z * drift,
    filter: hiddenFilter,
  });

  const common = {
    muted: true,
    playbackRate: shot.rate,
    trimBefore: Math.round(shot.srcFrom * FPS),
  } as const;

  const clip = CLIPS[shot.clip];
  const showFg = shot.net;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {needFilter ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={fid} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={`${bx} ${by}`} result="b" />
            <feColorMatrix in="b" type="matrix" values={R_ONLY} result="r" />
            <feOffset in="r" dx={d} dy={0} result="ro" />
            <feColorMatrix in="b" type="matrix" values={GB_ONLY} result="cb" />
            <feOffset in="cb" dx={-d} dy={0} result="cbo" />
            <feBlend in="ro" in2="cbo" mode="screen" />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill
        style={{
          overflow: 'hidden',
          scale: trScale * insetScale,
          filter: wrapFilter,
        }}
      >
        {/* latar: video asli; saat "net" jadi jaring halftone hitam-putih di belakang Windah */}
        <Video
          name={`${shot.clip} latar`}
          src={staticFile(clip.src)}
          {...common}
          style={vidStyle(showFg ? 'grayscale(1) contrast(1.7) brightness(0.62)' : undefined)}
        />
        {showFg ? (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: 'multiply',
                backgroundImage: 'radial-gradient(circle, #fff 0%, #fff 33%, #000 60%)',
                backgroundSize: '11px 11px',
                transform: 'rotate(45deg) scale(2)',
              }}
            />
            <Video
              name={`${shot.clip} Windah (matte)`}
              src={staticFile(clip.fg)}
              {...common}
              style={vidStyle()}
            />
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Kilat putih (meluruh 4 frame) dan kilat negatif (2 frame) di awal potongan. */
const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  const current = SHOTS.find((s) => frame >= f(s.n0) && frame < f(s.n1));
  if (!current) return null;
  const lf = frame - f(current.n0);
  const white = (current.flash ?? 0) * Math.max(0, 1 - lf / 4);
  const inv = current.invert && lf < 2;
  return (
    <>
      {white > 0.02 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: white}} /> : null}
      {inv ? <AbsoluteFill style={{backgroundColor: '#fff', mixBlendMode: 'difference'}} /> : null}
    </>
  );
};

const CUTS = SHOTS.map((s) => f(s.n0));

/** Asap oranye/gelap yang melayang pelan dan menebal di tiap potongan (seperti referensi). */
const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  const near = Math.min(...CUTS.map((c) => Math.abs(frame - c)));
  const pulse = Math.exp(-near / 5);
  const blob = (i: number, color: string, blend: 'screen' | 'normal', size: number) => {
    const x = Math.sin(frame / 53 + i * 2.1) * 260 + (i % 2 ? 720 : 260);
    const y = Math.cos(frame / 61 + i * 1.7) * 220 + 300 + i * 180;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)`,
          mixBlendMode: blend,
          filter: 'blur(26px)',
        }}
      />
    );
  };
  return (
    <AbsoluteFill style={{opacity: 0.1 + 0.55 * pulse, pointerEvents: 'none'}}>
      {blob(0, 'rgba(255,150,30,0.9)', 'screen', 760)}
      {blob(1, 'rgba(255,190,90,0.7)', 'screen', 620)}
      {blob(2, 'rgba(10,10,10,0.9)', 'normal', 700)}
      {blob(3, 'rgba(255,120,20,0.8)', 'screen', 560)}
    </AbsoluteFill>
  );
};

/** Film strip hitam di atas/bawah pada shot penutup. */
const FilmStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const s = f(64);
  const o = interpolate(frame, [s, s + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (frame < s) return null;
  const bar: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: '#050505',
    opacity: o,
  };
  const holes: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 34,
    height: 28,
    backgroundImage: 'repeating-linear-gradient(90deg, #050505 0 26px, #d8d8d8 26px 50px)',
    backgroundSize: '100% 100%',
    transform: `translateX(${-(frame - s) * 3}px)`,
    width: '120%',
  };
  return (
    <>
      <div style={{...bar, top: 0}}>
        <div style={holes} />
      </div>
      <div style={{...bar, bottom: 0}}>
        <div style={holes} />
      </div>
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

/** Setelah beat ke-18 layar hitam sampai lagu habis. */
const Tail: React.FC = () => {
  const frame = useCurrentFrame();
  return frame >= f(72) ? <AbsoluteFill style={{backgroundColor: '#000'}} /> : null;
};

const SfxTrack: React.FC = () => (
  <>
    {SFX.map((s, i) => (
      <Sequence key={i} from={f(s.n)} durationInFrames={Math.ceil(s.dur * FPS)} name={`SFX ${s.file}`}>
        <Audio src={staticFile(`Sfx/${s.file}`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);

/** Dipasang di Sequence yang mulai di HOOK_END. Frame lokal = frame drop. */
export const Drop: React.FC = () => (
  <AbsoluteFill>
    {SHOTS.map((s, i) => {
      const {from, to} = shotFrames(s);
      return (
        <Sequence key={i} from={from} durationInFrames={to - from} name={`Shot ${i + 1} ${s.clip}`}>
          <ShotView shot={s} index={i} />
        </Sequence>
      );
    })}
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)',
      }}
    />
    <Smoke />
    <Grain />
    <Flashes />
    <FilmStrip />
    <Tail />
    <SfxTrack />
  </AbsoluteFill>
);

export const DROP_LENGTH = DROP_FRAMES;
