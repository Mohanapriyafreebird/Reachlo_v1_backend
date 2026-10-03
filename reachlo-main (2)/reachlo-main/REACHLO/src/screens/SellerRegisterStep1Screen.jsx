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
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import Toast from '../components/Toast';


// -----------------------------------------------------
// COLORS
// -----------------------------------------------------

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PURPLE_LIGHT = '#F3EEFF';
const PURPLE_SOFT = '#FAF7FF';

const TEXT_PRIMARY = '#171329';
const TEXT_SECONDARY = '#6B647D';
const TEXT_MUTED = '#9690A3';

const BORDER = '#E8E2F2';
const INPUT_BG = '#FBFAFD';
const ERROR = '#DC2626';


// -----------------------------------------------------
// STEP INDICATOR
// -----------------------------------------------------

function StepIndicator() {
  return (
    <View style={styles.stepIndicator}>

      {/* Step 1 */}
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleActive]}>
          <Text style={styles.stepNumberActive}>1</Text>
        </View>

        <Text style={styles.stepLabelActive}>
          Personal
        </Text>
      </View>

      {/* Connector */}
      <View style={styles.stepConnector} />

      {/* Step 2 */}
      <View style={styles.stepItem}>
        <View style={styles.stepCircleInactive}>
          <Text style={styles.stepNumberInactive}>2</Text>
        </View>

        <Text style={styles.stepLabelInactive}>
          Business
        </Text>
      </View>

    </View>
  );
}


// -----------------------------------------------------
// INPUT COMPONENT
// -----------------------------------------------------

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType = 'next',
  onSubmitEditing,
  secureTextEntry = false,
  rightElement,
  leftElement,
  maxLength,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>

      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >

        {leftElement && (
          <View style={styles.leftElement}>
            {leftElement}
          </View>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#AAA3B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          style={styles.textInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={PURPLE}
        />

        {rightElement && (
          <View style={styles.rightElement}>
            {rightElement}
          </View>
        )}

      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={ERROR}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

    </View>
  );
}


// -----------------------------------------------------
// PASSWORD STRENGTH
// -----------------------------------------------------

function PasswordStrength({ password }) {
  if (!password) return null;

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Weak';

  if (score === 2) label = 'Fair';
  if (score === 3) label = 'Good';
  if (score === 4) label = 'Strong';

  return (
    <View style={styles.strengthContainer}>

      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.strengthBar,
              bar <= score && styles.strengthBarActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.strengthText}>
        Password strength: {label}
      </Text>

    </View>
  );
}


// -----------------------------------------------------
// MAIN SCREEN
// -----------------------------------------------------

