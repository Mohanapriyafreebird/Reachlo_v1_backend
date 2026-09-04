import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  Dimensions,
  Animated,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    titleLine1: 'Discover Trusted',
    titleLine2: 'Services',
    titleBlue: ' Near You',
    subtitle: 'Find verified businesses,\nexclusive offers and connect instantly.',
    image: require('../../assets/buyer_login/image 1.png'),
  },
  {
    id: '2',
    titleLine1: 'Save More with',
    titleLine2: 'Exclusive',
    titleBlue: ' Offers',
    subtitle: 'Access discounts and deals\nfrom local businesses.',
    image: require('../../assets/buyer_login/image 2.png'),
  },
  {
    id: '3',
    titleLine1: 'Connect',
    titleLine2: 'Directly',
    titleBlue: ' Instantly',
    subtitle: 'Call, WhatsApp or enquire\ndirectly with sellers.',
    image: require('../../assets/buyer_login/image 3.png'),
  },
  {
    id: '4',
    titleLine1: 'Deals Tailored',
    titleLine2: 'Just',
    titleBlue: ' For You',
    subtitle: 'Get recommendations based\non your interests and city.',
    image: require('../../assets/buyer_login/image 4.png'),
  },
];

export default function BuyerLoginScreen({ navigation }) {
  const { theme: originalTheme, isDarkMode: originalIsDarkMode } = useTheme();
  const theme = require('../constants/theme').BUYER_LIGHT_THEME;
  const isDarkMode = false;
  const { login, clearAuth } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const passwordRef = useRef(null);
  const flatListRef = useRef(null);
  const autoScrollTimerRef = useRef(null);
  const isManualScrollRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animations
  const heroScale = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;
  const heroHeight = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;

  useEffect(() => {
    const keyboardWillShowSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.parallel([
          Animated.timing(heroScale, { toValue: 0.8, duration: 250, useNativeDriver: false }),
          Animated.timing(heroOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
          Animated.timing(heroHeight, { toValue: 0, duration: 250, useNativeDriver: false }),
        ]).start();
      }
    );
    const keyboardWillHideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.parallel([
          Animated.timing(heroScale, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(heroOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(heroHeight, { toValue: SCREEN_HEIGHT * 0.4, duration: 250, useNativeDriver: false }),
        ]).start();
      }
    );

    return () => {
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, [heroScale, heroOpacity, heroHeight]);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('buyerEmail');
        const savedPassword = await AsyncStorage.getItem('buyerPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (err) {
        console.log('Error loading credentials', err);
      }
    };
    loadCredentials();
  }, []);

  useEffect(() => {
    const startAutoScroll = () => {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = setInterval(() => {
        if (!isKeyboardVisible && !isManualScrollRef.current) {
          setCurrentIndex((prevIndex) => {
            const nextIndex = prevIndex === SLIDES.length - 1 ? 0 : prevIndex + 1;
            flatListRef.current?.scrollToOffset({ offset: nextIndex * SCREEN_WIDTH, animated: true });
            return nextIndex;
          });
        }
      }, 4000);
    };

    startAutoScroll();
    return () => clearInterval(autoScrollTimerRef.current);
  }, [isKeyboardVisible]);

  const handleScrollBeginDrag = () => {
    isManualScrollRef.current = true;
    clearInterval(autoScrollTimerRef.current);
  };

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
    isManualScrollRef.current = false;
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const showToastMsg = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      showToastMsg('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      // Pass requested_role='BUYER' so the backend enforces portal isolation server-side.
      // The backend will reject Seller accounts with HTTP 403 before issuing any token.
      const response = await login(email.trim(), password, 'BUYER');

      // ── Frontend role guard (defensive layer) ────────────────────────────
      // Should not be reached if backend enforcement is working, but kept as a
      // safety net for older server versions or misconfiguration.
      if (response.role === 'SELLER' || response.role === 'ADMIN') {
        await clearAuth();
        showToastMsg(
          "⚠ Wrong Login Portal\n\nThis account is registered as a Seller.\nPlease use the 'Grow Your Business' login instead.",
          'error'
        );
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      if (rememberMe) {
        await AsyncStorage.setItem('buyerEmail', email.trim());
        await AsyncStorage.setItem('buyerPassword', password);
      } else {
        await AsyncStorage.removeItem('buyerEmail');
        await AsyncStorage.removeItem('buyerPassword');
      }

      navigation.replace('DiscoveryFeed');
    } catch (err) {
      // The backend returns 403 with a descriptive message for wrong-portal attempts
      const rawMessage = err?.message || 'Invalid email or password';
      if (rawMessage.toLowerCase().includes('wrong login portal') || rawMessage.toLowerCase().includes('registered as a seller')) {
        showToastMsg(
          '⚠ Wrong Login Portal\n\nThis account is registered as a Seller.\nPlease use the Seller Login page to continue.',
          'error'
        );
      } else {
        showToastMsg(rawMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSlide = ({ item }) => {
    return (
      <View style={styles.slideWrapper}>
        <View style={styles.slideContent}>
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              {item.titleLine1}{'\n'}
              <Text style={{ color: '#0F172A' }}>{item.titleLine2}</Text>
              <Text style={styles.titleBlue}>{item.titleBlue}</Text>
            </Text>
            <Text style={styles.subtitleText}>{item.subtitle}</Text>
          </View>
          <Image 
            source={item.image} 
            style={styles.illustration} 
            resizeMode="contain" 
          />
        </View>
      </View>
    );
  };

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.mainWrapper}>
            
            {/* HERO SECTION */}
            <Animated.View style={[styles.topSection, { height: heroHeight, opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
              <LinearGradient colors={['#F5FAFF', '#EDF6FF']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.blobTopRight} />
              <View style={styles.blobBottomLeft} />
              <View style={styles.sparkle1} />
              <View style={styles.sparkle2} />

              <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <Text style={styles.logoText}>REACHLO</Text>

                <FlatList
                  ref={flatListRef}
                  data={SLIDES}
                  renderItem={renderSlide}
                  horizontal
                  pagingEnabled
                  snapToInterval={SCREEN_WIDTH}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onMomentumScrollEnd={handleMomentumScrollEnd}
                  keyExtractor={(item) => item.id}
                  scrollEventThrottle={16}
                  bounces={false}
                  contentContainerStyle={{ width: SCREEN_WIDTH * SLIDES.length }}
                />
                
                <View style={styles.indicatorContainer}>
                  {SLIDES.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        currentIndex === index ? styles.indicatorActive : styles.indicatorInactive
                      ]}
                    />
                  ))}
                </View>
              </SafeAreaView>
            </Animated.View>

            {/* LOGIN CARD */}
            <View style={styles.bottomCard}>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.cardScroll}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.welcomeWrapper}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>BUYER WORKSPACE</Text>
                  </View>
                  <Text style={styles.welcomeHeading}>Welcome Back!</Text>
                  <Text style={styles.welcomeSubtitle}>Login to continue and explore amazing offers.</Text>
                </View>
                
                <View style={styles.formContainer}>
                  {/* Email Field */}
                  <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                    <Ionicons name="mail-outline" size={22} color={emailFocused ? '#2563EB' : '#6B7280'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email or Phone Number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      editable={!loading}
                    />
                  </View>

                  {/* Password Field */}
                  <View style={[styles.inputContainer, passFocused && styles.inputFocused, { marginTop: 16 }]}>
                    <Ionicons name="lock-closed-outline" size={22} color={passFocused ? '#2563EB' : '#6B7280'} style={styles.inputIcon} />
                    <TextInput
                      ref={passwordRef}
                      style={styles.inputField}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      onSubmitEditing={handleSubmit}
                      editable={!loading}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={22} 
                        color="#6B7280" 
                      />
                    </Pressable>
                  </View>

                  {/* Remember Me and Forgot Password */}
                  <View style={styles.rememberForgotContainer}>
                    <Pressable 
                      style={styles.rememberMeContainer} 
                      onPress={() => setRememberMe(!rememberMe)}
                      disabled={loading}
                    >
                      <Ionicons 
                        name={rememberMe ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={rememberMe ? '#2563EB' : '#9CA3AF'} 
                      />
                      <Text style={styles.rememberMeText}>Remember me</Text>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate('ForgotPassword')} disabled={loading}>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </Pressable>
                  </View>

                  {/* Login Button */}
                  <Pressable 
                    onPress={handleSubmit} 
                    disabled={loading} 
                    style={({ pressed }) => [
                      styles.loginBtnContainer,
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <LinearGradient
                      colors={['#38BDF8', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginGradient}
                    >
                      <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
                    </LinearGradient>
                  </Pressable>
                  
                  {/* Social login removed per UX request */}

                  {/* Signup Prompt */}
                  <View style={styles.signupContainer}>
                    <Text style={styles.signupPrompt}>Don't have an account?</Text>
                    <Pressable
                      onPress={() => navigation.navigate('Register', { defaultRole: 'BUYER' })}
                      disabled={loading}
                    >
                      <Text style={styles.signupText}>Sign up</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF6FF',
  },
  keyboardView: {
    flex: 1,
  },
  mainWrapper: {
    flex: 1,
  },
  
  /* HERO SECTION */
  topSection: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
  },
  sparkle1: {
    position: 'absolute',
    top: '30%',
    right: '40%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(41, 182, 246, 0.6)',
  },
  sparkle2: {
    position: 'absolute',
    top: '60%',
    right: '25%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(30, 136, 229, 0.4)',
  },
  logoText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#071B4A',
    letterSpacing: 2,
    marginTop: 10,
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  textContainer: {
    width: '50%',
    zIndex: 10,
    marginTop: -40,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 12,
  },
  titleBlue: {
    color: '#1877F2',
  },
  subtitleText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    paddingRight: 10,
    fontWeight: '400',
  },
  illustration: {
    position: 'absolute',
    right: -10,
    width: 200, 
    height: 200,
    marginTop: -15,
    zIndex: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 35,
    left: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorActive: {
    width: 30,
    backgroundColor: '#1877F2',
  },
  indicatorInactive: {
    backgroundColor: '#CBD5E1',
  },

  /* LOGIN CARD */
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 15,
    marginTop: 24,
  },
  cardScroll: {
    paddingBottom: 40,
  },
  welcomeWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    marginBottom: 12,
  },
  roleBadgeText: {
    color: '#0F76D0',
    fontSize: 12,
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberMeText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtnContainer: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  loginGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    color: '#6B7280',
    fontSize: 15,
    marginRight: 6,
  },
  signupText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
});
