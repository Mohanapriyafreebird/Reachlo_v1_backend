import React, {
  useState,
  useRef,
  forwardRef,
  useEffect,
} from 'react';

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
  ActivityIndicator,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { FONT_WEIGHTS } from '../constants/typography';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';


/* ============================================================
   COLORS
   ============================================================ */

const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  blueSoft: '#DBEAFE',

  background: '#F7F9FC',
  white: '#FFFFFF',

  text: '#172033',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  border: '#E2E8F0',
  borderFocus: '#2563EB',

  inputBackground: '#FFFFFF',

  error: '#DC2626',
  errorBackground: '#FEF2F2',

  success: '#16A34A',

  shadow: '#0F172A',
};


/* ============================================================
   REUSABLE TEXT INPUT
   ============================================================ */

const FormInput = forwardRef(
  (
    {
      label,
      icon,
      value,
      onChangeText,
      placeholder,
      error,
      onBlur,
      onFocus,
      secureTextEntry = false,
      rightElement,
      leftElement,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);

    const handleFocus = (event) => {
      setFocused(true);

      if (onFocus) {
        onFocus(event);
      }
    };

    const handleBlur = (event) => {
      setFocused(false);

      if (onBlur) {
        onBlur(event);
      }
    };

    return (
      <View style={styles.inputGroup}>

        {/* LABEL */}

        <Text style={styles.inputLabel}>
          {label}
        </Text>


        {/* INPUT CONTAINER */}

        <View
          style={[
            styles.inputContainer,

            focused &&
            styles.inputContainerFocused,

            error &&
            styles.inputContainerError,
          ]}
        >

          {/* LEFT ICON */}

          {icon && (
            <View style={styles.inputIconContainer}>

              <Ionicons
                name={icon}
                size={20}
                color={
                  error
                    ? COLORS.error
                    : focused
                      ? COLORS.primary
                      : COLORS.textMuted
                }
              />

            </View>
          )}


          {/* CUSTOM LEFT ELEMENT */}

          {leftElement && (
            <View style={styles.leftElement}>
              {leftElement}
            </View>
          )}


          {/* TEXT INPUT */}

          <TextInput
            ref={ref}

            value={value}
            onChangeText={onChangeText}

            placeholder={placeholder}
            placeholderTextColor="#A0AEC0"

            secureTextEntry={secureTextEntry}

            style={styles.input}

            selectionColor={COLORS.primary}
            cursorColor={COLORS.primary}

            onFocus={handleFocus}
            onBlur={handleBlur}

            editable={true}

            multiline={false}

            textAlignVertical="center"

            {...props}
          />


          {/* RIGHT ELEMENT */}

          {rightElement && (
            <View style={styles.rightElement}>
              {rightElement}
            </View>
          )}

        </View>


        {/* ERROR */}

        {error && (
          <View style={styles.errorRow}>

            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={COLORS.error}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>

          </View>
        )}

      </View>
    );
  }
);


/* ============================================================
   PASSWORD INPUT
   ============================================================ */