export default function SellerRegisterStep1Screen({ navigation }) {

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const scrollRef = useRef(null);


  // ---------------------------------------------------
  // TOAST
  // ---------------------------------------------------

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };


  // ---------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------

  const validate = () => {

    const errs = {};

    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters';
    }

    const numericPhone = phone.replace(/[^0-9]/g, '');

    if (!phone) {
      errs.phone = 'Phone number is required';
    } else if (numericPhone.length !== 10) {
      errs.phone = 'Phone number must be exactly 10 digits';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    setErrors(errs);

    return Object.keys(errs).length === 0;
  };


  // ---------------------------------------------------
  // CONTINUE
  // ---------------------------------------------------

  const handleContinue = () => {

    Keyboard.dismiss();

    if (!validate()) {
      showToast(
        'Please fix the highlighted fields before continuing.',
        'error'
      );
      return;
    }

    navigation.navigate('SellerRegisterStep2', {
      step1Data: {
        name: name.trim(),
        phone: phone.replace(/[^0-9]/g, ''),
        email: email.trim().toLowerCase(),
        password,
      },
    });
  };


  // ---------------------------------------------------
  // CLEAR ERROR
  // ---------------------------------------------------

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: null,
      }));
    }
  };


  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>

      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE_DARK}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >

            {/* ==========================================
                PURPLE HEADER
            ========================================== */}

            <LinearGradient
              colors={[
                '#6D28D9',
                '#7C3AED',
                '#8B5CF6',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >

              {/* Decorative circles */}
              <View style={styles.decorCircleOne} />
              <View style={styles.decorCircleTwo} />

              {/* Logo */}
              <Text style={styles.logo}>
                REACHLO
              </Text>

              <Text style={styles.headerTitle}>
                Create your account
              </Text>

              <Text style={styles.headerSubtitle}>
                Start growing your business with REACHLO
              </Text>

              {/* Step indicator */}
              <StepIndicator />

            </LinearGradient>


            {/* ==========================================
                FORM CARD
            ========================================== */}

            <View style={styles.formCard}>

              {/* Card heading */}

              <View style={styles.cardHeader}>

                <View style={styles.cardIcon}>
                  <Ionicons
                    name="person-outline"
                    size={21}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>
                    Personal details
                  </Text>

                  <Text style={styles.cardSubtitle}>
                    Tell us a little about yourself
                  </Text>
                </View>

              </View>


              {/* ========================================
                  FULL NAME
              ======================================== */}

              <View>
                <FormInput
                  label="Full name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearError('name');
                  }}
                  placeholder="e.g. Priya Sharma"
                  error={errors.name}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>


              {/* ========================================
                  PHONE
              ======================================== */}

              <FormInput
                label="Phone number"
                value={phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');

                  setPhone(cleaned);
                  clearError('phone');
                }}
                placeholder="XXXXX XXXXX"
                error={errors.phone}
                keyboardType="phone-pad"
                maxLength={10}
                leftElement={
                  <Text style={styles.phonePrefix}>
                    +91
                  </Text>
                }
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />


              {/* ========================================
                  EMAIL
              ======================================== */}

              <FormInput
                label="Email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                placeholder="you@example.com"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />


              {/* ========================================
                  PASSWORD
              ======================================== */}

              <View style={styles.inputGroup}>

                <Text style={styles.inputLabel}>
                  Password
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    errors.password && styles.inputContainerError,
                  ]}
                >

                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError('password');
                    }}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor="#AAA3B8"
                    secureTextEntry={!showPassword}
                    style={styles.textInput}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    selectionColor={PURPLE}
                  />

                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordToggle}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={21}
                      color={PURPLE}
                    />
                  </Pressable>

                </View>

                <PasswordStrength password={password} />

                {errors.password ? (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={ERROR}
                    />

                    <Text style={styles.errorText}>
                      {errors.password}
                    </Text>
                  </View>
                ) : null}

              </View>


              {/* ========================================
                  SECURITY NOTE
              ======================================== */}

              <View style={styles.securityNote}>

                <View style={styles.securityIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={PURPLE}
                  />
                </View>

                <Text style={styles.securityText}>
                  Your information is securely protected and
                  will only be used to create your REACHLO account.
                </Text>

              </View>


              {/* ========================================
                  CONTINUE BUTTON
              ======================================== */}

              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && styles.buttonPressed,
                ]}
              >

                <LinearGradient
                  colors={[
                    '#7C3AED',
                    '#6D28D9',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueGradient}
                >

                  <Text style={styles.continueText}>
                    Continue
                  </Text>

                  <View style={styles.arrowCircle}>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={PURPLE}
                    />
                  </View>

                </LinearGradient>

              </Pressable>


              {/* ========================================
                  LOGIN
              ======================================== */}

              <View style={styles.loginRow}>

                <Text style={styles.loginText}>
                  Already have an account?
                </Text>

                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  hitSlop={8}
                >
                  <Text style={styles.loginLink}>
                    Log in
                  </Text>
                </Pressable>

              </View>

            </View>

          </ScrollView>

        </TouchableWithoutFeedback>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: PURPLE_DARK,
  },

  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F9F8FC',
  },

  scrollContent: {
    paddingBottom: 40,
    backgroundColor: '#F9F8FC',
  },


  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------

  header: {
    minHeight: 330,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 72,
    alignItems: 'center',
    overflow: 'hidden',
  },

  decorCircleOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -100,
    right: -70,
  },

  decorCircleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -85,
    left: -70,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 5,
    marginBottom: 24,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: FONT_WEIGHTS.BOLD,
    textAlign: 'center',
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },


  // ---------------------------------------------------
  // STEPS
  // ---------------------------------------------------

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 27,
  },

  stepItem: {
    alignItems: 'center',
    minWidth: 70,
  },

  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepCircleActive: {
    backgroundColor: '#FFFFFF',
  },

  stepCircleInactive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.48)',
  },

  stepNumberActive: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
  },

  stepNumberInactive: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },

  stepLabelActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },

  stepLabelInactive: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },

  stepConnector: {
    width: 55,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.32)',
    marginHorizontal: 7,
    marginBottom: 20,
  },


  // ---------------------------------------------------
  // FORM CARD
  // ---------------------------------------------------

  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: -48,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 27,

    borderWidth: 1,
    borderColor: '#EEEAF4',

    shadowColor: '#3B176D',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
  },


  // ---------------------------------------------------
  // CARD HEADER
  // ---------------------------------------------------

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  cardIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  cardSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12.5,
    marginTop: 3,
  },


  // ---------------------------------------------------
  // INPUTS
  // ---------------------------------------------------

  inputGroup: {
    marginBottom: 19,
  },

  inputLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 55,
    borderRadius: 15,
    borderWidth: 1.3,
    borderColor: BORDER,
    backgroundColor: INPUT_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  inputContainerFocused: {
    borderColor: PURPLE,
    backgroundColor: '#FFFFFF',
  },

  inputContainerError: {
    borderColor: ERROR,
    backgroundColor: '#FFF9F9',
  },

  textInput: {
    flex: 1,
    height: 53,
    color: TEXT_PRIMARY,
    fontSize: 14.5,
    paddingVertical: 0,
  },

  leftElement: {
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#DED7E8',
    height: 25,
    justifyContent: 'center',
  },

  rightElement: {
    marginLeft: 8,
  },

  phonePrefix: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },


  // ---------------------------------------------------
  // PASSWORD
  // ---------------------------------------------------

  passwordToggle: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  strengthContainer: {
    marginTop: 7,
  },

  strengthBars: {
    flexDirection: 'row',
    gap: 5,
  },

  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E8E3EE',
  },

  strengthBarActive: {
    backgroundColor: PURPLE,
  },

  strengthText: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    marginTop: 5,
  },


  // ---------------------------------------------------
  // ERROR
  // ---------------------------------------------------

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },

  errorText: {
    color: ERROR,
    fontSize: 11.5,
    flex: 1,
  },


  // ---------------------------------------------------
  // SECURITY
  // ---------------------------------------------------

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8FF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#EEE8FA',
    padding: 12,
    marginTop: 1,
    marginBottom: 20,
  },

  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEE7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  securityText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 10.5,
    lineHeight: 16,
  },


  // ---------------------------------------------------
  // BUTTON
  // ---------------------------------------------------

  continueButton: {
    height: 55,
    borderRadius: 16,
    overflow: 'hidden',

    shadowColor: PURPLE,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  continueGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginRight: 10,
  },

  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },


  // ---------------------------------------------------
  // LOGIN
  // ---------------------------------------------------

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },

  loginText: {
    color: TEXT_SECONDARY,
    fontSize: 13.5,
    marginRight: 5,
  },

  loginLink: {
    color: PURPLE,
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

});