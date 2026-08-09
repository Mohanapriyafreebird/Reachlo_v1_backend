import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    titleLine1: 'Grow Your\nBusiness',
    titleBlue: ' Faster',
    subtitle: 'Promote your services and connect with buyers in your city.',
    image: require('../../assets/seller_login/image 1 seller.png'),
    imageStyle: { width: 230, height: 230 },
  },
  {
    id: '2',
    titleLine1: 'Create Beautiful\n',
    titleBlue: 'Campaigns',
    subtitle: 'Showcase offers, services and promotions to ready buyers.',
    image: require('../../assets/seller_login/image 2 seller.png'),
  },
  {
    id: '3',
    titleLine1: 'Engage Buyers\n',
    titleBlue: 'Instantly',
    subtitle: 'Receive enquiries and connect through call, chat or WhatsApp.',
    image: require('../../assets/seller_login/image 3 seller .png'),
    imageStyle: { width: 220, height: 220 },
  },
  {
    id: '4',
    titleLine1: 'Track Leads\n& Grow',
    titleBlue: ' Business',
    subtitle: 'Monitor views, leads and campaign performance from one dashboard.',
    image: require('../../assets/seller_login/image 4 seller.png'),
  },
];

export default function LoginScreen({ navigation }) {
  const { login, clearAuth } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateField = (field, val) => {
    if (field === 'email') {
      if (!val.trim()) setEmailError('Email or Phone is required');
      else setEmailError('');
    } else if (field === 'password') {
      if (!val) setPasswordError('Password is required');
      else setPasswordError('');
    }
  };

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
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [floatAnim]);

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
    const startAutoScroll = () => {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = setInterval(() => {
        if (!isKeyboardVisible && !isManualScrollRef.current) {
          setCurrentIndex((prevIndex) => {
            const nextIndex = prevIndex === SLIDES.length - 1 ? 0 : prevIndex + 1;
            // The slides have a width of (SCREEN_WIDTH - 32) because of the margins
            flatListRef.current?.scrollToOffset({ offset: nextIndex * (SCREEN_WIDTH - 32), animated: true });
            return nextIndex;
          });
        }
      }, 5000); // 5 seconds per slide
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
      // Pass requested_role='SELLER' so the backend enforces portal isolation server-side.
      // The backend will reject Buyer accounts with HTTP 403 before issuing any token.
      const response = await login(email.trim(), password, 'SELLER');

      // ── Frontend role guard (defensive layer) ────────────────────────────
      // Should not be reached if backend enforcement is working, but kept as a
      // safety net for older server versions or misconfiguration.
      if (response.role !== 'SELLER' && response.role !== 'ADMIN') {
        await clearAuth();
        showToastMsg(
          "⚠ Wrong Login Portal\n\nThis account is registered as a Buyer.\nPlease use the 'Explore Amazing Offers' login instead.",
          'error'
        );
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      if (response.role === 'SELLER') {
        navigation.replace('SellerDashboard');
      } else if (response.role === 'ADMIN') {
        navigation.replace('AdminDashboard');
      }
    } catch (err) {
      // The backend returns 403 with a descriptive message for wrong-portal attempts
      const rawMessage = err?.message || 'Invalid email or password';
      if (rawMessage.toLowerCase().includes('wrong login portal') || rawMessage.toLowerCase().includes('registered as a buyer')) {
        showToastMsg(
          '⚠ Wrong Login Portal\n\nThis account is registered as a Buyer.\nPlease use the Buyer Login page to continue.',
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
              {item.titleLine1}
              <Text style={{ color: '#2563EB' }}>{item.titleBlue}</Text>
            </Text>
            <Text style={styles.subtitleText} numberOfLines={3}>{item.subtitle}</Text>
          </View>
          
          <Animated.View style={[styles.imageShadowContainer, { transform: [{ translateY: floatAnim }] }]}>
            <Image 
              source={item.image} 
              style={[styles.illustration, item.imageStyle]} 
              resizeMode="contain" 
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
      
      {/* Background Blobs */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(56, 189, 248, 0.4)', 'transparent']}
          style={styles.bgBlobTop}
        />
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.3)', 'transparent']}
          style={styles.bgBlobBottom}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.mainWrapper}>
            
            {/* HERO SECTION */}
            <Animated.View style={[styles.topSection, { height: heroHeight, opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
              <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <Text style={styles.logoText}>REACHLO</Text>

                <BlurView intensity={30} tint="light" style={styles.heroGlassContainer}>
                  <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSlide}
                    horizontal
                    pagingEnabled
                    snapToInterval={SCREEN_WIDTH - 32}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    onScrollBeginDrag={handleScrollBeginDrag}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    scrollEventThrottle={16}
                    bounces={false}
                    contentContainerStyle={{ width: (SCREEN_WIDTH - 32) * SLIDES.length }}
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
                </BlurView>
              </SafeAreaView>
            </Animated.View>

            {/* LOGIN CARD */}
            <View style={styles.bottomCardWrapper}>
              <BlurView intensity={40} tint="light" style={styles.bottomCard}>
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={styles.cardScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.welcomeWrapper}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>SELLER WORKSPACE</Text>
                    </View>
                    <Text style={styles.welcomeHeading}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtitle}>Secure access to leads, dashboards, and premium campaign tools.</Text>
                    <View style={styles.trustRow}> 
                      <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                      <Text style={styles.trustText}>Trusted by 5,000+ businesses</Text>
                    </View>
                  </View>
                  
                  <View style={styles.formContainer}>
                    {/* Email Input */}
                    <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                      <Ionicons name="mail-outline" size={22} color={emailFocused ? '#2563EB' : '#475569'} style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputField}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email or Phone Number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => { setEmailFocused(false); validateField('email', email); }}
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        editable={!loading}
                      />
                    </View>
                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                    {/* Password Input */}
                    <View style={[styles.inputContainer, passFocused && styles.inputFocused, { marginTop: 16 }]}>
                      <Ionicons name="lock-closed-outline" size={22} color={passFocused ? '#2563EB' : '#475569'} style={styles.inputIcon} />
                      <TextInput
                        ref={passwordRef}
                        style={styles.inputField}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onFocus={() => setPassFocused(true)}
                        onBlur={() => { setPassFocused(false); validateField('password', password); }}
                        onSubmitEditing={handleSubmit}
                        editable={!loading}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={22} 
                          color="#475569" 
                        />
                      </Pressable>
                    </View>
                    {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                    <View style={styles.forgotContainer}>
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
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                      ]}
                    >
                      <LinearGradient
                        colors={['#38BDF8', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.loginGradient}
                      >
                        <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Sign In'}</Text>
                        {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
                      </LinearGradient>
                    </Pressable>

                    {/* Social login removed per UX request */}

                    <View style={styles.signupContainer}>
                      <Text style={styles.signupPrompt}>Don't have an account?</Text>
                      <Pressable
                        onPress={() => navigation.navigate('Register', { defaultRole: 'SELLER' })}
                        disabled={loading}
                      >
                        <Text style={styles.signupText}>Create Account</Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              </BlurView>
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
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  mainWrapper: {
    flex: 1,
  },
  bgBlobTop: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
    top: -SCREEN_WIDTH * 0.5,
    left: -SCREEN_WIDTH * 0.2,
    opacity: 0.8,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: SCREEN_WIDTH * 0.6,
    bottom: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.4,
    opacity: 0.8,
  },
  
  /* HERO SECTION */
  topSection: {
    width: '100%',
    position: 'relative',
  },
  logoText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#0C1445',
    letterSpacing: 2,
    marginTop: 10,
    marginBottom: 10,
  },
  heroGlassContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  slideWrapper: {
    width: SCREEN_WIDTH - 32,
    height: '100%',
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textContainer: {
    width: '50%',
    zIndex: 10,
    marginTop: -40,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0C1445',
    lineHeight: 32,
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    paddingRight: 10,
    fontWeight: '500',
  },
  imageShadowContainer: {
    position: 'absolute',
    right: 0,
    marginTop: -15,
    zIndex: 1,
  },
  illustration: {
    width: 180, 
    height: 180,
    backgroundColor: 'transparent',
  },
  indicatorContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  indicator: {
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorActive: {
    width: 30,
    height: 6,
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  indicatorInactive: {
    width: 8,
    height: 6,
    backgroundColor: 'rgba(37,99,235,0.3)',
    borderRadius: 3,
  },

  /* LOGIN CARD */
  bottomCardWrapper: {
    flex: 1,
    marginTop: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 14,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 24,
    paddingTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  cardScroll: {
    paddingBottom: 40,
  },
  welcomeWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37,99,235,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0C1445',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22,163,74,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    marginTop: 4,
  },
  trustText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#0C1445',
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 24,
  },
  forgotText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  loginBtnContainer: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  loginGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
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
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    gap: 10,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupPrompt: {
    color: '#475569',
    fontSize: 15,
    marginRight: 6,
    fontWeight: '500',
  },
  signupText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '800',
  },
});
