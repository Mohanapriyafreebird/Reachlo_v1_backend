import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../constants/typography';
import { useAuth } from '../context/AuthContext';
import API_CONFIG from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

// ── Reachlo Logo — recreated from brand reference ──────────────────────────
function ReachloLogo({ size = 100 }) {
  const arcSize = size;
  const strokeWidth = arcSize * 0.08;

  return (
    <View style={[logoStyles.container, { width: arcSize, height: arcSize }]}>
      {/* Outer arc — teal/cyan right side */}
      <View
        style={[
          logoStyles.arcOuter,
          {
            width: arcSize,
            height: arcSize,
            borderRadius: arcSize / 2,
            borderWidth: strokeWidth,
            borderColor: COLORS.ACCENT_CYAN,
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
          },
        ]}
      />
      {/* Inner arc — purple/indigo left side */}
      <View
        style={[
          logoStyles.arcInner,
          {
            width: arcSize * 0.72,
            height: arcSize * 0.72,
            borderRadius: (arcSize * 0.72) / 2,
            borderWidth: strokeWidth,
            borderColor: COLORS.ACCENT_PURPLE,
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            top: arcSize * 0.14,
            left: arcSize * 0.14,
          },
        ]}
      />
      {/* Letter R */}
      <Text
        style={[
          logoStyles.letterR,
          {
            fontSize: arcSize * 0.38,
            lineHeight: arcSize * 0.44,
          },
        ]}
        accessibilityLabel="Reachlo logo R"
      >
        R
      </Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arcOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: [{ rotate: '45deg' }],
  },
  arcInner: {
    position: 'absolute',
    transform: [{ rotate: '225deg' }],
  },
  letterR: {
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    includeFontPadding: false,
    letterSpacing: -1,
  },
});
// ────────────────────────────────────────────────────────────────────────────

export default function SplashScreen({ navigation }) {
  const { token, role, isLoading } = useAuth();

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const btnsOpacity = useRef(new Animated.Value(0)).current;
  const btnsTranslateY = useRef(new Animated.Value(40)).current;
  const bgScale = useRef(new Animated.Value(1.1)).current;

  const [timerDone, setTimerDone] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // Step 1: Entry animations + backend wakeup ping
  useEffect(() => {
    // ── Fire-and-forget backend wakeup ping ──────────────────────────────────
    // Render.com free tier cold-starts in 30-60s. By pinging /health during
    // the splash animation, the backend is warm before the user tries to login.
    fetch(`${API_CONFIG.BASE_URL}/health`, { method: 'GET' }).catch(() => {});
    // ────────────────────────────────────────────────────────────────────────

    // Background settle
    Animated.timing(bgScale, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Logo fade + scale in
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline slides in after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // 2-second minimum display
    const timer = setTimeout(() => setTimerDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Step 2: After timer + auth — navigate or show buttons
  useEffect(() => {
    if (!timerDone || isLoading) return;

    const decide = async () => {
      if (token && role) {
        // Already logged in — go straight to dashboard
        if (role === 'SELLER') navigation.replace('SellerDashboard');
        else if (role === 'ADMIN') navigation.replace('AdminDashboard');
        else navigation.replace('DiscoveryFeed');
      } else {
        // Show CTA buttons with animation
        setShowButtons(true);
        Animated.parallel([
          Animated.timing(btnsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(btnsTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    decide();
  }, [timerDone, isLoading, token, role]);

  const handleSellerPress = () => {
    navigation.navigate('Register', { defaultRole: 'SELLER' });
  };

  const handleBuyerPress = () => {
    navigation.navigate('Register', { defaultRole: 'BUYER' });
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative background circles */}
      <Animated.View
        style={[styles.bgCircleTop, { transform: [{ scale: bgScale }] }]}
      />
      <Animated.View
        style={[styles.bgCircleBottom, { transform: [{ scale: bgScale }] }]}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <ReachloLogo size={110} />
          <Text style={styles.brandName}>REACHLO</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>Where Businesses{'\n'}Meet Real Buyers</Text>
          <Text style={styles.subTagline}>
            India's platform for time-bound campaigns{'\n'}and verified local connections
          </Text>
        </Animated.View>

        {/* CTA Buttons — appear after auth check */}
        {showButtons && (
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: btnsOpacity,
                transform: [{ translateY: btnsTranslateY }],
              },
            ]}
          >
            {/* Seller CTA */}
            <Pressable
              onPress={handleSellerPress}
              style={({ pressed }) => [
                styles.sellerButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Grow Your Business — for businesses"
            >
              
              <View style={styles.buttonTextContainer}>
                <Text style={styles.sellerButtonTitle}>Grow Your Business</Text>
                <Text style={styles.buttonSubtext}>For businesses & sellers</Text>
              </View>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>

            {/* Buyer CTA */}
            <Pressable
              onPress={handleBuyerPress}
              style={({ pressed }) => [
                styles.buyerButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Explore Amazing Offers — for buyers"
            >
               
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buyerButtonTitle}>Explore Amazing Offers</Text>
                <Text style={styles.buyerButtonSubtext}>For shoppers & buyers</Text>
              </View>
              <Text style={styles.buyerButtonArrow}>→</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>© 2026 Reachlo by Sorven Global</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },

  // Decorative background elements
  bgCircleTop: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: COLORS.PRIMARY_ULTRA_LIGHT,
    top: -width * 0.55,
    right: -width * 0.2,
  },
  bgCircleBottom: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.SURFACE_2,
    bottom: -width * 0.3,
    left: -width * 0.15,
    opacity: 0.6,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 6,
    marginTop: 14,
  },

  // Tagline
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  tagline: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: FONT_SIZES.XL * LINE_HEIGHTS.TIGHT,
    marginBottom: 12,
  },
  subTagline: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: FONT_SIZES.SM * LINE_HEIGHTS.RELAXED,
  },

  // CTA Buttons
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    width: '100%',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  buyerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  sellerButtonIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  buyerButtonIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  buttonTextContainer: {
    flex: 1,
  },
  sellerButtonTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  buttonSubtext: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.PRIMARY_LIGHT,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  buyerButtonTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
  buyerButtonSubtext: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  buttonArrow: {
    fontSize: 20,
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  buyerButtonArrow: {
    fontSize: 20,
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // Footer
  footerText: {
    textAlign: 'center',
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    opacity: 0.7,
    paddingBottom: 20,
  },
});