const PasswordField = forwardRef(
  (
    {
      label,
      value,
      onChangeText,
      placeholder,
      error,
      onBlur,
      ...props
    },
    ref
  ) => {

    const [visible, setVisible] =
      useState(false);

    const [focused, setFocused] =
      useState(false);


    const getStrength = () => {

      if (!value) {
        return 0;
      }

      let strength = 0;

      if (value.length >= 8) {
        strength++;
      }

      if (/[A-Z]/.test(value)) {
        strength++;
      }

      if (/[0-9]/.test(value)) {
        strength++;
      }

      if (/[^A-Za-z0-9]/.test(value)) {
        strength++;
      }

      return strength;
    };


    const strength = getStrength();


    const strengthText = {
      0: '',
      1: 'Weak password',
      2: 'Fair password',
      3: 'Good password',
      4: 'Strong password',
    };


    return (
      <View style={styles.inputGroup}>

        {/* LABEL */}

        <Text style={styles.inputLabel}>
          {label}
        </Text>


        {/* PASSWORD CONTAINER */}

        <View
          style={[
            styles.inputContainer,

            focused &&
            styles.inputContainerFocused,

            error &&
            styles.inputContainerError,
          ]}
        >

          {/* ICON */}

          <View style={styles.inputIconContainer}>

            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                error
                  ? COLORS.error
                  : focused
                    ? COLORS.primary
                    : COLORS.textMuted
              }
            />

          </View>


          {/* PASSWORD INPUT */}

          <TextInput
            ref={ref}

            value={value}
            onChangeText={onChangeText}

            placeholder={placeholder}
            placeholderTextColor="#A0AEC0"

            secureTextEntry={!visible}

            style={styles.input}

            selectionColor={COLORS.primary}
            cursorColor={COLORS.primary}

            onFocus={() =>
              setFocused(true)
            }

            onBlur={(event) => {

              setFocused(false);

              if (onBlur) {
                onBlur(event);
              }

            }}

            editable={true}

            multiline={false}

            textAlignVertical="center"

            {...props}
          />


          {/* SHOW / HIDE PASSWORD */}

          <Pressable
            onPress={() =>
              setVisible(
                (previous) =>
                  !previous
              )
            }
            style={styles.passwordToggle}
            hitSlop={10}
          >

            <Ionicons
              name={
                visible
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={21}
              color={COLORS.textMuted}
            />

          </Pressable>

        </View>


        {/* PASSWORD STRENGTH */}

        {value.length > 0 && (
          <View
            style={
              styles.passwordStrengthContainer
            }
          >

            <View style={styles.strengthBars}>

              {[1, 2, 3, 4].map(
                (item) => (
                  <View
                    key={item}
                    style={[
                      styles.strengthBar,

                      item <= strength &&
                      styles.strengthBarActive,
                    ]}
                  />
                )
              )}

            </View>


            <Text
              style={[
                styles.strengthText,

                strength === 1 && {
                  color: COLORS.error,
                },

                strength === 2 && {
                  color: '#D97706',
                },

                strength >= 3 && {
                  color: COLORS.success,
                },
              ]}
            >
              {strengthText[strength]}
            </Text>

          </View>
        )}


        {/* ERROR */}

        {error && (
          <View style={styles.errorRow}>

            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={COLORS.error}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>

          </View>
        )}

      </View>
    );
  }
);


/* ============================================================
   MAIN REGISTER SCREEN
   ============================================================ */

