import { useId } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export function BallArt({ accent }: { accent: string }) {
  const gradientId = `ballShade-${useId()}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradientId} cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.35" stopColor={accent} />
          <Stop offset="1" stopColor="#00000055" />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill={`url(#${gradientId})`} stroke="#00000040" strokeWidth={2} />
    </Svg>
  );
}
