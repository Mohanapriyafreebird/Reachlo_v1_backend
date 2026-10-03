import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CAMPAIGN_CARD_ASPECT } from '../constants/campaignCardConstants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const H_PADDING = 24;
const MIN_CROP_SCALE = 0.45;
const MAX_CROP_SCALE = 1;
const THUMB_SIZE = 22;

function computeCropBox(displayW, displayH, scale = 1) {
  const aspect = CAMPAIGN_CARD_ASPECT;
  let cropH = displayH * scale;
  let cropW = cropH * aspect;
  if (cropW > displayW * scale) {
    cropW = displayW * scale;
    cropH = cropW / aspect;
  }
  cropW = Math.max(60, Math.min(displayW, cropW));
  cropH = Math.max(40, Math.min(displayH, cropH));
  const maxX = Math.max(0, displayW - cropW);
  const maxY = Math.max(0, displayH - cropH);
  return { cropW, cropH, maxX, maxY };
}

function computeCenterCropRect(imageWidth, imageHeight) {
  const aspect = CAMPAIGN_CARD_ASPECT;
  let cropW = imageWidth;
  let cropH = cropW / aspect;

  if (cropH > imageHeight) {
    cropH = imageHeight;
    cropW = cropH * aspect;
  }

  const originX = Math.max(0, Math.round((imageWidth - cropW) / 2));
  const originY = Math.max(0, Math.round((imageHeight - cropH) / 2));
  const width = Math.min(imageWidth - originX, Math.round(cropW));
  const height = Math.min(imageHeight - originY, Math.round(cropH));

  return { originX, originY, width, height };
}

