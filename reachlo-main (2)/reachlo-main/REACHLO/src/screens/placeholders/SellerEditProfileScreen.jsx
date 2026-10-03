import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { FONT_WEIGHTS } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

/* ============================================================
   PROFILE INPUT
   ============================================================ */

const ProfileInput = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
  returnKeyType = 'next',
  onSubmitEditing,
  isDarkMode,
}) => {
  const [focused, setFocused] = useState(false);

  const colors = {
    label: isDarkMode ? '#CBD5E1' : '#475569',

    inputBackground: isDarkMode
      ? '#171B2B'
      : '#F8FAFC',

    inputBorder: focused
      ? '#7C3AED'
      : isDarkMode
        ? '#2B3145'
        : '#E2E8F0',

    icon: focused
      ? '#7C3AED'
      : isDarkMode
        ? '#94A3B8'
        : '#64748B',

    text: isDarkMode
      ? '#F8FAFC'
      : '#172033',

    placeholder: isDarkMode
      ? '#64748B'
      : '#94A3B8',
  };

  return (
    <View style={styles.fieldWrapper}>

      {/* LABEL */}
      <Text
        style={[
          styles.fieldLabel,
          {
            color: colors.label,
          },
        ]}
      >
        {label}
      </Text>

      {/* INPUT */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          },
          focused && styles.inputFocused,
        ]}
      >

        {/* ICON */}
        <View
          style={[
            styles.inputIconContainer,
            {
              backgroundColor: focused
                ? isDarkMode
                  ? '#251A43'
                  : '#F1EDFF'
                : isDarkMode
                  ? '#202538'
                  : '#F1F5F9',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={colors.icon}
          />
        </View>

        {/* TEXT INPUT */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}

          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}

          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}

          selectionColor="#7C3AED"
          cursorColor="#7C3AED"

          editable={true}
          multiline={false}

          style={[
            styles.textInput,
            {
              color: colors.text,
            },
          ]}
        />

      </View>
    </View>
  );
};


/* ============================================================
   MAIN SCREEN
   ============================================================ */

export default function SellerEditProfileScreen({
  navigation,
}) {

  const { isDarkMode } = useTheme();

  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');

  const [loading, setLoading] = useState(false);


  /* ============================================================
     THEME COLORS
     ============================================================ */

  const colors = {

    background: isDarkMode
      ? '#080A16'
      : '#F5F7FB',

    headerBackground: isDarkMode
      ? '#0D1020'
      : '#FFFFFF',

    headerBorder: isDarkMode
      ? '#1F2538'
      : '#E8ECF2',

    primaryText: isDarkMode
      ? '#F8FAFC'
      : '#172554',

    secondaryText: isDarkMode
      ? '#A8B1C3'
      : '#64748B',

    mutedText: isDarkMode
      ? '#78839A'
      : '#94A3B8',

    cardBackground: isDarkMode
      ? '#101423'
      : '#FFFFFF',

    cardBorder: isDarkMode
      ? '#242A3D'
      : '#E3E8EF',

    iconBackground: isDarkMode
      ? '#211A3A'
      : '#F0ECFF',

    infoBackground: isDarkMode
      ? '#101B30'
      : '#F0F7FF',

    infoBorder: isDarkMode
      ? '#233A60'
      : '#D9E9FC',

    infoIconBackground: isDarkMode
      ? '#182C4B'
      : '#E5F0FF',
  };


  /* ============================================================
     VALIDATION
     ============================================================ */

  const validateEmail = (text) => {
    const reg =
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;

    return reg.test(text.trim());
  };


  /* ============================================================
     SAVE
     ============================================================ */

  const handleSave = async () => {

    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert(
        'Validation Error',
        'Name cannot be empty.'
      );
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid email address.'
      );
      return;
    }

    if (
      !phone.trim() ||
      phone.replace(/[^0-9]/g, '').length < 10
    ) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid phone number.'
      );
      return;
    }

    if (!city.trim()) {
      Alert.alert(
        'Validation Error',
        'City cannot be empty.'
      );
      return;
    }

    setLoading(true);

    try {

      const response = await apiService.request(
        '/auth/me',
        {
          method: 'PATCH',

          body: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.replace(/[^0-9]/g, ''),
            city: city.trim(),
          },
        }
      );

      if (updateUserProfile) {

        updateUserProfile({
          name: response.name,
          email: response.email,
          phone: response.phone,
          city: response.city,
        });

      }

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (e) {

      Alert.alert(
        'Error',
        e.message || 'Failed to update profile.'
      );

    } finally {

      setLoading(false);

    }
  };


  /* ============================================================
     UI
     ============================================================ */

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >

      {/* ======================================================
          KEYBOARD HANDLING
          IMPORTANT:
          Android does NOT use KeyboardAvoidingView.
         ====================================================== */}

      {Platform.OS === 'ios' ? (

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior="padding"
        >
          <ProfileContent
            navigation={navigation}
            colors={colors}
            isDarkMode={isDarkMode}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            city={city}
            setCity={setCity}
            loading={loading}
            handleSave={handleSave}
          />
        </KeyboardAvoidingView>

      ) : (

        /*
         * Android:
         * Use a normal View instead of KeyboardAvoidingView.
         * This prevents the screen from repeatedly resizing/jumping.
         */

        <View style={styles.keyboardContainer}>
          <ProfileContent
            navigation={navigation}
            colors={colors}
            isDarkMode={isDarkMode}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            city={city}
            setCity={setCity}
            loading={loading}
            handleSave={handleSave}
          />
        </View>

      )}

    </SafeAreaView>
  );
}


