import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import apiService from '../../services/apiService';
import Toast from '../../components/Toast';

const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  setVisible,
  icon,
  colors,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text
        style={[
          styles.label,
          { color: colors.secondaryText },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isFocused
              ? colors.inputFocused
              : colors.input,
            borderColor: isFocused
              ? colors.borderFocused
              : colors.border,
            shadowColor: isFocused
              ? colors.accent
              : 'transparent',
            shadowOpacity: isFocused ? 0.12 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.inputIconContainer,
            {
              backgroundColor: isFocused
                ? colors.iconBg
                : 'transparent',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={
              isFocused
                ? colors.icon
                : colors.tertiaryText
            }
          />
        </View>

        <TextInput
          style={[
            styles.input,
            { color: colors.text },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.tertiaryText}
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          onPress={() => setVisible(!visible)}
          style={styles.eyeButton}
          hitSlop={8}
        >
          <Ionicons
            name={
              visible
                ? 'eye-outline'
                : 'eye-off-outline'
            }
            size={21}
            color={colors.tertiaryText}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default function SellerChangePasswordScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingPassword, setSavingPassword] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /*
   * ---------------------------------------------------------
   * Theme-aware colors
   * ---------------------------------------------------------
   */

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

        iconBg: '#211B3D',
        icon: '#A78BFA',

        infoBg: '#111B2D',
        infoBorder: '#243B62',

        requirementBg: '#151A29',

        danger: '#F87171',
        success: '#34D399',
      };
    }

    return {
      background: '#F5F7FB',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      input: '#F8FAFC',
      inputFocused: '#FFFFFF',

      border: '#E2E8F0',
      borderFocused: '#7C3AED',

      text: '#172554',
      secondaryText: '#64748B',
      tertiaryText: '#94A3B8',

      accent: '#7C3AED',
      accentBlue: '#2563EB',

      iconBg: '#F0ECFF',
      icon: '#7C3AED',

      infoBg: '#EFF6FF',
      infoBorder: '#DBEAFE',

      requirementBg: '#F8FAFC',

      danger: '#DC2626',
      success: '#059669',
    };
  }, [isDarkMode]);

  /*
   * ---------------------------------------------------------
   * Toast
   * ---------------------------------------------------------
   */

  const displayToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
  };

  /*
   * ---------------------------------------------------------
   * Password requirements
   * ---------------------------------------------------------
   */

  const passwordRequirements = [
    {
      label: 'At least 6 characters',
      valid: newPassword.length >= 6,
    },
    {
      label: 'Passwords match',
      valid:
        newPassword.length > 0 &&
        confirmPassword.length > 0 &&
        newPassword === confirmPassword,
    },
  ];

  /*
   * ---------------------------------------------------------
   * Password strength
   * ---------------------------------------------------------
   */

  const getPasswordStrength = () => {
    if (!newPassword) {
      return {
        label: 'Enter a password',
        progress: 0,
        color: colors.tertiaryText,
      };
    }

    let score = 0;

    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) {
      return {
        label: 'Weak',
        progress: 25,
        color: colors.danger,
      };
    }

    if (score <= 3) {
      return {
        label: 'Good',
        progress: 60,
        color: '#F59E0B',
      };
    }

    return {
      label: 'Strong',
      progress: 100,
      color: colors.success,
    };
  };

  const passwordStrength = getPasswordStrength();

  /*
   * ---------------------------------------------------------
   * Update Password
   * ---------------------------------------------------------
   */

  const handleUpdatePassword = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      displayToast('Please fill all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      displayToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      displayToast(
        'New password must be at least 6 characters',
        'error'
      );
      return;
    }

    setSavingPassword(true);

    try {
      await apiService.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      displayToast('Password updated successfully!', 'success');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (e) {
      displayToast(
        e.message || 'Failed to update password',
        'error'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: isDarkMode
                  ? colors.surfaceElevated
                  : '#F1F5F9',

                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerContent}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Change Password
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: colors.secondaryText,
                },
              ]}
            >
              Keep your account secure
            </Text>
          </View>

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: colors.iconBg,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={colors.icon}
            />
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Security Hero */}

          <View
            style={[
              styles.securityHero,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <LinearGradient
              colors={
                isDarkMode
                  ? ['#211A42', '#15213D']
                  : ['#F1ECFF', '#EFF6FF']
              }
              style={styles.securityHeroGradient}
            >
              <View
                style={[
                  styles.securityIcon,
                  {
                    backgroundColor: isDarkMode
                      ? '#2C2452'
                      : '#FFFFFF',
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={25}
                  color={colors.icon}
                />
              </View>

              <View style={styles.securityText}>
                <Text
                  style={[
                    styles.securityTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Protect your account
                </Text>

                <Text
                  style={[
                    styles.securityDescription,
                    {
                      color: colors.secondaryText,
                    },
                  ]}
                >
                  Choose a strong password that you
                  don't use anywhere else.
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* =================================================
              FORM CARD
          ================================================== */}

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Card Header */}

            <View style={styles.formHeader}>
              <View>
                <Text
                  style={[
                    styles.formTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Password Details
                </Text>

                <Text
                  style={[
                    styles.formSubtitle,
                    {
                      color: colors.secondaryText,
                    },
                  ]}
                >
                  Update your login credentials
                </Text>
              </View>

              <View
                style={[
                  styles.smallLock,
                  {
                    backgroundColor: colors.iconBg,
                  },
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={19}
                  color={colors.icon}
                />
              </View>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: colors.border,
                },
              ]}
            />

            {/* Current Password */}

            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              visible={showCurrentPassword}
              setVisible={setShowCurrentPassword}
              icon="lock-closed-outline"
              colors={colors}
            />

            {/* New Password */}

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Create a new password"
              visible={showNewPassword}
              setVisible={setShowNewPassword}
              icon="key-outline"
              colors={colors}
            />

            {/* Password Strength */}

            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthHeader}>
                  <Text
                    style={[
                      styles.strengthLabel,
                      {
                        color: colors.secondaryText,
                      },
                    ]}
                  >
                    Password strength
                  </Text>

                  <Text
                    style={[
                      styles.strengthValue,
                      {
                        color: passwordStrength.color,
                      },
                    ]}
                  >
                    {passwordStrength.label}
                  </Text>
                </View>

                <View
                  style={[
                    styles.progressTrack,
                    {
                      backgroundColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${passwordStrength.progress}%`,
                        backgroundColor:
                          passwordStrength.color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Confirm Password */}

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              visible={showConfirmPassword}
              setVisible={setShowConfirmPassword}
              icon="checkmark-circle-outline"
              colors={colors}
            />

            {/* =================================================
                REQUIREMENTS
            ================================================== */}

            <View
              style={[
                styles.requirementsBox,
                {
                  backgroundColor:
                    colors.requirementBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.requirementsHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.icon}
                />

                <Text
                  style={[
                    styles.requirementsTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Password requirements
                </Text>
              </View>

              {passwordRequirements.map(
                (requirement, index) => (
                  <View
                    key={index}
                    style={styles.requirementRow}
                  >
                    <Ionicons
                      name={
                        requirement.valid
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={17}
                      color={
                        requirement.valid
                          ? colors.success
                          : colors.tertiaryText
                      }
                    />

                    <Text
                      style={[
                        styles.requirementText,
                        {
                          color: requirement.valid
                            ? colors.text
                            : colors.secondaryText,
                        },
                      ]}
                    >
                      {requirement.label}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Security Information */}

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.infoBg,
                borderColor: colors.infoBorder,
              },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                {
                  backgroundColor: isDarkMode
                    ? '#172746'
                    : '#FFFFFF',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={colors.accentBlue}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text
                style={[
                  styles.infoTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Your account is protected
              </Text>

              <Text
                style={[
                  styles.infoDescription,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                Your password is securely updated
                through your account settings.
              </Text>
            </View>
          </View>

          {/* Extra bottom space */}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* =====================================================
            BOTTOM ACTION
        ====================================================== */}

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={[
              styles.saveButton,
              savingPassword &&
              styles.saveButtonDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={savingPassword}
          >
            <LinearGradient
              colors={['#8B5CF6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {savingPassword ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.saveButtonText}>
                    Update Password
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <Text
              style={[
                styles.cancelText,
                {
                  color: colors.secondaryText,
                },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
===============================================================
STYLES
===============================================================
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  /*
   * Header
   */

  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  headerContent: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /*
   * Scroll
   */

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },

  /*
   * Security Hero
   */

  securityHero: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  securityHeroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
  },

  securityIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  securityText: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 4,
  },

  securityDescription: {
    fontSize: 13,
    lineHeight: 19,
  },

  /*
   * Form
   */

  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 2,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  formTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  formSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  smallLock: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  /*
   * Inputs
   */

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.SEMIBOLD || '600',
    marginBottom: 8,
    marginLeft: 2,
  },

  inputWrapper: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowRadius: 8,

    elevation: 0,
  },

  inputIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 3,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    paddingHorizontal: 8,
  },

  eyeButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /*
   * Password strength
   */

  strengthContainer: {
    marginTop: -7,
    marginBottom: 18,
    paddingHorizontal: 2,
  },

  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },

  strengthLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  strengthValue: {
    fontSize: 11,
    fontWeight: '700',
  },

  progressTrack: {
    height: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    borderRadius: 10,
  },

  /*
   * Requirements
   */

  requirementsBox: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 14,
    marginTop: 2,
  },

  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  requirementsTitle: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginLeft: 8,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  requirementText: {
    fontSize: 12,
    marginLeft: 8,
  },

  /*
   * Information card
   */

  infoCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 3,
  },

  infoDescription: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  /*
   * Footer
   */

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom:
      Platform.OS === 'ios' ? 8 : 14,
    borderTopWidth: 1,
  },

  saveButton: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',

    shadowColor: '#6D28D9',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,

    elevation: 4,
  },

  saveGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginLeft: 8,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  cancelButton: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});