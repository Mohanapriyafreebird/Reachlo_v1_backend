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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import API_CONFIG from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

// ── Reachlo Logo — recreated from brand reference ──────────────────────────
function ReachloLogo({ size = 100 }) {
  const arcSize = size * 0.7;
  const strokeWidth = arcSize * 0.12;

  return (
    <View style={[logoStyles.appIconContainer, { width: size, height: size }]}>
      <View style={[logoStyles.container, { width: arcSize, height: arcSize }]}>
        {/* Outer arc — teal/cyan bottom */}
        <View
          style={[
            logoStyles.arcOuter,
            {
              width: arcSize,
              height: arcSize,
              borderRadius: arcSize / 2,
              borderWidth: strokeWidth,
              borderColor: '#14B8A6',
              borderTopColor: 'transparent',
            },
          ]}
        />
        {/* Inner arc — purple/indigo */}
        <View
          style={[
            logoStyles.arcInner,
            {
              width: arcSize * 0.75,
              height: arcSize * 0.75,
              borderRadius: (arcSize * 0.75) / 2,
              borderWidth: strokeWidth,
              borderColor: '#A78BFA',
              borderTopColor: 'transparent',
              top: arcSize * 0.125,
              left: arcSize * 0.125,
            },
          ]}
        />
        {/* Letter R */}
        <Text
          style={[
            logoStyles.letterR,
            {
              fontSize: arcSize * 0.45,
            },
          ]}
        >
          R
        </Text>
      </View>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  appIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: -8, // slight offset to balance the bottom-heavy arcs
  },
  arcOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  arcInner: {
    position: 'absolute',
  },
  letterR: {
    fontWeight: '900',
    color: '#FFFFFF',
    position: 'absolute',
    top: '10%',
  },
});
// ────────────────────────────────────────────────────────────────────────────

export default function SplashScreen({ navigation }) {
  const { token, role, isLoading } = useAuth();

  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  const [timerDone, setTimerDone] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/health`, { method: 'GET' }).catch(() => { });

    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => setTimerDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!timerDone || isLoading) return;

    if (token && role) {
      if (role === 'SELLER') navigation.replace('SellerDashboard');
      else if (role === 'ADMIN') navigation.replace('AdminDashboard');
      else navigation.replace('DiscoveryFeed');
    } else {
      setShowButtons(true);
    }
  }, [timerDone, isLoading, token, role]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#4C1D95', '#2E1065']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Orbs */}
      <View style={[styles.orb, { top: height * 0.1, left: -40, width: 200, height: 200, borderRadius: 100 }]} />
      <View style={[styles.orb, { bottom: -60, right: -60, width: 250, height: 250, borderRadius: 125 }]} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {/* Logo & Branding */}
          <View style={styles.brandingContainer}>
            <ReachloLogo size={110} />
            <Text style={styles.brandName}>REACHLO</Text>
            <Text style={styles.tagline}>
              Connecting Businesses{'\n'}with Local Creators
            </Text>
          </View>



          {/* Action Buttons & Footer */}
          <View style={styles.bottomSection}>
            {showButtons && (
              <>
                <Pressable
                  onPress={() => navigation.navigate('Register', { defaultRole: 'SELLER' })}
                  style={({ pressed }) => [styles.glassButton, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.buttonTextWrap}>
                    <Text style={styles.buttonTitle}>Grow Your Business</Text>
                    <Text style={styles.buttonSubtitle}>For businesses & sellers</Text>
                  </View>
                  <Text style={styles.buttonArrow}>→</Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('Register', { defaultRole: 'BUYER' })}
                  style={({ pressed }) => [styles.glassButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.buttonTextWrap}>
                    <Text style={styles.buttonTitle}>Explore Amazing Offers</Text>
                    <Text style={styles.buttonSubtitle}>For shoppers & buyers</Text>
                  </View>
                  <Text style={styles.buttonArrow}>→</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>
            Made with <Text style={{ color: '#EF4444' }}></Text> by Sorven Global
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    alignItems: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 20,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  bottomSection: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 20,
  },
  glassButton: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonTextWrap: {
    flex: 1,
  },
  buttonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 2,
  },
});

