/**
 * AICampaignGenerateScreen
 *
 * Input screen where sellers tell the AI what they want to promote.
 * Calls POST /ai/generate and navigates to AIDraftReview on success.
 *
 * Fields:
 *  - Campaign Topic (required)
 *  - Price or Deal (optional)
 *  - Start Date / End Date
 *  - Target Cities (multi-select with autocomplete, or "All over India")
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
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import COLORS from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import Toast from '../../components/Toast';
import apiService from '../../services/apiService';
import INDIAN_CITIES from '../../constants/indianCities';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBqi9sSzxZk_uOmzlwESS0HPX5gRz9vnxo';

const ALL_INDIA_TAG = 'All over India';

const LOADING_STATUSES = [
  'Analyzing your business profile...',
  'Building creative strategy...',
  'Composing advertising direction...',
  'Writing persuasive campaign copy...',
  'Generating premium ad thumbnail...',
];

const loadingAnimations = {
  'Analyzing your business profile...': require('../../../assets/loading_statuses/Analyzing your business profile.png'),
  'Building creative strategy...': require('../../../assets/loading_statuses/Building creative strategy.png'),
  'Composing advertising direction...': require('../../../assets/loading_statuses/Composing advertising direction.png'),
  'Writing persuasive campaign copy...': require('../../../assets/loading_statuses/Writing persuasive campaign copy.png'),
  'Generating premium ad thumbnail...': require('../../../assets/loading_statuses/Generating premium ad thumbnail.png'),
};

export default function AICampaignGenerateScreen({ navigation }) {
  const [campaignTopic, setCampaignTopic] = useState('');
  const [priceOrDeal, setPriceOrDeal] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 30)));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Target Cities state
  const [selectedCities, setSelectedCities] = useState([]);
  const [citySearchText, setCitySearchText] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const cityInputRef = useRef(null);

  const [exactPrice, setExactPrice] = useState('');

  const [locationData, setLocationData] = useState(null); // { address, latitude, longitude }
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationGpsLoading, setLocationGpsLoading] = useState(false);
  const locationSessionToken = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fadeAnim = useState(new Animated.Value(1))[0];

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // Cycle through premium loading statuses
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
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
  }, [loading, fadeAnim]);

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  // ── Target Cities ──────────────────────────────────────────────────────────

  const handleCitySearchChange = (text) => {
    setCitySearchText(text);
    if (text.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    const lower = text.toLowerCase();
    const matches = INDIAN_CITIES.filter(
      (c) =>
        c.toLowerCase().startsWith(lower) &&
        !selectedCities.includes(c) &&
        !selectedCities.includes(ALL_INDIA_TAG)
    ).slice(0, 6);
    setCitySuggestions(matches);
  };

  const addCity = (city) => {
    if (city === ALL_INDIA_TAG) {
      setSelectedCities([ALL_INDIA_TAG]);
    } else if (!selectedCities.includes(city) && !selectedCities.includes(ALL_INDIA_TAG)) {
      setSelectedCities((prev) => [...prev, city]);
    }
    setCitySearchText('');
    setCitySuggestions([]);
  };

  const removeCity = (city) => {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
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

  // ── Inline Location Picker (no MapView — avoids Android APK crash) ───────────

  const handleLocationGps = async () => {
    setLocationGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied. Please search manually.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      // Reverse geocode via Google
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      const address = geoData.results?.[0]?.formatted_address || 'Current Location';
      setLocationData({ address, latitude, longitude });
      setLocationSearch('');
      setLocationSuggestions([]);
    } catch (e) {
      showToast('Could not get your location. Please search manually.');
    } finally {
      setLocationGpsLoading(false);
    }
  };

  const handleLocationSearchChange = async (text) => {
    setLocationSearch(text);
    if (text.length < 3) { setLocationSuggestions([]); return; }
    if (!locationSessionToken.current) {
      locationSessionToken.current = Math.random().toString(36).substring(2);
    }
    setLocationSearchLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${locationSessionToken.current}&components=country:in&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      setLocationSuggestions(data.predictions || []);
    } catch (e) {
      console.warn('Location autocomplete error:', e);
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const handleSelectLocationSuggestion = async (prediction) => {
    setLocationSuggestions([]);
    const placeId = prediction.place_id;
    const token = locationSessionToken.current;
    locationSessionToken.current = null;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      const result = data.result;
      if (result?.geometry) {
        const latitude = result.geometry.location.lat;
        const longitude = result.geometry.location.lng;
        const address = result.formatted_address || prediction.description;
        setLocationData({ address, latitude, longitude });
        setLocationSearch(address);
      }
    } catch (e) {
      console.warn('Location details error:', e);
    }
  };

  // ───────────────────────────────────────────────────────────────────────

  // ── Generate ────────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    Keyboard.dismiss();

    if (!campaignTopic.trim()) {
      showToast('Please tell us what you are promoting.');
      return;
    }
    if (campaignTopic.trim().length < 5) {
      showToast('Please provide a bit more detail about what you are promoting.');
      return;
    }
    if (endDate < startDate) {
      showToast('End date cannot be before start date.');
      return;
    }

    // Serialize target_cities as JSON string
    let targetCitiesStr = null;
    if (selectedCities.length > 0) {
      targetCitiesStr = JSON.stringify(selectedCities);
    }

    setLoading(true);
    try {
      const response = await apiService.post('/ai/generate', {
        campaign_topic: campaignTopic.trim(),
        price_or_deal: priceOrDeal.trim() || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        target_cities: targetCitiesStr,
        location_address: locationData?.address || null,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
      });

      navigation.replace('AIDraftReview', { 
        draftId: response.id,
        initialPrice: exactPrice.trim() ? parseFloat(exactPrice.trim()) : null
      });
    } catch (e) {
      setLoading(false);
      showToast(e.message || 'Generation failed. Please try again.');
    }
  };

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.loadingGradient}>
          <Animated.Image
            source={loadingAnimations[LOADING_STATUSES[loadingStatusIndex]]}
            style={{ width: 180, height: 180, marginBottom: 24, opacity: fadeAnim, resizeMode: 'contain' }}
          />
          <Animated.Text style={[styles.loadingStatusText, { opacity: fadeAnim }]}>
            {LOADING_STATUSES[loadingStatusIndex]}
          </Animated.Text>
          <Text style={styles.loadingSubText}>This usually takes about 15-20 seconds</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  const isAllIndia = selectedCities.includes(ALL_INDIA_TAG);

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="error"
        onHide={() => setToastVisible(false)}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                <Ionicons name="arrow-back" size={22} color={COLORS.TEXT_PRIMARY} />
              </Pressable>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.headerTitle}>AI Campaign</Text>
              </View>
            </View>

            <View style={styles.content}>
              <View style={styles.titleSection}>
                <Text style={styles.pageTitle}>What are you promoting today?</Text>
                <Text style={styles.pageSubtitle}>
                  We'll combine this with your business profile to write a professional campaign and generate an ad-quality image.
                </Text>
              </View>

              <View style={styles.formSection}>

                {/* Campaign Topic */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Topic or Product <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="e.g. Diwali special on all laptop repairs, or New arrival of office chairs."
                    placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                    value={campaignTopic}
                    onChangeText={setCampaignTopic}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                {/* Price or Deal */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Price or Deal <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Flat 20% off, Starts at ₹999, Buy 1 Get 1"
                    placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                    value={priceOrDeal}
                    onChangeText={setPriceOrDeal}
                  />
                  <Text style={styles.helperText}>If left empty, AI will use general language.</Text>
                </View>

                {/* Dates */}
                <View style={styles.datesRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Start Date</Text>
                    <Pressable style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.TEXT_SECONDARY} style={{ marginRight: 8 }} />
                      <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                    </Pressable>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={onStartDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>End Date</Text>
                    <Pressable style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.TEXT_SECONDARY} style={{ marginRight: 8 }} />
                      <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                    </Pressable>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={onEndDateChange}
                        minimumDate={startDate}
                      />
                    )}
                  </View>
                </View>

                {/* ── Target Cities ─────────────────────────────────────── */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Target Cities <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <Text style={styles.helperText}>
                    Which cities do you provide your service in? Leave empty to target your registered city only.
                  </Text>

                  {/* All over India toggle */}
                  <Pressable
                    style={[styles.allIndiaBtn, isAllIndia && styles.allIndiaBtnActive]}
                    onPress={toggleAllIndia}
                  >
                    <Ionicons
                      name={isAllIndia ? 'checkmark-circle' : 'earth-outline'}
                      size={16}
                      color={isAllIndia ? '#FFFFFF' : '#1A73E8'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.allIndiaBtnText, isAllIndia && styles.allIndiaBtnTextActive]}>
                      All over India
                    </Text>
                  </Pressable>

                  {/* Selected city tags */}
                  {selectedCities.length > 0 && !isAllIndia && (
                    <View style={styles.tagsContainer}>
                      {selectedCities.map((city) => (
                        <View key={city} style={styles.cityTag}>
                          <Text style={styles.cityTagText}>{city}</Text>
                          <Pressable onPress={() => removeCity(city)} hitSlop={6}>
                            <Ionicons name="close-circle" size={16} color="#1A73E8" style={{ marginLeft: 4 }} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* City search input */}
                  {!isAllIndia && (
                    <View style={styles.citySearchWrapper}>
                      <View style={styles.citySearchBar}>
                        <Ionicons name="search-outline" size={16} color={COLORS.TEXT_PLACEHOLDER} style={{ marginRight: 8 }} />
                        <TextInput
                          ref={cityInputRef}
                          style={styles.citySearchInput}
                          placeholder="Type a city name, e.g. Chennai..."
                          placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                          value={citySearchText}
                          onChangeText={handleCitySearchChange}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            const match = INDIAN_CITIES.find(
                              (c) => c.toLowerCase() === citySearchText.trim().toLowerCase()
                            );
                            if (match) addCity(match);
                          }}
                        />
                      </View>

                      {/* Suggestions dropdown */}
                      {citySuggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                          {citySuggestions.map((city) => (
                            <Pressable
                              key={city}
                              style={({ pressed }) => [
                                styles.suggestionItem,
                                pressed && styles.suggestionItemPressed,
                              ]}
                              onPress={() => addCity(city)}
                            >
                              <Ionicons name="location-outline" size={14} color="#1A73E8" style={{ marginRight: 8 }} />
                              <Text style={styles.suggestionText}>{city}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {/* ──────────────────────────────────────────────────────── */}

                {/* Exact Price */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Exact Campaign Price <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 999, 4999, 0 for free"
                    placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                    keyboardType="numeric"
                    value={exactPrice}
                    onChangeText={setExactPrice}
                  />
                  <Text style={styles.helperText}>This will be shown on your campaign card after publishing.</Text>
                </View>

                {/* Business Location - inline picker (no MapView to avoid Android APK crash) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Business Location <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <Text style={styles.helperText}>Pinpoint your exact location for local buyers.</Text>

                  {/* GPS + Search buttons */}
                  <View style={styles.locationBtnsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.locationBtn, pressed && { opacity: 0.7 }]}
                      onPress={handleLocationGps}
                      disabled={locationGpsLoading}
                    >
                      {locationGpsLoading
                        ? <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        : <Ionicons name="locate" size={15} color={COLORS.PRIMARY} style={{ marginRight: 5 }} />
                      }
                      <Text style={styles.locationBtnText}>Use Current Location</Text>
                    </Pressable>
                  </View>

                  {/* Search bar */}
                  <View style={styles.locationSearchBar}>
                    <Ionicons name="search-outline" size={15} color={COLORS.TEXT_PLACEHOLDER} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.locationSearchInput}
                      placeholder="Search business address..."
                      placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
                      value={locationSearch}
                      onChangeText={handleLocationSearchChange}
                      returnKeyType="search"
                    />
                    {locationSearchLoading && <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginLeft: 6 }} />}
                    {locationSearch.length > 0 && !locationSearchLoading && (
                      <Pressable onPress={() => { setLocationSearch(''); setLocationSuggestions([]); }}>
                        <Ionicons name="close-circle" size={16} color={COLORS.TEXT_PLACEHOLDER} />
                      </Pressable>
                    )}
                  </View>

                  {/* Suggestions */}
                  {locationSuggestions.length > 0 && (
                    <View style={styles.locationSuggestionsList}>
                      {locationSuggestions.map((pred) => (
                        <Pressable
                          key={pred.place_id}
                          style={({ pressed }) => [styles.locationSuggestionItem, pressed && { backgroundColor: '#F0F9FF' }]}
                          onPress={() => handleSelectLocationSuggestion(pred)}
                        >
                          <Ionicons name="location-outline" size={14} color={COLORS.PRIMARY} style={{ marginRight: 8, marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.locationSuggestionMain} numberOfLines={1}>
                              {pred.structured_formatting?.main_text || pred.description}
                            </Text>
                            <Text style={styles.locationSuggestionSub} numberOfLines={1}>
                              {pred.structured_formatting?.secondary_text || ''}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Confirmed location display */}
                  {locationData && (
                    <View style={styles.locationConfirmedBox}>
                      <Ionicons name="checkmark-circle" size={15} color={COLORS.SUCCESS} style={{ marginRight: 6 }} />
                      <Text style={styles.locationConfirmedText} numberOfLines={2}>{locationData.address}</Text>
                      <Pressable onPress={() => { setLocationData(null); setLocationSearch(''); }}>
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </Pressable>
                    </View>
                  )}
                </View>

              </View>

              <PrimaryButton
                title="Generate Campaign →"
                onPress={handleGenerate}
                style={styles.generateBtn}
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1 },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingStatusText: {
    color: '#0F172A',
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubText: {
    color: '#64748B',
    fontSize: FONT_SIZES.SM,
  },
  scrollContent: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  content: { padding: 20 },
  titleSection: { marginBottom: 32 },
  pageTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  formSection: { gap: 24 },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  required: { color: COLORS.ERROR },
  optionalTag: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
    fontSize: FONT_SIZES.XS,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.TEXT_PRIMARY,
  },
  textArea: { minHeight: 120, paddingTop: 16 },
  helperText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 2,
  },
  datesRow: { flexDirection: 'row', gap: 16 },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  dateText: { fontSize: FONT_SIZES.BASE, color: COLORS.TEXT_PRIMARY },

  // ── Target Cities ─────────────────────────────────────────────────────────
  allIndiaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1A73E8',
    backgroundColor: '#EFF6FF',
    marginTop: 4,
  },
  allIndiaBtnActive: {
    backgroundColor: '#1A73E8',
    borderColor: '#1A73E8',
  },
  allIndiaBtnText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: '#1A73E8',
  },
  allIndiaBtnTextActive: { color: '#FFFFFF' },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityTagText: {
    fontSize: FONT_SIZES.SM,
    color: '#1E40AF',
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  citySearchWrapper: { position: 'relative', zIndex: 10 },
  citySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  citySearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
  },
  suggestionsBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionItemPressed: { backgroundColor: '#F0F9FF' },
  suggestionText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  generateBtn: { marginTop: 40, backgroundColor: '#1A73E8', height: 56 },

  // ── Inline Location Picker ──────────────────────────────────────────────
  locationBtnsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationBtnText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  locationSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 6,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
  },
  locationSuggestionsList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  locationSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationSuggestionMain: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  locationSuggestionSub: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 1,
  },
  locationConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  locationConfirmedText: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: '#15803D',
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
});
