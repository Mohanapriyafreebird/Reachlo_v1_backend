/**
 * SellerChangePasswordScreen.jsx
 *
 * Used by both Buyer (DiscoveryFeed profile) and Seller profile pages.
 * Implements a secure 3-step OTP password change flow:
 *   Step 1 — Confirm email (pre-filled from logged-in user) → Send OTP
 *   Step 2 — Enter 6-digit OTP received in email
 *   Step 3 — Enter & confirm new password using the reset_token
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import apiService from '../../services/apiService';
import Toast from '../../components/Toast';

/* ─────────────────────────────────────────
   Reusable Input Component
───────────────────────────────────────── */
const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  showToggle = false,
  visible,
  onToggle,
  icon,
  maxLength,
  onSubmitEditing,
  returnKeyType = 'done',
  error,
  colors,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.secondaryText }]}>
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isFocused ? colors.inputFocused : colors.input,
            borderColor: error
              ? colors.danger
              : isFocused
              ? colors.borderFocused
              : colors.border,
            shadowColor: isFocused ? colors.accent : 'transparent',
            shadowOpacity: isFocused ? 0.12 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.inputIconContainer,
            { backgroundColor: isFocused ? colors.iconBg : 'transparent' },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={isFocused ? colors.icon : colors.tertiaryText}
          />
        </View>

        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.tertiaryText}
          secureTextEntry={showToggle ? !visible : secureTextEntry}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />

        {showToggle && (
          <Pressable onPress={onToggle} style={styles.eyeButton} hitSlop={8}>
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={21}
              color={colors.tertiaryText}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
export default function SellerChangePasswordScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  // Steps: 1 = confirm email, 2 = enter OTP, 3 = new password
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingEmail, setFetchingEmail] = useState(true);
  const [errors, setErrors] = useState({});

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showToast, setShowToast] = useState(false);

  const successScale = useRef(new Animated.Value(0.7)).current;

  /* ── Fetch logged-in user's email on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const me = await apiService.get('/auth/me');
        setEmail((me.email || '').trim().toLowerCase());
      } catch (_) {
        // If fetch fails the user can type manually
      } finally {
        setFetchingEmail(false);
      }
    })();
  }, []);

  /* ── Toast helper ── */
  const toast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const clearError = (key) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  /* ── Colors ── */
  const colors = useMemo(() => {
    if (isDarkMode) {
      return {
        background: '#090B16',
        surface: '#111522',
        surfaceElevated: '#171B2B',
        input: '#151A29',
        inputFocused: '#191E31',
        border: '#252B3D',
        borderFocused: '#7C5CFF',
        text: '#F8FAFC',
        secondaryText: '#AAB2C5',
        tertiaryText: '#737C92',
        accent: '#8B5CF6',
        accentBlue: '#3B82F6',
        icon: '#A78BFA',
        iconBg: 'rgba(139,92,246,0.12)',
        gradientStart: '#7C5CFF',
        gradientEnd: '#3B82F6',
        stepActive: '#8B5CF6',
        stepInactive: '#252B3D',
        stepLine: '#252B3D',
        danger: '#F43F5E',
        success: '#10B981',
        successSoft: 'rgba(16,185,129,0.12)',
        white: '#FFFFFF',
        primarySoft: 'rgba(139,92,246,0.10)',
      };
    }
    return {
      background: '#F4F6FB',
      surface: '#FFFFFF',
      surfaceElevated: '#F8F9FF',
      input: '#F1F3FA',
      inputFocused: '#EEEEFF',
      border: '#DDE1EF',
      borderFocused: '#6D4AFF',
      text: '#0F172A',
      secondaryText: '#4B5563',
      tertiaryText: '#9CA3AF',
      accent: '#6D4AFF',
      accentBlue: '#3B82F6',
      icon: '#6D4AFF',
      iconBg: 'rgba(109,74,255,0.08)',
      gradientStart: '#6D4AFF',
      gradientEnd: '#3B82F6',
      stepActive: '#6D4AFF',
      stepInactive: '#E5E7EB',
      stepLine: '#DDE1EF',
      danger: '#EF4444',
      success: '#059669',
      successSoft: 'rgba(5,150,105,0.1)',
      white: '#FFFFFF',
      primarySoft: 'rgba(109,74,255,0.08)',
    };
  }, [isDarkMode]);

  /* ══════════════════════════════════════════
     STEP 1 — Send OTP to email
  ══════════════════════════════════════════ */
  const handleSendOTP = async () => {
    if (!email.trim()) {
      setErrors({ email: 'Email address is required.' });
      return;
    }
    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      await apiService.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      toast('OTP sent to your email address.', 'success');
      setStep(2);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('too many') || msg.includes('429')) {
        toast('Too many attempts. Please wait before trying again.', 'error');
      } else if (msg.includes('could not send') || msg.includes('503')) {
        toast('Could not send OTP email. Please try again later.', 'error');
      } else {
        toast(err?.message || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════
     STEP 2 — Verify OTP
  ══════════════════════════════════════════ */
  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP sent to your email.' });
      return;
    }
    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      const res = await apiService.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('too many') || msg.includes('429')) {
        setErrors({ otp: 'Too many incorrect attempts. Please request a new OTP.' });
        toast('OTP locked. Please request a new one.', 'error');
      } else if (msg.includes('expired')) {
        setErrors({ otp: 'OTP has expired. Please request a new one.' });
        toast('OTP expired. Going back.', 'error');
        setTimeout(() => setStep(1), 1500);
      } else {
        setErrors({ otp: err?.message || 'Incorrect OTP. Please try again.' });
        toast(err?.message || 'Incorrect OTP.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════
     STEP 3 — Set new password
  ══════════════════════════════════════════ */
  const handleResetPassword = async () => {
    const errs = {};
    if (!newPassword) errs.newPassword = 'New password is required.';
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      await apiService.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      });

      // Show success animation then go back
      setStep(4);
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();
      toast('Password changed successfully!', 'success');
      setTimeout(() => navigation.goBack(), 2200);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid or has expired') || msg.includes('reset token')) {
        toast('Session expired. Please start over.', 'error');
        setTimeout(() => setStep(1), 1500);
      } else {
        toast(err?.message || 'Could not reset password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════
     Step Indicator (3 steps)
  ══════════════════════════════════════════ */
  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {['Email', 'OTP', 'Password'].map((label, idx) => {
        const s = idx + 1;
        const active = step >= s;
        const done = step > s;
        return (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: active ? colors.stepActive : colors.stepInactive },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.stepNum,
                      { color: active ? colors.white : colors.tertiaryText },
                    ]}
                  >
                    {s}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: active ? colors.text : colors.tertiaryText },
                ]}
              >
                {label}
              </Text>
            </View>
            {idx < 2 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: step > s ? colors.stepActive : colors.stepLine },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  /* ══════════════════════════════════════════
     Success screen (step 4)
  ══════════════════════════════════════════ */
  const renderSuccess = () => (
    <Animated.View
      style={[styles.successContainer, { transform: [{ scale: successScale }] }]}
    >
      <View
        style={[
          styles.successIconWrap,
          { backgroundColor: colors.successSoft, borderColor: colors.success },
        ]}
      >
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text }]}>
        Password Changed!
      </Text>
      <Text style={[styles.successSub, { color: colors.secondaryText }]}>
        Your password has been updated successfully.
      </Text>
      <View style={[styles.redirectPill, { backgroundColor: colors.primarySoft }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.redirectText, { color: colors.accent }]}>
          Going back...
        </Text>
      </View>
    </Animated.View>
  );

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <Toast
        visible={showToast}
        message={toastMsg}
        type={toastType}
        onHide={() => setShowToast(false)}
      />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 4 ? (
            renderSuccess()
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {renderStepIndicator()}

              {/* ── STEP 1: Email ── */}
              {step === 1 && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="mail-outline" size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Confirm your email
                      </Text>
                      <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                        We'll send a one-time password to verify it's you.
                      </Text>
                    </View>
                  </View>

                  {fetchingEmail ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
                  ) : (
                    <Field
                      label="Registered Email"
                      value={email}
                      onChangeText={(t) => { setEmail(t); clearError('email'); }}
                      placeholder="you@example.com"
                      icon="mail-outline"
                      keyboardType="email-address"
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                      error={errors.email}
                      colors={colors}
                    />
                  )}

                  <Pressable
                    onPress={handleSendOTP}
                    disabled={loading || fetchingEmail}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Send OTP</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === 2 && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="keypad-outline" size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Enter OTP
                      </Text>
                      <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                        A 6-digit code was sent to{' '}
                        <Text style={{ color: colors.accent, fontWeight: '600' }}>{email}</Text>.
                        Check your inbox.
                      </Text>
                    </View>
                  </View>

                  <Field
                    label="One-Time Password"
                    value={otp}
                    onChangeText={(t) => { setOtp(t.replace(/[^0-9]/g, '')); clearError('otp'); }}
                    placeholder="6-digit OTP"
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOTP}
                    error={errors.otp}
                    colors={colors}
                  />

                  <Pressable
                    onPress={handleVerifyOTP}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Verify OTP</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => { setOtp(''); setErrors({}); setStep(1); }}
                    disabled={loading}
                    style={styles.secondaryBtn}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.accent} />
                    <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
                      Resend OTP
                    </Text>
                  </Pressable>
                </>
              )}

              {/* ── STEP 3: New Password ── */}
              {step === 3 && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="lock-closed-outline" size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Set new password
                      </Text>
                      <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                        Choose a strong password that you haven't used before.
                      </Text>
                    </View>
                  </View>

                  <Field
                    label="New Password"
                    value={newPassword}
                    onChangeText={(t) => { setNewPassword(t); clearError('newPassword'); }}
                    placeholder="At least 8 characters"
                    icon="lock-closed-outline"
                    showToggle
                    visible={showNew}
                    onToggle={() => setShowNew((p) => !p)}
                    returnKeyType="next"
                    error={errors.newPassword}
                    colors={colors}
                  />

                  <Field
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                    placeholder="Repeat new password"
                    icon="lock-closed-outline"
                    showToggle
                    visible={showConfirm}
                    onToggle={() => setShowConfirm((p) => !p)}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                    error={errors.confirmPassword}
                    colors={colors}
                  />

                  <Pressable
                    onPress={handleResetPassword}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Change Password</Text>
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  scroll: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  /* Step indicator */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '700' },
  stepLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 6, marginBottom: 18 },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  sectionSub: { fontSize: 13, lineHeight: 18 },

  /* Input */
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 0,
  },
  inputIconContainer: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { flex: 1, height: 48, fontSize: 14, paddingRight: 8 },
  eyeButton: { paddingHorizontal: 12 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontSize: 12 },

  /* Buttons */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 50,
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },

  /* Success */
  successContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  redirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  redirectText: { fontSize: 13, fontWeight: '600' },
});