export default function RegisterScreen({
  route,
  navigation,
}) {

  const { register } = useAuth();


  /* ==========================================================
     ROLE
     ========================================================== */

  const defaultRole =
    route?.params?.defaultRole ||
    'BUYER';

  const [role, setRole] =
    useState(defaultRole);


  /* ==========================================================
     FORM STATE
     ========================================================== */

  const [name, setName] =
    useState('');

  const [companyName, setCompanyName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [city, setCity] =
    useState('');

  const [password, setPassword] =
    useState('');


  /* ==========================================================
     UI STATE
     ========================================================== */

  const [errors, setErrors] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [toastVisible, setToastVisible] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState('');

  const [toastType, setToastType] =
    useState('info');


  /* ==========================================================
     REFS
     ========================================================== */

  const nameRef =
    useRef(null);

  const companyNameRef =
    useRef(null);

  const emailRef =
    useRef(null);

  const phoneRef =
    useRef(null);

  const cityRef =
    useRef(null);

  const passwordRef =
    useRef(null);


  /* ==========================================================
     SELLER REDIRECT
     ========================================================== */

  useEffect(() => {

    if (defaultRole === 'SELLER') {

      navigation.replace(
        'SellerRegisterStep1'
      );

    }

  }, [
    defaultRole,
    navigation,
  ]);


  if (defaultRole === 'SELLER') {
    return null;
  }


  /* ==========================================================
     TOAST
     ========================================================== */

  const showToastMsg = (
    message,
    type = 'info'
  ) => {

    setToastMessage(message);

    setToastType(type);

    setToastVisible(true);
  };


  /* ==========================================================
     VALIDATE SINGLE FIELD
     ========================================================== */

  const validateField = (
    field,
    value
  ) => {

    let error = null;


    /* NAME */

    if (field === 'name') {

      if (!value.trim()) {

        error =
          'Full name is required';

      } else if (
        value.trim().length < 2
      ) {

        error =
          'Name must be at least 2 characters';

      }

    }


    /* COMPANY */

    else if (
      field === 'companyName' &&
      role === 'SELLER'
    ) {

      if (!value.trim()) {

        error =
          'Company / Brand name is required';

      }

    }


    /* EMAIL */

    else if (field === 'email') {

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


      if (!value.trim()) {

        error =
          'Email address is required';

      } else if (
        !emailRegex.test(
          value.trim()
        )
      ) {

        error =
          'Please enter a valid email address';

      }

    }


    /* PHONE */

    else if (field === 'phone') {

      const numericPhone =
        value.replace(
          /[^0-9]/g,
          ''
        );


      if (!value) {

        error =
          'Phone number is required';

      } else if (
        numericPhone.length !== 10
      ) {

        error =
          'Phone number must be exactly 10 digits';

      }

    }


    /* CITY */

    else if (field === 'city') {

      if (!value.trim()) {

        error =
          'City is required';

      }

    }


    /* PASSWORD */

    else if (field === 'password') {

      if (!value) {

        error =
          'Password is required';

      } else if (
        value.length < 8
      ) {

        error =
          'Password must be at least 8 characters';

      }

    }


    /*
     * IMPORTANT:
     *
     * We update validation only after the user
     * has finished interacting with a field.
     *
     * This prevents unnecessary layout changes
     * while the keyboard is open.
     */

    setErrors(
      (previous) => ({
        ...previous,
        [field]: error,
      })
    );

  };


  /* ==========================================================
     COMPLETE VALIDATION
     ========================================================== */

  const validate = () => {

    const tempErrors = {};


    /* NAME */

    if (!name.trim()) {

      tempErrors.name =
        'Full name is required';

    } else if (
      name.trim().length < 2
    ) {

      tempErrors.name =
        'Name must be at least 2 characters';

    }


    /* SELLER COMPANY */

    if (
      role === 'SELLER' &&
      !companyName.trim()
    ) {

      tempErrors.companyName =
        'Company / Brand name is required';

    }


    /* EMAIL */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!email.trim()) {

      tempErrors.email =
        'Email address is required';

    } else if (
      !emailRegex.test(
        email.trim()
      )
    ) {

      tempErrors.email =
        'Please enter a valid email address';

    }


    /* PHONE */

    const numericPhone =
      phone.replace(
        /[^0-9]/g,
        ''
      );


    if (!phone) {

      tempErrors.phone =
        'Phone number is required';

    } else if (
      numericPhone.length !== 10
    ) {

      tempErrors.phone =
        'Phone number must be exactly 10 digits';

    }


    /* CITY */

    if (!city.trim()) {

      tempErrors.city =
        'City is required';

    }


    /* PASSWORD */

    if (!password) {

      tempErrors.password =
        'Password is required';

    } else if (
      password.length < 8
    ) {

      tempErrors.password =
        'Password must be at least 8 characters';

    }


    /* ROLE */

    if (!role) {

      tempErrors.role =
        'Role must be selected';

    }


    setErrors(tempErrors);


    return (
      Object.keys(
        tempErrors
      ).length === 0
    );

  };


  /* ==========================================================
     SUBMIT
     ========================================================== */

  const handleSubmit = async () => {

    /*
     * Hide keyboard before validation.
     * This prevents the keyboard and validation
     * layout changes from happening simultaneously.
     */

    Keyboard.dismiss();


    const isValid = validate();


    if (!isValid) {
      return;
    }


    setLoading(true);


    try {

      const cleanPhone =
        phone.replace(
          /[^0-9]/g,
          ''
        );


      const response =
        await register({

          name:
            name.trim(),

          company_name:
            role === 'SELLER'
              ? companyName.trim()
              : undefined,

          email:
            email.trim(),

          phone:
            cleanPhone,

          city:
            city.trim(),

          password,

          role,

        });


      /* ======================================================
         NAVIGATION
         ====================================================== */

      if (
        response?.role ===
        'SELLER'
      ) {

        navigation.replace(
          'SellerDashboard'
        );

      } else {

        navigation.replace(
          'DiscoveryFeed'
        );

      }

    } catch (err) {

      const msg =
        err?.message || '';


      /* ======================================================
         DUPLICATE EMAIL
         ====================================================== */

      if (
        msg
          .toLowerCase()
          .includes('email')
      ) {

        setErrors(
          (previous) => ({
            ...previous,
            email:
              'This email is already registered',
          })
        );


        showToastMsg(
          'This email address is already registered. Please use a different email or log in.',
          'error'
        );

      }


      /* ======================================================
         DUPLICATE PHONE
         ====================================================== */

      else if (
        msg
          .toLowerCase()
          .includes('mobile') ||

        msg
          .toLowerCase()
          .includes('phone') ||

        msg
          .toLowerCase()
          .includes('number')
      ) {

        setErrors(
          (previous) => ({
            ...previous,
            phone:
              'This phone number is already registered',
          })
        );


        showToastMsg(
          'This mobile number is already registered. Please use a different number or log in.',
          'error'
        );

      }


      /* ======================================================
         GENERIC ERROR
         ====================================================== */

      else {

        showToastMsg(
          msg ||
          'Registration failed. Please try again.',
          'error'
        );

      }

    } finally {

      setLoading(false);

    }

  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (

    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'bottom',
      ]}
    >

      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.primary
        }
      />


      {/* ======================================================
          TOAST
          ====================================================== */}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() =>
          setToastVisible(false)
        }
      />


      {/* ======================================================
          IMPORTANT KEYBOARD FIX
          
          iOS:
          KeyboardAvoidingView is useful.

          Android:
          DO NOT use KeyboardAvoidingView
          with behavior="height" here.
          ====================================================== */}

      {Platform.OS === 'ios' ? (

        <KeyboardAvoidingView
          style={
            styles.keyboardView
          }
          behavior="padding"
        >

          <RegisterForm
            navigation={navigation}

            name={name}
            setName={setName}

            companyName={companyName}
            setCompanyName={
              setCompanyName
            }

            email={email}
            setEmail={setEmail}

            phone={phone}
            setPhone={setPhone}

            city={city}
            setCity={setCity}

            password={password}
            setPassword={
              setPassword
            }

            errors={errors}
            setErrors={setErrors}

            loading={loading}

            nameRef={nameRef}
            companyNameRef={
              companyNameRef
            }
            emailRef={emailRef}
            phoneRef={phoneRef}
            cityRef={cityRef}
            passwordRef={
              passwordRef
            }

            validateField={
              validateField
            }

            handleSubmit={
              handleSubmit
            }
          />

        </KeyboardAvoidingView>

      ) : (

        /*
         * ANDROID
         *
         * Normal View + ScrollView.
         *
         * This is the important fix.
         */

        <View
          style={
            styles.keyboardView
          }
        >

          <RegisterForm
            navigation={navigation}

            name={name}
            setName={setName}

            companyName={companyName}
            setCompanyName={
              setCompanyName
            }

            email={email}
            setEmail={setEmail}

            phone={phone}
            setPhone={setPhone}

            city={city}
            setCity={setCity}

            password={password}
            setPassword={
              setPassword
            }

            errors={errors}
            setErrors={setErrors}

            loading={loading}

            nameRef={nameRef}
            companyNameRef={
              companyNameRef
            }
            emailRef={emailRef}
            phoneRef={phoneRef}
            cityRef={cityRef}
            passwordRef={
              passwordRef
            }

            validateField={
              validateField
            }

            handleSubmit={
              handleSubmit
            }
          />

        </View>

      )}

    </SafeAreaView>
  );
}


