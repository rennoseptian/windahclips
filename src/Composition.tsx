import React, {useEffect, useState} from 'react';
import {AbsoluteFill, interpolate, Sequence, staticFile, useDelayRender} from 'remotion';
import {Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {Drop} from './edit/Drop';
import {Hook} from './edit/Hook';
import {FONT_MAIN, FONT_SCRIPT} from './edit/Words';
import {DROP_FRAMES, HOOK_END} from './edit/timing';

export const WindahJedag: React.FC = () => {
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Memuat font'));

  useEffect(() => {
    Promise.all([
      loadFont({family: FONT_MAIN, url: staticFile('Fonts/Coolvetica Hv Comp.otf')}),
      loadFont({family: FONT_SCRIPT, url: staticFile('Fonts/Aston Script.ttf')}),
    ])
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* Suara Windah mentah (raw.mp4) hanya selama hook */}
      <Sequence durationInFrames={HOOK_END} name="Suara hook">
        <Audio name="Suara" src={staticFile('Video/raw.mp4')} volume={1.4} />
      </Sequence>
      {/* Funk mentah: hook 0-10 dtk direndahkan di bawah suara, drop penuh; fade 20.7-21.5 dtk.
          Offset 1.2365 dtk = posisi lagu yang sinkron dengan Hook&Lagu.mp4 (korelasi 0.9996). */}
      <Audio
        name="Funk"
        src={staticFile('Audio/FUNK POWER (Ultra Slowed).mp3')}
        trimBefore={37}
        volume={(fr) => {
          const base = interpolate(fr, [HOOK_END - 3, HOOK_END], [0.2, 0.95], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const fade = interpolate(fr, [622, 644], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return base * fade;
        }}
      />

      <Sequence durationInFrames={HOOK_END} name="Hook (kamera ikut kepala)">
        <Hook />
      </Sequence>

      <Sequence from={HOOK_END} durationInFrames={DROP_FRAMES} name="Drop jedag-jedug">
        <Drop />
      </Sequence>
    </AbsoluteFill>
  );
};
