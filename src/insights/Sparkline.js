/**
 * Sparkline.js — tiny inline SVG line chart for a numeric series (e.g. the last
 * 6 months of spending). No axes/labels — just the shape of the trend.
 */
import React from 'react';
import Svg, {Polyline, Circle} from 'react-native-svg';
import {colors} from '../theme/theme';

export default function Sparkline({
  data = [],
  width = 120,
  height = 36,
  color = colors.accent,
  strokeWidth = 2,
}) {
  if (!data || data.length < 2) {
    return null;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = strokeWidth;
  const usableH = height - pad * 2;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (1 - (v - min) / range) * usableH;
    return [x, y];
  });
  const polyline = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={last[0]} cy={last[1]} r={strokeWidth + 1} fill={color} />
    </Svg>
  );
}
