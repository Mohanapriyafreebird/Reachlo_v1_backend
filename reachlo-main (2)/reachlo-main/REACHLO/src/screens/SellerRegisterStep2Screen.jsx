import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { FONT_WEIGHTS } from '../constants/typography';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';


// =====================================================
// COLORS
// =====================================================

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PURPLE_LIGHT = '#F3EEFF';

const TEXT_PRIMARY = '#171329';
const TEXT_SECONDARY = '#6B647D';
const TEXT_MUTED = '#9690A3';

const BORDER = '#E8E2F2';
const INPUT_BG = '#FBFAFD';

const ERROR = '#DC2626';


// =====================================================
// STEP INDICATOR
// =====================================================

function StepIndicator() {
  return (
    <View style={styles.stepIndicator}>

      {/* Step 1 - completed */}

      <View style={styles.stepItem}>

        <View style={styles.stepCircleCompleted}>
          <Ionicons
            name="checkmark"
            size={18}
            color={PURPLE}
          />
        </View>

        <Text style={styles.stepLabelCompleted}>
          Personal
        </Text>

      </View>


      {/* Connector */}

      <View style={styles.stepConnectorActive} />


      {/* Step 2 */}

      <View style={styles.stepItem}>

        <View style={styles.stepCircleActive}>
          <Text style={styles.stepNumberActive}>
            2
          </Text>
        </View>

        <Text style={styles.stepLabelActive}>
          Business
        </Text>

      </View>

    </View>
  );
}


// =====================================================
// FORM INPUT
// =====================================================

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  autoCapitalize = 'sentences',
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
          multiline && styles.textAreaContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#AAA3B8"
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={autoCapitalize}
          editable={true}
          style={[
            styles.textInput,
            multiline && styles.textAreaInput,
          ]}
          selectionColor={PURPLE}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

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


// =====================================================
// MAIN SCREEN
// =====================================================

