import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import COLORS from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../constants/typography';

const { width, height } = Dimensions.get('window');

// A soft floating particle component
const FloatingParticle = ({ size, color, startX, startY, delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const translateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      translateLoop.start();
      opacityLoop.start();
    }, delay);

    return () => {
      clearTimeout(timer);
      translateLoop.stop();
      opacityLoop.stop();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
};


export default function LandingScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const navigateToRegister = (role) => {
    navigation.navigate('Register', { defaultRole: role });
  };

  const navigateToLogin = () => {
    navigation.navigate('BuyerLogin');
  };

  // Hover/Press animations for cards
  const businessScale = useRef(new Animated.Value(1)).current;
  const buyerScale = useRef(new Animated.Value(1)).current;
  const arrowTranslateX = useRef(new Animated.Value(0)).current;

  const springValue = (value, toValue) => {
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* BACKGROUND BLOBS */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['rgba(56, 189, 248, 0.3)', 'transparent']}
          style={styles.blob1}
        />
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.2)', 'transparent']}
          style={styles.blob2}
        />
        <FloatingParticle size={12} color="#38BDF8" startX={width * 0.2} startY={height * 0.15} delay={0} />
        <FloatingParticle size={8} color="#2563EB" startX={width * 0.8} startY={height * 0.3} delay={1000} />
        <FloatingParticle size={16} color="#BAE6FD" startX={width * 0.5} startY={height * 0.6} delay={500} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <BlurView intensity={30} tint="light" style={styles.logoContainer}>
            <Text style={styles.headerLogo}>R</Text>
          </BlurView>
          <Pressable onPress={navigateToLogin} style={styles.loginButton}>
            <Text style={styles.loginText}>Login</Text>
          </Pressable>
        </View>

        {/* HERO */}
        <View style={styles.heroSection}>
          <Text style={styles.heroHeadline}>
            Where Businesses Meet Real Buyers
          </Text>
        </View>

        {/* CARDS */}
        <View style={styles.cardsContainer}>
          {/* BUSINESS CARD */}
          <Pressable
            onPressIn={() => {
              springValue(businessScale, 0.96);
              springValue(arrowTranslateX, 10);
            }}
            onPressOut={() => {
              springValue(businessScale, 1);
              springValue(arrowTranslateX, 0);
            }}
            onPress={() => navigateToRegister('SELLER')}
          >
            <Animated.View style={[styles.businessCardWrapper, { transform: [{ scale: businessScale }] }]}>
              <LinearGradient
                colors={['#0EA5E9', '#2563EB']}
                style={styles.businessGradient}
              >
                <BlurView intensity={25} style={styles.businessGlass}>
                  <View style={styles.cardContent}>
                    <View>
                      <Text style={styles.cardTitleWhite}>For Business</Text>
                      <Text style={styles.cardSubtitleWhite}>Post offers & get leads</Text>
                    </View>
                    <Animated.Text style={[styles.arrowIcon, { transform: [{ translateX: arrowTranslateX }] }]}>
                      ➔
                    </Animated.Text>
                  </View>
                  <View style={styles.illustrationPlaceholder}>
                     {/* Replace with 3D Illustration later */}
                     <Text style={{fontSize: 40}}>🚀</Text>
                  </View>
                </BlurView>
              </LinearGradient>
            </Animated.View>
          </Pressable>

          {/* BUYER CARD */}
          <Pressable
            onPressIn={() => springValue(buyerScale, 0.96)}
            onPressOut={() => springValue(buyerScale, 1)}
            onPress={() => navigateToRegister('BUYER')}
          >
            <Animated.View style={[styles.buyerCardWrapper, { transform: [{ scale: buyerScale }] }]}>
              <BlurView intensity={40} tint="light" style={styles.buyerGlass}>
                <View style={styles.cardContent}>
                  <View>
                    <Text style={styles.cardTitleBlue}>For Buyers</Text>
                    <Text style={styles.cardSubtitleGrey}>Discover local offers</Text>
                  </View>
                  <Text style={styles.arrowIconBlue}>➔</Text>
                </View>
                <View style={styles.illustrationPlaceholder}>
                   {/* Replace with 3D Illustration later */}
                   <Text style={{fontSize: 40}}>🛍️</Text>
                </View>
              </BlurView>
            </Animated.View>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.3,
    left: -width * 0.2,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    bottom: -width * 0.2,
    right: -width * 0.3,
    opacity: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  loginText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  heroHeadline: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0C1445',
    lineHeight: 52,
    letterSpacing: -1,
  },
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 24,
  },
  businessCardWrapper: {
    borderRadius: 30,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  businessGradient: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  businessGlass: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0.2,
    borderColor: '#FFFFFF',
    minHeight: 180,
    justifyContent: 'space-between',
  },
  buyerCardWrapper: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  buyerGlass: {
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  cardTitleWhite: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitleWhite: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  cardTitleBlue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4,
  },
  cardSubtitleGrey: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  arrowIconBlue: {
    fontSize: 24,
    color: '#2563EB',
  },
  illustrationPlaceholder: {
    position: 'absolute',
    bottom: -10,
    right: 20,
    opacity: 0.9,
    transform: [{ rotate: '-10deg' }],
  },
});
