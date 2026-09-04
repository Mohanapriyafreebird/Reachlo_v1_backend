import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../constants/typography';
import PrimaryButton from '../components/PrimaryButton';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '📢',
    title: 'Run Campaigns That Actually Work',
    body: 'Create time-bound offers and reach real buyers in your city — no ad spend needed.',
  },
  {
    id: '2',
    icon: '🎯',
    title: 'Find Exactly What You Need',
    body: 'Browse verified local businesses and campaigns filtered by your city and category.',
  },
  {
    id: '3',
    icon: '🤝',
    title: 'Connect Directly. No Middlemen.',
    body: 'Chat via WhatsApp, submit a lead, or call — all from one platform.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    setCurrentIndex(index);
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('reachlo_onboarded', 'true');
    navigation.navigate('Landing');
  };

  const handleGetStarted = async (role) => {
    await AsyncStorage.setItem('reachlo_onboarded', 'true');
    navigation.navigate('Register', { defaultRole: role });
  };

  const renderSlide = ({ item }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.imageContainer}>
          <Text style={styles.emoji} accessibilityLabel={item.title}>
            {item.icon}
          </Text>
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideBody}>{item.body}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {currentIndex < 2 && (
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {currentIndex === 2 ? (
          <View style={styles.buttonContainer}>
            <PrimaryButton
              title="I'm a Business"
              onPress={() => handleGetStarted('SELLER')}
              style={styles.ctaButton}
            />
            <PrimaryButton
              title="I'm a Buyer"
              onPress={() => handleGetStarted('BUYER')}
              variant="outlined"
              style={styles.ctaButton}
            />
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  list: {
    flex: 1,
  },
  slide: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 54,
  },
  slideTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: FONT_SIZES.XL * LINE_HEIGHTS.TIGHT,
  },
  slideBody: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: FONT_SIZES.BASE * LINE_HEIGHTS.RELAXED,
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.PRIMARY,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: COLORS.BORDER,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  ctaButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  spacer: {
    height: 54, // Match button height to avoid layout shift
  },
});