/* ============================================================
   CONTENT
   ============================================================ */

const ProfileContent = ({
  navigation,
  colors,
  isDarkMode,

  name,
  setName,

  email,
  setEmail,

  phone,
  setPhone,

  city,
  setCity,

  loading,
  handleSave,
}) => {

  return (
    <View style={styles.contentContainer}>

      {/* ======================================================
          HEADER
          ====================================================== */}

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >

        {/* BACK BUTTON */}

        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: isDarkMode
                ? '#171B2B'
                : '#F1F5F9',
            },
            pressed && styles.pressed,
          ]}
        >

          <Ionicons
            name="arrow-back"
            size={23}
            color={
              isDarkMode
                ? '#E2E8F0'
                : '#1E3A8A'
            }
          />

        </Pressable>


        {/* HEADER TEXT */}

        <View style={styles.headerTextContainer}>

          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.primaryText,
              },
            ]}
          >
            Edit Profile
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            Update your personal information
          </Text>

        </View>


        {/* HEADER ICON */}

        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor: colors.iconBackground,
            },
          ]}
        >

          <Ionicons
            name="person-outline"
            size={20}
            color="#7C3AED"
          />

        </View>

      </View>


      {/* ======================================================
          SCROLL CONTENT
          ====================================================== */}

      <ScrollView
        style={styles.scrollView}

        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 60,
          },
        ]}

        showsVerticalScrollIndicator={false}

        keyboardShouldPersistTaps="always"

        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }

        automaticallyAdjustKeyboardInsets={false}

        nestedScrollEnabled={true}
      >


        {/* ==================================================
            INTRO
            ================================================== */}

        <View style={styles.introSection}>

          <Text
            style={[
              styles.pageTitle,
              {
                color: colors.primaryText,
              },
            ]}
          >
            Personal Details
          </Text>

        </View>


        {/* ==================================================
            FORM CARD
            ================================================== */}

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >

          {/* CARD HEADER */}

          <View style={styles.sectionHeader}>

            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    colors.iconBackground,
                },
              ]}
            >

              <Ionicons
                name="person-outline"
                size={20}
                color="#7C3AED"
              />

            </View>


            <View style={styles.sectionHeaderText}>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.primaryText,
                  },
                ]}
              >
                Account Information
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                Your basic profile details
              </Text>

            </View>

          </View>


          {/* DIVIDER */}

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  colors.cardBorder,
              },
            ]}
          />


          {/* =================================================
              FULL NAME
              ================================================= */}

          <ProfileInput
            icon="person-outline"
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            isDarkMode={isDarkMode}
          />


          {/* =================================================
              EMAIL
              ================================================= */}

          <ProfileInput
            icon="mail-outline"
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            isDarkMode={isDarkMode}
          />


          {/* =================================================
              PHONE
              ================================================= */}

          <ProfileInput
            icon="call-outline"
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            isDarkMode={isDarkMode}
          />


          {/* =================================================
              CITY
              ================================================= */}

          <ProfileInput
            icon="location-outline"
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Enter your city"
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            isDarkMode={isDarkMode}
          />

        </View>


        {/* ==================================================
            SECURITY INFORMATION
            ================================================== */}

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                colors.infoBackground,

              borderColor:
                colors.infoBorder,
            },
          ]}
        >

          <View
            style={[
              styles.infoIcon,
              {
                backgroundColor:
                  colors.infoIconBackground,
              },
            ]}
          >

            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#3B82F6"
            />

          </View>


          <View style={styles.infoContent}>

            <Text
              style={[
                styles.infoTitle,
                {
                  color: colors.primaryText,
                },
              ]}
            >
              Your information is secure
            </Text>

            <Text
              style={[
                styles.infoDescription,
                {
                  color: colors.secondaryText,
                },
              ]}
            >
              Your personal details are protected
              and used only to manage your Reachlo
              account.
            </Text>

          </View>

        </View>


        {/* ==================================================
            ACTIONS
            ================================================== */}

        <View style={styles.buttonContainer}>

          {loading ? (

            <View style={styles.loadingContainer}>

              <ActivityIndicator
                size="small"
                color="#7C3AED"
              />

              <Text
                style={[
                  styles.loadingText,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                Saving changes...
              </Text>

            </View>

          ) : (

            <>

              {/* SAVE BUTTON */}

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                ]}
              >

                <LinearGradient
                  colors={[
                    '#8B5CF6',
                    '#6366F1',
                    '#2563EB',
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={styles.saveGradient}
                >

                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.saveButtonText}
                  >
                    Save Changes
                  </Text>

                </LinearGradient>

              </Pressable>


              {/* CANCEL BUTTON */}

              <Pressable
                onPress={() =>
                  navigation.goBack()
                }
                style={({ pressed }) => [
                  styles.cancelButton,
                  {
                    backgroundColor:
                      colors.cardBackground,

                    borderColor:
                      colors.cardBorder,
                  },
                  pressed && styles.buttonPressed,
                ]}
              >

                <Ionicons
                  name="close-outline"
                  size={19}
                  color={colors.secondaryText}
                />

                <Text
                  style={[
                    styles.cancelButtonText,
                    {
                      color:
                        colors.secondaryText,
                    },
                  ]}
                >
                  Cancel
                </Text>

              </Pressable>

            </>

          )}

        </View>


        <View style={styles.bottomSpacing} />

      </ScrollView>

    </View>
  );
};


