/**
 * AICampaignGenerateScreen
 *
 * Seller AI Campaign Generator
 * - Purple seller theme
 * - Fully supports light + dark mode
 * - Keeps existing API / location / city / date functionality
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Animated,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import Toast from '../../components/Toast';
import apiService from '../../services/apiService';
import INDIAN_CITIES from '../../constants/indianCities';

const GOOGLE_PLACES_API_KEY =
  'AIzaSyBqi9sSzxZk_uOmzlwESS0HPX5gRz9vnxo';

const ALL_INDIA_TAG = 'All over India';

const LOADING_STATUSES = [
  'Analyzing your business profile...',
  'Building creative strategy...',
  'Composing advertising direction...',
  'Writing persuasive campaign copy...',
  'Generating premium ad thumbnail...',
];

const loadingAnimations = {
  'Analyzing your business profile...':
    require('../../../assets/loading_statuses/Analyzing your business profile.png'),

  'Building creative strategy...':
    require('../../../assets/loading_statuses/Building creative strategy.png'),

  'Composing advertising direction...':
    require('../../../assets/loading_statuses/Composing advertising direction.png'),

  'Writing persuasive campaign copy...':
    require('../../../assets/loading_statuses/Writing persuasive campaign copy.png'),

  'Generating premium ad thumbnail...':
    require('../../../assets/loading_statuses/Generating premium ad thumbnail.png'),
};

export default function AICampaignGenerateScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();

  /*
   * ---------------------------------------------------------
   * SELLER COLOR SYSTEM
   * ---------------------------------------------------------
   */

  const PURPLE = '#8B5CF6';
  const PURPLE_DARK = '#7C3AED';
  const PURPLE_LIGHT = '#A78BFA';

  const colors = {
    background: isDarkMode ? '#090817' : '#F8F7FC',

    header:
      isDarkMode
        ? '#110D25'
        : '#FFFFFF',

    surface:
      isDarkMode
        ? '#151129'
        : '#FFFFFF',

    surfaceElevated:
      isDarkMode
        ? '#1B1534'
        : '#FFFFFF',

    input:
      isDarkMode
        ? '#100C22'
        : '#F8F7FC',

    inputPressed:
      isDarkMode
        ? '#18122F'
        : '#F3F0FF',

    border:
      isDarkMode
        ? '#302451'
        : '#E7E2F2',

    borderStrong:
      isDarkMode
        ? '#493676'
        : '#D9D0EE',

    text:
      isDarkMode
        ? '#F7F4FF'
        : '#171329',

    textSecondary:
      isDarkMode
        ? '#A9A2BD'
        : '#6B667A',

    textMuted:
      isDarkMode
        ? '#77718C'
        : '#898397',

    placeholder:
      isDarkMode
        ? '#625C76'
        : '#A19BAC',

    purple: PURPLE,

    purpleSoft:
      isDarkMode
        ? 'rgba(139,92,246,0.16)'
        : '#F0EAFF',

    purpleSofter:
      isDarkMode
        ? 'rgba(139,92,246,0.08)'
        : '#F8F5FF',

    success:
      isDarkMode
        ? '#4ADE80'
        : '#16A34A',

    successBg:
      isDarkMode
        ? 'rgba(34,197,94,0.10)'
        : '#F0FDF4',

    successBorder:
      isDarkMode
        ? 'rgba(74,222,128,0.25)'
        : '#BBF7D0',
  };

  /*
   * ---------------------------------------------------------
   * STATE
   * ---------------------------------------------------------
   */

  const [campaignTopic, setCampaignTopic] = useState('');
  const [priceOrDeal, setPriceOrDeal] = useState('');

  const [startDate, setStartDate] = useState(new Date());

  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30))
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [selectedCities, setSelectedCities] = useState([]);
  const [citySearchText, setCitySearchText] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);

  const cityInputRef = useRef(null);

  const [exactPrice, setExactPrice] = useState('');

  const [locationData, setLocationData] = useState(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationGpsLoading, setLocationGpsLoading] = useState(false);

  const locationSessionToken = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [focusedField, setFocusedField] = useState(null);

  const fadeAnim = useState(new Animated.Value(1))[0];

  /*
   * ---------------------------------------------------------
   * TOAST
   * ---------------------------------------------------------
   */

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  /*
   * ---------------------------------------------------------
   * LOADING STATUS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let interval;

    if (loading) {
      interval = setInterval(() => {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),

          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        setLoadingStatusIndex((prev) =>
          prev < LOADING_STATUSES.length - 1 ? prev + 1 : prev
        );
      }, 2500);
    } else {
      setLoadingStatusIndex(0);
      fadeAnim.setValue(1);
    }

    return () => clearInterval(interval);
  }, [loading]);

  /*
   * ---------------------------------------------------------
   * DATE PICKERS
   * ---------------------------------------------------------
   */

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  /*
   * ---------------------------------------------------------
   * CITY SEARCH
   * ---------------------------------------------------------
   */

  const handleCitySearchChange = (text) => {
    setCitySearchText(text);

    if (text.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }

    const lower = text.toLowerCase();

    const matches = INDIAN_CITIES
      .filter(
        (city) =>
          city.toLowerCase().startsWith(lower) &&
          !selectedCities.includes(city) &&
          !selectedCities.includes(ALL_INDIA_TAG)
      )
      .slice(0, 6);

    setCitySuggestions(matches);
  };

  const addCity = (city) => {
    if (city === ALL_INDIA_TAG) {
      setSelectedCities([ALL_INDIA_TAG]);
    } else if (
      !selectedCities.includes(city) &&
      !selectedCities.includes(ALL_INDIA_TAG)
    ) {
      setSelectedCities((prev) => [...prev, city]);
    }

    setCitySearchText('');
    setCitySuggestions([]);
  };

  const removeCity = (city) => {
    setSelectedCities((prev) =>
      prev.filter((item) => item !== city)
    );
  };

  const toggleAllIndia = () => {
    if (selectedCities.includes(ALL_INDIA_TAG)) {
      setSelectedCities([]);
    } else {
      setSelectedCities([ALL_INDIA_TAG]);
      setCitySearchText('');
      setCitySuggestions([]);
    }
  };

  /*
   * ---------------------------------------------------------
   * GPS LOCATION
   * ---------------------------------------------------------
   */

  const handleLocationGps = async () => {
    setLocationGpsLoading(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        showToast(
          'Location permission denied. Please search manually.'
        );
        return;
      }

      const loc =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const { latitude, longitude } = loc.coords;

      const geoUrl =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      const address =
        geoData.results &&
          geoData.results[0] &&
          geoData.results[0].formatted_address
          ? geoData.results[0].formatted_address
          : 'Current Location';

      setLocationData({
        address,
        latitude,
        longitude,
      });

      setLocationSearch('');
      setLocationSuggestions([]);
    } catch (e) {
      showToast(
        'Could not get your location. Please search manually.'
      );
    } finally {
      setLocationGpsLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOCATION SEARCH
   * ---------------------------------------------------------
   */

  const handleLocationSearchChange = async (text) => {
    setLocationSearch(text);

    if (text.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    if (!locationSessionToken.current) {
      locationSessionToken.current =
        Math.random().toString(36).substring(2);
    }

    setLocationSearchLoading(true);

    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(text)}` +
        `&key=${GOOGLE_PLACES_API_KEY}` +
        `&sessiontoken=${locationSessionToken.current}` +
        `&components=country:in&language=en`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn('Location autocomplete API error:', data.status, data.error_message);
      }

      setLocationSuggestions(data.predictions || []);
    } catch (e) {
      console.warn(
        'Location autocomplete error:',
        e
      );
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const handleSelectLocationSuggestion = async (
    prediction
  ) => {
    setLocationSuggestions([]);

    const placeId = prediction.place_id;

    const token = locationSessionToken.current;

    locationSessionToken.current = null;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=geometry,formatted_address` +
        `&key=${GOOGLE_PLACES_API_KEY}` +
        `&sessiontoken=${token}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status && data.status !== 'OK') {
        console.warn('Location details API error:', data.status, data.error_message);
      }

      const result = data.result;

      if (result && result.geometry) {
        const latitude =
          result.geometry.location.lat;

        const longitude =
          result.geometry.location.lng;

        const address =
          result.formatted_address ||
          prediction.description;

        setLocationData({
          address,
          latitude,
          longitude,
        });

        setLocationSearch(address);
      }
    } catch (e) {
      console.warn(
        'Location details error:',
        e
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * GENERATE CAMPAIGN
   * ---------------------------------------------------------
   */

  const handleGenerate = async () => {
    Keyboard.dismiss();

    if (!campaignTopic.trim()) {
      showToast(
        'Please tell us what you are promoting.'
      );
      return;
    }

    if (campaignTopic.trim().length < 5) {
      showToast(
        'Please provide a bit more detail about what you are promoting.'
      );
      return;
    }

    if (endDate < startDate) {
      showToast(
        'End date cannot be before start date.'
      );
      return;
    }

    let targetCitiesStr = null;

    if (selectedCities.length > 0) {
      targetCitiesStr =
        JSON.stringify(selectedCities);
    }

    setLoading(true);

    try {
      const response =
        await apiService.post('/ai/generate', {
          campaign_topic:
            campaignTopic.trim(),

          price_or_deal:
            priceOrDeal.trim() || null,

          start_date:
            startDate.toISOString(),

          end_date:
            endDate.toISOString(),

          target_cities:
            targetCitiesStr,

          location_address:
            locationData
              ? locationData.address
              : null,

          latitude:
            locationData
              ? locationData.latitude
              : null,

          longitude:
            locationData
              ? locationData.longitude
              : null,
        });

      navigation.replace(
        'AIDraftReview',
        {
          draftId: response.id,

          initialPrice:
            exactPrice.trim()
              ? parseFloat(exactPrice.trim())
              : null,
        }
      );
    } catch (e) {
      setLoading(false);

      showToast(
        e.message ||
        'Generation failed. Please try again.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING SCREEN
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ['#0F0A1D', '#170F2E']
              : ['#F7F3FF', '#EEE7FF']
          }
          style={styles.loadingGradient}
        >
          <View
            style={[
              styles.loadingIconCircle,
              {
                backgroundColor:
                  colors.purpleSoft,
                borderColor:
                  colors.borderStrong,
              },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={34}
              color={colors.purple}
            />
          </View>

          <Animated.Image
            source={
              loadingAnimations[
              LOADING_STATUSES[
              loadingStatusIndex
              ]
              ]
            }
            style={[
              styles.loadingImage,
              {
                opacity: fadeAnim,
              },
            ]}
          />

          <Animated.Text
            style={[
              styles.loadingStatusText,
              {
                color: colors.text,
                opacity: fadeAnim,
              },
            ]}
          >
            {
              LOADING_STATUSES[
              loadingStatusIndex
              ]
            }
          </Animated.Text>

          <Text
            style={[
              styles.loadingSubText,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            Creating your campaign with AI
          </Text>

          <View
            style={[
              styles.loadingProgressTrack,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.loadingProgress,
                {
                  backgroundColor:
                    colors.purple,
                  opacity: fadeAnim,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.loadingTimeText,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            This usually takes about 15–20 seconds
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const isAllIndia =
    selectedCities.includes(
      ALL_INDIA_TAG
    );

  /*
   * ---------------------------------------------------------
   * SMALL REUSABLE UI HELPERS
   * ---------------------------------------------------------
   */

  const getInputStyle = (field) => [
    styles.textInput,
    {
      backgroundColor: colors.input,
      borderColor:
        focusedField === field
          ? colors.purple
          : colors.border,
      color: colors.text,
    },
    focusedField === field && {
      shadowColor: colors.purple,
      shadowOpacity: isDarkMode ? 0.16 : 0.08,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      elevation: 2,
    },
  ];

  const SectionHeader = ({
    icon,
    title,
    subtitle,
  }) => (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          {
            backgroundColor:
              colors.purpleSoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={colors.purple}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
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
                  colors.textSecondary,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );

  const FieldLabel = ({
    children,
    required,
  }) => (
    <Text
      style={[
        styles.fieldLabel,
        {
          color: colors.text,
        },
      ]}
    >
      {children}

      {required && (
        <Text
          style={{
            color: '#EF4444',
          }}
        >
          {' '}
          *
        </Text>
      )}
    </Text>
  );

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="error"
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
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.scrollContent
            }
          >
            {/* ------------------------------------------------
                HEADER
            ------------------------------------------------ */}

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
              <Pressable
                onPress={() =>
                  navigation.goBack()
                }
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor:
                      colors.purpleSoft,
                    borderColor:
                      colors.border,
                  },
                  pressed && {
                    opacity: 0.7,
                    transform: [
                      { scale: 0.96 },
                    ],
                  },
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={colors.purple}
                />
              </Pressable>

              <View
                style={styles.headerTitleArea}
              >
                <View
                  style={
                    styles.headerTitleRow
                  }
                >
                  <Ionicons
                    name="sparkles"
                    size={19}
                    color={colors.purple}
                  />

                  <Text
                    style={[
                      styles.headerTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    AI Campaign
                  </Text>
                </View>

                <Text
                  style={[
                    styles.headerSubtitle,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  Create a campaign in seconds
                </Text>
              </View>

              <View
                style={[
                  styles.headerBadge,
                  {
                    backgroundColor:
                      colors.purpleSoft,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={colors.purple}
                />
              </View>
            </View>

            {/* ------------------------------------------------
                HERO
            ------------------------------------------------ */}

            <View style={styles.heroSection}>
              <View
                style={[
                  styles.heroAccent,
                  {
                    backgroundColor:
                      colors.purple,
                  },
                ]}
              />

              <Text
                style={[
                  styles.pageTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                What are you promoting today?
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Tell us about your offer and
                we'll combine it with your
                business profile to create a
                professional campaign.
              </Text>

              <View
                style={[
                  styles.aiHint,
                  {
                    backgroundColor:
                      colors.purpleSofter,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={colors.purple}
                />

                <Text
                  style={[
                    styles.aiHintText,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  AI will turn your idea into
                  campaign-ready content.
                </Text>
              </View>
            </View>

            {/* ------------------------------------------------
                BASIC CAMPAIGN INFORMATION
            ------------------------------------------------ */}

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <SectionHeader
                icon="megaphone-outline"
                title="Campaign details"
                subtitle="Start with the basics"
              />

              {/* Topic */}

              <View style={styles.fieldGroup}>
                <FieldLabel required>
                  Topic or Product
                </FieldLabel>

                <TextInput
                  style={[
                    getInputStyle('topic'),
                    styles.textArea,
                  ]}
                  placeholder="e.g. Diwali special on laptop repairs or new office chairs"
                  placeholderTextColor={
                    colors.placeholder
                  }
                  value={campaignTopic}
                  onChangeText={
                    setCampaignTopic
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onFocus={() =>
                    setFocusedField(
                      'topic'
                    )
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  autoFocus
                />

                <Text
                  style={[
                    styles.helperText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Describe the product,
                  service or promotion you
                  want to advertise.
                </Text>
              </View>

              {/* Price / Deal */}

              <View style={styles.fieldGroup}>
                <FieldLabel>
                  Price or Deal
                  <Text
                    style={{
                      color:
                        colors.textMuted,
                      fontWeight:
                        FONT_WEIGHTS.REGULAR,
                    }}
                  >
                    {' '}
                    (optional)
                  </Text>
                </FieldLabel>

                <TextInput
                  style={getInputStyle(
                    'deal'
                  )}
                  placeholder="e.g. Flat 20% off, Starts at ₹999, Buy 1 Get 1"
                  placeholderTextColor={
                    colors.placeholder
                  }
                  value={priceOrDeal}
                  onChangeText={
                    setPriceOrDeal
                  }
                  onFocus={() =>
                    setFocusedField(
                      'deal'
                    )
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                />

                <Text
                  style={[
                    styles.helperText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Leave empty and AI will use
                  general promotional language.
                </Text>
              </View>
            </View>

            {/* ------------------------------------------------
                CAMPAIGN DURATION
            ------------------------------------------------ */}

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <SectionHeader
                icon="calendar-outline"
                title="Campaign duration"
                subtitle="Choose when your campaign runs"
              />

              <View
                style={styles.datesRow}
              >
                {/* Start */}

                <View
                  style={[
                    styles.dateColumn,
                    { flex: 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Start date
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.datePickerButton,
                      {
                        backgroundColor:
                          colors.input,
                        borderColor:
                          colors.border,
                      },
                      pressed && {
                        backgroundColor:
                          colors.inputPressed,
                      },
                    ]}
                    onPress={() =>
                      setShowStartPicker(
                        true
                      )
                    }
                  >
                    <View
                      style={[
                        styles.dateIcon,
                        {
                          backgroundColor:
                            colors.purpleSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={
                          colors.purple
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.dateText,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {startDate.toLocaleDateString()}
                    </Text>
                  </Pressable>

                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={
                        onStartDateChange
                      }
                      minimumDate={
                        new Date()
                      }
                      themeVariant={
                        isDarkMode
                          ? 'dark'
                          : 'light'
                      }
                    />
                  )}
                </View>

                {/* End */}

                <View
                  style={[
                    styles.dateColumn,
                    { flex: 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    End date
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.datePickerButton,
                      {
                        backgroundColor:
                          colors.input,
                        borderColor:
                          colors.border,
                      },
                      pressed && {
                        backgroundColor:
                          colors.inputPressed,
                      },
                    ]}
                    onPress={() =>
                      setShowEndPicker(
                        true
                      )
                    }
                  >
                    <View
                      style={[
                        styles.dateIcon,
                        {
                          backgroundColor:
                            colors.purpleSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={
                          colors.purple
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.dateText,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {endDate.toLocaleDateString()}
                    </Text>
                  </Pressable>

                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={
                        onEndDateChange
                      }
                      minimumDate={
                        startDate
                      }
                      themeVariant={
                        isDarkMode
                          ? 'dark'
                          : 'light'
                      }
                    />
                  )}
                </View>
              </View>
            </View>

            {/* ------------------------------------------------
                TARGET AUDIENCE / CITIES
            ------------------------------------------------ */}

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <SectionHeader
                icon="location-outline"
                title="Target audience"
                subtitle="Choose where your campaign should appear"
              />

              <Text
                style={[
                  styles.helperLarge,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Select the cities where you
                provide your service. If left
                empty, your registered city will
                be used.
              </Text>

              {/* All India */}

              <Pressable
                style={({ pressed }) => [
                  styles.allIndiaButton,
                  {
                    backgroundColor:
                      isAllIndia
                        ? colors.purple
                        : colors.purpleSoft,

                    borderColor:
                      colors.purple,
                  },

                  pressed && {
                    opacity: 0.8,
                  },
                ]}
                onPress={
                  toggleAllIndia
                }
              >
                <Ionicons
                  name={
                    isAllIndia
                      ? 'checkmark-circle'
                      : 'earth-outline'
                  }
                  size={18}
                  color={
                    isAllIndia
                      ? '#FFFFFF'
                      : colors.purple
                  }
                />

                <Text
                  style={[
                    styles.allIndiaText,
                    {
                      color:
                        isAllIndia
                          ? '#FFFFFF'
                          : colors.purple,
                    },
                  ]}
                >
                  All over India
                </Text>
              </Pressable>

              {/* Selected cities */}

              {selectedCities.length >
                0 &&
                !isAllIndia && (
                  <View
                    style={
                      styles.tagsContainer
                    }
                  >
                    {selectedCities.map(
                      (city) => (
                        <View
                          key={city}
                          style={[
                            styles.cityTag,
                            {
                              backgroundColor:
                                colors.purpleSoft,
                              borderColor:
                                colors.borderStrong,
                            },
                          ]}
                        >
                          <Ionicons
                            name="location"
                            size={13}
                            color={
                              colors.purple
                            }
                          />

                          <Text
                            style={[
                              styles.cityTagText,
                              {
                                color:
                                  colors.purple,
                              },
                            ]}
                          >
                            {city}
                          </Text>

                          <Pressable
                            onPress={() =>
                              removeCity(
                                city
                              )
                            }
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color={
                                colors.purple
                              }
                            />
                          </Pressable>
                        </View>
                      )
                    )}
                  </View>
                )}

              {/* City search */}

              {!isAllIndia && (
                <View
                  style={
                    styles.citySearchWrapper
                  }
                >
                  <View
                    style={[
                      styles.searchBar,
                      {
                        backgroundColor:
                          colors.input,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="search-outline"
                      size={19}
                      color={
                        colors.textMuted
                      }
                    />

                    <TextInput
                      ref={cityInputRef}
                      style={[
                        styles.searchInput,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                      placeholder="Search for a city..."
                      placeholderTextColor={
                        colors.placeholder
                      }
                      value={
                        citySearchText
                      }
                      onChangeText={
                        handleCitySearchChange
                      }
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const match =
                          INDIAN_CITIES.find(
                            (city) =>
                              city.toLowerCase() ===
                              citySearchText
                                .trim()
                                .toLowerCase()
                          );

                        if (match) {
                          addCity(match);
                        }
                      }}
                    />

                    {citySearchText.length >
                      0 && (
                        <Pressable
                          onPress={() => {
                            setCitySearchText(
                              ''
                            );
                            setCitySuggestions(
                              []
                            );
                          }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color={
                              colors.textMuted
                            }
                          />
                        </Pressable>
                      )}
                  </View>

                  {/* City suggestions */}

                  {citySuggestions.length >
                    0 && (
                      <View
                        style={[
                          styles.suggestionsBox,
                          {
                            backgroundColor:
                              colors.surfaceElevated,
                            borderColor:
                              colors.border,
                          },
                        ]}
                      >
                        {citySuggestions.map(
                          (city, index) => (
                            <Pressable
                              key={city}
                              style={({ pressed }) => [
                                styles.suggestionItem,
                                {
                                  borderBottomColor:
                                    colors.border,
                                },
                                pressed && {
                                  backgroundColor:
                                    colors.purpleSoft,
                                },
                                index ===
                                citySuggestions.length -
                                1 && {
                                  borderBottomWidth: 0,
                                },
                              ]}
                              onPress={() =>
                                addCity(
                                  city
                                )
                              }
                            >
                              <View
                                style={[
                                  styles.suggestionIcon,
                                  {
                                    backgroundColor:
                                      colors.purpleSoft,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="location-outline"
                                  size={15}
                                  color={
                                    colors.purple
                                  }
                                />
                              </View>

                              <Text
                                style={[
                                  styles.suggestionText,
                                  {
                                    color:
                                      colors.text,
                                  },
                                ]}
                              >
                                {city}
                              </Text>

                              <Ionicons
                                name="add"
                                size={18}
                                color={
                                  colors.purple
                                }
                              />
                            </Pressable>
                          )
                        )}
                      </View>
                    )}
                </View>
              )}
            </View>

            {/* ------------------------------------------------
                PRICE
            ------------------------------------------------ */}

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <SectionHeader
                icon="pricetag-outline"
                title="Campaign pricing"
                subtitle="Optional information shown to buyers"
              />

              <FieldLabel>
                Exact campaign price
                <Text
                  style={{
                    color:
                      colors.textMuted,
                    fontWeight:
                      FONT_WEIGHTS.REGULAR,
                  }}
                >
                  {' '}
                  (optional)
                </Text>
              </FieldLabel>

              <View
                style={[
                  styles.priceInputWrapper,
                  {
                    backgroundColor:
                      colors.input,
                    borderColor:
                      focusedField ===
                        'price'
                        ? colors.purple
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencySymbol,
                    {
                      color:
                        colors.purple,
                    },
                  ]}
                >
                  ₹
                </Text>

                <TextInput
                  style={[
                    styles.priceInput,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  placeholder="999"
                  placeholderTextColor={
                    colors.placeholder
                  }
                  keyboardType="numeric"
                  value={exactPrice}
                  onChangeText={
                    setExactPrice
                  }
                  onFocus={() =>
                    setFocusedField(
                      'price'
                    )
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                />
              </View>

              <Text
                style={[
                  styles.helperText,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                This price will be displayed
                on your campaign card after
                publishing.
              </Text>
            </View>

            {/* ------------------------------------------------
                BUSINESS LOCATION
            ------------------------------------------------ */}

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <SectionHeader
                icon="navigate-outline"
                title="Business location"
                subtitle="Help nearby buyers find you"
              />

              <Text
                style={[
                  styles.helperLarge,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Pinpoint your business location
                so local buyers can discover
                your campaign more easily.
              </Text>

              {/* GPS */}

              <Pressable
                style={({ pressed }) => [
                  styles.currentLocationButton,
                  {
                    backgroundColor:
                      colors.purpleSoft,
                    borderColor:
                      colors.borderStrong,
                  },
                  pressed && {
                    opacity: 0.75,
                  },
                ]}
                onPress={
                  handleLocationGps
                }
                disabled={
                  locationGpsLoading
                }
              >
                {locationGpsLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.purple
                    }
                  />
                ) : (
                  <View
                    style={[
                      styles.locationButtonIcon,
                      {
                        backgroundColor:
                          colors.purple,
                      },
                    ]}
                  >
                    <Ionicons
                      name="locate"
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                )}

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={[
                      styles.currentLocationTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Use current location
                  </Text>

                  <Text
                    style={[
                      styles.currentLocationSubtitle,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    Automatically detect your
                    business location
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    colors.textMuted
                  }
                />
              </Pressable>

              {/* OR divider */}

              <View
                style={styles.orRow}
              >
                <View
                  style={[
                    styles.orLine,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.orText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  OR SEARCH
                </Text>

                <View
                  style={[
                    styles.orLine,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />
              </View>

              {/* Search */}

              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor:
                      colors.input,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={19}
                  color={
                    colors.textMuted
                  }
                />

                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                  placeholder="Search business address..."
                  placeholderTextColor={
                    colors.placeholder
                  }
                  value={
                    locationSearch
                  }
                  onChangeText={
                    handleLocationSearchChange
                  }
                  returnKeyType="search"
                />

                {locationSearchLoading && (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.purple
                    }
                  />
                )}

                {locationSearch.length >
                  0 &&
                  !locationSearchLoading && (
                    <Pressable
                      onPress={() => {
                        setLocationSearch(
                          ''
                        );
                        setLocationSuggestions(
                          []
                        );
                      }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={
                          colors.textMuted
                        }
                      />
                    </Pressable>
                  )}
              </View>

              {/* Location suggestions */}

              {locationSuggestions.length >
                0 && (
                  <View
                    style={[
                      styles.locationSuggestionsList,
                      {
                        backgroundColor:
                          colors.surfaceElevated,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    {locationSuggestions.map(
                      (prediction, index) => (
                        <Pressable
                          key={
                            prediction.place_id
                          }
                          style={({ pressed }) => [
                            styles.locationSuggestionItem,
                            {
                              borderBottomColor:
                                colors.border,
                            },
                            pressed && {
                              backgroundColor:
                                colors.purpleSoft,
                            },
                            index ===
                            locationSuggestions.length -
                            1 && {
                              borderBottomWidth: 0,
                            },
                          ]}
                          onPress={() =>
                            handleSelectLocationSuggestion(
                              prediction
                            )
                          }
                        >
                          <View
                            style={[
                              styles.suggestionIcon,
                              {
                                backgroundColor:
                                  colors.purpleSoft,
                              },
                            ]}
                          >
                            <Ionicons
                              name="location"
                              size={15}
                              color={
                                colors.purple
                              }
                            />
                          </View>

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={[
                                styles.locationSuggestionMain,
                                {
                                  color:
                                    colors.text,
                                },
                              ]}
                              numberOfLines={
                                1
                              }
                            >
                              {(prediction
                                .structured_formatting &&
                                prediction
                                  .structured_formatting
                                  .main_text) ||
                                prediction.description}
                            </Text>

                            <Text
                              style={[
                                styles.locationSuggestionSub,
                                {
                                  color:
                                    colors.textSecondary,
                                },
                              ]}
                              numberOfLines={
                                1
                              }
                            >
                              {(prediction
                                .structured_formatting &&
                                prediction
                                  .structured_formatting
                                  .secondary_text) ||
                                ''}
                            </Text>
                          </View>
                        </Pressable>
                      )
                    )}
                  </View>
                )}

              {/* Confirmed location */}

              {locationData && (
                <View
                  style={[
                    styles.locationConfirmedBox,
                    {
                      backgroundColor:
                        colors.successBg,
                      borderColor:
                        colors.successBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.confirmedIcon,
                      {
                        backgroundColor:
                          isDarkMode
                            ? 'rgba(34,197,94,0.18)'
                            : '#DCFCE7',
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={
                        colors.success
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={[
                        styles.confirmedLabel,
                        {
                          color:
                            colors.success,
                        },
                      ]}
                    >
                      Location selected
                    </Text>

                    <Text
                      style={[
                        styles.locationConfirmedText,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {
                        locationData.address
                      }
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      setLocationData(
                        null
                      );
                      setLocationSearch(
                        ''
                      );
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={
                        colors.textMuted
                      }
                    />
                  </Pressable>
                </View>
              )}
            </View>

            {/* ------------------------------------------------
                GENERATE BUTTON
            ------------------------------------------------ */}

            <View
              style={
                styles.generateSection
              }
            >
              <View
                style={[
                  styles.generateHint,
                  {
                    backgroundColor:
                      colors.purpleSofter,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={15}
                  color={colors.purple}
                />

                <Text
                  style={[
                    styles.generateHintText,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  Your business profile will
                  be used to personalize the
                  campaign.
                </Text>
              </View>

              <Pressable
                onPress={handleGenerate}
                style={({ pressed }) => [
                  styles.generateButton,
                  pressed && {
                    transform: [
                      { scale: 0.985 },
                    ],
                    opacity: 0.92,
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    '#A855F7',
                    '#7C3AED',
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
                    styles.generateGradient
                  }
                >
                  <View
                    style={
                      styles.generateIconCircle
                    }
                  >
                    <Ionicons
                      name="sparkles"
                      size={17}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text
                    style={
                      styles.generateButtonText
                    }
                  >
                    Generate Campaign
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>

              <Text
                style={[
                  styles.bottomHint,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                You can review and edit the
                generated campaign before
                publishing.
              </Text>
            </View>

            <View
              style={{
                height: 24,
              }}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /*
   * HEADER
   */

  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitleArea: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /*
   * HERO
   */

  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 18,
  },

  heroAccent: {
    width: 42,
    height: 5,
    borderRadius: 10,
    marginBottom: 15,
  },

  pageTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.5,
    marginBottom: 9,
  },

  pageSubtitle: {
    fontSize: 14.5,
    lineHeight: 22,
  },

  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },

  aiHintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },

  /*
   * SECTION CARDS
   */

  sectionCard: {
    marginHorizontal: 16,
    marginTop: 13,
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  /*
   * FIELDS
   */

  fieldGroup: {
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginBottom: 8,
  },

  textInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
  },

  textArea: {
    minHeight: 125,
    paddingTop: 15,
  },

  helperText: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 7,
    marginLeft: 2,
  },

  helperLarge: {
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 13,
  },

  /*
   * DATES
   */

  datesRow: {
    flexDirection: 'row',
    gap: 12,
  },

  dateColumn: {
    minWidth: 0,
  },

  datePickerButton: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  dateText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },

  /*
   * ALL INDIA
   */

  allIndiaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },

  allIndiaText: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },

  /*
   * CITY TAGS
   */

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cityTagText: {
    fontSize: 12.5,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },

  /*
   * SEARCH
   */

  citySearchWrapper: {
    position: 'relative',
    zIndex: 20,
  },

  searchBar: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    paddingVertical: 0,
  },

  suggestionsBox: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  suggestionItem: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },

  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  suggestionText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },

  /*
   * PRICE
   */

  priceInputWrapper: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  currencySymbol: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginRight: 9,
  },

  priceInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  /*
   * LOCATION
   */

  currentLocationButton: {
    minHeight: 67,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  locationButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  currentLocationTitle: {
    fontSize: 13.5,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },

  currentLocationSubtitle: {
    fontSize: 11.5,
    marginTop: 3,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    gap: 9,
  },

  orLine: {
    flex: 1,
    height: 1,
  },

  orText: {
    fontSize: 9.5,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 0.8,
  },

  locationSuggestionsList: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 7,
    overflow: 'hidden',
  },

  locationSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },

  locationSuggestionMain: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },

  locationSuggestionSub: {
    fontSize: 11,
    marginTop: 2,
  },

  locationConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    marginTop: 10,
  },

  confirmedIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  confirmedLabel: {
    fontSize: 11.5,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 2,
  },

  locationConfirmedText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },

  /*
   * GENERATE
   */

  generateSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  generateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 11,
    gap: 7,
  },

  generateHintText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
  },

  generateButton: {
    height: 58,
    borderRadius: 17,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },

  generateGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },

  generateIconCircle: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  bottomHint: {
    textAlign: 'center',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 10,
  },

  /*
   * LOADING
   */

  loadingContainer: {
    flex: 1,
  },

  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  loadingImage: {
    width: 170,
    height: 170,
    marginBottom: 16,
    resizeMode: 'contain',
  },

  loadingStatusText: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.BOLD,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 7,
  },

  loadingSubText: {
    fontSize: 13,
    marginBottom: 20,
  },

  loadingProgressTrack: {
    width: 190,
    height: 5,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },

  loadingProgress: {
    width: '65%',
    height: '100%',
    borderRadius: 10,
  },

  loadingTimeText: {
    fontSize: 11,
  },
});