export async function smartCenterCrop(imageUri) {
  const size = await new Promise((resolve, reject) => {
    Image.getSize(imageUri, (width, height) => resolve({ width, height }), reject);
  });

  const crop = computeCenterCropRect(size.width, size.height);
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ crop }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: result.uri,
    fileName: `campaign_${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

function ZoomSlider({ value, min, max, onChange }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(value);
  const trackWidthRef = useRef(0);
  const dragStartRef = useRef(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // keep ref updated for pan handlers
  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const valueToPos = (v) => {
    const width = trackWidthRef.current || 0;
    if (!width) return 0;
    return ((v - min) / (max - min)) * (width - THUMB_SIZE);
  };

  const posToValue = (pos) => {
    const width = trackWidthRef.current || 0;
    if (!width) return min;
    const ratio = pos / (width - THUMB_SIZE);
    return Math.min(max, Math.max(min, min + ratio * (max - min)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = valueToPos(valueRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        const width = trackWidthRef.current;
        if (!width) return;
        const maxPos = width - THUMB_SIZE;
        const nextPos = Math.min(maxPos, Math.max(0, dragStartRef.current + gesture.dx));
        onChange(posToValue(nextPos));
      },
    })
  ).current;

  const thumbPos = valueToPos(value);
  const fillWidth = Math.max(0, thumbPos + THUMB_SIZE / 2);

  return (
    <View style={zoomStyles.container}>
      <Text style={zoomStyles.label}>Zoom</Text>
      <View
        style={zoomStyles.trackWrap}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
      >
        <View style={zoomStyles.trackBase} />
        <View style={[zoomStyles.trackFill, { width: fillWidth }]} />
        <View
          {...panResponder.panHandlers}
          style={[zoomStyles.thumb, { left: thumbPos }]}
        />
      </View>
      <Text style={zoomStyles.percent}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

const zoomStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  trackWrap: {
    height: 36,
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
    backgroundColor: '#2563EB',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    top: 7,
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  percent: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default function ImageCropModal({ visible, imageUri, onCancel, onConfirm }) {
  const [imageSize, setImageSize] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = useState(1);
  const cropOffsetRef = useRef({ x: 0, y: 0 });
  const cropScaleRef = useRef(1);
  const boundsRef = useRef({ maxX: 0, maxY: 0, cropW: 0, cropH: 0, displayW: 0, displayH: 0 });

  useEffect(() => {
    if (!imageUri) {
      setImageSize(null);
      return;
    }
    Image.getSize(
      imageUri,
      (width, height) => setImageSize({ width, height }),
      () => setImageSize(null)
    );
  }, [imageUri]);

  const containerW = SCREEN_WIDTH - H_PADDING * 2;
  const containerH = SCREEN_HEIGHT * 0.46; // reduce to avoid overflowing

  let displayW = containerW;
  let displayH = containerH;
  if (imageSize) {
    const scale = Math.min(containerW / imageSize.width, containerH / imageSize.height);
    displayW = imageSize.width * scale;
    displayH = imageSize.height * scale;
  }

  const { cropW, cropH, maxX, maxY } = computeCropBox(displayW, displayH, cropScale);
  boundsRef.current = { maxX, maxY, cropW, cropH, displayW, displayH };

  useEffect(() => {
    const initial = {
      x: Math.min(maxX, Math.max(0, maxX / 2)),
      y: Math.min(maxY, Math.max(0, maxY / 2)),
    };
    cropOffsetRef.current = initial;
    setCropOffset(initial);
  }, [imageUri, maxX, maxY, displayW, displayH, cropScale]);

  useEffect(() => {
    if (!visible) {
      setCropScale(1);
      cropScaleRef.current = 1;
    }
  }, [visible]);

  const dragStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = { ...cropOffsetRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        const { maxX: mx, maxY: my } = boundsRef.current;
        const start = dragStartRef.current;
        const x = Math.min(mx, Math.max(0, start.x + gesture.dx));
        const y = Math.min(my, Math.max(0, start.y + gesture.dy));
        setCropOffset({ x, y });
      },
      onPanResponderRelease: (_, gesture) => {
        const { maxX: mx, maxY: my } = boundsRef.current;
        const start = dragStartRef.current;
        cropOffsetRef.current = {
          x: Math.min(mx, Math.max(0, start.x + gesture.dx)),
          y: Math.min(my, Math.max(0, start.y + gesture.dy)),
        };
        setCropOffset({ ...cropOffsetRef.current });
      },
    })
  ).current;

  const handleScaleChange = (next) => {
    const clamped = Math.min(MAX_CROP_SCALE, Math.max(MIN_CROP_SCALE, next));
    cropScaleRef.current = clamped;
    setCropScale(clamped);
  };

  const handleConfirm = async () => {
    if (!imageUri || !imageSize) return;
    setProcessing(true);
    try {
      const { cropW: cw, cropH: ch, displayW: dw, displayH: dh } = boundsRef.current;
      const scaleX = imageSize.width / dw;
      const scaleY = imageSize.height / dh;
      const originX = Math.max(0, Math.round(cropOffset.x * scaleX));
      const originY = Math.max(0, Math.round(cropOffset.y * scaleY));
      const width = Math.min(imageSize.width - originX, Math.round(cw * scaleX));
      const height = Math.min(imageSize.height - originY, Math.round(ch * scaleY));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      onConfirm({
        uri: result.uri,
        fileName: `campaign_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    } catch (error) {
      console.warn('Crop failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.glassHandle} />
          <Text style={styles.title}>Adjust Thumbnail</Text>
          <Text style={styles.subtitle}>
            Drag to reposition. Use the slider to zoom.
          </Text>

          <View style={[styles.cropArea, { minHeight: SCREEN_HEIGHT * 0.42 }]}>
            {imageUri && imageSize ? (
              <View style={{ width: displayW, height: displayH, alignSelf: 'center' }}>
                <Image source={{ uri: imageUri }} style={{ width: displayW, height: displayH }} resizeMode="contain" />

                <View style={[styles.dim, { top: 0, left: 0, width: displayW, height: cropOffset.y }]} />
                <View style={[styles.dim, { top: cropOffset.y + cropH, left: 0, width: displayW, height: displayH - cropOffset.y - cropH }]} />
                <View style={[styles.dim, { top: cropOffset.y, left: 0, width: cropOffset.x, height: cropH }]} />
                <View style={[styles.dim, { top: cropOffset.y, left: cropOffset.x + cropW, width: displayW - cropOffset.x - cropW, height: cropH }]} />

                <View
                  {...panResponder.panHandlers}
                  style={[styles.cropFrame, { width: cropW, height: cropH, left: cropOffset.x, top: cropOffset.y }]}
                >
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#2563EB" />
            )}
          </View>

          <ZoomSlider
            value={cropScale}
            min={MIN_CROP_SCALE}
            max={MAX_CROP_SCALE}
            onChange={handleScaleChange}
          />

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={processing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.confirmBtn} disabled={processing || !imageSize}>
              {processing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>Use Thumbnail</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 32,
    minHeight: SCREEN_HEIGHT * 0.75,
  },
  glassHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(203, 213, 225, 0.9)',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  cropArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: SCREEN_HEIGHT * 0.48,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    pointerEvents: 'none',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
