/**
 * GlassHighlight.js — the shared "frost sheen" overlay used by glass surfaces.
 *
 * Renders a top-edge light reflection (a vertical white gradient that fades to
 * nothing) plus an optional soft accent glow bleeding up from the bottom. It's a
 * single absolutely-positioned SVG so it composites cheaply over any surface and
 * gives the Liquid-Glass impression of light catching the top edge — no native
 * blur module required.
 *
 * Pointer-events are disabled so it never intercepts touches.
 */
import React from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

function GlassHighlight({
  radius = 24,
  glowColor,
  sheenOpacity = 0.14,
  glowOpacity = 0.22,
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="frostSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={sheenOpacity} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={sheenOpacity * 0.18} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        {glowColor ? (
          <LinearGradient id="frostGlow" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={glowColor} stopOpacity={glowOpacity} />
            <Stop offset="0.55" stopColor={glowColor} stopOpacity="0" />
          </LinearGradient>
        ) : null}
      </Defs>
      {glowColor ? (
        <Rect x="0" y="0" width="100%" height="100%" rx={radius} fill="url(#frostGlow)" />
      ) : null}
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} fill="url(#frostSheen)" />
    </Svg>
  );
}

export default React.memo(GlassHighlight);