/* ============================================================
   REGISTER FORM
   ============================================================ */

const RegisterForm = ({
  navigation,

  name,
  setName,

  companyName,
  setCompanyName,

  email,
  setEmail,

  phone,
  setPhone,

  city,
  setCity,

  password,
  setPassword,

  errors,
  setErrors,

  loading,

  nameRef,
  companyNameRef,
  emailRef,
  phoneRef,
  cityRef,
  passwordRef,

  validateField,
  handleSubmit,
}) => {

  return (

    /*
     * IMPORTANT:
     *
     * There is NO TouchableWithoutFeedback here.
     *
     * It can interfere with touch/keyboard handling
     * around TextInputs.
     */

    <ScrollView
      showsVerticalScrollIndicator={false}

      keyboardShouldPersistTaps="always"

      keyboardDismissMode={
        Platform.OS === 'ios'
          ? 'interactive'
          : 'on-drag'
      }

      nestedScrollEnabled={true}

      contentContainerStyle={
        styles.scrollContent
      }

      automaticallyAdjustKeyboardInsets={
        false
      }

      bounces={true}

      overScrollMode="never"
    >


      {/* ======================================================
          HERO
          ====================================================== */}

      <View
        style={styles.heroSection}
      >

        {/* DECORATIVE CIRCLE */}

        <View
          style={[
            styles.heroCircle,
            styles.heroCircleOne,
          ]}
        />


        <View
          style={[
            styles.heroCircle,
            styles.heroCircleTwo,
          ]}
        />


        {/* LOGO */}

        <Text style={styles.logo}>
          REACHLO
        </Text>


        {/* TITLE */}

        <Text style={styles.heroTitle}>
          Create Your Account
        </Text>


        {/* SUBTITLE */}

        <Text
          style={styles.heroSubtitle}
        >
          Discover better deals around you.
        </Text>


        {/* FEATURES */}

        <View
          style={styles.heroFeatures}
        >

          {/* DISCOVER */}

          <View
            style={styles.featureItem}
          >

            <View
              style={styles.featureIcon}
            >

              <Ionicons
                name="sparkles-outline"
                size={15}
                color={
                  COLORS.primary
                }
              />

            </View>

            <Text
              style={styles.featureText}
            >
              Discover
            </Text>

          </View>


          <View
            style={styles.featureDot}
          />


          {/* SAVE */}

          <View
            style={styles.featureItem}
          >

            <View
              style={styles.featureIcon}
            >

              <Ionicons
                name="pricetag-outline"
                size={15}
                color={
                  COLORS.primary
                }
              />

            </View>

            <Text
              style={styles.featureText}
            >
              Save
            </Text>

          </View>


          <View
            style={styles.featureDot}
          />


          {/* CONNECT */}

          <View
            style={styles.featureItem}
          >

            <View
              style={styles.featureIcon}
            >

              <Ionicons
                name="chatbubble-ellipses-outline"
                size={15}
                color={
                  COLORS.primary
                }
              />

            </View>

            <Text
              style={styles.featureText}
            >
              Connect
            </Text>

          </View>

        </View>

      </View>


      {/* ======================================================
          FORM CARD
          ====================================================== */}

      <View
        style={styles.formCard}
      >


        {/* FORM HEADER */}

        <View
          style={styles.formHeader}
        >

          <View
            style={styles.formHeaderText}
          >

            <Text
              style={styles.formTitle}
            >
              Welcome to REACHLO
            </Text>

            <Text
              style={styles.formSubtitle}
            >
              Create your buyer account in a few steps.
            </Text>

          </View>


          <View
            style={styles.stepBadge}
          >

            <Text
              style={styles.stepText}
            >
              1 / 1
            </Text>

          </View>

        </View>


        {/* ==================================================
            FULL NAME
            ================================================== */}

        <FormInput
          ref={nameRef}

          label="Full Name"
          icon="person-outline"

          value={name}

          onChangeText={(text) => {

            setName(text);

            if (errors.name) {

              setErrors(
                (previous) => ({
                  ...previous,
                  name: null,
                })
              );

            }

          }}

          placeholder="Enter your full name"

          error={errors.name}

          autoCapitalize="words"
          autoCorrect={false}

          returnKeyType="next"

          onSubmitEditing={() => {

            emailRef.current?.focus();

          }}

          onBlur={() => {

            validateField(
              'name',
              name
            );

          }}

          blurOnSubmit={false}

          editable={!loading}
        />


        {/* ==================================================
            EMAIL
            ================================================== */}

        <FormInput
          ref={emailRef}

          label="Email Address"
          icon="mail-outline"

          value={email}

          onChangeText={(text) => {

            setEmail(text);

            if (errors.email) {

              setErrors(
                (previous) => ({
                  ...previous,
                  email: null,
                })
              );

            }

          }}

          placeholder="name@example.com"

          error={errors.email}

          keyboardType="email-address"

          autoCapitalize="none"
          autoCorrect={false}

          returnKeyType="next"

          onSubmitEditing={() => {

            phoneRef.current?.focus();

          }}

          onBlur={() => {

            validateField(
              'email',
              email
            );

          }}

          blurOnSubmit={false}

          editable={!loading}
        />


        {/* ==================================================
            PHONE
            ================================================== */}

        <FormInput
          ref={phoneRef}

          label="Phone Number"
          icon="call-outline"

          value={phone}

          onChangeText={(text) => {

            const cleaned =
              text.replace(
                /[^0-9]/g,
                ''
              );

            setPhone(cleaned);

            if (errors.phone) {

              setErrors(
                (previous) => ({
                  ...previous,
                  phone: null,
                })
              );

            }

          }}

          placeholder="10-digit mobile number"

          error={errors.phone}

          keyboardType="phone-pad"

          maxLength={10}

          leftElement={
            <Text
              style={
                styles.countryCode
              }
            >
              +91
            </Text>
          }

          returnKeyType="next"

          onSubmitEditing={() => {

            cityRef.current?.focus();

          }}

          onBlur={() => {

            validateField(
              'phone',
              phone
            );

          }}

          blurOnSubmit={false}

          editable={!loading}
        />


        {/* ==================================================
            CITY
            ================================================== */}

        <FormInput
          ref={cityRef}

          label="City"
          icon="location-outline"

          value={city}

          onChangeText={(text) => {

            setCity(text);

            if (errors.city) {

              setErrors(
                (previous) => ({
                  ...previous,
                  city: null,
                })
              );

            }

          }}

          placeholder="e.g. Chennai, Bangalore, Mumbai"

          error={errors.city}

          autoCapitalize="words"
          autoCorrect={false}

          returnKeyType="next"

          onSubmitEditing={() => {

            passwordRef.current?.focus();

          }}

          onBlur={() => {

            validateField(
              'city',
              city
            );

          }}

          blurOnSubmit={false}

          editable={!loading}
        />


        {/* ==================================================
            PASSWORD
            ================================================== */}

        <PasswordField
          ref={passwordRef}

          label="Password"

          value={password}

          onChangeText={(text) => {

            setPassword(text);

            if (errors.password) {

              setErrors(
                (previous) => ({
                  ...previous,
                  password: null,
                })
              );

            }

          }}

          placeholder="Create a password"

          error={errors.password}

          returnKeyType="done"

          onSubmitEditing={
            handleSubmit
          }

          onBlur={() => {

            validateField(
              'password',
              password
            );

          }}

          blurOnSubmit={true}

          editable={!loading}
        />


        {/* ==================================================
            PASSWORD TIP
            ================================================== */}

        <View
          style={styles.passwordTip}
        >

          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.passwordTipText
            }
          >
            Use at least 8 characters with a mix of letters,
            numbers and symbols.
          </Text>

        </View>


        {/* ==================================================
            CREATE ACCOUNT
            ================================================== */}

        <Pressable
          onPress={handleSubmit}

          disabled={loading}

          style={({ pressed }) => [
            styles.signupButton,

            pressed &&
            !loading &&
            styles.signupButtonPressed,

            loading &&
            styles.signupButtonDisabled,
          ]}
        >

          <LinearGradient
            colors={[
              COLORS.primary,
              COLORS.primaryDark,
            ]}

            start={{
              x: 0,
              y: 0,
            }}

            end={{
              x: 1,
              y: 1,
            }}

            style={
              styles.signupGradient
            }
          >

            {loading ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <>

                <Text
                  style={
                    styles.signupText
                  }
                >
                  Create Account
                </Text>


                <View
                  style={
                    styles.signupIcon
                  }
                >

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />

                </View>

              </>

            )}

          </LinearGradient>

        </Pressable>


        {/* ==================================================
            LOGIN
            ================================================== */}

        <View
          style={styles.loginContainer}
        >

          <Text
            style={styles.loginPrompt}
          >
            Already have an account?
          </Text>


          <Pressable
            onPress={() =>
              navigation.navigate(
                'BuyerLogin'
              )
            }

            disabled={loading}

            style={
              styles.loginButton
            }
          >

            <Text
              style={styles.loginText}
            >
              Login
            </Text>

            <Ionicons
              name="arrow-forward"
              size={15}
              color={
                COLORS.primary
              }
            />

          </Pressable>

        </View>


        {/* ==================================================
            TERMS
            ================================================== */}

        <Text
          style={styles.termsText}
        >
          By creating an account, you agree to use REACHLO
          responsibly and keep your account information secure.
        </Text>

      </View>


      {/* BOTTOM SPACE */}

      <View
        style={styles.bottomSpace}
      />

    </ScrollView>
  );
};


