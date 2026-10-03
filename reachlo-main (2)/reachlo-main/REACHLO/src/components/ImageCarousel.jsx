import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  CAMPAIGN_CARD_IMAGE_HEIGHT,
  CAMPAIGN_CARD_ASPECT,
} from '../constants/campaignCardConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImageCarousel({
  images = [],
  width,
  height,
  aspectRatio = CAMPAIGN_CARD_ASPECT,
  showDots = true,
  rounded = true,
}) {
  const carouselWidth = width || SCREEN_WIDTH - 48;
  const carouselHeight = height ?? carouselWidth / aspectRatio;
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) return null;

  const onScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveIndex(index);
  };

  return (
    <View style={{ width: carouselWidth, height: carouselHeight }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={rounded ? styles.rounded : undefined}
      >
        {images.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={{ width: carouselWidth, height: carouselHeight }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {showDots && images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rounded: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
});
