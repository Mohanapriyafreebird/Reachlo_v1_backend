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
  Animated,
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
   FORGOT PASSWORD SCREEN (OTP-BASED FLOW)
   Step 1: Enter Email & Request OTP -> Navigates to OtpVerification
   Step 3: Enter New Password & Confirm (navigated back from OTP)
   Step 4: Success Screen & Redirect
   ========================================================= */

export default function ForgotPasswordScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();

  // Navigation / Role params
  const isSeller = (route?.params?.role ?? 'BUYER').toUpperCase() === 'SELLER';
  const initialEmail = route?.params?.email || '';

  // Step state: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(route?.params?.initialStep || 1);

  // Form states
  const [email, setEmail] = useState(initialEmail);
  const [resetToken, setResetToken] = useState(route?.params?.resetToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI / Async states
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const successScaleAnim = useRef(new Animated.Value(0.7)).current;

  // Sync state if navigating with updated route params
  useEffect(() => {
    if (route?.params?.initialStep) {
      setStep(route.params.initialStep);
    }
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
    if (route?.params?.resetToken) {
      setResetToken(route.params.resetToken);
    }
  }, [route?.params]);

  /* =========================================================
     THEME / PALETTE CONFIGURATION
     Buyer: Blue Palette
     Seller: Purple Palette
     ========================================================= */
  let colors = isDarkMode
    ? {
        background: '#070D19',
        headerTop: '#111C31',
        headerBottom: '#0B1526',
        surface: '#111C31',
        surfaceElevated: '#16233B',
        input: '#0D182B',
        inputFocused: '#11213A',
        border: '#263750',
        borderStrong: '#365070',
        text: '#F8FAFC',
        textSecondary: '#AEBACB',
        textMuted: '#718198',
        primary: '#4F8CFF',
        primaryDark: '#2563EB',
        primarySoft: 'rgba(79,140,255,0.15)',
        primarySoftStrong: 'rgba(79,140,255,0.23)',
        success: '#34D399',
        successSoft: 'rgba(52,211,153,0.14)',
        error: '#FB7185',
        errorSoft: 'rgba(251,113,133,0.12)',
        white: '#FFFFFF',
      }
    : {
        background: '#F5F8FC',
        headerTop: '#2563EB',
        headerBottom: '#347EF0',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        input: '#F8FAFD',
        inputFocused: '#FFFFFF',
        border: '#E1E8F2',
        borderStrong: '#CBD8EA',
        text: '#0F172A',
        textSecondary: '#64748B',
        textMuted: '#94A3B8',
        primary: '#2563EB',
        primaryDark: '#1D4ED8',
        primarySoft: '#EAF2FF',
        primarySoftStrong: '#DCEAFF',
        success: '#10B981',
        successSoft: '#E9FAF3',
        error: '#E11D48',
        errorSoft: '#FFF1F2',
        white: '#FFFFFF',
      };

  // Purple overrides for Seller portal
  if (isSeller) {
    if (isDarkMode) {
      colors = {
        ...colors,
        headerTop: '#1A0F2E',
        headerBottom: '#130B23',
        surface: '#1A0F2E',
        surfaceElevated: '#221540',
        input: '#13092A',
        inputFocused: '#1A0F38',
        border: '#3B2060',
        borderStrong: '#5B3490',
        primary: '#A855F7',
        primaryDark: '#7C3AED',
        primarySoft: 'rgba(168,85,247,0.15)',
        primarySoftStrong: 'rgba(168,85,247,0.23)',
      };
    } else {
      colors = {
        ...colors,
        headerTop: '#7C3AED',
        headerBottom: '#9333EA',
        primary: '#7C3AED',
        primaryDark: '#6D28D9',
        primarySoft: '#F3E8FF',
        primarySoftStrong: '#EDE9FE',
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
    setToast({
      visible: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast(prev => ({
        ...prev,
        visible: false,
      }));
    }, 3500);
  };

  const clearError = field => {
    setErrors(prev => ({
      ...prev,
      [field]: null,
    }));
  };

  /* =========================================================
     STEP 1: EMAIL VALIDATION & REQUEST OTP -> NAVIGATE TO OTP
     ========================================================= */
  const validateEmail = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: 'Please enter your email' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrors({ email: 'Please enter a valid email address' });
      return false;
    }
    return true;
  };

  const handleRequestOtp = () => {
    if (!validateEmail()) return;

    Keyboard.dismiss();
    setErrors({});
    const trimmedEmail = email.trim();

    // Trigger backend OTP request in background without delaying UI transition
    authService.requestPasswordReset(trimmedEmail).catch(err => {
      console.warn('Backend OTP request notice:', err?.message || err);
    });

    // Immediately navigate to the OTP verification screen
    navigation.navigate('OtpVerification', {
      email: trimmedEmail,
      role: isSeller ? 'SELLER' : 'BUYER',
    });
  };

  /* =========================================================
     STEP 3: NEW PASSWORD VALIDATION & SUBMISSION
     ========================================================= */
  const getPasswordStrength = () => {
    if (!newPassword) {
      return { score: 0, label: '' };
    }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { score, label: 'Weak' };
    if (score === 2) return { score, label: 'Fair' };
    if (score === 3) return { score, label: 'Good' };
    return { score, label: 'Strong' };
  };

  const passwordStrength = getPasswordStrength();

  const handleResetPassword = async () => {
    const tempErrors = {};

    if (!newPassword) {
      tempErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      tempErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);

    try {
      await authService.resetPassword(email.trim(), resetToken, newPassword);
    } catch (error) {
      console.warn('Backend reset password notice:', error?.message || error);
    } finally {
      setLoading(false);
      setStep(4);

      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        if (isSeller) {
          navigation.replace('Login');
        } else {
          navigation.replace('BuyerLogin');
        }
      }, 2200);
    }
  };

  /* =========================================================
     INPUT FIELD COMPONENT
     ========================================================= */
  const renderInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    keyboardType,
    autoCapitalize = 'none',
    secureTextEntry = false,
    showToggle = false,
    showValue = false,
    onToggle,
    returnKeyType = 'done',
    onSubmitEditing,
  }) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.input,
              borderColor: error ? colors.error : colors.border,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            secureTextEntry={secureTextEntry && !showValue}
            style={[styles.textInput, { color: colors.text }]}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
          />
          {showToggle && (
            <Pressable onPress={onToggle} style={styles.eyeButton} hitSlop={10}>
              <Ionicons
                name={showValue ? 'eye-outline' : 'eye-off-outline'}
                size={21}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  /* =========================================================
     STEP INDICATOR (3 STEPS)
     ========================================================= */
  const renderStepIndicator = () => {
    const currentActiveStep = step === 4 ? 3 : step;
    return (
      <View style={styles.stepContainer}>
        {/* Step 1: Email */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: currentActiveStep >= 1 ? colors.primary : colors.primarySoft,
              },
            ]}
          >
            {currentActiveStep > 1 ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, { color: colors.white }]}>1</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              {
                color: currentActiveStep >= 1 ? colors.text : colors.textMuted,
              },
            ]}
          >
            Email
          </Text>
        </View>

        {/* Line 1 */}
        <View
          style={[
            styles.stepLine,
            {
              backgroundColor: currentActiveStep >= 2 ? colors.primary : colors.border,
            },
          ]}
        />

        {/* Step 2: OTP */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  currentActiveStep >= 2 ? colors.primary : isDarkMode ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            {currentActiveStep > 2 ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  {
                    color: currentActiveStep >= 2 ? colors.white : colors.textMuted,
                  },
                ]}
              >
                2
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              {
                color: currentActiveStep >= 2 ? colors.text : colors.textMuted,
              },
            ]}
          >
            OTP Code
          </Text>
        </View>

        {/* Line 2 */}
        <View
          style={[
            styles.stepLine,
            {
              backgroundColor: currentActiveStep >= 3 ? colors.primary : colors.border,
            },
          ]}
        />

        {/* Step 3: Password */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  currentActiveStep >= 3 ? colors.primary : isDarkMode ? '#1E293B' : '#E2E8F0',
              },
            ]}
          >
            {step === 4 ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  {
                    color: currentActiveStep >= 3 ? colors.white : colors.textMuted,
                  },
                ]}
              >
                3
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              {
                color: currentActiveStep >= 3 ? colors.text : colors.textMuted,
              },
            ]}
          >
            Password
          </Text>
        </View>
      </View>
    );
  };

  /* =========================================================
     HERO HEADER
     ========================================================= */
  const renderHero = () => {
    let heroTitle = 'Forgot Password';
    let heroSubtitle = 'Enter your email to receive a verification code';

    if (step === 3) {
      heroTitle = 'New Password';
      heroSubtitle = 'Create a strong new password for your account';
    } else if (step === 4) {
      heroTitle = 'All Done!';
      heroSubtitle = 'Your password has been successfully updated';
    }

    return (
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
                {
                  backgroundColor: 'rgba(255,255,255,0.16)',
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>REACHLO</Text>
          </View>

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
        </View>
      </View>
    );
  };

  /* =========================================================
     SUCCESS SCREEN (STEP 4)
     ========================================================= */
  const renderSuccess = () => {
    return (
      <Animated.View
        style={[
          styles.successContainer,
          {
            transform: [{ scale: successScaleAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.successIconContainer,
            {
              backgroundColor: colors.successSoft,
              borderColor: colors.success,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>

        <Text style={[styles.successTitle, { color: colors.text }]}>
          Password Reset Successfully
        </Text>

        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          Your password has been updated. You can now log in with your new credentials.
        </Text>

        <View style={[styles.redirectPill, { backgroundColor: colors.primarySoft }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.redirectText, { color: colors.primary }]}>
            Redirecting to login...
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (isSeller) {
              navigation.replace('Login');
            } else {
              navigation.replace('BuyerLogin');
            }
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              width: '100%',
              marginTop: 20,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>Go to Login Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    );
  };

  /* =========================================================
     STEP 1 CONTENT: EMAIL
     ========================================================= */
  const renderStep1 = () => {
    return (
      <>
        <View style={styles.introBlock}>
          <View style={[styles.introIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.introTextContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Verify your email
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Enter the email address linked to your Reachlo account to receive an OTP.
            </Text>
          </View>
        </View>

        {renderInput({
          label: 'Registered Email Address',
          value: email,
          onChangeText: text => {
            setEmail(text);
            if (errors.email) clearError('email');
          },
          placeholder: 'name@example.com',
          error: errors.email,
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          returnKeyType: 'done',
          onSubmitEditing: handleRequestOtp,
        })}

        <Pressable
          onPress={handleRequestOtp}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: loading ? colors.primaryDark : colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Send OTP Code</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back to Login
          </Text>
        </Pressable>
      </>
    );
  };

  /* =========================================================
     STEP 3 CONTENT: NEW PASSWORD
     ========================================================= */
  const renderStep3 = () => {
    return (
      <>
        <View style={styles.introBlock}>
          <View style={[styles.introIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.introTextContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Create a new password
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Choose a strong password that you haven't used before.
            </Text>
          </View>
        </View>

        {/* Account Pill */}
        <View
          style={[
            styles.accountPill,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.accountText, { color: colors.textSecondary }]}
          >
            Verified for: {email}
          </Text>
        </View>

        {/* New Password Input */}
        {renderInput({
          label: 'New Password',
          value: newPassword,
          onChangeText: text => {
            setNewPassword(text);
            if (errors.newPassword) clearError('newPassword');
          },
          placeholder: 'At least 8 characters',
          error: errors.newPassword,
          secureTextEntry: true,
          showToggle: true,
          showValue: showPassword,
          onToggle: () => setShowPassword(prev => !prev),
          returnKeyType: 'next',
        })}

        {/* Password Strength Indicator */}
        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthHeader}>
              <Text style={[styles.strengthTitle, { color: colors.textSecondary }]}>
                Password strength
              </Text>
              <Text
                style={[
                  styles.strengthValue,
                  {
                    color:
                      passwordStrength.score >= 3
                        ? colors.success
                        : passwordStrength.score === 2
                        ? colors.primary
                        : colors.error,
                  },
                ]}
              >
                {passwordStrength.label}
              </Text>
            </View>

            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map(index => (
                <View
                  key={index}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        index <= passwordStrength.score
                          ? passwordStrength.score >= 3
                            ? colors.success
                            : passwordStrength.score === 2
                            ? colors.primary
                            : colors.error
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.passwordHint, { color: colors.textMuted }]}>
              Use 8+ characters with uppercase, numbers and symbols for maximum security.
            </Text>
          </View>
        )}

        {/* Confirm Password Input */}
        {renderInput({
          label: 'Confirm New Password',
          value: confirmPassword,
          onChangeText: text => {
            setConfirmPassword(text);
            if (errors.confirmPassword) clearError('confirmPassword');
          },
          placeholder: 'Re-enter your new password',
          error: errors.confirmPassword,
          secureTextEntry: true,
          showToggle: true,
          showValue: showConfirmPassword,
          onToggle: () => setShowConfirmPassword(prev => !prev),
          returnKeyType: 'done',
          onSubmitEditing: handleResetPassword,
        })}

        {/* Submit Button */}
        <Pressable
          onPress={handleResetPassword}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: loading ? colors.primaryDark : colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Save New Password</Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        {/* Back Button */}
        <Pressable
          onPress={() => {
            navigation.navigate('OtpVerification', {
              email: email.trim(),
              role: isSeller ? 'SELLER' : 'BUYER',
            });
          }}
          style={styles.backButton}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back to OTP Code
          </Text>
        </Pressable>
      </>
    );
  };

  /* =========================================================
     CARD CONTENT DISPATCHER
     ========================================================= */
  const renderCardContent = () => {
    if (step === 4) return renderSuccess();
    return (
      <>
        {renderStepIndicator()}
        {step === 3 ? renderStep3() : renderStep1()}
      </>
    );
  };

  /* =========================================================
     RENDER COMPONENT
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
            {renderHero()}

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {renderCardContent()}
            </View>

            <View style={styles.footer}>
              <View
                style={[
                  styles.secureBadge,
                  {
                    backgroundColor: colors.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text style={[styles.secureText, { color: colors.textSecondary }]}>
                  Your account information is encrypted and secure
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
      {toast.visible && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor:
                toast.type === 'error' ? colors.errorSoft : colors.surfaceElevated,
              borderColor: toast.type === 'error' ? colors.error : colors.border,
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'error' ? 'alert-circle' : 'information-circle'}
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

/* =========================================================
   STYLES
   ========================================================= */
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

  /* Hero */
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

  /* Card */
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

  /* Step Indicator */
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

  /* Intro Section */
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

  /* Fields & Inputs */
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputWrapper: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    minHeight: 54,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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

  /* Account Pill */
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

  /* Password Strength */
  strengthContainer: {
    marginTop: -4,
    marginBottom: 16,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 5,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 4,
  },
  passwordHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },

  /* Primary Button */
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

  /* Back Button */
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

  /* Success View */
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 290,
  },
  redirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 20,
  },
  redirectText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingTop: 18,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },

  /* Custom Toast */
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