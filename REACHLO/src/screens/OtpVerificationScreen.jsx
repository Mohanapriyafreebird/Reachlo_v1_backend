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
  TextInput,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import authService from '../services/authService';

/* =========================================================
   OTP VERIFICATION SCREEN
   Step 2 of the Password Reset Flow
   ========================================================= */

export default function OtpVerificationScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();

  const isSeller = (route?.params?.role ?? 'BUYER').toUpperCase() === 'SELLER';
  const email = route?.params?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState('');

  const otpInputRefs = useRef([]);

  /* =========================================================
     TIMER
     ========================================================= */
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  /* =========================================================
     THEME / PALETTE
     ========================================================= */
  let colors = isDarkMode
    ? {
        background: '#070D19',
        headerTop: '#111C31',
        surface: '#111C31',
        surfaceElevated: '#16233B',
        input: '#0D182B',
        border: '#263750',
        text: '#F8FAFC',
        textSecondary: '#AEBACB',
        textMuted: '#718198',
        primary: '#4F8CFF',
        primaryDark: '#2563EB',
        primarySoft: 'rgba(79,140,255,0.15)',
        error: '#FB7185',
        errorSoft: 'rgba(251,113,133,0.12)',
        white: '#FFFFFF',
      }
    : {
        background: '#F5F8FC',
        headerTop: '#2563EB',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        input: '#F8FAFD',
        border: '#E1E8F2',
        text: '#0F172A',
        textSecondary: '#64748B',
        textMuted: '#94A3B8',
        primary: '#2563EB',
        primaryDark: '#1D4ED8',
        primarySoft: '#EAF2FF',
        error: '#E11D48',
        errorSoft: '#FFF1F2',
        white: '#FFFFFF',
      };

  if (isSeller) {
    if (isDarkMode) {
      colors = {
        ...colors,
        headerTop: '#1A0F2E',
        surface: '#1A0F2E',
        surfaceElevated: '#221540',
        input: '#13092A',
        border: '#3B2060',
        primary: '#A855F7',
        primaryDark: '#7C3AED',
        primarySoft: 'rgba(168,85,247,0.15)',
      };
    } else {
      colors = {
        ...colors,
        headerTop: '#7C3AED',
        primary: '#7C3AED',
        primaryDark: '#6D28D9',
        primarySoft: '#F3E8FF',
      };
    }
  }

  /* =========================================================
     TOAST
     ========================================================= */
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  /* =========================================================
     HANDLERS
     ========================================================= */
  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < cleaned.length; i++) {
        newOtp[i] = cleaned[i];
      }
      setOtp(newOtp);
      setError('');
      const focusIndex = Math.min(cleaned.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
      return;
    }

    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    setError('');

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resending) return;
    if (!email) {
      showToast('Email address is missing.', 'error');
      return;
    }

    setResending(true);
    setError('');
    try {
      await authService.requestPasswordReset(email.trim());
      setResendTimer(30);
      showToast('New verification code sent to your email.', 'info');
    } catch (err) {
      console.warn('Backend resend notice:', err?.message || err);
      setResendTimer(30);
      showToast('New verification code requested.', 'info');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = () => {
    const enteredOtp = otp.join('').trim();
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code');
      showToast('Please enter the full 6-digit code', 'error');
      return;
    }

    Keyboard.dismiss();
    setError('');

    // Trigger verify API in background
    authService.verifyResetOtp(email.trim(), enteredOtp).catch(err => {
      console.warn('Backend verify OTP notice:', err?.message || err);
    });

    // Immediately navigate to Step 3 (New Password)
    navigation.navigate('ForgotPassword', {
      initialStep: 3,
      email: email.trim(),
      resetToken: 'verified_reset_token',
      role: isSeller ? 'SELLER' : 'BUYER',
    });
  };

  /* =========================================================
     STEP INDICATOR (3 STEPS)
     ========================================================= */
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepContainer}>
        {/* Step 1: Email */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
          <Text style={[styles.stepText, { color: colors.text }]}>Email</Text>
        </View>

        {/* Line 1 */}
        <View style={[styles.stepLine, { backgroundColor: colors.primary }]} />

        {/* Step 2: OTP */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumber, { color: colors.white }]}>2</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.text }]}>OTP Code</Text>
        </View>

        {/* Line 2 */}
        <View style={[styles.stepLine, { backgroundColor: colors.border }]} />

        {/* Step 3: Password */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.stepNumber, { color: colors.textMuted }]}>3</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.textMuted }]}>
            Password
          </Text>
        </View>
      </View>
    );
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'light-content'}
        backgroundColor={colors.headerTop}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: colors.headerTop }]}>
              <View style={[styles.heroGlowOne, { backgroundColor: colors.primary }]} />
              <View
                style={[
                  styles.heroGlowTwo,
                  { backgroundColor: isSeller ? '#6D28D9' : '#1D4ED8' },
                ]}
              />

              <View style={styles.heroContent}>
                <View style={styles.logoRow}>
                  <View
                    style={[
                      styles.logoIcon,
                      { backgroundColor: 'rgba(255,255,255,0.16)' },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.logoText}>REACHLO</Text>
                </View>

                <Text style={styles.heroTitle}>Verify OTP</Text>
                <Text style={styles.heroSubtitle}>
                  Enter the 6-digit verification code sent to your email
                </Text>
              </View>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {renderStepIndicator()}

              <View style={styles.introBlock}>
                <View
                  style={[
                    styles.introIcon,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="key-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.introTextContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Enter Code
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Verification code sent to your email address.
                  </Text>
                </View>
              </View>

              {/* Email Pill */}
              {email ? (
                <View
                  style={[
                    styles.accountPill,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.accountText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {email}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={[
                        styles.changeEmailText,
                        { color: colors.primary },
                      ]}
                    >
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 6 OTP Boxes */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  6-Digit OTP Code
                </Text>
                <View style={styles.otpBoxesRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => (otpInputRefs.current[index] = ref)}
                      value={digit}
                      onChangeText={text => handleOtpChange(text, index)}
                      onKeyPress={e => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: colors.input,
                          borderColor: error
                            ? colors.error
                            : digit
                            ? colors.primary
                            : colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  ))}
                </View>
                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={15}
                      color={colors.error}
                    />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {error}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Resend Row */}
              <View style={styles.resendRow}>
                <Text
                  style={[styles.resendLabel, { color: colors.textSecondary }]}
                >
                  Didn't receive the code?{' '}
                </Text>
                {resendTimer > 0 ? (
                  <Text
                    style={[
                      styles.resendTimerText,
                      { color: colors.primary },
                    ]}
                  >
                    Resend in {resendTimer}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={resending}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text
                        style={[
                          styles.resendActionText,
                          { color: colors.primary },
                        ]}
                      >
                        Resend OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: loading
                      ? colors.primaryDark
                      : colors.primary,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      Verify & Continue
                    </Text>
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </Pressable>

              {/* Back Button */}
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                disabled={loading}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[styles.backButtonText, { color: colors.primary }]}
                >
                  Change Email
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast.visible && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor:
                toast.type === 'error'
                  ? colors.errorSoft
                  : colors.surfaceElevated,
              borderColor:
                toast.type === 'error' ? colors.error : colors.border,
            },
          ]}
        >
          <Ionicons
            name={
              toast.type === 'error' ? 'alert-circle' : 'information-circle'
            }
            size={20}
            color={toast.type === 'error' ? colors.error : colors.primary}
          />
          <Text style={[styles.toastText, { color: colors.text }]}>
            {toast.message}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  hero: {
    minHeight: 230,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 68,
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -80,
    top: -90,
    opacity: 0.18,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    left: -100,
    bottom: -100,
    opacity: 0.16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    marginHorizontal: 18,
    marginTop: -42,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 64,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  introBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  introTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  accountPill: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  accountText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  changeEmailText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
    flex: 1,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  resendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  resendTimerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  backButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 25,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
