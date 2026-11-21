import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Sequence, staticFile, useDelayRender} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {Drop} from './edit/Drop';
import {FONT_MAIN, FONT_SCRIPT} from './edit/Words';
import {DROP_FRAMES, HEIGHT, HOOK_END, WIDTH} from './edit/timing';

const HOOK_SIZE = HEIGHT; // hook 1:1 di-cover ke 4:5 -> 1350x1350, kiri-kanan terpotong merata

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
      {/* Lagu: audio Hook&Lagu.mp4 utuh dari awal sampai habis (drop mulai 10.0 dtk) */}
      <Audio name="Lagu" src={staticFile('Video/Hook&Lagu.mp4')} />

      <Sequence durationInFrames={HOOK_END} name="Hook (apa adanya)">
        <Video
          name="Hook video"
          src={staticFile('Video/Hook&Lagu.mp4')}
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: -(HOOK_SIZE - WIDTH) / 2,
            width: HOOK_SIZE,
            height: HOOK_SIZE,
          }}
        />
      </Sequence>

      <Sequence from={HOOK_END} durationInFrames={DROP_FRAMES} name="Drop jedag-jedug">
        <Drop />
      </Sequence>
    </AbsoluteFill>
  );
};
