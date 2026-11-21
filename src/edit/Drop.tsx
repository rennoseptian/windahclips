import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {CLIPS, FACE, RAMPS, SFX, SHOTS, type ClipId, type DropShot} from './data';
import {HITS} from './measured';
import {DROP_FRAMES, FPS, HEIGHT, HOOK_END, WIDTH, df} from './timing';
import {FONT_MAIN} from './Words';

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

/**
 * Hentakan di tiap onset lagu (waktu hasil ukur): p = kekuatan punch (zoom + kecerahan + RGB),
 * dx/dy = getar bolak-balik yang meluruh ~10 frame (shake).
 */
const pulse = (tg: number) => {
  let p = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < HITS.length; i++) {
    const d = tg - HITS[i][0] + 1 / 60;
    if (d < 0) break;
    if (d > 0.6) continue;
    const w = Math.min(1.4, HITS[i][1] / 1.2);
    const e = Math.exp(-d / 0.08) * w;
    p += e;
    dx += (i % 2 ? 1 : -1) * e * Math.cos(d * 58);
    dy += (i % 3 === 0 ? -1 : 1) * e * 0.7 * Math.sin(d * 66 + i);
  }
  return {p: Math.min(p, 1.8), dx, dy};
};

// frame potongan (relatif awal drop)
const CUTF = SHOTS.map((s) => df(s.t));
const shotRange = (i: number) => ({from: CUTF[i], to: i + 1 < SHOTS.length ? CUTF[i + 1] : DROP_FRAMES});

/** bagi shot jadi segmen kecepatan; src time kontinu antar segmen */
const buildSegments = (shot: DropShot, dur: number) => {
  const prof = RAMPS[shot.ramp];
  let consume = 0;
  prof.forEach(([fr, r]) => (consume += ((dur * fr) / FPS) * r));
  const clipDur = CLIPS[shot.clip].dur;
  const maxFrom = Math.max(0, clipDur - 0.1 - consume);
  const srcFrom = Math.min(shot.srcFrom, maxFrom);
  const scale = consume > clipDur - 0.1 ? (clipDur - 0.1) / consume : 1;
  let start = 0;
  let srcT = srcFrom;
  const segs: {start: number; len: number; rate: number; srcStart: number}[] = [];
  prof.forEach(([fr, r], k) => {
    const len = k === prof.length - 1 ? dur - start : Math.max(1, Math.round(dur * fr));
    const rate = r * scale;
    segs.push({start, len, rate, srcStart: srcT});
    srcT += (len / FPS) * rate;
    start += len;
  });
  return segs;
};

const R_ONLY = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
const GB_ONLY = '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

