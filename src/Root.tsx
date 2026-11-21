import React from 'react';
import {Composition} from 'remotion';
import {WindahJedag} from './Composition';
import {FPS, HEIGHT, TOTAL, WIDTH} from './edit/timing';

const common = {
  component: WindahJedag,
  durationInFrames: TOTAL,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* default: tanpa SFX meme */}
      <Composition id="WindahJedag" {...common} defaultProps={{meme: false}} />
      {/* varian dengan SFX meme Windah bergema */}
      <Composition id="WindahJedagMeme" {...common} defaultProps={{meme: true}} />
    </>
  );
};
