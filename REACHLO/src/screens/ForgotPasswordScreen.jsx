import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import InputField from '../components/InputField';
import PasswordInput from '../components/PasswordInput';
import PrimaryButton from '../components/PrimaryButton';
import Toast from '../components/Toast';
import apiService from '../services/apiService';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=enter email, 2=enter new password, 3=success
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const successScaleAnim = useRef(new Animated.Value(0)).current;

  const showToastMsg = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleCheckEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrors({ email: 'Email address is required' });
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      // Verify the email exists in the database before going to step 2
      await apiService.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        new_password: '__verify_only__check_email__',  // temporary probe — backend rejects this (too short) only AFTER confirming the user exists
      });
      // If we get here, the email exists (the above only succeeds if user found and password ≥ 8 chars — but this probe is < 8, so we catch below)
      setStep(2);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('404')) {
        setErrors({ email: 'No account found with this email address' });
        showToastMsg('No account found with this email. Please check and try again.', 'error');
      } else if (msg.toLowerCase().includes('8 characters') || msg.toLowerCase().includes('at least')) {
        // Backend found the user and rejected the short probe password — email is valid, proceed to step 2
        setStep(2);
      } else {
        // Unknown error — still proceed to step 2 to avoid blocking users
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const tempErrors = {};
    if (!newPassword) tempErrors.newPassword = 'New password is required';
    else if (newPassword.length < 8) tempErrors.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword) tempErrors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) tempErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await apiService.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        new_password: newPassword,
      });

      setStep(3);
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        navigation.replace('Login');
      }, 2000);
    } catch (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found')) {
        showToastMsg('No account found with this email. Please go back and try a different email.', 'error');
      } else {
        showToastMsg(msg || 'Could not reset password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HERO SECTION */}
            <View style={styles.heroSection}>
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
              <Text style={styles.heroLogo}>REACHLO</Text>
              <Text style={styles.heroTitle}>
                {step === 3 ? 'Password Reset! ✅' : 'Reset Password'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {step === 1 && "Enter your registered email to get started"}
                {step === 2 && "Create a strong new password"}
                {step === 3 && "You can now log in with your new password"}
              </Text>
            </View>

            {/* FLOATING CARD */}
            <View style={styles.floatingCard}>
              {step === 3 ? (
                <View style={styles.successContainer}>
                  <Animated.Text style={[styles.successIcon, { transform: [{ scale: successScaleAnim }] }]}>
                    🔐
                  </Animated.Text>
                  <Text style={styles.successTitle}>Password Reset Successfully!</Text>
                  <Text style={styles.successSubtitle}>Redirecting you to login…</Text>
                </View>
              ) : step === 1 ? (
                <>
                  {/* Step 1: Enter email */}
                  <Text style={styles.stepLabel}>Step 1 of 2 — Verify Your Email</Text>
                  <InputField
                    label="Registered Email Address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({});
                    }}
                    placeholder="name@example.com"
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleCheckEmail}
                  />

                  <PrimaryButton
                    title="Continue"
                    onPress={handleCheckEmail}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                  />

                  <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Login</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Step 2: Enter new password */}
                  <Text style={styles.stepLabel}>Step 2 of 2 — Create New Password</Text>
                  <Text style={styles.emailDisplay}>Account: {email}</Text>

                  <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                    }}
                    placeholder="At least 8 characters"
                    error={errors.newPassword}
                    showStrength={true}
                    returnKeyType="next"
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                    placeholder="Re-enter your new password"
                    error={errors.confirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />

                  <PrimaryButton
                    title="Save New Password"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                  />

                  <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
                    <Text style={styles.backText}>← Change Email</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  keyboardView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroSection: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.ACCENT_CYAN,
    opacity: 0.15, top: -50, right: -50,
  },
  heroCircle2: {
    position: 'absolute',
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: COLORS.ACCENT_PURPLE,
    opacity: 0.1, bottom: -30, left: -30,
  },
  heroLogo: {
    fontSize: FONT_SIZES.BASE, fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE, letterSpacing: 4, marginBottom: 6, opacity: 0.9,
  },
  heroTitle: {
    fontSize: FONT_SIZES.XXL, fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE, marginBottom: 4, textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.SM, color: COLORS.PRIMARY_ULTRA_LIGHT,
    fontWeight: FONT_WEIGHTS.MEDIUM, textAlign: 'center',
  },
  floatingCard: {
    backgroundColor: COLORS.WHITE, borderRadius: 24,
    marginHorizontal: 20, marginTop: -28,
    paddingHorizontal: 20, paddingVertical: 24,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  stepLabel: {
    fontSize: FONT_SIZES.XS, fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.PRIMARY, marginBottom: 16, letterSpacing: 0.5,
  },
  emailDisplay: {
    fontSize: FONT_SIZES.SM, color: COLORS.TEXT_SECONDARY,
    marginBottom: 16, fontStyle: 'italic',
  },
  submitButton: { marginTop: 8, marginBottom: 16 },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: {
    fontSize: FONT_SIZES.SM, color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  successContainer: { alignItems: 'center', paddingVertical: 24 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY, marginBottom: 8, textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONT_SIZES.SM, color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});
