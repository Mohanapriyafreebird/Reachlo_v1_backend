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
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import apiService from '../services/apiService';


/* =========================================================
   FORGOT PASSWORD SCREEN
   ========================================================= */

export default function ForgotPasswordScreen({ navigation }) {

  const { isDarkMode } = useTheme();

  const [step, setStep] = useState(1);
  // 1 = enter email (sends OTP)
  // 2 = enter OTP
  // 3 = create new password
  // 4 = success

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const successScaleAnim = useRef(
    new Animated.Value(0.7)
  ).current;


  /* =========================================================
     THEME
     ========================================================= */

  const colors = isDarkMode
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
    }, 3000);
  };


  /* =========================================================
     EMAIL VALIDATION
     ========================================================= */

  const validateEmail = () => {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setErrors({
        email: 'Email address is required',
      });

      return false;
    }

    if (!emailRegex.test(email.trim())) {
      setErrors({
        email: 'Please enter a valid email address',
      });

      return false;
    }

    return true;
  };


  /* =========================================================
     CHECK EMAIL
     ========================================================= */

  const handleCheckEmail = async () => {

    if (!validateEmail()) {
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);

    try {
      // Step 1: request OTP — backend sends it to the user's email
      await apiService.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      // Always move to OTP entry step (backend returns same msg whether email exists or not)
      showToast('OTP sent to your email address.', 'success');
      setStep(2);

    } catch (err) {
      const msg = err?.message || '';
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes('too many') || lowerMsg.includes('429')) {
        showToast('Too many attempts. Please wait before trying again.', 'error');
      } else if (lowerMsg.includes('could not send') || lowerMsg.includes('503')) {
        showToast('Could not send OTP email. Please try again later.', 'error');
      } else {
        showToast(msg || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     VERIFY OTP
     ========================================================= */

  const handleVerifyOTP = async () => {

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP sent to your email.' });
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);

    try {
      const response = await apiService.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      // Store the reset token returned from the backend
      setResetToken(response.reset_token);
      setStep(3);

    } catch (err) {
      const msg = err?.message || '';
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes('too many') || lowerMsg.includes('429')) {
        setErrors({ otp: 'Too many incorrect attempts. Please request a new OTP.' });
        showToast('OTP locked. Please request a new one.', 'error');
      } else if (lowerMsg.includes('expired')) {
        setErrors({ otp: 'OTP has expired. Please request a new one.' });
        showToast('OTP expired. Going back to email step.', 'error');
        setTimeout(() => setStep(1), 1500);
      } else {
        setErrors({ otp: msg || 'Incorrect OTP. Please try again.' });
        showToast(msg || 'Incorrect OTP.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     PASSWORD STRENGTH
     ========================================================= */

  const getPasswordStrength = () => {

    if (!newPassword) {
      return {
        score: 0,
        label: '',
      };
    }

    let score = 0;

    if (newPassword.length >= 8) {
      score++;
    }

    if (/[A-Z]/.test(newPassword)) {
      score++;
    }

    if (/[0-9]/.test(newPassword)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(newPassword)) {
      score++;
    }

    if (score <= 1) {
      return {
        score,
        label: 'Weak',
      };
    }

    if (score === 2) {
      return {
        score,
        label: 'Fair',
      };
    }

    if (score === 3) {
      return {
        score,
        label: 'Good',
      };
    }

    return {
      score,
      label: 'Strong',
    };
  };


  const passwordStrength = getPasswordStrength();


  /* =========================================================
     RESET PASSWORD
     ========================================================= */

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
      // Step 3: reset password using the reset token from OTP verification
      await apiService.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      });

      setStep(4);

      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        navigation.replace('Login');
      }, 2200);

    } catch (error) {
      const msg = error?.message || '';
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes('invalid or has expired') || lowerMsg.includes('reset token')) {
        showToast('Session expired. Please start over.', 'error');
        setTimeout(() => setStep(1), 1500);
      } else {
        showToast(msg || 'Could not reset password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     CLEAR ERROR
     ========================================================= */

  const clearError = field => {

    setErrors(prev => ({
      ...prev,
      [field]: null,
    }));
  };


  /* =========================================================
     INPUT COMPONENT
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

        <Text
          style={[
            styles.fieldLabel,
            {
              color: colors.text,
            },
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.input,
              borderColor: error
                ? colors.error
                : colors.border,
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
            secureTextEntry={
              secureTextEntry && !showValue
            }
            style={[
              styles.textInput,
              {
                color: colors.text,
              },
            ]}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
          />

          {showToggle && (
            <Pressable
              onPress={onToggle}
              style={styles.eyeButton}
              hitSlop={10}
            >
              <Ionicons
                name={
                  showValue
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={21}
                color={colors.textSecondary}
              />
            </Pressable>
          )}

        </View>

        {error ? (
          <View style={styles.errorRow}>

            <Ionicons
              name="alert-circle-outline"
              size={15}
              color={colors.error}
            />

            <Text
              style={[
                styles.errorText,
                {
                  color: colors.error,
                },
              ]}
            >
              {error}
            </Text>

          </View>
        ) : null}

      </View>
    );
  };


  /* =========================================================
     STEP INDICATOR
     ========================================================= */

  const renderStepIndicator = () => {

    return (
      <View style={styles.stepContainer}>

        {/* Step 1: Email */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  step >= 1
                    ? colors.primary
                    : colors.primarySoft,
              },
            ]}
          >
            {step > 1 ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, { color: colors.white }]}>1</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              { color: step >= 1 ? colors.text : colors.textMuted },
            ]}
          >
            Email
          </Text>
        </View>

        <View
          style={[
            styles.stepLine,
            { backgroundColor: step >= 2 ? colors.primary : colors.border },
          ]}
        />

        {/* Step 2: OTP */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  step >= 2
                    ? colors.primary
                    : colors.primarySoft,
              },
            ]}
          >
            {step > 2 ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  { color: step >= 2 ? colors.white : colors.textMuted },
                ]}
              >
                2
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              { color: step >= 2 ? colors.text : colors.textMuted },
            ]}
          >
            OTP
          </Text>
        </View>

        <View
          style={[
            styles.stepLine,
            { backgroundColor: step >= 3 ? colors.primary : colors.border },
          ]}
        />

        {/* Step 3: New Password */}
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  step >= 3
                    ? colors.primary
                    : colors.primarySoft,
              },
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                { color: step >= 3 ? colors.white : colors.textMuted },
              ]}
            >
              3
            </Text>
          </View>
          <Text
            style={[
              styles.stepText,
              { color: step >= 3 ? colors.text : colors.textMuted },
            ]}
          >
            Password
          </Text>
        </View>

      </View>
    );
  };


  /* =========================================================
     HERO
     ========================================================= */

  const renderHero = () => {

    return (
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.headerTop,
          },
        ]}
      >

        <View
          style={[
            styles.heroGlowOne,
            {
              backgroundColor: colors.primary,
            },
          ]}
        />

        <View
          style={[
            styles.heroGlowTwo,
            {
              backgroundColor: '#7C3AED',
            },
          ]}
        />

        <View style={styles.heroContent}>

          <View style={styles.logoRow}>

            <View
              style={[
                styles.logoIcon,
                {
                  backgroundColor:
                    'rgba(255,255,255,0.16)',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.logoText}>
              REACHLO
            </Text>

          </View>


          <Text style={styles.heroTitle}>
            Reset Password
          </Text>

          <Text style={styles.heroSubtitle}>
            Secure your account with a new password
          </Text>

        </View>

      </View>
    );
  };


  /* =========================================================
     SUCCESS
     ========================================================= */

  const renderSuccess = () => {

    return (
      <Animated.View
        style={[
          styles.successContainer,
          {
            transform: [
              {
                scale: successScaleAnim,
              },
            ],
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
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={colors.success}
          />
        </View>

        <Text
          style={[
            styles.successTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Password Reset Successfully
        </Text>

        <Text
          style={[
            styles.successSubtitle,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Your password has been updated successfully.
        </Text>

        <View
          style={[
            styles.redirectPill,
            {
              backgroundColor: colors.primarySoft,
            },
          ]}
        >

          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text
            style={[
              styles.redirectText,
              {
                color: colors.primary,
              },
            ]}
          >
            Redirecting to login...
          </Text>

        </View>

      </Animated.View>
    );
  };


  /* =========================================================
     MAIN CONTENT
     ========================================================= */

  const renderContent = () => {

    if (step === 4) {
      return renderSuccess();
    }

    return (
      <>

        {renderStepIndicator()}


        {step === 1 ? (

          <>

            <View style={styles.introBlock}>

              <View
                style={[
                  styles.introIcon,
                  {
                    backgroundColor:
                      colors.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={styles.introTextContainer}>

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Verify your email
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Enter the email address linked to
                  your Reachlo account.
                </Text>

              </View>

            </View>


            {renderInput({
              label: 'Registered Email Address',
              value: email,
              onChangeText: text => {
                setEmail(text);

                if (errors.email) {
                  clearError('email');
                }
              },
              placeholder: 'name@example.com',
              error: errors.email,
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              returnKeyType: 'continue',
              onSubmitEditing: handleCheckEmail,
            })}


            <Pressable
              onPress={handleCheckEmail}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor:
                    loading
                      ? colors.primaryDark
                      : colors.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >

              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    Continue
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
                </>
              )}

            </Pressable>


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
                style={[
                  styles.backButtonText,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                Back to Login
              </Text>

            </Pressable>

          </>

        ) : step === 2 ? (

          /* ── STEP 2: Enter OTP ── */
          <>

            <View style={styles.introBlock}>
              <View
                style={[
                  styles.introIcon,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Ionicons
                  name="keypad-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.introTextContainer}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text },
                  ]}
                >
                  Enter your OTP
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  We sent a 6-digit code to{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {email}
                  </Text>
                  . Check your inbox (and spam folder).
                </Text>
              </View>
            </View>


            {renderInput({
              label: 'One-Time Password (OTP)',
              value: otp,
              onChangeText: text => {
                setOtp(text.replace(/[^0-9]/g, ''));
                if (errors.otp) clearError('otp');
              },
              placeholder: '6-digit OTP',
              error: errors.otp,
              keyboardType: 'number-pad',
              maxLength: 6,
              returnKeyType: 'done',
              onSubmitEditing: handleVerifyOTP,
            })}


            <Pressable
              onPress={handleVerifyOTP}
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
                  <Text style={styles.primaryButtonText}>Verify OTP</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </Pressable>


            {/* Resend OTP */}
            <Pressable
              onPress={() => {
                setOtp('');
                setErrors({});
                setStep(1);
              }}
              style={styles.backButton}
              disabled={loading}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>
                Resend OTP
              </Text>
            </Pressable>

          </>

        ) : (

          <>

            <View style={styles.introBlock}>

              <View
                style={[
                  styles.introIcon,
                  {
                    backgroundColor:
                      colors.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={styles.introTextContainer}>

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Create a new password
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Choose a strong password that you
                  haven't used before.
                </Text>

              </View>

            </View>


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
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {email}
              </Text>

            </View>


            {renderInput({
              label: 'New Password',
              value: newPassword,
              onChangeText: text => {
                setNewPassword(text);

                if (errors.newPassword) {
                  clearError('newPassword');
                }
              },
              placeholder: 'At least 8 characters',
              error: errors.newPassword,
              secureTextEntry: true,
              showToggle: true,
              showValue: showPassword,
              onToggle: () =>
                setShowPassword(prev => !prev),
              returnKeyType: 'next',
            })}


            {/* PASSWORD STRENGTH */}

            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>

                <View style={styles.strengthHeader}>

                  <Text
                    style={[
                      styles.strengthTitle,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
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
                            index <=
                            passwordStrength.score
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


                <Text
                  style={[
                    styles.passwordHint,
                    {
                      color: colors.textMuted,
                    },
                  ]}
                >
                  Use 8+ characters with uppercase,
                  numbers and symbols for a stronger
                  password.
                </Text>

              </View>
            )}


            {renderInput({
              label: 'Confirm New Password',
              value: confirmPassword,
              onChangeText: text => {
                setConfirmPassword(text);

                if (errors.confirmPassword) {
                  clearError('confirmPassword');
                }
              },
              placeholder: 'Re-enter your new password',
              error: errors.confirmPassword,
              secureTextEntry: true,
              showToggle: true,
              showValue: showConfirmPassword,
              onToggle: () =>
                setShowConfirmPassword(
                  prev => !prev
                ),
              returnKeyType: 'done',
              onSubmitEditing: handleResetPassword,
            })}


            <Pressable
              onPress={handleResetPassword}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor:
                    loading
                      ? colors.primaryDark
                      : colors.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >

              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    Save New Password
                  </Text>

                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#FFFFFF"
                  />
                </>
              )}

            </Pressable>


            <Pressable
              onPress={() => {
                setStep(1);
                setErrors({});
              }}
              style={styles.backButton}
              disabled={loading}
            >

              <Ionicons
                name="arrow-back"
                size={18}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.backButtonText,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                Change Email
              </Text>

            </Pressable>

          </>

        )}

      </>
    );
  };


  /* =========================================================
     RETURN
     ========================================================= */

  return (

    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}
    >

      <StatusBar
        barStyle={
          isDarkMode
            ? 'light-content'
            : 'light-content'
        }
        backgroundColor={colors.headerTop}
      />


      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.keyboardView}
      >

        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
        >

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.scrollContent
            }
          >

            {renderHero()}


            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >

              {renderContent()}

            </View>


            <View style={styles.footer}>

              <View
                style={[
                  styles.secureBadge,
                  {
                    backgroundColor:
                      colors.primarySoft,
                  },
                ]}
              >

                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.secureText,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Your account information is secure
                </Text>

              </View>

            </View>

          </ScrollView>

        </TouchableWithoutFeedback>

      </KeyboardAvoidingView>


      {/* =====================================================
          CUSTOM TOAST
          ===================================================== */}

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
                toast.type === 'error'
                  ? colors.error
                  : colors.border,
            },
          ]}
        >

          <Ionicons
            name={
              toast.type === 'error'
                ? 'alert-circle'
                : 'information-circle'
            }
            size={20}
            color={
              toast.type === 'error'
                ? colors.error
                : colors.primary
            }
          />

          <Text
            style={[
              styles.toastText,
              {
                color: colors.text,
              },
            ]}
          >
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


  /* =======================================================
     HERO
     ======================================================= */

  hero: {
    minHeight: 250,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 72,
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
    marginBottom: 18,
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
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.7,
    marginBottom: 8,
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 310,
  },


  /* =======================================================
     CARD
     ======================================================= */

  card: {
    marginHorizontal: 18,
    marginTop: -42,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 26,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },


  /* =======================================================
     STEP INDICATOR
     ======================================================= */

  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 6,
  },

  stepItem: {
    alignItems: 'center',
    minWidth: 68,
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
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
    marginHorizontal: 8,
    marginBottom: 22,
  },


  /* =======================================================
     INTRO
     ======================================================= */

  introBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  introIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  introTextContainer: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: 3,
  },

  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },


  /* =======================================================
     INPUT
     ======================================================= */

  fieldContainer: {
    marginBottom: 18,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.1,
  },

  inputWrapper: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  textInput: {
    flex: 1,
    minHeight: 56,
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
    marginTop: 7,
    paddingHorizontal: 2,
  },

  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
    flex: 1,
  },


  /* =======================================================
     ACCOUNT PILL
     ======================================================= */

  accountPill: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  accountText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },


  /* =======================================================
     PASSWORD STRENGTH
     ======================================================= */

  strengthContainer: {
    marginTop: -5,
    marginBottom: 19,
  },

  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 8,
  },


  /* =======================================================
     PRIMARY BUTTON
     ======================================================= */

  primaryButton: {
    minHeight: 58,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 5,

    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 5,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
  },


  /* =======================================================
     BACK BUTTON
     ======================================================= */

  backButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
  },


  /* =======================================================
     SUCCESS
     ======================================================= */

  successContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },

  successIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  successTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  successSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 290,
  },

  redirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 22,
  },

  redirectText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },


  /* =======================================================
     FOOTER
     ======================================================= */

  footer: {
    alignItems: 'center',
    paddingTop: 18,
  },

  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  secureText: {
    fontSize: 10.5,
    fontWeight: '600',
    marginLeft: 6,
  },


  /* =======================================================
     TOAST
     ======================================================= */

  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 25,

    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 15,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 7,
  },

  toastText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 9,
  },

});