import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {HOOK_FACE} from './measured';
import {SFX} from './data';
import {HEIGHT, WIDTH, FPS} from './timing';
import {Words} from './Words';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Kamera hook mengikuti kepala/mata Windah: track wajah per frame, dihaluskan dengan pegas (ada lag + overshoot kecil). */
const track = (() => {
  const n = HOOK_FACE.u.length;
  const mean = (a: readonly number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const mu = mean(HOOK_FACE.u);
  const mv = mean(HOOK_FACE.v);
  const out: {u: number; v: number}[] = [];
  let pu = HOOK_FACE.u[0];
  let pv = HOOK_FACE.v[0];
  let vu = 0;
  let vv = 0;
  const k = 70;
  const c = 8.5;
  const dt = 1 / FPS;
  for (let i = 0; i < n; i++) {
    // target = wajah penuh (kamera ikut), sedikit dilonggarkan ke rata-rata supaya gerakan kepala tetap terasa
    const tu = mu + (HOOK_FACE.u[i] - mu) * 1.0;
    const tv = mv + (HOOK_FACE.v[i] - mv) * 1.0;
    vu += (k * (tu - pu) - c * vu) * dt;
    vv += (k * (tv - pv) - c * vv) * dt;
    pu += vu * dt;
    pv += vv * dt;
    out.push({u: pu, v: pv});
  }
  return out;
})();

const HOOK_Z = 1.2;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const i = clamp(frame, 0, track.length - 1);
  const {u, v} = track[i];

  // intro: kilat putih masuk + punch zoom + RGB split, meluruh ~8 frame
  const k = Math.exp(-frame / 3);
  const zoom = HOOK_Z * (1 + 0.14 * k);
  const S2 = HEIGHT * zoom;
  const gain = 1; // wajah dikunci di bingkai
  const L = clamp(0.5 * WIDTH - u * S2 * gain, WIDTH - S2, 0);
  const T = clamp(0.56 * HEIGHT - v * S2 * gain, HEIGHT - S2, 0);

  const d = 14 * k;
  const blur = 18 * k;
  const filterId = 'hook-fx';
  const flashOpacity = 0.95 * Math.exp(-frame / 2.6);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {frame < 14 ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={`${blur} ${blur * 0.2}`} result="b" />
            <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={d} dy={0} result="ro" />
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb" />
            <feOffset in="cb" dx={-d} dy={0} result="cbo" />
            <feBlend in="ro" in2="cbo" mode="screen" />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{overflow: 'hidden', filter: frame < 14 ? `url(#${filterId})` : undefined}}>
        <Video
          name="Hook video (kamera ikut kepala)"
          src={staticFile('Video/Hook&Lagu.mp4')}
          muted
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: HEIGHT,
            height: HEIGHT,
            transformOrigin: '0 0',
            translate: `${L}px ${T}px`,
            scale: zoom,
          }}
        />
      </AbsoluteFill>
      {/* scrim tipis supaya caption terbaca */}
      <AbsoluteFill
        style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.18) 32%, rgba(0,0,0,0) 48%)'}}
      />
      <Words />
      {flashOpacity > 0.02 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: flashOpacity}} /> : null}
      {SFX.filter((s) => s.t < 1).map((s, idx) => (
        <Sequence key={idx} from={Math.round(s.t * FPS)} durationInFrames={Math.ceil(s.dur * FPS)} name={`SFX ${s.file}`}>
          <Audio src={staticFile(`Sfx/${s.file}`)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