/* ==============================================================
   STYLES
   ============================================================== */

const styles = StyleSheet.create({

  /* ==========================================================
     MAIN
     ========================================================== */

  container: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  contentContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },


  /* ==========================================================
     HEADER
     ========================================================== */

  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 14,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },

  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },


  /* ==========================================================
     INTRO
     ========================================================== */

  introSection: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.6,
  },


  /* ==========================================================
     FORM CARD
     ========================================================== */

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 19,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionHeaderText: {
    marginLeft: 12,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  sectionSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },

  divider: {
    height: 1,
    marginVertical: 19,
  },


  /* ==========================================================
     INPUT
     ========================================================== */

  fieldWrapper: {
    marginBottom: 17,
  },

  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 56,
    height: 56,

    borderRadius: 14,

    borderWidth: 1,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,

    overflow: 'hidden',
  },

  inputFocused: {
    shadowColor: '#7C3AED',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,

    shadowRadius: 5,

    elevation: 2,
  },

  inputIconContainer: {
    width: 36,
    height: 36,

    borderRadius: 10,

    justifyContent: 'center',
    alignItems: 'center',

    flexShrink: 0,
  },

  textInput: {
    flex: 1,

    height: 54,

    fontSize: 16,

    marginLeft: 9,

    paddingHorizontal: 0,
    paddingVertical: 0,

    includeFontPadding: false,

    textAlignVertical: 'center',

    minWidth: 0,
  },


  /* ==========================================================
     INFO CARD
     ========================================================== */

  infoCard: {
    marginTop: 18,

    borderRadius: 17,

    borderWidth: 1,

    padding: 15,

    flexDirection: 'row',

    alignItems: 'flex-start',
  },

  infoIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14.5,

    fontWeight: FONT_WEIGHTS.BOLD,

    marginBottom: 4,
  },

  infoDescription: {
    fontSize: 12.5,

    lineHeight: 18,
  },


  /* ==========================================================
     BUTTONS
     ========================================================== */

  buttonContainer: {
    marginTop: 22,
  },

  saveButton: {
    height: 54,

    borderRadius: 15,

    overflow: 'hidden',

    shadowColor: '#6366F1',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.18,

    shadowRadius: 9,

    elevation: 4,
  },

  saveGradient: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: FONT_WEIGHTS.BOLD,
  },

  cancelButton: {
    height: 52,

    borderRadius: 15,

    borderWidth: 1,

    marginTop: 11,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 5,
  },

  cancelButtonText: {
    fontSize: 15,

    fontWeight: FONT_WEIGHTS.BOLD,
  },


  /* ==========================================================
     LOADING
     ========================================================== */

  loadingContainer: {
    height: 54,

    alignItems: 'center',

    justifyContent: 'center',

    flexDirection: 'row',

    gap: 9,
  },

  loadingText: {
    fontSize: 14,

    fontWeight: '600',
  },


  /* ==========================================================
     PRESS STATES
     ========================================================== */

  pressed: {
    opacity: 0.75,
  },

  buttonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  bottomSpacing: {
    height: 20,
  },

});