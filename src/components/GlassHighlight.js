/**
 * GlassHighlight.js — the shared "frost sheen" overlay used by glass surfaces.
 *
 * Renders a top-edge light reflection (a vertical white gradient fading to
 * nothing) plus an optional soft accent glow from the bottom. Two details make
 * it render consistently across every card:
 *   1. UNIQUE gradient ids per instance — react-native-svg resolves duplicate
 *      ids globally, so sharing one id makes cards pick up the wrong gradient
 *      (the "cut off on the right / inconsistent" artifact).
 *   2. MEASURED pixel dimensions for the <Svg>/<Rect> — `width="100%"` without a
 *      viewBox can under-size the canvas, clipping the gradient near an edge.
 *
 * Pointer-events are disabled so it never intercepts touches.
 */
import React, {useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

let _uid = 0;
function useUid() {
  const ref = useRef(null);
  if (ref.current === null) {
    _uid += 1;
    ref.current = _uid;
  }
  return ref.current;
}

function GlassHighlight({
  radius = 24,
  glowColor,
  sheenOpacity = 0.12,
  glowOpacity = 0.2,
}) {
  const uid = useUid();
  const sheenId = `frostSheen${uid}`;
  const glowId = `frostGlow${uid}`;
  const [size, setSize] = useState({w: 0, h: 0});

  const onLayout = e => {
    const {width, height} = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) {
      setSize({w: width, h: height});
    }
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={sheenOpacity} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={sheenOpacity * 0.2} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            {glowColor ? (
              <LinearGradient id={glowId} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={glowColor} stopOpacity={glowOpacity} />
                <Stop offset="0.55" stopColor={glowColor} stopOpacity="0" />
              </LinearGradient>
            ) : null}
          </Defs>
          {glowColor ? (
            <Rect
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              rx={radius}
              fill={`url(#${glowId})`}
            />
          ) : null}
          <Rect
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            rx={radius}
            fill={`url(#${sheenId})`}
          />
        </Svg>
      ) : null}
    </View>
  );
}

export default React.memo(GlassHighlight);
