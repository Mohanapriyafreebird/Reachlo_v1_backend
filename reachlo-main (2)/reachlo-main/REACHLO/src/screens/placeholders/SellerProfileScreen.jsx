import React, { useState, useEffect, useRef } from 'react';
import {
  Switch,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager,
  Modal,
  Image,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import COLORS from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import Toast from '../../components/Toast';
import BusinessLocationPicker from '../../components/BusinessLocationPicker';
import RatingModal from '../../components/RatingModal';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';


// ============================================================
// ANDROID LAYOUT ANIMATION
// ============================================================

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// ============================================================
// MAIN SCREEN
// ============================================================

export default function SellerProfileScreen({ navigation }) {

  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { updateUserProfile, logout } = useAuth();

  // ==========================================================
  // THEME COLORS
  // ==========================================================

  const colors = isDarkMode
    ? {
        background: '#070B16',
        header: '#111A2D',
        surface: '#182542',
        surfaceElevated: '#111A2D',
        surfaceSoft: '#182542',
        input: '#182542',
        inputPressed: '#223254',
        border: 'rgba(255,255,255,0.12)',
        borderStrong: 'rgba(255,255,255,0.16)',
        divider: 'rgba(255,255,255,0.08)',
        text: '#F8FAFF',
        textSecondary: '#AAB6CC',
        textMuted: '#8491A6',
        placeholder: '#6F7D92',
        primary: '#5B8CFF',
        primaryBlue: '#5B8CFF',
        primarySoft: 'rgba(91,140,255,0.16)',
        primarySofter: 'rgba(91,140,255,0.09)',
        blueSoft: 'rgba(91,140,255,0.15)',
        success: '#4ADE80',
        successBg: 'rgba(34,197,94,0.12)',
        successBorder: 'rgba(74,222,128,0.25)',
        danger: '#EF4444',
        dangerBg: '#301719',
        dangerBorder: '#65262A',
      }
    : {
        background: '#F7F9FC',
        header: '#FFFFFF',
        surface: '#F3F7FF',
        surfaceElevated: '#FFFFFF',
        surfaceSoft: '#F8FAFF',
        input: '#F8FAFC',
        inputPressed: '#F5F7FF',
        border: '#E4EAF2',
        borderStrong: '#CBD5E1',
        divider: '#E7EBF0',
        text: '#111827',
        textSecondary: '#667085',
        textMuted: '#8A94A6',
        placeholder: '#98A2B3',
        primary: '#3478F6',
        primaryBlue: '#3478F6',
        primarySoft: '#EAF0FF',
        primarySofter: '#F2F6FF',
        blueSoft: '#EAF0FF',
        success: '#16A34A',
        successBg: '#F0FDF4',
        successBorder: '#BBF7D0',
        danger: '#EF4444',
        dangerBg: '#FEF2F2',
        dangerBorder: '#FECACA',
      };


  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);

  // Personal
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');

  // Business
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [usp, setUsp] = useState('');
  const [category, setCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Location
  const [locationAddress, setLocationAddress] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Profile image
  const [profileImage, setProfileImage] = useState(null);

  // Chat settings
  const [showChatSettingsModal, setShowChatSettingsModal] =
    useState(false);

  const [chatRetention, setChatRetention] =
    useState('forever');

  const [savingChatSettings, setSavingChatSettings] =
    useState(false);

  // FAQ
  const [showFaqModal, setShowFaqModal] =
    useState(false);

  // Rating
  const [showRatingModal, setShowRatingModal] =
    useState(false);

  // Original values
  const original = useRef({});

  // Save animation
  const saveAnim = useRef(
    new Animated.Value(0)
  ).current;

  // Toast
  const [toastVisible, setToastVisible] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState('');

  const [toastType, setToastType] =
    useState('success');


  // ==========================================================
  // TOAST
  // ==========================================================

  const showToast = (
    message,
    type = 'success'
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };


  // ==========================================================
  // LOAD CHAT SETTINGS
  // ==========================================================

  useEffect(() => {

    const loadChatSettings = async () => {

      try {

        const value =
          await AsyncStorage.getItem(
            'chat_retention_policy'
          );

        if (value) {
          setChatRetention(value);
        }

      } catch (error) {
        // Ignore local storage errors
      }

    };

    loadChatSettings();

  }, []);


  // ==========================================================
  // SAVE CHAT SETTINGS
  // ==========================================================

  const saveChatSettings = async (policy) => {

    setSavingChatSettings(true);

    try {

      await AsyncStorage.setItem(
        'chat_retention_policy',
        policy
      );

      setChatRetention(policy);

      showToast(
        'Chat settings updated successfully',
        'success'
      );

      setTimeout(() => {
        setShowChatSettingsModal(false);
      }, 500);

    } catch (error) {

      showToast(
        'Failed to update chat settings',
        'error'
      );

    } finally {

      setSavingChatSettings(false);

    }
  };


  // ==========================================================
  // CHECK CHANGES
  // ==========================================================

  const hasChanges = () => {

    return (
      name !== original.current.name ||
      phone !== original.current.phone ||
      businessName !== original.current.businessName ||
      businessDescription !==
        original.current.businessDescription ||
      usp !== original.current.usp ||
      website !== original.current.website ||
      gstNumber !== original.current.gstNumber ||
      profileImage !==
        original.current.profileImage ||
      locationData !== null
    );

  };


  // ==========================================================
  // SAVE BUTTON ANIMATION
  // ==========================================================

  useEffect(() => {

    Animated.spring(saveAnim, {
      toValue:
        (isEditingPersonal ||
          isEditingBusiness) &&
        hasChanges()
          ? 1
          : 0,

      useNativeDriver: true,

      tension: 80,

      friction: 12,
    }).start();

  }, [
    isEditingPersonal,
    isEditingBusiness,
    name,
    phone,
    businessName,
    businessDescription,
    usp,
    website,
    gstNumber,
    profileImage,
    locationData,
  ]);


  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(() => {

    loadProfile();

  }, []);


  const loadProfile = async () => {

    setLoading(true);

    try {

      const data =
        await apiService.get(
          '/businesses/me/full'
        );

      setProfile(data);

      setName(data.name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setCity(data.city || '');

      setBusinessName(
        data.business_name || ''
      );

      setBusinessDescription(
        data.business_description || ''
      );

      setUsp(data.usp || '');

      setCategory(
        data.category || ''
      );

      setWebsite(
        data.website_url || ''
      );

      setGstNumber(
        data.gst_number || ''
      );

      setLocationAddress(
        data.location_address || ''
      );

      setProfileImage(
        data.profile_image_url || null
      );


      original.current = {

        name: data.name || '',

        phone: data.phone || '',

        businessName:
          data.business_name || '',

        businessDescription:
          data.business_description || '',

        usp: data.usp || '',

        website:
          data.website_url || '',

        gstNumber:
          data.gst_number || '',

        profileImage:
          data.profile_image_url || null,

      };


      try {

        const stats =
          await apiService.get(
            '/businesses/me/analytics'
          );

        setAnalytics(stats);

      } catch (analyticsError) {

        setAnalytics(null);

      }

    } catch (error) {

      showToast(
        'Failed to load profile. Please try again.',
        'error'
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // IMAGE PICKER
  // ==========================================================

  const handlePickImage = async () => {

    if (
      !isEditingPersonal &&
      !isEditingBusiness
    ) {
      return;
    }


    Alert.alert(
      'Upload Profile Picture',
      'Choose an option',
      [

        {
          text: 'Camera',

          onPress: async () => {

            const { status } =
              await ImagePicker
                .requestCameraPermissionsAsync();

            if (status !== 'granted') {

              showToast(
                'Camera permission is required.',
                'error'
              );

              return;
            }


            const result =
              await ImagePicker
                .launchCameraAsync({

                  mediaTypes:
                    ImagePicker.MediaTypeOptions.Images,

                  allowsEditing: true,

                  aspect: [1, 1],

                  quality: 0.8,

                });


            if (!result.canceled) {

              setProfileImage(
                result.assets[0].uri
              );

            }
          },
        },


        {
          text: 'Gallery',

          onPress: async () => {

            const { status } =
              await ImagePicker
                .requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {

              showToast(
                'Gallery permission is required.',
                'error'
              );

              return;
            }


            const result =
              await ImagePicker
                .launchImageLibraryAsync({

                  mediaTypes:
                    ImagePicker.MediaTypeOptions.Images,

                  allowsEditing: true,

                  aspect: [1, 1],

                  quality: 0.8,

                });


            if (!result.canceled) {

              setProfileImage(
                result.assets[0].uri
              );

            }
          },
        },


        {
          text: 'Cancel',
          style: 'cancel',
        },

      ]
    );
  };


  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  const handleUseCurrentLocation = async () => {

    try {

      const { status } =
        await Location
          .requestForegroundPermissionsAsync();


      if (status !== 'granted') {

        showToast(
          'Permission to access location was denied.',
          'error'
        );

        return;
      }


      setLoading(true);


      const location =
        await Location.getCurrentPositionAsync({});


      const geocode =
        await Location.reverseGeocodeAsync({

          latitude:
            location.coords.latitude,

          longitude:
            location.coords.longitude,

        });


      if (
        geocode &&
        geocode.length > 0
      ) {

        const place = geocode[0];


        const formattedAddress =
          `${place.name ? place.name + ', ' : ''}` +
          `${place.street || ''}, ` +
          `${place.city || place.subregion || ''}, ` +
          `${place.region || ''} ` +
          `${place.postalCode || ''}`
            .replace(
              /^[,\s]+|[,\s]+$/g,
              ''
            )
            .replace(
              /,\s*,/g,
              ','
            );


        setLocationData({

          address:
            formattedAddress,

          latitude:
            location.coords.latitude,

          longitude:
            location.coords.longitude,

          city:
            place.city ||
            place.subregion ||
            city,

        });


        showToast(
          'Location updated',
          'success'
        );

      }

    } catch (error) {

      showToast(
        'Could not fetch current location.',
        'error'
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSave = async () => {

    setSaving(true);

    try {

      const promises = [];


      // ------------------------------------------------------
      // Personal changes
      // ------------------------------------------------------

      const personalChanges = {};


      if (
        name !== original.current.name
      ) {

        personalChanges.name =
          name.trim();

      }


      if (
        phone !== original.current.phone
      ) {

        personalChanges.phone =
          phone.replace(
            /[^0-9]/g,
            ''
          );

      }


      if (
        Object.keys(personalChanges)
          .length > 0
      ) {

        promises.push(

          apiService.request(
            '/auth/me',
            {
              method: 'PATCH',
              body: personalChanges,
            }
          )

        );

      }


      // ------------------------------------------------------
      // Business changes
      // ------------------------------------------------------

      const businessChanges = {};


      if (
        businessName !==
        original.current.businessName
      ) {

        businessChanges.name =
          businessName.trim();

      }


      if (
        businessDescription !==
        original.current.businessDescription
      ) {

        businessChanges.business_description =
          businessDescription.trim();

      }


      if (
        usp !== original.current.usp
      ) {

        businessChanges.usp =
          usp.trim();

      }


      if (
        website !== original.current.website
      ) {

        businessChanges.website_url =
          website.trim();

      }


      if (
        gstNumber !==
        original.current.gstNumber
      ) {

        businessChanges.gst_number =
          gstNumber.trim();

      }


      if (locationData) {

        businessChanges.location_address =
          locationData.address;

        businessChanges.latitude =
          locationData.latitude;

        businessChanges.longitude =
          locationData.longitude;

        businessChanges.city =
          locationData.city ||
          locationData.address
            .split(',')[0]
            ?.trim() ||
          city;

      }


      if (
        Object.keys(businessChanges)
          .length > 0
      ) {

        promises.push(

          apiService.request(
            '/businesses/me',
            {
              method: 'PATCH',
              body: businessChanges,
            }
          )

        );

      }


      await Promise.all(promises);


      if (
        Object.keys(personalChanges)
          .length > 0
      ) {

        updateUserProfile(
          personalChanges
        );

      }


      original.current = {

        name:
          name.trim(),

        phone:
          phone.replace(
            /[^0-9]/g,
            ''
          ),

        businessName:
          businessName.trim(),

        businessDescription:
          businessDescription.trim(),

        usp:
          usp.trim(),

        website:
          website.trim(),

        gstNumber:
          gstNumber.trim(),

        profileImage:
          profileImage,

      };


      if (locationData) {

        setProfile(prev => ({
          ...prev,
          location_address:
            locationData.address,
        }));

        setLocationAddress(
          locationData.address
        );

        setCity(
          locationData.city || city
        );

      }


      setLocationData(null);

      setIsEditingPersonal(false);

      setIsEditingBusiness(false);


      showToast(
        'Profile updated successfully',
        'success'
      );

    } catch (error) {

      showToast(
        error?.message ||
          'Failed to save. Please try again.',
        'error'
      );

    } finally {

      setSaving(false);

    }
  };


  // ==========================================================
  // CANCEL
  // ==========================================================

  const handleCancel = () => {

    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );


    setName(
      original.current.name
    );

    setPhone(
      original.current.phone
    );

    setBusinessName(
      original.current.businessName
    );

    setBusinessDescription(
      original.current.businessDescription
    );

    setUsp(
      original.current.usp
    );

    setWebsite(
      original.current.website
    );

    setGstNumber(
      original.current.gstNumber || ''
    );

    setProfileImage(
      original.current.profileImage
    );

    setLocationData(null);

    setIsEditingPersonal(false);

    setIsEditingBusiness(false);

  };


  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const confirmDeleteAccount = () => {

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [

        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: () => {

            showToast(
              'Account deletion requested',
              'success'
            );

          },
        },

      ]
    );
  };


  // ==========================================================
  // INITIALS
  // ==========================================================

  const initials = name
    ? name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading && !profile) {

    return (

      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >

        <View
          style={[
            styles.loadingContainer,
            {
              backgroundColor:
                colors.background,
            },
          ]}
        >

          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            Loading profile...
          </Text>

        </View>

      </SafeAreaView>

    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() =>
          setToastVisible(false)
        }
      />


      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={{ flex: 1 }}
      >

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >


          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={[
              styles.header,
              {
                backgroundColor:
                  colors.header,

                borderBottomColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={styles.headerTop}
            >

              <View>

                <Text
                  style={[
                    styles.headerEyebrow,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  ACCOUNT
                </Text>

                <Text
                  style={[
                    styles.headerTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Profile Dashboard
                </Text>

              </View>

            </View>


            {/* =================================================
                HORIZONTAL PROFILE CARD
            ================================================= */}

            <View
              style={[
                styles.profileSummaryCard,
                {
                  backgroundColor:
                    colors.surfaceElevated,

                  borderColor:
                    colors.border,

                  shadowColor:
                    isDarkMode
                      ? '#000'
                      : '#64748B',
                },
              ]}
            >

              {/* Avatar */}

              <Pressable
                onPress={
                  handlePickImage
                }
                style={
                  styles.avatarContainer
                }
              >

                {profileImage ? (

                  <Image
                    source={{
                      uri: profileImage,
                    }}
                    style={[
                      styles.avatarCircle,
                      {
                        borderColor:
                          theme.sellerPrimary ||
                          colors.primary,
                      },
                    ]}
                  />

                ) : (

                  <View
                    style={[
                      styles.avatarCircle,
                      {
                        backgroundColor:
                          isDarkMode
                            ? '#1C3154'
                            : '#EEF4FF',

                        borderColor:
                          theme.sellerPrimary ||
                          colors.primary,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.avatarText,
                        {
                          color:
                            theme.sellerPrimary ||
                            colors.primary,
                        },
                      ]}
                    >
                      {initials}
                    </Text>

                  </View>

                )}


                <View
                  style={[
                    styles.avatarEditIcon,
                    {
                      backgroundColor:
                        theme.sellerPrimary ||
                        colors.primary,

                      borderColor:
                        colors.surfaceElevated,
                    },
                  ]}
                >

                  <Ionicons
                    name="camera"
                    size={12}
                    color="#FFFFFF"
                  />

                </View>

              </Pressable>


              {/* Seller information */}

              <View
                style={
                  styles.profileTextContainer
                }
              >

                <Text
                  style={[
                    styles.profileName,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {name || 'Seller Name'}
                </Text>


                <Text
                  style={[
                    styles.profileBusiness,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {businessName ||
                    'Business Name'}
                </Text>


                <View
                  style={[
                    styles.verifiedBadge,
                    {
                      backgroundColor:
                        colors.successBg,

                      borderColor:
                        colors.successBorder,
                    },
                  ]}
                >

                  <Ionicons
                    name="shield-checkmark"
                    size={12}
                    color={colors.success}
                  />

                  <Text
                    style={[
                      styles.verifiedText,
                      {
                        color:
                          colors.success,
                      },
                    ]}
                  >
                    Verified Business
                  </Text>

                </View>

              </View>

            </View>

          </View>


          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <View
            style={styles.content}
          >


            {/* =================================================
                ANALYTICS
            ================================================= */}

            <View
              style={
                styles.sectionHeader
              }
            >

              <View>

                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Business Analytics
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Overview of your business activity
                </Text>

              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'SellerAnalytics'
                  )
                }
              >

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    colors.placeholder
                  }
                />

              </Pressable>

            </View>


            <View
              style={
                styles.analyticsGrid
              }
            >

              <AnalyticsCard
                icon="megaphone-outline"
                iconColor="#3B82F6"
                value={
                  analytics?.campaigns_created ||
                  0
                }
                label="Campaigns"
                colors={colors}
              />

              <AnalyticsCard
                icon="flash-outline"
                iconColor="#22C55E"
                value={
                  analytics?.active_campaigns ||
                  0
                }
                label="Active"
                colors={colors}
              />

              <AnalyticsCard
                icon="people-outline"
                iconColor="#F59E0B"
                value={
                  analytics?.total_leads ||
                  0
                }
                label="Leads"
                colors={colors}
              />

            </View>


            {/* =================================================
                PERSONAL INFORMATION
            ================================================= */}

            <SectionHeader
              title="Personal Information"
              subtitle="Manage your personal account details"
              colors={colors}
              editing={isEditingPersonal}
              onEdit={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                );

                setIsEditingPersonal(true);
              }}
            />


            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colors.surfaceElevated,

                  borderColor:
                    colors.border,
                },
              ]}
            >

              <EditableField
                colors={colors}
                label="Full Name"
                value={name}
                onChangeText={setName}
                editable={isEditingPersonal}
              />


              <EditableField
                colors={colors}
                label="Mobile Number"
                value={phone}
                editable={false}
                note="Contact support to change your registered mobile number."
              />


              <EditableField
                colors={colors}
                label="Email Address"
                value={email}
                editable={false}
              />


              <View
                style={
                  styles.fieldGroup
                }
              >

                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  Password
                </Text>


                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor:
                        colors.input,

                      borderColor:
                        colors.border,
                    },
                  ]}
                >

                  <Text
                    style={[
                      styles.passwordMask,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    ••••••••
                  </Text>


                  <Pressable
                    onPress={() =>
                      navigation.navigate(
                        'SellerChangePasswordScreen'
                      )
                    }
                    style={
                      styles.changePasswordButton
                    }
                  >

                    <Text
                      style={[
                        styles.changePasswordText,
                        {
                          color:
                            colors.primaryBlue,
                        },
                      ]}
                    >
                      Change
                    </Text>

                  </Pressable>

                </View>

              </View>

            </View>


            {/* =================================================
                BUSINESS INFORMATION
            ================================================= */}

            <SectionHeader
              title="Business Information"
              subtitle="Keep your business details up to date"
              colors={colors}
              editing={isEditingBusiness}
              onEdit={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                );

                setIsEditingBusiness(true);
              }}
            />


            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colors.surfaceElevated,

                  borderColor:
                    colors.border,
                },
              ]}
            >

              <EditableField
                colors={colors}
                label="Business Name"
                value={businessName}
                onChangeText={
                  setBusinessName
                }
                editable={
                  isEditingBusiness
                }
              />


              <EditableField
                colors={colors}
                label="Business Category"
                value={category}
                editable={false}
                note="Cannot be changed after registration."
              />


              <MultilineField
                colors={colors}
                label="Business Description"
                value={businessDescription}
                onChangeText={
                  setBusinessDescription
                }
                editable={
                  isEditingBusiness
                }
                placeholder="Describe your business..."
                numberOfLines={4}
              />


              <MultilineField
                colors={colors}
                label="What makes your business different?"
                value={usp}
                onChangeText={setUsp}
                editable={
                  isEditingBusiness
                }
                placeholder="Describe your unique selling proposition..."
                numberOfLines={3}
              />


              <EditableField
                colors={colors}
                label="Website (optional)"
                value={website}
                onChangeText={setWebsite}
                editable={
                  isEditingBusiness
                }
              />


              <EditableField
                colors={colors}
                label="GST Number (optional)"
                value={gstNumber}
                onChangeText={setGstNumber}
                editable={
                  isEditingBusiness
                }
              />

            </View>


            {/* =================================================
                LOCATION
            ================================================= */}

            <SectionHeader
              title="Location"
              subtitle="Manage your business location"
              colors={colors}
              editing={isEditingBusiness}
              onEdit={() =>
                setIsEditingBusiness(true)
              }
            />


            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colors.surfaceElevated,

                  borderColor:
                    colors.border,
                },
              ]}
            >

              <View
                style={[
                  styles.locationDisplay,
                  {
                    backgroundColor:
                      colors.blueSoft,

                    borderColor:
                      colors.border,
                  },
                ]}
              >

                <View
                  style={[
                    styles.locationIcon,
                    {
                      backgroundColor:
                        colors.primarySofter,
                    },
                  ]}
                >

                  <Ionicons
                    name="location"
                    size={20}
                    color={
                      colors.primaryBlue
                    }
                  />

                </View>


                <Text
                  style={[
                    styles.locationText,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  numberOfLines={3}
                >
                  {locationData
                    ? locationData.address
                    : locationAddress ||
                      'No location set'}
                </Text>

              </View>


              {isEditingBusiness && (

                <View
                  style={
                    styles.locationActions
                  }
                >

                  {showLocationPicker ? (

                    <BusinessLocationPicker
                      onLocationConfirmed={
                        data => {

                          setLocationData(
                            data
                          );

                          setShowLocationPicker(
                            false
                          );

                        }
                      }
                      initialAddress={
                        locationAddress ||
                        ''
                      }
                    />

                  ) : (

                    <View
                      style={
                        styles.locationButtonRow
                      }
                    >

                      <Pressable
                        style={[
                          styles.outlineButton,
                          {
                            borderColor:
                              colors.primary,
                            backgroundColor:
                              colors.primarySofter,
                          },
                        ]}
                        onPress={() =>
                          setShowLocationPicker(
                            true
                          )
                        }
                      >

                        <Ionicons
                          name="search-outline"
                          size={17}
                          color={
                            colors.primary
                          }
                        />

                        <Text
                          style={[
                            styles.outlineButtonText,
                            {
                              color:
                                colors.primary,
                            },
                          ]}
                        >
                          Change
                        </Text>

                      </Pressable>


                      <Pressable
                        style={[
                          styles.outlineButton,
                          {
                            borderColor:
                              colors.primaryBlue,
                            backgroundColor:
                              colors.blueSoft,
                          },
                        ]}
                        onPress={
                          handleUseCurrentLocation
                        }
                      >

                        <Ionicons
                          name="navigate-outline"
                          size={17}
                          color={
                            colors.primaryBlue
                          }
                        />

                        <Text
                          style={[
                            styles.outlineButtonText,
                            {
                              color:
                                colors.primaryBlue,
                            },
                          ]}
                        >
                          Current
                        </Text>

                      </Pressable>

                    </View>

                  )}

                </View>

              )}

            </View>


            {/* =================================================
                ACCOUNT SETTINGS
            ================================================= */}

            <View
              style={
                styles.accountSettingsSection
              }
            >

              <View
                style={
                  styles.accountSectionHeader
                }
              >

                <Text
                  style={[
                    styles.accountSectionTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  ACCOUNT SETTINGS
                </Text>

                <Text
                  style={[
                    styles.accountSectionSubtitle,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Manage your account preferences
                </Text>

              </View>


              <View
                style={[
                  styles.settingsCard,
                  {
                    backgroundColor:
                      colors.surfaceElevated,

                    borderColor:
                      colors.border,

                    shadowColor:
                      isDarkMode
                        ? '#000'
                        : '#64748B',
                  },
                ]}
              >

                <SettingsRow
                  colors={colors}
                  icon="person-outline"
                  title="Edit Profile"
                  subtitle="Update your personal information"
                  onPress={() => {

                    setIsEditingPersonal(
                      true
                    );

                  }}
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="lock-closed-outline"
                  title="Change Password"
                  subtitle="Update your account password"
                  onPress={() =>
                    navigation.navigate(
                      'SellerChangePasswordScreen'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="briefcase-outline"
                  title="Edit Business Details"
                  subtitle="Manage your business information"
                  onPress={() => {

                    setIsEditingBusiness(
                      true
                    );

                  }}
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="bar-chart-outline"
                  title="Analytics"
                  subtitle="View business performance"
                  onPress={() =>
                    navigation.navigate(
                      'SellerAnalytics'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="wallet-outline"
                  title="Wallet"
                  subtitle="Manage your earnings"
                  onPress={() =>
                    navigation.navigate(
                      'SellerWallet'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                {/* DARK MODE */}

                <View
                  style={
                    styles.settingsRow
                  }
                >

                  <View
                    style={
                      styles.settingsRowLeft
                    }
                  >

                    <View
                      style={[
                        styles.settingsIcon,
                        {
                          backgroundColor:
                            colors.primarySofter,
                        },
                      ]}
                    >

                      <Ionicons
                        name={
                          isDarkMode
                            ? 'moon-outline'
                            : 'sunny-outline'
                        }
                        size={20}
                        color={
                          colors.primary
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.settingsTextContainer
                      }
                    >

                      <Text
                        style={[
                          styles.settingsTitle,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Dark Mode
                      </Text>

                      <Text
                        style={[
                          styles.settingsSubtitle,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        Use the dark appearance
                      </Text>

                    </View>

                  </View>


                  <Switch
                    value={isDarkMode}
                    onValueChange={
                      toggleDarkMode
                    }
                    trackColor={{
                      false:
                        isDarkMode
                          ? '#334155'
                          : '#CBD5E1',

                      true:
                        colors.primary,
                    }}
                    thumbColor="#FFFFFF"
                  />

                </View>


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="chatbubble-ellipses-outline"
                  title="Chat Settings"
                  subtitle="Manage chat history"
                  onPress={() =>
                    setShowChatSettingsModal(
                      true
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="notifications-outline"
                  title="Notifications"
                  subtitle="Manage notification preferences"
                  onPress={() =>
                    showToast(
                      'Settings coming soon',
                      'info'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="language-outline"
                  title="Language"
                  subtitle="Choose your preferred language"
                  onPress={() =>
                    showToast(
                      'Settings coming soon',
                      'info'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="shield-half-outline"
                  title="Privacy Settings"
                  subtitle="Manage privacy preferences"
                  onPress={() =>
                    showToast(
                      'Settings coming soon',
                      'info'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="help-buoy-outline"
                  title="Help & Support"
                  subtitle="Get help with REACHLO"
                  onPress={() =>
                    navigation.navigate(
                      'HelpSupport'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="shield-checkmark-outline"
                  title="Privacy Policy"
                  subtitle="Read our privacy policy"
                  onPress={() =>
                    navigation.navigate(
                      'PrivacyPolicy'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="information-circle-outline"
                  title="About REACHLO"
                  subtitle="Learn more about REACHLO"
                  onPress={() =>
                    navigation.navigate(
                      'AboutReachlo'
                    )
                  }
                />


                <SettingsDivider
                  colors={colors}
                />


                <SettingsRow
                  colors={colors}
                  icon="star-outline"
                  title="Rate REACHLO"
                  subtitle="Share your feedback"
                  onPress={() =>
                    setShowRatingModal(
                      true
                    )
                  }
                />

              </View>

            </View>


            {/* =================================================
                DANGER ACTIONS
            ================================================= */}

            <View
              style={
                styles.destructiveActions
              }
            >

              <Pressable
                style={[
                  styles.destructiveButton,
                  {
                    backgroundColor:
                      colors.dangerBg,

                    borderColor:
                      colors.dangerBorder,
                  },
                ]}
                onPress={logout}
              >

                <View
                  style={[
                    styles.destructiveIcon,
                    {
                      backgroundColor:
                        isDarkMode
                          ? '#431D20'
                          : '#FEE2E2',
                    },
                  ]}
                >

                  <Ionicons
                    name="log-out-outline"
                    size={19}
                    color={colors.danger}
                  />

                </View>

                <Text
                  style={[
                    styles.destructiveText,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  Log Out
                </Text>

              </Pressable>


              <Pressable
                style={[
                  styles.destructiveButton,
                  {
                    backgroundColor:
                      colors.dangerBg,

                    borderColor:
                      colors.dangerBorder,
                  },
                ]}
                onPress={
                  confirmDeleteAccount
                }
              >

                <View
                  style={[
                    styles.destructiveIcon,
                    {
                      backgroundColor:
                        isDarkMode
                          ? '#431D20'
                          : '#FEE2E2',
                    },
                  ]}
                >

                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color={colors.danger}
                  />

                </View>

                <Text
                  style={[
                    styles.destructiveText,
                    {
                      color:
                        colors.danger,
                    },
                  ]}
                >
                  Delete Account
                </Text>

              </Pressable>

            </View>


            <View
              style={{
                height: 120,
              }}
            />

          </View>

        </ScrollView>

      </KeyboardAvoidingView>


      {/* ========================================================
          SAVE / CANCEL BAR
      ======================================================== */}

      {(isEditingPersonal ||
        isEditingBusiness) && (

        <Animated.View
          style={[
            styles.bottomBar,

            {
              backgroundColor:
                colors.surface,

              borderTopColor:
                colors.border,

              transform: [
                {
                  translateY:
                    saveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        140,
                        0,
                      ],
                    }),
                },
              ],

              opacity: saveAnim,
            },
          ]}
        >

          <Pressable
            style={[
              styles.cancelButton,
              {
                backgroundColor:
                  colors.input,

                borderColor:
                  colors.border,
              },
            ]}
            onPress={
              handleCancel
            }
          >

            <Text
              style={[
                styles.cancelButtonText,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              Cancel
            </Text>

          </Pressable>


          <Pressable
            style={[
              styles.saveButton,
              !hasChanges() && {
                opacity: 0.5,
              },
            ]}
            onPress={
              handleSave
            }
            disabled={
              saving ||
              !hasChanges()
            }
          >

            <LinearGradient
              colors={[
                '#3B82F6',
                '#8B5CF6',
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 0,
              }}
              style={
                styles.saveGradient
              }
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
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    Save Changes
                  </Text>

                </>

              )}

            </LinearGradient>

          </Pressable>

        </Animated.View>

      )}


      {/* ========================================================
          CHAT SETTINGS MODAL
      ======================================================== */}

      <Modal
        visible={
          showChatSettingsModal
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowChatSettingsModal(
            false
          )
        }
      >

        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                isDarkMode
                  ? 'rgba(0,0,0,0.72)'
                  : 'rgba(15,23,42,0.55)',
            },
          ]}
        >

          <View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  colors.surfaceElevated,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >

              <View>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Chat Settings
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  Manage chat history retention
                </Text>

              </View>


              <Pressable
                style={[
                  styles.modalClose,
                  {
                    backgroundColor:
                      colors.input,
                  },
                ]}
                onPress={() =>
                  setShowChatSettingsModal(
                    false
                  )
                }
              >

                <Ionicons
                  name="close"
                  size={20}
                  color={
                    colors.text
                  }
                />

              </Pressable>

            </View>


            {[
              '24h',
              '1w',
              '1m',
              'forever',
            ].map(policy => {

              const selected =
                chatRetention ===
                policy;


              const label =
                policy === '24h'
                  ? '24 Hours'
                  : policy === '1w'
                  ? '1 Week'
                  : policy === '1m'
                  ? '1 Month'
                  : 'Until I clear it';


              return (

                <Pressable
                  key={policy}
                  style={[
                    styles.retentionOption,
                    {
                      backgroundColor:
                        selected
                          ? colors.primarySoft
                          : colors.input,

                      borderColor:
                        selected
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() =>
                    saveChatSettings(
                      policy
                    )
                  }
                >

                  <View
                    style={[
                      styles.retentionIcon,
                      {
                        backgroundColor:
                          selected
                            ? colors.primary
                            : colors.surfaceSoft,
                      },
                    ]}
                  >

                    <Ionicons
                      name={
                        policy ===
                        'forever'
                          ? 'infinite-outline'
                          : 'time-outline'
                      }
                      size={18}
                      color={
                        selected
                          ? '#FFFFFF'
                          : colors.primary
                      }
                    />

                  </View>


                  <View
                    style={
                      styles.retentionText
                    }
                  >

                    <Text
                      style={[
                        styles.retentionTitle,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {label}
                    </Text>

                    {policy ===
                      'forever' && (

                      <Text
                        style={[
                          styles.retentionSubtitle,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        Keep messages until manually cleared
                      </Text>

                    )}

                  </View>


                  {selected && (

                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color={
                        colors.primary
                      }
                    />

                  )}

                </Pressable>

              );

            })}


            {savingChatSettings && (

              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
                style={{
                  marginTop: 8,
                }}
              />

            )}

          </View>

        </View>

      </Modal>


      {/* ========================================================
          FAQ MODAL
      ======================================================== */}

      <Modal
        visible={showFaqModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowFaqModal(false)
        }
      >

        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                isDarkMode
                  ? 'rgba(0,0,0,0.72)'
                  : 'rgba(15,23,42,0.55)',
            },
          ]}
        >

          <View
            style={[
              styles.faqModalContent,
              {
                backgroundColor:
                  colors.surfaceElevated,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >

              <View>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Frequently Asked Questions
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  Find answers to common questions
                </Text>

              </View>


              <Pressable
                style={[
                  styles.modalClose,
                  {
                    backgroundColor:
                      colors.input,
                  },
                ]}
                onPress={() =>
                  setShowFaqModal(
                    false
                  )
                }
              >

                <Ionicons
                  name="close"
                  size={20}
                  color={
                    colors.text
                  }
                />

              </Pressable>

            </View>


            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 24,
              }}
            >

              {FAQ_DATA.map(
                (item, index) => (

                  <FaqAccordionItem
                    key={index}
                    question={
                      item.question
                    }
                    answer={
                      item.answer
                    }
                    colors={colors}
                  />

                )
              )}

            </ScrollView>

          </View>

        </View>

      </Modal>


      {/* ========================================================
          RATING
      ======================================================== */}

      <RatingModal
        visible={
          showRatingModal
        }
        onClose={() =>
          setShowRatingModal(
            false
          )
        }
        userRole="seller"
      />

    </SafeAreaView>

  );
}


// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  title,
  subtitle,
  colors,
  editing,
  onEdit,
}) {

  return (

    <View
      style={
        styles.sectionHeader
      }
    >

      <View
        style={{
          flex: 1,
          paddingRight: 12,
        }}
      >

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          {title}
        </Text>

        {subtitle && (

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {subtitle}
          </Text>

        )}

      </View>


      {!editing && (

        <Pressable
          style={[
            styles.editPill,
            {
              backgroundColor:
                colors.primarySofter,
            },
          ]}
          onPress={onEdit}
        >

          <Ionicons
            name="create-outline"
            size={15}
            color={
              colors.primary
            }
          />

          <Text
            style={[
              styles.editPillText,
              {
                color:
                  colors.primary,
              },
            ]}
          >
            Edit
          </Text>

        </Pressable>

      )}

    </View>

  );
}


// ============================================================
// ANALYTICS CARD
// ============================================================

function AnalyticsCard({
  icon,
  iconColor,
  value,
  label,
  colors,
}) {

  return (

    <View
      style={[
        styles.analyticsCard,
        {
          backgroundColor:
            colors.surfaceElevated,

          borderColor:
            colors.border,
        },
      ]}
    >

      <View
        style={[
          styles.analyticsIcon,
          {
            backgroundColor:
              `${iconColor}18`,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />

      </View>


      <Text
        style={[
          styles.analyticsValue,
          {
            color:
              colors.text,
          },
        ]}
      >
        {value}
      </Text>


      <Text
        style={[
          styles.analyticsLabel,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>

    </View>

  );
}


// ============================================================
// EDITABLE FIELD
// ============================================================

function EditableField({
  label,
  value,
  onChangeText,
  editable = true,
  note,
  colors,
}) {

  return (

    <View
      style={
        styles.fieldGroup
      }
    >

      <Text
        style={[
          styles.fieldLabel,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>


      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor:
              editable
                ? colors.inputPressed
                : colors.input,

            borderColor:
              editable
                ? colors.borderStrong
                : colors.border,
          },
        ]}
      >

        <TextInput
          style={[
            styles.textInput,
            {
              color:
                editable
                  ? colors.text
                  : colors.textSecondary,
            },
          ]}
          value={value}
          onChangeText={
            onChangeText
          }
          editable={editable}
          placeholderTextColor={
            colors.placeholder
          }
        />

        {!editable && (

          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={
              colors.textMuted
            }
          />

        )}

      </View>


      {note && (

        <Text
          style={[
            styles.fieldNote,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {note}
        </Text>

      )}

    </View>

  );
}


// ============================================================
// MULTILINE FIELD
// ============================================================

function MultilineField({
  label,
  value,
  onChangeText,
  editable,
  placeholder,
  numberOfLines,
  colors,
}) {

  return (

    <View
      style={
        styles.fieldGroup
      }
    >

      <Text
        style={[
          styles.fieldLabel,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>


      <View
        style={[
          styles.multilineWrapper,
          {
            backgroundColor:
              editable
                ? colors.inputPressed
                : colors.input,

            borderColor:
              editable
                ? colors.borderStrong
                : colors.border,
          },
        ]}
      >

        <TextInput
          style={[
            styles.multilineInput,
            {
              color:
                editable
                  ? colors.text
                  : colors.textSecondary,
            },
          ]}
          value={value}
          onChangeText={
            onChangeText
          }
          editable={editable}
          multiline
          numberOfLines={
            numberOfLines
          }
          textAlignVertical="top"
          placeholder={
            placeholder
          }
          placeholderTextColor={
            colors.placeholder
          }
        />

      </View>

    </View>

  );
}


// ============================================================
// SETTINGS ROW
// ============================================================

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}) {

  return (

    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,

        pressed && {
          opacity: 0.72,
        },
      ]}
      onPress={onPress}
    >

      <View
        style={
          styles.settingsRowLeft
        }
      >

        <View
          style={[
            styles.settingsIcon,
            {
              backgroundColor:
                colors.primarySofter,
            },
          ]}
        >

          <Ionicons
            name={icon}
            size={20}
            color={
              colors.primary
            }
          />

        </View>


        <View
          style={
            styles.settingsTextContainer
          }
        >

          <Text
            style={[
              styles.settingsTitle,
              {
                color:
                  colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>


          {subtitle && (

            <Text
              style={[
                styles.settingsSubtitle,
                {
                  color:
                    colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>

          )}

        </View>

      </View>


      <View
        style={
          styles.settingsArrow
        }
      >

        <Ionicons
          name="chevron-forward"
          size={19}
          color={
            colors.placeholder
          }
        />

      </View>

    </Pressable>

  );
}


// ============================================================
// SETTINGS DIVIDER
// ============================================================

function SettingsDivider({
  colors,
}) {

  return (

    <View
      style={[
        styles.settingsDivider,
        {
          backgroundColor:
            colors.divider,
        },
      ]}
    />

  );
}


// ============================================================
// FAQ ACCORDION
// ============================================================

function FaqAccordionItem({
  question,
  answer,
  colors,
}) {

  const [expanded, setExpanded] =
    useState(false);


  return (

    <View
      style={[
        styles.faqItem,
        {
          borderBottomColor:
            colors.divider,
        },
      ]}
    >

      <Pressable
        style={
          styles.faqHeader
        }
        onPress={() => {

          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut
          );

          setExpanded(
            !expanded
          );

        }}
      >

        <Text
          style={[
            styles.faqQuestion,
            {
              color:
                colors.text,
            },
          ]}
        >
          {question}
        </Text>


        <Ionicons
          name={
            expanded
              ? 'chevron-up'
              : 'chevron-down'
          }
          size={20}
          color={
            expanded
              ? colors.primary
              : colors.textMuted
          }
        />

      </Pressable>


      {expanded && (

        <Text
          style={[
            styles.faqAnswer,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {answer}
        </Text>

      )}

    </View>

  );
}


// ============================================================
// FAQ DATA
// ============================================================

const FAQ_DATA = [

  {
    question:
      'How do I create a new campaign?',

    answer:
      "Go to your Home Dashboard and click the 'Generate with AI' or 'Manual Creation' tile to start creating a new campaign instantly.",
  },

  {
    question:
      'Can I edit an active campaign?',

    answer:
      'Yes, you can edit your active campaigns from the Campaigns tab by tapping the pencil icon on the campaign card.',
  },

  {
    question:
      'How do buyers contact me?',

    answer:
      'Buyers can contact you via call or in-app chat. You will receive a push notification for new messages and leads.',
  },

  {
    question:
      'How is billing handled?',

    answer:
      'We offer transparent billing with our Pro and Elite plans. You can upgrade or manage your billing settings in the app.',
  },

];


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ----------------------------------------------------------
  // SCREEN
  // ----------------------------------------------------------

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  header: {

    paddingTop: 14,

    paddingHorizontal: 22,

    paddingBottom: 24,

    borderBottomWidth: 1,

    borderBottomLeftRadius: 30,

    borderBottomRightRadius: 30,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.05,

    shadowRadius: 14,

    elevation: 3,

  },

  headerTop: {

    marginBottom: 18,

  },

  headerEyebrow: {

    fontSize: 11,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    letterSpacing: 1.4,

    marginBottom: 4,

  },

  headerTitle: {

    fontSize: 25,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },


  // ----------------------------------------------------------
  // HORIZONTAL PROFILE CARD
  // ----------------------------------------------------------

  profileSummaryCard: {

    flexDirection: 'row',

    alignItems: 'center',

    minHeight: 120,

    paddingVertical: 20,

    paddingHorizontal: 20,

    borderRadius: 28,

    borderWidth: 1,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.10,

    shadowRadius: 18,

    elevation: 3,

  },

  avatarContainer: {
    width: 88,
    height: 88,
    position: 'relative',
    flexShrink: 0,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },

  avatarText: {

    fontSize: 30,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  avatarEditIcon: {

    position: 'absolute',

    right: -1,

    bottom: -1,

    width: 27,

    height: 27,

    borderRadius: 14,

    justifyContent: 'center',

    alignItems: 'center',

    borderWidth: 2,

  },

  profileTextContainer: {
    flex: 1,
    marginLeft: 18,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },

  profileName: {
    fontSize: 22,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 2,
    flexShrink: 1,
  },

  profileBusiness: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 6,
    flexShrink: 1,
  },

  verifiedBadge: {

    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 11,

    borderWidth: 1,

  },

  verifiedText: {

    fontSize: 11,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    marginLeft: 4,

  },


  // ----------------------------------------------------------
  // CONTENT
  // ----------------------------------------------------------

  content: {

    paddingHorizontal: 18,

    paddingTop: 22,

  },


  // ----------------------------------------------------------
  // SECTION HEADER
  // ----------------------------------------------------------

  sectionHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 11,

    marginTop: 5,

  },

  sectionTitle: {

    fontSize: 18,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  sectionSubtitle: {

    fontSize: 12,

    marginTop: 3,

  },

  editPill: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 11,

    paddingVertical: 7,

    borderRadius: 12,

    gap: 5,

  },

  editPillText: {

    fontSize: 12,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },


  // ----------------------------------------------------------
  // ANALYTICS
  // ----------------------------------------------------------

  analyticsGrid: {

    flexDirection: 'row',

    gap: 10,

    marginBottom: 25,

  },

  analyticsCard: {

    flex: 1,

    minHeight: 116,

    borderRadius: 19,

    borderWidth: 1,

    paddingVertical: 14,

    paddingHorizontal: 8,

    alignItems: 'center',

    justifyContent: 'center',

  },

  analyticsIcon: {

    width: 40,

    height: 40,

    borderRadius: 12,

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: 7,

  },

  analyticsValue: {

    fontSize: 21,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  analyticsLabel: {

    fontSize: 11.5,

    fontWeight: '600',

    marginTop: 2,

    textAlign: 'center',

  },


  // ----------------------------------------------------------
  // CARDS
  // ----------------------------------------------------------

  card: {

    borderRadius: 22,

    borderWidth: 1,

    padding: 16,

    marginBottom: 24,

    gap: 17,

  },


  // ----------------------------------------------------------
  // FIELDS
  // ----------------------------------------------------------

  fieldGroup: {

    gap: 7,

  },

  fieldLabel: {

    fontSize: 12.5,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

  },

  fieldNote: {

    fontSize: 10.5,

    lineHeight: 15,

    marginTop: 1,

  },

  inputWrapper: {

    minHeight: 52,

    borderRadius: 14,

    borderWidth: 1.2,

    paddingHorizontal: 14,

    flexDirection: 'row',

    alignItems: 'center',

  },

  textInput: {

    flex: 1,

    height: '100%',

    fontSize: 15,

    fontWeight: '500',

  },

  passwordMask: {

    fontSize: 21,

    letterSpacing: 3,

  },

  changePasswordButton: {

    paddingVertical: 7,

    paddingLeft: 12,

  },

  changePasswordText: {

    fontSize: 13,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  multilineWrapper: {

    minHeight: 118,

    borderRadius: 15,

    borderWidth: 1.2,

    paddingHorizontal: 14,

    paddingVertical: 12,

  },

  multilineInput: {

    flex: 1,

    minHeight: 90,

    fontSize: 14.5,

    lineHeight: 21,

  },


  // ----------------------------------------------------------
  // LOCATION
  // ----------------------------------------------------------

  locationDisplay: {

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 16,

    borderWidth: 1,

    padding: 13,

  },

  locationIcon: {

    width: 40,

    height: 40,

    borderRadius: 12,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 11,

  },

  locationText: {

    flex: 1,

    fontSize: 13.5,

    lineHeight: 20,

    fontWeight: '500',

  },

  locationActions: {

    marginTop: 14,

  },

  locationButtonRow: {

    flexDirection: 'row',

    gap: 10,

  },

  outlineButton: {

    flex: 1,

    height: 46,

    borderRadius: 13,

    borderWidth: 1.2,

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'row',

    gap: 6,

  },

  outlineButtonText: {

    fontSize: 12.5,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },


  // ----------------------------------------------------------
  // ACCOUNT SETTINGS
  // ----------------------------------------------------------

  accountSettingsSection: {
    marginTop: 8,
    marginHorizontal: 18,
  },

  accountSectionHeader: {

    marginBottom: 12,

    paddingHorizontal: 4,

  },

  accountSectionTitle: {

    fontSize: 13,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    letterSpacing: 1.2,

  },

  accountSectionSubtitle: {

    fontSize: 11.5,

    marginTop: 4,

  },

  settingsCard: {

    borderRadius: 26,

    borderWidth: 1,

    paddingVertical: 4,

    paddingHorizontal: 6,

    overflow: 'hidden',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.08,

    shadowRadius: 18,

    elevation: 3,

  },

  settingsRow: {

    minHeight: 68,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 8,

    paddingVertical: 10,

  },

  settingsRowLeft: {

    flex: 1,

    minWidth: 0,

    flexDirection: 'row',

    alignItems: 'center',

  },

  settingsIcon: {

    width: 42,

    height: 42,

    borderRadius: 13,

    justifyContent: 'center',

    alignItems: 'center',

    flexShrink: 0,

  },

  settingsTextContainer: {

    flex: 1,

    marginLeft: 12,

    minWidth: 0,

  },

  settingsTitle: {

    fontSize: 15,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

  },

  settingsSubtitle: {

    fontSize: 12,

    marginTop: 2,

  },

  settingsArrow: {

    width: 26,

    alignItems: 'flex-end',

    justifyContent: 'center',

  },

  settingsDivider: {

    height: 1,

    marginHorizontal: 8,

  },


  // ----------------------------------------------------------
  // DANGER
  // ----------------------------------------------------------

  destructiveActions: {

    marginTop: 20,

    gap: 10,

  },

  destructiveButton: {

    minHeight: 56,

    borderRadius: 16,

    borderWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,

  },

  destructiveIcon: {

    width: 36,

    height: 36,

    borderRadius: 11,

    justifyContent: 'center',

    alignItems: 'center',

  },

  destructiveText: {

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    marginLeft: 11,

  },


  // ----------------------------------------------------------
  // BOTTOM SAVE BAR
  // ----------------------------------------------------------

  bottomBar: {

    position: 'absolute',

    left: 0,

    right: 0,

    bottom: 0,

    minHeight: 82,

    paddingHorizontal: 16,

    paddingTop: 12,

    paddingBottom:
      Platform.OS === 'ios'
        ? 30
        : 12,

    borderTopWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -6,
    },

    shadowOpacity: 0.12,

    shadowRadius: 15,

    elevation: 20,

  },

  cancelButton: {

    flex: 1,

    height: 50,

    borderRadius: 14,

    borderWidth: 1,

    justifyContent: 'center',

    alignItems: 'center',

  },

  cancelButtonText: {

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  saveButton: {

    flex: 2,

    height: 50,

    borderRadius: 14,

    overflow: 'hidden',

  },

  saveGradient: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 7,

  },

  saveButtonText: {

    color: '#FFFFFF',

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },


  // ----------------------------------------------------------
  // MODALS
  // ----------------------------------------------------------

  modalOverlay: {

    flex: 1,

    justifyContent: 'flex-end',

  },

  modalContent: {

    borderTopLeftRadius: 30,

    borderTopRightRadius: 30,

    borderWidth: 1,

    paddingHorizontal: 20,

    paddingTop: 10,

    paddingBottom:
      Platform.OS === 'ios'
        ? 34
        : 22,

  },

  faqModalContent: {

    maxHeight: '82%',

    borderTopLeftRadius: 30,

    borderTopRightRadius: 30,

    borderWidth: 1,

    paddingHorizontal: 20,

    paddingTop: 10,

    paddingBottom:
      Platform.OS === 'ios'
        ? 30
        : 20,

  },

  modalHandle: {

    alignSelf: 'center',

    width: 42,

    height: 4,

    borderRadius: 5,

    backgroundColor: '#A0A8B8',

    marginBottom: 17,

  },

  modalHeader: {

    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginBottom: 18,

  },

  modalTitle: {

    fontSize: 21,

    fontWeight:
      FONT_WEIGHTS.BOLD,

  },

  modalSubtitle: {

    fontSize: 12,

    marginTop: 4,

  },

  modalClose: {

    width: 38,

    height: 38,

    borderRadius: 12,

    justifyContent: 'center',

    alignItems: 'center',

  },


  // ----------------------------------------------------------
  // RETENTION
  // ----------------------------------------------------------

  retentionOption: {

    minHeight: 64,

    borderRadius: 15,

    borderWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,

    marginBottom: 10,

  },

  retentionIcon: {

    width: 38,

    height: 38,

    borderRadius: 11,

    justifyContent: 'center',

    alignItems: 'center',

  },

  retentionText: {

    flex: 1,

    marginLeft: 11,

  },

  retentionTitle: {

    fontSize: 14,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

  },

  retentionSubtitle: {

    fontSize: 10.5,

    marginTop: 2,

  },


  // ----------------------------------------------------------
  // FAQ
  // ----------------------------------------------------------

  faqItem: {

    borderBottomWidth: 1,

    paddingVertical: 16,

  },

  faqHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

  },

  faqQuestion: {

    flex: 1,

    paddingRight: 15,

    fontSize: 14.5,

    lineHeight: 20,

    fontWeight:
      FONT_WEIGHTS.SEMIBOLD,

  },

  faqAnswer: {

    marginTop: 10,

    fontSize: 13.5,

    lineHeight: 21,

  },

});