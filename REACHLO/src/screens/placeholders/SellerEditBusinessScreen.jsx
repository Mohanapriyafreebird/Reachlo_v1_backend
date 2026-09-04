import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const ACCENT = '#7C3AED';
const BLUE = '#2563EB';

export default function SellerEditBusinessScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [businessUsp, setBusinessUsp] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBusinessDetails = async () => {
      try {
        const data = await apiService.get('/businesses/me');

        setBusinessName(data.name || '');
        setBusinessDesc(data.business_description || '');
        setBusinessUsp(data.usp || '');
      } catch (e) {
        console.warn('Failed to load business profile:', e);

        Alert.alert(
          'Unable to load',
          'We could not load your business details. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadBusinessDetails();
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert(
        'Business name required',
        'Please enter your business name before saving.'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: businessName.trim(),
        business_description: businessDesc.trim() || null,
        usp: businessUsp.trim() || null,
      };

      await apiService.request('/businesses/me', {
        method: 'PATCH',
        body: payload,
      });

      Alert.alert(
        'Changes saved',
        'Your business details have been updated successfully.',
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      Alert.alert(
        'Update failed',
        e.message || 'Failed to update business details.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Reusable themed input
   */
  const renderField = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    multiline = false,
    helperText,
  }) => {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.text },
            ]}
          >
            {label}
          </Text>

          {label === 'Business Name' && (
            <Text style={[styles.requiredText, { color: ACCENT }]}>
              Required
            </Text>
          )}
        </View>

        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: isDarkMode
                ? '#151A2C'
                : '#F8FAFC',

              borderColor: isDarkMode
                ? '#293149'
                : '#E2E8F0',
            },

            multiline && styles.textAreaWrapper,
          ]}
        >
          <View
            style={[
              styles.inputIconContainer,
              {
                backgroundColor: isDarkMode
                  ? '#211B3B'
                  : '#F0EBFF',
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={19}
              color={ACCENT}
            />
          </View>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={
              isDarkMode ? '#69738A' : '#94A3B8'
            }
            multiline={multiline}
            numberOfLines={multiline ? 5 : 1}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={[
              styles.input,
              {
                color: theme.text,
              },
              multiline && styles.textArea,
            ]}
            autoCapitalize="sentences"
            selectionColor={ACCENT}
          />
        </View>

        {helperText && (
          <Text
            style={[
              styles.helperText,
              { color: theme.textSecondary },
            ]}
          >
            {helperText}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.background,
        },
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: isDarkMode
                ? '#1D2435'
                : '#E8EDF4',
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: isDarkMode
                  ? '#151A2C'
                  : '#F1F5F9',

                borderColor: isDarkMode
                  ? '#293149'
                  : '#E2E8F0',
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={theme.text}
            />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.text },
              ]}
            >
              Business Profile
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Manage your business information
            </Text>
          </View>

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: isDarkMode
                  ? '#211B3B'
                  : '#F0EBFF',
              },
            ]}
          >
            <Ionicons
              name="storefront-outline"
              size={22}
              color={ACCENT}
            />
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <View
              style={[
                styles.loadingIcon,
                {
                  backgroundColor: isDarkMode
                    ? '#211B3B'
                    : '#F0EBFF',
                },
              ]}
            >
              <Ionicons
                name="storefront-outline"
                size={28}
                color={ACCENT}
              />
            </View>

            <ActivityIndicator
              size="small"
              color={ACCENT}
              style={{ marginTop: 18 }}
            />

            <Text
              style={[
                styles.loadingTitle,
                { color: theme.text },
              ]}
            >
              Loading business details
            </Text>

            <Text
              style={[
                styles.loadingSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Please wait a moment...
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >

            {/* =================================================
                FORM CARD
            ================================================= */}
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isDarkMode
                    ? '#222B40'
                    : '#E3E8EF',
                },
              ]}
            >
              {/* CARD HEADER */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardHeaderIcon,
                    {
                      backgroundColor: isDarkMode
                        ? '#211B3B'
                        : '#F0EBFF',
                    },
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color={ACCENT}
                  />
                </View>

                <View style={styles.cardHeaderText}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.text },
                    ]}
                  >
                    Business information
                  </Text>

                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDarkMode
                      ? '#252D40'
                      : '#E9EDF3',
                  },
                ]}
              />

              {/* BUSINESS NAME */}
              {renderField({
                label: 'Business Name',
                value: businessName,
                onChangeText: setBusinessName,
                placeholder: 'Enter your business name',
                icon: 'business-outline',
                helperText:
                  'Use the name customers know your business by.',
              })}

              {/* DESCRIPTION */}
              {renderField({
                label: 'Business Description',
                value: businessDesc,
                onChangeText: setBusinessDesc,
                placeholder:
                  'Describe what your business provides...',
                icon: 'document-text-outline',
                multiline: true,
                helperText:
                  'Briefly explain your products, services, or experience.',
              })}

              {/* USP */}
              {renderField({
                label: 'Unique Selling Proposition',
                value: businessUsp,
                onChangeText: setBusinessUsp,
                placeholder:
                  'What makes your business different?',
                icon: 'sparkles-outline',
                multiline: true,
                helperText:
                  'Highlight what customers get from you that they may not get elsewhere.',
              })}
            </View>

            {/* =================================================
                TIP CARD
            ================================================= */}
            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: isDarkMode
                    ? '#111C31'
                    : '#F0F7FF',

                  borderColor: isDarkMode
                    ? '#1E3558'
                    : '#D7E8FA',
                },
              ]}
            >
              <View
                style={[
                  styles.tipIcon,
                  {
                    backgroundColor: isDarkMode
                      ? '#172A46'
                      : '#E1F0FF',
                  },
                ]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={20}
                  color={BLUE}
                />
              </View>

              <View style={styles.tipContent}>
                <Text
                  style={[
                    styles.tipTitle,
                    { color: theme.text },
                  ]}
                >
                  Make your profile stand out
                </Text>

                <Text
                  style={[
                    styles.tipText,
                    { color: theme.textSecondary },
                  ]}
                >
                  A clear description and strong USP help AI
                  campaigns create more relevant promotional content.
                </Text>
              </View>
            </View>

            {/* =================================================
                ACTION BUTTONS
            ================================================= */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && !saving && styles.pressed,
                  saving && styles.disabledButton,
                ]}
              >
                <LinearGradient
                  colors={
                    isDarkMode
                      ? ['#8B5CF6', '#4F46E5']
                      : ['#7C3AED', '#2563EB']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradient}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={21}
                        color="#FFFFFF"
                      />

                      <Text style={styles.saveButtonText}>
                        Save Changes
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                disabled={saving}
                style={({ pressed }) => [
                  styles.cancelButton,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isDarkMode
                      ? '#293149'
                      : '#DCE3EC',
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    {
                      color: theme.textSecondary,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.bottomNote,
                { color: theme.textTertiary },
              ]}
            >
              Your business information is used to personalize
              your Reachlo campaigns.
            </Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  /* =========================================================
     HEADER
  ========================================================= */

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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 21,
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

  /* =========================================================
     SCROLL
  ========================================================= */

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 40,
  },

  /* =========================================================
     INTRO
  ========================================================= */

  introSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  introText: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.6,
  },

  pageDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },

  /* =========================================================
     FORM CARD
  ========================================================= */

  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  cardSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    marginVertical: 20,
  },

  /* =========================================================
     INPUTS
  ========================================================= */

  fieldContainer: {
    marginBottom: 21,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  requiredText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  inputWrapper: {
    minHeight: 56,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  textAreaWrapper: {
    minHeight: 128,
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 10,
  },

  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    minHeight: 40,
  },

  textArea: {
    minHeight: 105,
    paddingTop: 7,
    paddingBottom: 5,
    lineHeight: 21,
  },

  helperText: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 6,
    paddingHorizontal: 2,
  },

  /* =========================================================
     TIP CARD
  ========================================================= */

  tipCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    marginTop: 15,
  },

  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  tipText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  /* =========================================================
     ACTIONS
  ========================================================= */

  actionsContainer: {
    marginTop: 24,
    gap: 11,
  },

  saveButton: {
    height: 55,
    borderRadius: 16,
    overflow: 'hidden',

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
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
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  cancelButton: {
    height: 53,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  disabledButton: {
    opacity: 0.7,
  },

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },

  bottomNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 18,
    paddingHorizontal: 20,
  },

  /* =========================================================
     LOADING
  ========================================================= */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginTop: 14,
  },

  loadingSubtitle: {
    fontSize: 13,
    marginTop: 5,
  },
});