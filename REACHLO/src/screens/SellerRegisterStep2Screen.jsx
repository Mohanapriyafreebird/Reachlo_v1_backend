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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import PrimaryButton from '../components/PrimaryButton';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

// Step indicator pill (reusable inline)
function StepPill({ step, label, active }) {
  return (
    <View style={styles.stepPillWrapper}>
      <View style={[styles.stepPill, active ? styles.stepPillActive : styles.stepPillInactive]}>
        <Text style={[styles.stepPillText, active ? styles.stepPillTextActive : styles.stepPillTextInactive]}>
          {step}
        </Text>
      </View>
      <Text style={[styles.stepLabel, active ? styles.stepLabelActive : styles.stepLabelInactive]}>
        {label}
      </Text>
    </View>
  );
}

export default function SellerRegisterStep2Screen({ route, navigation }) {
  const { step1Data } = route.params || {};
  const { register } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState(''); // "What does your business provide?"
  const [usp, setUsp] = useState('');  // "What makes you different?"

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // USP nudge state (amber info bar when USP left empty on submit attempt)
  const [showUspNudge, setShowUspNudge] = useState(false);
  const [uspNudgeDismissed, setUspNudgeDismissed] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const scrollRef = useRef(null);
  const layouts = useRef({});

  const showToast = (msg, type = 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleLayout = (field, e) => {
    layouts.current[field] = e.nativeEvent.layout.y;
  };

  const validate = () => {
    const errs = {};

    if (!businessName.trim()) {
      errs.businessName = 'Business or company name is required';
    }

    if (!businessDescription.trim()) {
      errs.businessDescription = 'Please describe what your business provides';
    } else if (businessDescription.trim().length < 20) {
      errs.businessDescription = 'Please write at least 20 characters';
    }

    setErrors(errs);

    // USP nudge (non-blocking) — show once if USP is empty
    if (!usp.trim() && !uspNudgeDismissed) {
      setShowUspNudge(true);
    }

    const firstErr = Object.keys(errs)[0];
    if (firstErr && layouts.current[firstErr] !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, layouts.current[firstErr] - 20), animated: true });
    }
    return Object.keys(errs).length === 0;
  };

  const handleCreateAccount = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    // USP is optional — do NOT block registration if the nudge is showing.
    // The nudge is purely informational; dismiss it silently and proceed.
    if (showUspNudge) setShowUspNudge(false);

    setLoading(true);
    try {
      // One combined API call with Step 1 + Step 2 data — no orphaned records
      const registrationPayload = {
        // Step 1 personal details
        name: step1Data.name,
        email: step1Data.email,
        phone: step1Data.phone,
        password: step1Data.password,
        role: 'SELLER',
        city: step1Data.city || 'Unknown',

        // Step 2 business details
        company_name: businessName.trim(),
        // business_description: what the business provides — stored in businesses.business_description
        // DISTINCT from campaigns.description which is per-campaign marketing copy
        business_description: businessDescription.trim(),
        usp: usp.trim() || null,
      };

      const response = await register(registrationPayload);

      if (response.role === 'SELLER') {
        navigation.replace('SellerDashboard');
      } else {
        navigation.replace('DiscoveryFeed');
      }
    } catch (err) {
      const msg = err.message || '';
      // Show specific error messages for duplicate email/phone
      if (msg.toLowerCase().includes('email')) {
        showToast('This email address is already registered. Please go back and use a different email.', 'error');
      } else if (msg.toLowerCase().includes('mobile') || msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('number')) {
        showToast('This mobile number is already registered. Please go back and use a different number.', 'error');
      } else {
        showToast(msg || 'Registration failed. Please try again.', 'error');
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
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Back arrow — returns to Step 1 with all Step 1 fields still intact */}
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={COLORS.WHITE} />
            </Pressable>

            <Text style={styles.logoText}>REACHLO</Text>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <StepPill step="1" label="Personal" active={false} />
              <View style={styles.stepConnector} />
              <StepPill step="2" label="Business" active={true} />
            </View>

            <Text style={styles.title}>Tell us about your business</Text>
            <Text style={styles.subtitle}>Step 2 of 2 — Business details</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>

            {/* Business Name */}
            <View onLayout={(e) => handleLayout('businessName', e)}>
              <Text style={styles.fieldLabel}>Business or company name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, errors.businessName ? styles.textInputError : null]}
                placeholder="e.g. QuickFix IT Solutions"
                placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                value={businessName}
                onChangeText={(t) => {
                  setBusinessName(t);
                  if (errors.businessName) setErrors(p => ({ ...p, businessName: null }));
                }}
                autoCapitalize="words"
                editable={!loading}
              />
              {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
            </View>

            {/* Business Description — "What does your business provide?" */}
            <View onLayout={(e) => handleLayout('businessDescription', e)}>
              <Text style={styles.fieldLabel}>What does your business provide? <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput, errors.businessDescription ? styles.textInputError : null]}
                placeholder={
                  'Describe your products or services in a few sentences.\ne.g. We provide same-day on-site laptop and network repair for small offices in Chennai.'
                }
                placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                value={businessDescription}
                onChangeText={(t) => {
                  setBusinessDescription(t);
                  if (errors.businessDescription) setErrors(p => ({ ...p, businessDescription: null }));
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.helperText}>Write naturally — our AI reads this to understand your business</Text>
              {errors.businessDescription && <Text style={styles.errorText}>{errors.businessDescription}</Text>}
            </View>

            {/* USP — Optional */}
            <View onLayout={(e) => handleLayout('usp', e)}>
              <Text style={styles.fieldLabel}>
                What makes you different?{' '}
                <Text style={styles.optionalTag}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInputSmall]}
                placeholder="e.g. We come to your office — same-day on-site service, no pickup needed."
                placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                value={usp}
                onChangeText={(t) => {
                  setUsp(t);
                  if (showUspNudge) setShowUspNudge(false);
                }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.helperText}>
                This is the single most powerful personalisation input for your AI campaigns
              </Text>
            </View>

            {/* USP amber nudge (non-blocking info bar) */}
            {showUspNudge && !uspNudgeDismissed && (
              <View style={styles.uspNudge}>
                <Ionicons name="information-circle" size={16} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.uspNudgeText}>
                    Sellers who fill this get noticeably more specific AI campaigns. Add it now?
                  </Text>
                  <View style={styles.uspNudgeActions}>
                    <Pressable
                      onPress={() => {
                        setShowUspNudge(false);
                        scrollRef.current?.scrollTo({ y: layouts.current['usp'] || 0, animated: true });
                      }}
                    >
                      <Text style={styles.uspNudgeAdd}>Add USP</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowUspNudge(false);
                        setUspNudgeDismissed(true);
                        // Re-trigger submit
                        setTimeout(() => handleCreateAccount(), 50);
                      }}
                    >
                      <Text style={styles.uspNudgeSkip}>Skip for now</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Create Account button */}
            <PrimaryButton
              title="Create Account →"
              onPress={handleCreateAccount}
              loading={loading}
              disabled={loading}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 20,
    zIndex: 10,
  },
  logoText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 4,
    opacity: 0.9,
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepPillWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  stepPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepPillActive: {
    backgroundColor: COLORS.WHITE,
  },
  stepPillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  stepPillText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  stepPillTextActive: {
    color: COLORS.PRIMARY,
  },
  stepPillTextInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  stepLabelActive: {
    color: COLORS.WHITE,
  },
  stepLabelInactive: {
    color: 'rgba(255,255,255,0.5)',
  },
  stepConnector: {
    height: 2,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
    marginBottom: 22,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.SM,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 20,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  required: {
    color: COLORS.ERROR,
  },
  optionalTag: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
    fontSize: FONT_SIZES.XS,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  textAreaInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  textAreaInputSmall: {
    minHeight: 72,
    paddingTop: 10,
  },
  textInputError: {
    borderColor: COLORS.ERROR,
  },
  helperText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 6,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: FONT_SIZES.XS,
    marginTop: 4,
  },
  uspNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  uspNudgeText: {
    fontSize: FONT_SIZES.XS,
    color: '#92400E',
    lineHeight: 18,
  },
  uspNudgeActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  uspNudgeAdd: {
    color: COLORS.PRIMARY,
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  uspNudgeSkip: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONT_SIZES.XS,
  },
  submitBtn: {
    marginTop: 8,
  },
});
