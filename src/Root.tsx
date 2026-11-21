import React from 'react';
import {Composition} from 'remotion';
import {WindahJedag} from './Composition';
import {FPS, HEIGHT, TOTAL, WIDTH} from './edit/timing';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WindahJedag"
      component={WindahJedag}
      durationInFrames={TOTAL}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