const ShotView: React.FC<{shot: DropShot; index: number; dur: number}> = ({shot, index, dur}) => {
  const lf = useCurrentFrame();
  const g = CUTF[index] + lf; // frame drop
  const tg = (g + HOOK_END) / FPS; // detik global
  const segs = buildSegments(shot, dur);
  const seg = [...segs].reverse().find((s) => lf >= s.start) ?? segs[0];
  const srcT = seg.srcStart + ((lf - seg.start) / FPS) * seg.rate;

  const {p, dx: sdx, dy: sdy} = pulse(tg);

  // --- kamera: wajah dikunci ke titik `at`, ditambah drift, punch zoom, shake & whip saat potong ---
  const drift = interpolate(lf, [0, dur], [1, 1.1], {extrapolateRight: 'clamp'});
  const [fu, fv] = faceAt(shot.clip, srcT);
  const Z = shot.z * (1 + 0.04 * p) * drift;
  const S = SRC * Z;

  // whip: geser kuat tepat setelah potongan, meluruh cepat (diukur di referensi: ~45px/360 dalam 3 frame, meluruh ~10 frame)
  const wa = lf < 3 ? lf / 3 : Math.exp(-(lf - 3) / 4);
  const wdir = [[-1, 0], [1, 0], [0, -1], [0, 1]][shot.whip];
  const isWhip = shot.tr === 'whip';
  const whipAmp = isWhip ? 110 : 0;
  const whipX = wdir[0] * whipAmp * wa * (lf === 0 ? 0.2 : 1);
  const whipY = wdir[1] * whipAmp * wa * (lf === 0 ? 0.2 : 1);
  const jx = 2.4 * Math.sin(tg * 41) + 1.6 * Math.sin(tg * 23 + 1);
  const jy = 2.0 * Math.cos(tg * 37) + 1.4 * Math.sin(tg * 19 + 2);
  const shakeX = sdx * 11 + jx;
  const shakeY = sdy * 9 + jy;

  const L = clamp(shot.at[0] * WIDTH - fu * S + whipX + shakeX, WIDTH - S - 60, 60);
  const T = clamp(shot.at[1] * HEIGHT - fv * S + whipY + shakeY, HEIGHT - S - 60, 60);

  // --- transisi gaya referensi beat: potong keras -> frame defocus + zoom besar yang mengendap ~8 frame ---
  const k = Math.exp(-lf / 3.2);
  const horizontal = shot.whip < 2;
  const bx = isWhip ? (horizontal ? 46 : 5) * k : 30 * k;
  const by = isWhip ? (horizontal ? 5 : 46) * k : 30 * k;
  const trScale = isWhip ? 1 + 0.08 * k : 1 + 0.24 * k;

  const rgbIn = (shot.rgb ?? 0) * Math.exp(-lf / 6);
  const d = rgbIn + 3 + 9 * p;
  const bright = 1 + 0.12 * p;

  const insetScale = shot.inset
    ? interpolate(lf, [0, 9], [1, shot.inset], {extrapolateRight: 'clamp', easing: Easing.out(Easing.exp)})
    : 1;

  const fid = `fx-${index}`;
  const needFilter = bx + by > 0.6 || d > 0.8;
  const gray = shot.bw ? 'grayscale(1) contrast(1.3) ' : '';
  const wrapFilter = `${needFilter ? `url(#${fid}) ` : ''}${gray}brightness(${bright})`;

  const vidStyle = (hiddenFilter?: string): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: SRC,
    height: SRC,
    transformOrigin: '0 0',
    translate: `${L}px ${T}px`,
    scale: Z,
    filter: hiddenFilter,
  });

  const clip = CLIPS[shot.clip];
  const showFg = shot.net || !!shot.solid;

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
      <AbsoluteFill style={{overflow: 'hidden', scale: trScale * insetScale, filter: wrapFilter}}>
        {segs.map((sg, si) => (
          <Sequence key={si} from={sg.start} durationInFrames={sg.len} name={`${shot.clip} x${sg.rate.toFixed(2)}`}>
            {shot.solid ? (
              <AbsoluteFill style={{backgroundColor: shot.solid}} />
            ) : (
              <Video
                src={staticFile(clip.src)}
                muted
                playbackRate={sg.rate}
                trimBefore={Math.round(sg.srcStart * FPS)}
                style={vidStyle(showFg ? 'grayscale(1) contrast(1.7) brightness(0.62)' : undefined)}
              />
            )}
            {showFg ? (
              <>
                {shot.solid ? null : (
                <AbsoluteFill
                  style={{
                    mixBlendMode: 'multiply',
                    backgroundImage: 'radial-gradient(circle, #fff 0%, #fff 33%, #000 60%)',
                    backgroundSize: '11px 11px',
                    transform: 'rotate(45deg) scale(2)',
                  }}
                />
                )}
                <Video
                  src={staticFile(clip.fg)}
                  muted
                  playbackRate={sg.rate}
                  trimBefore={Math.round(sg.srcStart * FPS)}
                  style={vidStyle()}
                />
              </>
            ) : null}
          </Sequence>
        ))}
        {shot.ht ? (
          <AbsoluteFill
            style={{
              mixBlendMode: 'multiply',
              backgroundImage: 'radial-gradient(circle, #fff 0%, #fff 38%, #222 68%)',
              backgroundSize: '9px 9px',
              transform: 'rotate(45deg) scale(2)',
            }}
          />
        ) : null}
      </AbsoluteFill>
      {shot.banner ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 560,
            height: 120,
            backgroundColor: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scaleY(${clamp(lf / 3, 0, 1)})`,
          }}
        >
          <span style={{fontFamily: `'${FONT_MAIN}'`, fontSize: 92, color: '#fff', letterSpacing: '0.12em', lineHeight: 1}}>
            {shot.banner}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Kilat di tiap potongan: putih meluruh ~8 frame, strobe hitam-putih, atau negatif (diukur di referensi). */
const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  let i = -1;
  CUTF.forEach((c, ci) => {
    if (frame >= c) i = ci;
  });
  if (i < 0) return null;
  const shot = SHOTS[i];
  const lf = frame - CUTF[i];
  const out: React.ReactNode[] = [];
  if (shot.flash === 'w') {
    out.push(<AbsoluteFill key="w" style={{backgroundColor: '#fff', opacity: 0.92 * Math.exp(-lf / 3.2)}} />);
  } else if (shot.flash === 'strobe') {
    const seq = [0, 0, 1, 1, 0.6, 0.25]; // hitam 2f, putih 2f, lalu meluruh
    if (lf < 2) out.push(<AbsoluteFill key="k" style={{backgroundColor: '#000'}} />);
    else if (lf < seq.length) out.push(<AbsoluteFill key="s" style={{backgroundColor: '#fff', opacity: seq[lf]}} />);
  } else if (shot.flash === 'inv' && lf < 3) {
    out.push(<AbsoluteFill key="i" style={{backgroundColor: '#fff', mixBlendMode: 'difference'}} />);
  }
  // denyut putih tipis di tiap onset kuat (beat terlihat)
  const {p} = pulse((frame + HOOK_END) / FPS);
  if (p > 0.15) out.push(<AbsoluteFill key="h" style={{backgroundColor: '#fff', opacity: Math.min(0.14, 0.09 * p)}} />);
  return <>{out}</>;
};

/** Asap oranye/gelap yang melayang dan menebal di tiap potongan. */
const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  const near = Math.min(...CUTF.map((c) => Math.abs(frame - c)));
  const pls = Math.exp(-near / 5);
  const blob = (i: number, color: string, blend: 'screen' | 'normal', size: number) => {
    const x = Math.sin(frame / 41 + i * 2.1) * 300 + (i % 2 ? 720 : 260);
    const y = Math.cos(frame / 47 + i * 1.7) * 240 + 300 + i * 180;
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
    <AbsoluteFill style={{opacity: 0.16 + 0.55 * pls, pointerEvents: 'none'}}>
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
  const s = CUTF[CUTF.length - 1];
  const o = interpolate(frame, [s, s + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (frame < s) return null;
  const bar: React.CSSProperties = {position: 'absolute', left: 0, right: 0, height: 96, backgroundColor: '#050505', opacity: o};
  const holes: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 34,
    height: 28,
    backgroundImage: 'repeating-linear-gradient(90deg, #050505 0 26px, #d8d8d8 26px 50px)',
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

/** Lagu memudar ~20.5-21.3 dtk: layar hitam menyusul. */
const Tail: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [df(20.75), df(21.3)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return o > 0 ? <AbsoluteFill style={{backgroundColor: '#000', opacity: o}} /> : null;
};

const SfxTrack: React.FC = () => (
  <>
    {SFX.filter((s) => s.t >= 10).map((s, i) => (
      <Sequence key={i} from={df(s.t)} durationInFrames={Math.ceil(s.dur * FPS)} name={`SFX ${s.file}`}>
        <Audio src={staticFile(`Sfx/${s.file}`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);

/** Dipasang di Sequence yang mulai di HOOK_END. Frame lokal = frame drop. */
export const Drop: React.FC = () => (
  <AbsoluteFill>
    {SHOTS.map((s, i) => {
      const {from, to} = shotRange(i);
      return (
        <Sequence key={i} from={from} durationInFrames={to - from} name={`Shot ${i + 1} ${s.clip}`}>
          <ShotView shot={s} index={i} dur={to - from} />
        </Sequence>
      );
    })}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)'}} />
    <Smoke />
    <Grain />
    <Flashes />
    <FilmStrip />
    <Tail />
    <SfxTrack />
  </AbsoluteFill>
);

export const DROP_LENGTH = DROP_FRAMES;