export default function SellerRegisterStep2Screen({
  route,
  navigation,
}) {

  const { step1Data } = route.params || {};

  const { register } = useAuth();


  // ---------------------------------------------------
  // FORM STATE
  // ---------------------------------------------------

  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [usp, setUsp] = useState('');


  // ---------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------

  const [errors, setErrors] = useState({});


  // ---------------------------------------------------
  // LOADING
  // ---------------------------------------------------

  const [loading, setLoading] = useState(false);


  // ---------------------------------------------------
  // USP NUDGE
  // ---------------------------------------------------

  const [showUspNudge, setShowUspNudge] = useState(false);
  const [uspNudgeDismissed, setUspNudgeDismissed] = useState(false);


  // ---------------------------------------------------
  // TOAST
  // ---------------------------------------------------

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');


  // ---------------------------------------------------
  // REFS
  // ---------------------------------------------------

  const scrollRef = useRef(null);
  const layouts = useRef({});


  // ---------------------------------------------------
  // TOAST
  // ---------------------------------------------------

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };


  // ---------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------

  const handleLayout = (field, event) => {
    layouts.current[field] = event.nativeEvent.layout.y;
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
  // VALIDATE
  // ---------------------------------------------------

  const validate = () => {

    const errs = {};


    if (!businessName.trim()) {
      errs.businessName =
        'Business or company name is required';
    }


    if (!businessDescription.trim()) {

      errs.businessDescription =
        'Please describe what your business provides';

    } else if (businessDescription.trim().length < 20) {

      errs.businessDescription =
        'Please write at least 20 characters';

    }


    setErrors(errs);


    // Optional USP suggestion

    if (!usp.trim() && !uspNudgeDismissed) {
      setShowUspNudge(true);
    }


    // Scroll to first error

    const firstError = Object.keys(errs)[0];

    if (
      firstError &&
      layouts.current[firstError] !== undefined &&
      scrollRef.current
    ) {

      scrollRef.current.scrollTo({
        y: Math.max(
          0,
          layouts.current[firstError] - 20
        ),
        animated: true,
      });

    }


    return Object.keys(errs).length === 0;
  };


  // ---------------------------------------------------
  // CREATE ACCOUNT
  // ---------------------------------------------------

  const handleCreateAccount = async () => {

    Keyboard.dismiss();

    if (!validate()) {
      return;
    }


    if (showUspNudge) {
      setShowUspNudge(false);
    }


    setLoading(true);


    try {

      /*
       * IMPORTANT:
       * Step 1 and Step 2 are submitted together.
       */

      const registrationPayload = {

        // Step 1
        name: step1Data?.name,
        email: step1Data?.email,
        phone: step1Data?.phone,
        password: step1Data?.password,

        role: 'SELLER',

        city: step1Data?.city || 'Unknown',


        // Step 2
        company_name: businessName.trim(),

        business_description:
          businessDescription.trim(),

        usp: usp.trim() || null,
      };


      const response = await register(
        registrationPayload
      );


      if (response.role === 'SELLER') {

        navigation.replace('SellerDashboard');

      } else {

        navigation.replace('DiscoveryFeed');

      }

    } catch (err) {

      const msg = err?.message || '';

      const lowerMsg = msg.toLowerCase();


      if (lowerMsg.includes('email')) {

        showToast(
          'This email address is already registered. Please go back and use a different email.',
          'error'
        );

      } else if (
        lowerMsg.includes('mobile') ||
        lowerMsg.includes('phone') ||
        lowerMsg.includes('number')
      ) {

        showToast(
          'This mobile number is already registered. Please go back and use a different number.',
          'error'
        );

      } else {

        showToast(
          msg || 'Registration failed. Please try again.',
          'error'
        );

      }

    } finally {

      setLoading(false);

    }
  };


  // ===================================================
  // UI
  // ===================================================

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
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.keyboardContainer}
      >

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >


          {/* ==========================================
              HEADER
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


            {/* Back */}

            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={10}
            >

              <Ionicons
                name="arrow-back"
                size={22}
                color="#FFFFFF"
              />

            </Pressable>


            {/* Logo */}

            <Text style={styles.logo}>
              REACHLO
            </Text>


            {/* Title */}

            <Text style={styles.headerTitle}>
              Tell us about your business
            </Text>

            <Text style={styles.headerSubtitle}>
              Complete your business profile to finish registration
            </Text>


            {/* Steps */}

            <StepIndicator />

          </LinearGradient>


          {/* ==========================================
              FORM CARD
          ========================================== */}

          <View style={styles.formCard}>


            {/* Card Header */}

            <View style={styles.cardHeader}>

              <View style={styles.cardIcon}>
                <Ionicons
                  name="business-outline"
                  size={22}
                  color={PURPLE}
                />
              </View>

              <View style={styles.cardHeaderText}>

                <Text style={styles.cardTitle}>
                  Business details
                </Text>

                

              </View>

            </View>


            {/* ========================================
                BUSINESS NAME
            ======================================== */}

            <View
              onLayout={(event) =>
                handleLayout(
                  'businessName',
                  event
                )
              }
            >

              <FormInput
                label={
                  <>
                    Business or company name{' '}
                    <Text style={styles.required}>
                      *
                    </Text>
                  </>
                }
                value={businessName}
                onChangeText={(text) => {
                  setBusinessName(text);
                  clearError('businessName');
                }}
                placeholder="e.g. QuickFix IT Solutions"
                error={errors.businessName}
                autoCapitalize="words"
              />

            </View>


            {/* ========================================
                DESCRIPTION
            ======================================== */}

            <View
              onLayout={(event) =>
                handleLayout(
                  'businessDescription',
                  event
                )
              }
            >

              <FormInput
                label={
                  <>
                    What does your business provide?{' '}
                    <Text style={styles.required}>
                      *
                    </Text>
                  </>
                }
                value={businessDescription}
                onChangeText={(text) => {
                  setBusinessDescription(text);
                  clearError('businessDescription');
                }}
                placeholder={
                  'Describe your products or services in a few sentences.'
                }
                error={errors.businessDescription}
                multiline
                numberOfLines={5}
              />

              <View style={styles.helperRow}>

                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={PURPLE}
                />

                <Text style={styles.helperText}>
                  Write naturally — our AI uses this to understand your business.
                </Text>

              </View>

            </View>


            {/* ========================================
                USP
            ======================================== */}

            <View
              onLayout={(event) =>
                handleLayout(
                  'usp',
                  event
                )
              }
            >

              <FormInput
                label={
                  <>
                    What makes you different?{' '}
                    <Text style={styles.optionalText}>
                      Optional
                    </Text>
                  </>
                }
                value={usp}
                onChangeText={(text) => {

                  setUsp(text);

                  if (showUspNudge) {
                    setShowUspNudge(false);
                  }

                }}
                placeholder={
                  'e.g. Same-day service, personalised support, free delivery...'
                }
                multiline
                numberOfLines={4}
              />

              <Text style={styles.helperTextPlain}>
                A strong USP helps your AI create more specific campaigns.
              </Text>

            </View>


            {/* ========================================
                USP NUDGE
            ======================================== */}

            {showUspNudge && !uspNudgeDismissed && (

              <View style={styles.uspNudge}>

                <View style={styles.nudgeIcon}>

                  <Ionicons
                    name="bulb-outline"
                    size={18}
                    color="#B45309"
                  />

                </View>


                <View style={styles.nudgeContent}>

                  <Text style={styles.nudgeTitle}>
                    Make your campaigns more specific
                  </Text>

                  <Text style={styles.nudgeText}>
                    Adding your USP helps AI understand what makes your business special.
                  </Text>


                  <View style={styles.nudgeActions}>

                    <Pressable
                      onPress={() => {

                        setShowUspNudge(false);

                        scrollRef.current?.scrollTo({
                          y:
                            layouts.current.usp ||
                            0,
                          animated: true,
                        });

                      }}
                    >

                      <Text style={styles.nudgePrimary}>
                        Add USP
                      </Text>

                    </Pressable>


                    <Pressable
                      onPress={() => {

                        setShowUspNudge(false);

                        setUspNudgeDismissed(true);

                        setTimeout(
                          () =>
                            handleCreateAccount(),
                          50
                        );

                      }}
                    >

                      <Text style={styles.nudgeSecondary}>
                        Skip for now
                      </Text>

                    </Pressable>

                  </View>

                </View>

              </View>

            )}


            {/* ========================================
                PROGRESS NOTE
            ======================================== */}

            <View style={styles.finishNote}>

              <View style={styles.finishIcon}>

                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={PURPLE}
                />

              </View>

              <View style={styles.finishTextContainer}>

                <Text style={styles.finishTitle}>
                  Almost there!
                </Text>

                <Text style={styles.finishSubtitle}>
                  Your account will be created after you submit these details.
                </Text>

              </View>

            </View>


            {/* ========================================
                CREATE ACCOUNT BUTTON
            ======================================== */}

            <Pressable
              onPress={handleCreateAccount}
              disabled={loading}
              style={({ pressed }) => [
                styles.createButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >

              <LinearGradient
                colors={[
                  '#7C3AED',
                  '#6D28D9',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >

                {loading ? (

                  <Text style={styles.createText}>
                    Creating account...
                  </Text>

                ) : (

                  <>
                    <Text style={styles.createText}>
                      Create Account
                    </Text>

                    <View style={styles.arrowCircle}>

                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color={PURPLE}
                      />

                    </View>
                  </>

                )}

              </LinearGradient>

            </Pressable>


            {/* Bottom note */}

            <Text style={styles.bottomNote}>
              By creating an account, you agree to use REACHLO responsibly.
            </Text>


          </View>

        </ScrollView>

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
    minHeight: 345,
    paddingTop: 27,
    paddingHorizontal: 24,
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
    top: -105,
    right: -70,
  },

  decorCircleTwo: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 88,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -90,
    left: -75,
  },

  backButton: {
    position: 'absolute',
    top: 24,
    left: 20,

    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: 'rgba(255,255,255,0.14)',

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 5,
    marginBottom: 23,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: FONT_WEIGHTS.BOLD,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 310,
  },


  // ---------------------------------------------------
  // STEPS
  // ---------------------------------------------------

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
  },

  stepItem: {
    alignItems: 'center',
    minWidth: 70,
  },

  stepCircleCompleted: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepCircleActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepNumberActive: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
  },

  stepLabelCompleted: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },

  stepLabelActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },

  stepConnectorActive: {
    width: 55,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
    marginHorizontal: 7,
    marginBottom: 20,
  },


  // ---------------------------------------------------
  // CARD
  // ---------------------------------------------------

  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: -50,

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
    width: 46,
    height: 46,
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
    lineHeight: 18,
    marginTop: 3,
  },


  // ---------------------------------------------------
  // INPUT
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

  required: {
    color: ERROR,
  },

  optionalText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500',
  },

  inputContainer: {
    minHeight: 56,
    borderRadius: 15,

    borderWidth: 1.3,
    borderColor: BORDER,

    backgroundColor: INPUT_BG,

    paddingHorizontal: 15,

    justifyContent: 'center',
  },

  textAreaContainer: {
    minHeight: 112,
    paddingVertical: 12,
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
    color: TEXT_PRIMARY,
    fontSize: 14.5,
    minHeight: 52,
    paddingVertical: 0,
  },

  textAreaInput: {
    minHeight: 86,
    lineHeight: 21,
  },


  // ---------------------------------------------------
  // ERROR
  // ---------------------------------------------------

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },

  errorText: {
    color: ERROR,
    fontSize: 11.5,
    flex: 1,
  },


  // ---------------------------------------------------
  // HELPERS
  // ---------------------------------------------------

  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -8,
    marginBottom: 4,
  },

  helperText: {
    color: TEXT_SECONDARY,
    fontSize: 10.5,
    lineHeight: 16,
    marginLeft: 5,
    flex: 1,
  },

  helperTextPlain: {
    color: TEXT_MUTED,
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: 4,
  },


  // ---------------------------------------------------
  // USP NUDGE
  // ---------------------------------------------------

  uspNudge: {
    flexDirection: 'row',

    backgroundColor: '#FFF9EC',

    borderWidth: 1,
    borderColor: '#F5DFA7',

    borderRadius: 16,

    padding: 13,

    marginBottom: 18,
  },

  nudgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF0C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  nudgeContent: {
    flex: 1,
  },

  nudgeTitle: {
    color: '#78350F',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 3,
  },

  nudgeText: {
    color: '#92400E',
    fontSize: 10.5,
    lineHeight: 16,
  },

  nudgeActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 9,
  },

  nudgePrimary: {
    color: PURPLE,
    fontSize: 11.5,
    fontWeight: '700',
  },

  nudgeSecondary: {
    color: '#78716C',
    fontSize: 11.5,
    fontWeight: '600',
  },


  // ---------------------------------------------------
  // FINISH NOTE
  // ---------------------------------------------------

  finishNote: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FAF8FF',

    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE8FA',

    padding: 12,

    marginBottom: 20,
  },

  finishIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEE7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  finishTextContainer: {
    flex: 1,
  },

  finishTitle: {
    color: TEXT_PRIMARY,
    fontSize: 12.5,
    fontWeight: '700',
  },

  finishSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },


  // ---------------------------------------------------
  // CREATE BUTTON
  // ---------------------------------------------------

  createButton: {
    height: 56,
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

  createGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  createText: {
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

  buttonDisabled: {
    opacity: 0.75,
  },


  // ---------------------------------------------------
  // BOTTOM
  // ---------------------------------------------------

  bottomNote: {
    color: TEXT_MUTED,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 15,
  },

});