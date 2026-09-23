import React, { useRef, useState, useEffect } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';

const THUMB_SIZE = 24;

export default function RangeSlider({
  min = 0,
  max = 50000,
  lowValue,
  highValue,
  onValuesChange,
  step = 500,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valuesRef = useRef({ low: lowValue, high: highValue });
  const trackWidthRef = useRef(0);

  useEffect(() => {
    valuesRef.current = { low: lowValue, high: highValue };
  }, [lowValue, highValue]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const clamp = (value) => Math.min(max, Math.max(min, value));

  const snap = (value) => {
    const snapped = Math.round(value / step) * step;
    return clamp(snapped);
  };

  const valueToPos = (value) => {
    if (!trackWidth) return 0;
    return ((value - min) / (max - min)) * (trackWidth - THUMB_SIZE);
  };

  const posToValue = (pos) => {
    if (!trackWidth) return min;
    const ratio = pos / (trackWidth - THUMB_SIZE);
    return snap(min + ratio * (max - min));
  };

  const updateValues = (nextLow, nextHigh) => {
    let low = snap(nextLow);
    let high = snap(nextHigh);
    if (low > high - step) {
      low = high - step;
    }
    low = clamp(low);
    high = clamp(high);
    if (high < low + step) {
      high = Math.min(max, low + step);
    }
    valuesRef.current = { low, high };
    onValuesChange(low, high);
  };

  const dragStartRef = useRef({ lowPos: 0, highPos: 0 });

  const createThumbPan = (thumb) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = {
          lowPos: valueToPos(valuesRef.current.low),
          highPos: valueToPos(valuesRef.current.high),
        };
      },
      onPanResponderMove: (_, gesture) => {
        const width = trackWidthRef.current;
        if (!width) return;
        const maxPos = width - THUMB_SIZE;
        if (thumb === 'low') {
          const nextPos = Math.min(maxPos, Math.max(0, dragStartRef.current.lowPos + gesture.dx));
          updateValues(posToValue(nextPos), valuesRef.current.high);
        } else {
          const nextPos = Math.min(maxPos, Math.max(0, dragStartRef.current.highPos + gesture.dx));
          updateValues(valuesRef.current.low, posToValue(nextPos));
        }
      },
    });

  const lowPan = useRef(createThumbPan('low')).current;
  const highPan = useRef(createThumbPan('high')).current;

  const lowPos = valueToPos(lowValue);
  const highPos = valueToPos(highValue);
  const fillLeft = lowPos + THUMB_SIZE / 2;
  const fillWidth = Math.max(0, highPos - lowPos);

  const formatPrice = (value) => {
    if (value >= 1000) {
      return value % 1000 === 0 ? `${value / 1000}K` : value.toLocaleString('en-IN');
    }
    return String(value);
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.trackWrap}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.trackBase} />
        <View style={[styles.trackFill, { left: fillLeft, width: fillWidth }]} />
        <View
          {...lowPan.panHandlers}
          style={[styles.thumb, { left: lowPos }]}
        />
        <View
          {...highPan.panHandlers}
          style={[styles.thumb, { left: highPos }]}
        />
      </View>
      <View style={styles.labelsRow}>
        <Text style={styles.valueLabel}>{formatPrice(lowValue)}</Text>
        <Text style={styles.valueLabel}>{formatPrice(highValue)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  trackWrap: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBase: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  trackFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0EA5E9',
    top: 8,
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0EA5E9',
  },
});
