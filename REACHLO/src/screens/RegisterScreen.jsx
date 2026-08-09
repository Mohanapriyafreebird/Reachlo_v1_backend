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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../constants/typography';
import InputField from '../components/InputField';
import PasswordInput from '../components/PasswordInput';
import RoleSelector from '../components/RoleSelector';
import PrimaryButton from '../components/PrimaryButton';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ route, navigation }) {
  const defaultRole = route.params?.defaultRole || 'BUYER';

  // SELLER registration uses a dedicated two-step flow.
  // If this screen is navigated to with role=SELLER, redirect immediately.
  React.useEffect(() => {
    if (defaultRole === 'SELLER') {
      navigation.replace('SellerRegisterStep1');
    }
  }, [defaultRole]);

  // If SELLER, render nothing while redirecting
  if (defaultRole === 'SELLER') return null;
  
  const { register } = useAuth();
  
  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Toast status
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  // Input Refs for auto focus movement
  const nameRef = useRef(null);
  const companyNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const cityRef = useRef(null);
  const passwordRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Layout positions for error scrolling
  const layouts = useRef({});

  const showToastMsg = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleLayout = (field, event) => {
    layouts.current[field] = event.nativeEvent.layout.y;
  };

  const validateField = (field, val) => {
    let error = null;
    if (field === 'name') {
      if (!val.trim()) error = 'Full name is required';
      else if (val.trim().length < 2) error = 'Name must be at least 2 characters';
    } else if (field === 'companyName' && role === 'SELLER') {
      if (!val.trim()) error = 'Company / Brand name is required for sellers';
    } else if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val.trim()) error = 'Email address is required';
      else if (!emailRegex.test(val.trim())) error = 'Please enter a valid email address';
    } else if (field === 'phone') {
      const numericPhone = val.replace(/[^0-9]/g, '');
      if (!val) error = 'Phone number is required';
      else if (numericPhone.length !== 10) error = 'Phone number must be exactly 10 digits';
    } else if (field === 'city') {
      if (!val.trim()) error = 'City is required';
    } else if (field === 'password') {
      if (!val) error = 'Password is required';
      else if (val.length < 8) error = 'Password must be at least 8 characters';
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validate = () => {
    const tempErrors = {};
    
    // Name validation
    if (!name.trim()) {
      tempErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      tempErrors.name = 'Name must be at least 2 characters';
    }

    // Company name validation for sellers
    if (role === 'SELLER' && !companyName.trim()) {
      tempErrors.companyName = 'Company / Brand name is required for sellers';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const numericPhone = phone.replace(/[^0-9]/g, '');
    if (!phone) {
      tempErrors.phone = 'Phone number is required';
    } else if (numericPhone.length !== 10) {
      tempErrors.phone = 'Phone number must be exactly 10 digits';
    }

    // City validation
    if (!city.trim()) {
      tempErrors.city = 'City is required';
    }

    // Password validation
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 8) {
      tempErrors.password = 'Password must be at least 8 characters';
    }

    // Role validation
    if (!role) {
      tempErrors.role = 'Role must be selected';
    }

    setErrors(tempErrors);

    // Scroll to the first error field if any
    const firstError = Object.keys(tempErrors)[0];
    if (firstError) {
      const targetY = layouts.current[firstError];
      if (targetY !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: Math.max(0, targetY - 20), animated: true });
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const response = await register({
        name: name.trim(),
        company_name: role === 'SELLER' ? companyName.trim() : undefined,
        email: email.trim(),
        phone: cleanPhone,
        city: city.trim(),
        password,
        role,
      });

      // Navigate based on role
      if (response.role === 'SELLER') {
        navigation.replace('SellerDashboard');
      } else {
        navigation.replace('DiscoveryFeed');
      }
    } catch (err) {
      const msg = err.message || '';
      // Show specific field errors for duplicate email/phone
      if (msg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
        showToastMsg('This email address is already registered. Please use a different email or log in.', 'error');
      } else if (msg.toLowerCase().includes('mobile') || msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('number')) {
        setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
        showToastMsg('This mobile number is already registered. Please use a different number or log in.', 'error');
      } else {
        showToastMsg(msg || 'Registration failed. Please try again.', 'error');
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
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HERO SECTION */}
            <View style={styles.heroSection}>
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
              <Text style={styles.heroLogo}>REACHLO</Text>
              <Text style={styles.heroTitle}>Create Your Account</Text>
              <Text style={styles.heroSubtitle}>Connect. Campaign. Convert.</Text>
            </View>

            {/* FLOATING CARD */}
            <View style={styles.floatingCard}>
              {/* ROLE SELECTOR */}
              {!route.params?.defaultRole && (
                <View onLayout={(e) => handleLayout('role', e)}>
                  <Text style={styles.sectionLabel}>I want to join as a:</Text>
                  <RoleSelector selectedRole={role} onSelect={setRole} />
                  {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
                </View>
              )}

              {/* NAME FIELD */}
              <View onLayout={(e) => handleLayout('name', e)}>
                <InputField
                  ref={nameRef}
                  label="Full Name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder="Enter your name"
                  error={errors.name}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => (role === 'SELLER' ? companyNameRef.current?.focus() : emailRef.current?.focus())}
                  onBlur={() => validateField('name', name)}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* COMPANY NAME FIELD — Sellers only */}
              {role === 'SELLER' && (
                <View onLayout={(e) => handleLayout('companyName', e)}>
                  <InputField
                    ref={companyNameRef}
                    label="Company / Brand Name"
                    value={companyName}
                    onChangeText={(text) => {
                      setCompanyName(text);
                      if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
                    }}
                    placeholder="e.g. PixelCraft Studio, FitZone Gym"
                    error={errors.companyName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onBlur={() => validateField('companyName', companyName)}
                    blurOnSubmit={false}
                    editable={!loading}
                  />
                </View>
              )}

              {/* EMAIL FIELD */}
              <View onLayout={(e) => handleLayout('email', e)}>
                <InputField
                  ref={emailRef}
                  label="Email Address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  placeholder="name@example.com"
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  onBlur={() => validateField('email', email)}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* PHONE FIELD */}
              <View onLayout={(e) => handleLayout('phone', e)}>
                <InputField
                  ref={phoneRef}
                  label="Phone Number"
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setPhone(cleaned);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder="10-digit number"
                  error={errors.phone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  leftElement={<Text style={styles.prefixText}>+91</Text>}
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  onBlur={() => validateField('phone', phone)}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* CITY FIELD */}
              <View onLayout={(e) => handleLayout('city', e)}>
                <InputField
                  ref={cityRef}
                  label="City"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    if (errors.city) setErrors((prev) => ({ ...prev, city: null }));
                  }}
                  placeholder="e.g. Chennai, Bangalore, Mumbai"
                  error={errors.city}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onBlur={() => validateField('city', city)}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* PASSWORD FIELD */}
              <View onLayout={(e) => handleLayout('password', e)}>
                <PasswordInput
                  ref={passwordRef}
                  label="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  placeholder="Enter password"
                  error={errors.password}
                  showStrength={true}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  onBlur={() => validateField('password', password)}
                  blurOnSubmit={true}
                  editable={!loading}
                />
              </View>

              <PrimaryButton
                title="Sign Up"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              />

              {/* LOGIN REDIRECT */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginPrompt}>Already have an account?</Text>
                <Pressable
                  onPress={() => navigation.navigate(role === 'SELLER' ? 'Login' : 'BuyerLogin')}
                  disabled={loading}
                  accessibilityRole="link"
                  accessibilityLabel="Navigate to Login"
                  style={styles.loginLink}
                >
                  <Text style={styles.loginText}>Login</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.ACCENT_CYAN,
    opacity: 0.15,
    top: -50,
    right: -50,
  },
  heroCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.ACCENT_PURPLE,
    opacity: 0.1,
    bottom: -30,
    left: -30,
  },
  heroLogo: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
    letterSpacing: 4,
    marginBottom: 6,
    opacity: 0.9,
  },
  heroTitle: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY_ULTRA_LIGHT,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  floatingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 20,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: 'rgba(40, 70, 120, 1)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 50,
    elevation: 15,
  },
  sectionLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginBottom: 10,
  },
  prefixText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: FONT_SIZES.BASE,
    color: COLORS.TEXT_SECONDARY,
    marginRight: 6,
  },
  loginLink: {
    padding: 4,
  },
  loginText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.PRIMARY,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.REGULAR,
    marginTop: -10,
    marginBottom: 16,
  },
});