/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
     SCREEN
     ========================================================== */

  container: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },


  /* ==========================================================
     HERO
     ========================================================== */

  heroSection: {
    minHeight: 340,

    backgroundColor:
      COLORS.primary,

    paddingHorizontal: 24,

    paddingTop: 40,

    paddingBottom: 88,

    alignItems: 'center',

    justifyContent: 'center',

    overflow: 'hidden',

    position: 'relative',
  },

  heroCircle: {
    position: 'absolute',

    borderRadius: 999,

    backgroundColor:
      '#FFFFFF',
  },

  heroCircleOne: {
    width: 230,

    height: 230,

    opacity: 0.07,

    right: -90,

    top: -70,
  },

  heroCircleTwo: {
    width: 180,

    height: 180,

    opacity: 0.06,

    left: -80,

    bottom: -70,
  },

  logo: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    letterSpacing: 5,

    marginBottom: 18,
  },

  heroTitle: {
    color: '#FFFFFF',

    fontSize: 32,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    textAlign: 'center',

    letterSpacing: -0.6,

    marginBottom: 9,
  },

  heroSubtitle: {
    color: '#DBEAFE',

    fontSize: 15,

    fontWeight:
      FONT_WEIGHTS.MEDIUM,

    textAlign: 'center',

    marginBottom: 28,
  },


  /* ==========================================================
     HERO FEATURES
     ========================================================== */

  heroFeatures: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  featureItem: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  featureIcon: {
    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor:
      '#FFFFFF',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 6,
  },

  featureText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,
  },

  featureDot: {
    width: 4,

    height: 4,

    borderRadius: 2,

    backgroundColor:
      '#BFDBFE',

    marginHorizontal: 12,
  },


  /* ==========================================================
     FORM CARD
     ========================================================== */

  formCard: {
    backgroundColor:
      COLORS.white,

    marginHorizontal: 18,

    marginTop: -45,

    borderRadius: 28,

    paddingHorizontal: 20,

    paddingTop: 23,

    paddingBottom: 24,

    borderWidth: 1,

    borderColor:
      '#E8EEF7',

    shadowColor:
      COLORS.shadow,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    shadowOpacity: 0.08,

    shadowRadius: 24,

    elevation: 7,
  },


  /* ==========================================================
     FORM HEADER
     ========================================================== */

  formHeader: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems:
      'flex-start',

    marginBottom: 24,
  },

  formHeaderText: {
    flex: 1,

    paddingRight: 10,
  },

  formTitle: {
    color:
      COLORS.text,

    fontSize: 19,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    marginBottom: 5,
  },

  formSubtitle: {
    color:
      COLORS.textSecondary,

    fontSize: 12.5,

    lineHeight: 18,

    maxWidth: 260,
  },

  stepBadge: {
    backgroundColor:
      COLORS.primaryLight,

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 10,
  },

  stepText: {
    color:
      COLORS.primary,

    fontSize: 11,

    fontWeight:
      FONT_WEIGHTS.BOLD,
  },


  /* ==========================================================
     INPUT
     ========================================================== */

  inputGroup: {
    marginBottom: 18,
  },

  inputLabel: {
    color:
      COLORS.text,

    fontSize: 13,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

    marginBottom: 8,

    marginLeft: 2,
  },

  inputContainer: {
    height: 54,

    minHeight: 54,

    backgroundColor:
      COLORS.inputBackground,

    borderWidth: 1.3,

    borderColor:
      COLORS.border,

    borderRadius: 14,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 13,

    overflow: 'hidden',
  },

  inputContainerFocused: {
    borderColor:
      COLORS.borderFocus,

    backgroundColor:
      '#FCFDFF',

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.08,

    shadowRadius: 7,

    elevation: 2,
  },

  inputContainerError: {
    borderColor:
      COLORS.error,

    backgroundColor:
      COLORS.errorBackground,
  },

  inputIconContainer: {
    width: 30,

    height: 40,

    alignItems:
      'flex-start',

    justifyContent:
      'center',

    flexShrink: 0,
  },

  input: {
    flex: 1,

    height: 52,

    color:
      COLORS.text,

    fontSize: 15,

    fontWeight:
      FONT_WEIGHTS.REGULAR,

    paddingVertical: 0,

    paddingHorizontal: 0,

    margin: 0,

    minWidth: 0,

    textAlignVertical:
      'center',

    includeFontPadding:
      false,
  },

  leftElement: {
    paddingRight: 10,

    marginRight: 10,

    borderRightWidth: 1,

    borderRightColor:
      COLORS.border,

    height: 26,

    justifyContent:
      'center',
  },

  countryCode: {
    color:
      COLORS.textSecondary,

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,
  },

  rightElement: {
    marginLeft: 8,
  },


  /* ==========================================================
     PASSWORD
     ========================================================== */

  passwordToggle: {
    width: 34,

    height: 42,

    alignItems:
      'flex-end',

    justifyContent:
      'center',

    flexShrink: 0,
  },

  passwordStrengthContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 8,
  },

  strengthBars: {
    flex: 1,

    flexDirection: 'row',

    gap: 4,

    marginRight: 10,
  },

  strengthBar: {
    flex: 1,

    height: 4,

    borderRadius: 4,

    backgroundColor:
      '#E2E8F0',
  },

  strengthBarActive: {
    backgroundColor:
      COLORS.primary,
  },

  strengthText: {
    fontSize: 11,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

    minWidth: 85,

    textAlign: 'right',
  },


  /* ==========================================================
     ERROR
     ========================================================== */

  errorRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 6,

    paddingHorizontal: 2,
  },

  errorText: {
    color:
      COLORS.error,

    fontSize: 11.5,

    marginLeft: 5,

    flex: 1,
  },


  /* ==========================================================
     PASSWORD TIP
     ========================================================== */

  passwordTip: {
    flexDirection: 'row',

    alignItems:
      'flex-start',

    backgroundColor:
      COLORS.primaryLight,

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    marginTop: -3,

    marginBottom: 20,
  },

  passwordTipText: {
    color:
      '#475569',

    fontSize: 11.5,

    lineHeight: 17,

    marginLeft: 8,

    flex: 1,
  },


  /* ==========================================================
     SIGN UP BUTTON
     ========================================================== */

  signupButton: {
    height: 56,

    borderRadius: 16,

    overflow: 'hidden',

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.22,

    shadowRadius: 12,

    elevation: 5,

    marginTop: 2,
  },

  signupButtonPressed: {
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  signupButtonDisabled: {
    opacity: 0.7,
  },

  signupGradient: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  signupText: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight:
      FONT_WEIGHTS.BOLD,
  },

  signupIcon: {
    marginLeft: 10,
  },


  /* ==========================================================
     LOGIN
     ========================================================== */

  loginContainer: {
    flexDirection: 'row',

    justifyContent:
      'center',

    alignItems:
      'center',

    marginTop: 22,
  },

  loginPrompt: {
    color:
      COLORS.textSecondary,

    fontSize: 13.5,
  },

  loginButton: {
    flexDirection: 'row',

    alignItems:
      'center',

    marginLeft: 5,

    paddingVertical: 5,

    paddingHorizontal: 3,
  },

  loginText: {
    color:
      COLORS.primary,

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    marginRight: 3,
  },


  /* ==========================================================
     TERMS
     ========================================================== */

  termsText: {
    color:
      COLORS.textMuted,

    fontSize: 10.5,

    lineHeight: 16,

    textAlign: 'center',

    marginTop: 18,

    paddingHorizontal: 8,
  },

  bottomSpace: {
    height: 20,
  },

});