import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {PHRASES, type Phrase, type Word} from './data';
import {f} from './timing';

export const FONT_MAIN = 'Coolvetica Hv Comp';
export const FONT_SCRIPT = 'Aston Script';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const FILL: Record<NonNullable<Word['tone']>, React.CSSProperties> = {
  w: {color: '#ffffff'},
  gold: {
    backgroundImage: 'linear-gradient(180deg,#fff0a0 0%,#ffc21a 48%,#ff8a00 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  red: {
    backgroundImage: 'linear-gradient(180deg,#ff6a5a 0%,#ff1f1f 55%,#b30000 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
};

const BLINK = [1, 0.12, 1, 0.35, 1, 0.2, 1];

const WordView: React.FC<{
  word: Word;
  frame: number;
  /** frame kemunculan semua kata dalam frasa (terurut) */
  starts: number[];
  idx: number;
  lastStart: number;
  phraseEnd: number;
}> = ({word, frame, starts, idx, lastStart, phraseEnd}) => {
  const start = starts[idx];
  const d = frame - start;
  if (d < 0) {
    return <span style={{opacity: 0, ...base(word)}}>{word.t}</span>;
  }

  const e = interpolate(d, [0, 6], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });
  const k = 1 - e;
  const from = word.from ?? 'B';
  let tx = 0;
  let ty = 0;
  let sc = 1;
  if (from === 'L') tx = -320 * k;
  if (from === 'R') tx = 320 * k;
  if (from === 'T') ty = -260 * k;
  if (from === 'B') ty = 260 * k;
  if (from === 'Z') sc = 1 + 1.7 * k;

  // dentak punch setelah masuk
  sc *= 1 + 0.14 * Math.max(0, 1 - d / 8);

  // kata-kata sebelumnya diredupkan + blur saat kata baru muncul; fokus lagi di akhir frasa
  const newer = starts.filter((s, i) => i !== idx && s > start && s <= frame).length;
  const settle = clamp((frame - (lastStart + 3)) / 5, 0, 1);
  const behindBlur = (newer === 0 ? 0 : newer === 1 ? 4 : 9) * (1 - settle);
  const behindDim = (newer === 0 ? 1 : newer === 1 ? 0.82 : 0.58);
  const dim = behindDim + (1 - behindDim) * settle;

  const blur = 16 * k + behindBlur;

  let opacity = clamp(e * 1.4, 0, 1) * dim;
  if (word.blink && d >= 4 && d < 4 + BLINK.length * 2) {
    opacity *= BLINK[Math.floor((d - 4) / 2)];
  }
  // keluar: 2 frame terakhir frasa
  const out = interpolate(frame, [phraseEnd - 2, phraseEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  opacity *= out;

  return (
    <span
      style={{
        ...base(word),
        opacity,
        translate: `${tx}px ${ty}px`,
        scale: sc,
        rotate: word.rot ? `${word.rot}deg` : undefined,
        filter: `blur(${blur}px) drop-shadow(0 8px 22px rgba(0,0,0,0.55))`,
        ...FILL[word.tone ?? 'w'],
      }}
    >
      {word.t}
    </span>
  );
};

const base = (word: Word): React.CSSProperties => ({
  display: 'inline-block',
  fontFamily: word.font === 'script' ? `'${FONT_SCRIPT}'` : `'${FONT_MAIN}'`,
  fontSize: word.size,
  lineHeight: 0.84,
  letterSpacing: '0.01em',
  textTransform: word.font === 'script' ? 'none' : 'uppercase',
  whiteSpace: 'nowrap',
});

const PhraseView: React.FC<{phrase: Phrase}> = ({phrase}) => {
  const frame = useCurrentFrame();
  const starts = phrase.words.map((w) => f(w.n));
  const phraseStart = Math.min(...starts);
  const phraseEnd = f(phrase.n1);
  if (frame < phraseStart || frame >= phraseEnd) return null;
  const lastStart = Math.max(...starts);

  const rows = Array.from(new Set(phrase.words.map((w) => w.row))).sort((a, b) => a - b);
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: phrase.bottom ?? 120,
      }}
    >
      {rows.map((r) => (
        <div
          key={r}
          style={{display: 'flex', gap: 22, alignItems: 'baseline', justifyContent: 'center'}}
        >
          {phrase.words.map((w, i) =>
            w.row === r ? (
              <WordView
                key={i}
                word={w}
                frame={frame}
                starts={starts}
                idx={i}
                lastStart={lastStart}
                phraseEnd={phraseEnd}
              />
            ) : null,
          )}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** Dipasang di dalam Sequence yang dimulai di awal drop (frame lokal = frame drop). */
export const Words: React.FC = () => (
  <AbsoluteFill>
    {PHRASES.map((p, i) => (
      <PhraseView key={i} phrase={p} />
    ))}
  </AbsoluteFill>
);
