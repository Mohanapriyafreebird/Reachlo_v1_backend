/**
 * BusinessLocationPicker
 * 
 * Reusable location picker component used in:
 *   - SellerRegisterStep2Screen (registration)
 *   - SellerProfileScreen (profile edit — identical UX, no duplication)
 * 
 * Provides:
 *   - Two glassmorphism buttons: "Use current location" (GPS) + "Search business location"
 *   - Search bar with Google Places Autocomplete
 *   - Map preview card (180px, blue pin)
 *   - "Confirm this location" button
 *   - Stores: address string, latitude, longitude
 * 
 * Props:
 *   onLocationConfirmed({ address, latitude, longitude }) — called when seller confirms
 *   initialAddress — pre-fill location display box (for profile edit)
 *   googleApiKey — Google Places API key
 */

import React, { useState, useRef, useCallback, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBqi9sSzxZk_uOmzlwESS0HPX5gRz9vnxo';

// Prevents MapView native crash from killing the whole screen
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('MapView error in BusinessLocationPicker:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ height: 180, width: '100%', backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 6 }}>
          <Ionicons name="map-outline" size={28} color="#94A3B8" />
          <Text style={{ color: '#64748B', fontSize: 13 }}>Map preview unavailable</Text>
          <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', paddingHorizontal: 20 }}>Location is saved. Rebuild the app to enable map preview.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function BusinessLocationPicker({ onLocationConfirmed, initialAddress = '' }) {
  const [locationDisplay, setLocationDisplay] = useState(initialAddress);
  const [confirmed, setConfirmed] = useState(!!initialAddress);
  const [pendingCoords, setPendingCoords] = useState(null); // { latitude, longitude, address }

  // Search bar state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const sessionToken = useRef(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Map preview state
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [mapMarker, setMapMarker] = useState(null);
  const [mapAddress, setMapAddress] = useState('');

  // Animation for search bar slide-in
  const searchAnim = useRef(new Animated.Value(0)).current;

  const showSearch = () => {
    setSearchVisible(true);
    Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const hideSearch = () => {
    Animated.timing(searchAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start(() => {
      setSearchVisible(false);
      setSearchQuery('');
      setSuggestions([]);
    });
  };

  // ── GPS: Use current location ─────────────────────────────────────────────

  const handleUseCurrentLocation = async () => {
    setGpsError('');
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError(
          'Location permission denied. Please enable it in your device settings or search manually.'
        );
        setGpsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // Reverse geocode via Google Geocoding API
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      let address = '';
      let city = '';
      if (geoData.results && geoData.results.length > 0) {
        address = geoData.results[0].formatted_address;
        const cityObj = geoData.results[0].address_components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
        if (cityObj) city = cityObj.long_name;
      }

      openMapPreview({ latitude, longitude, address, city });
    } catch (e) {
      setGpsError('Could not get your location. Please search manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Places Autocomplete ───────────────────────────────────────────────────

  const handleSearchChange = async (text) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    // Generate sessionToken for billing grouping (reduces cost by ~90%)
    if (!sessionToken.current) {
      sessionToken.current = Math.random().toString(36).substring(2);
    }

    setSearchLoading(true);
    try {
      const encoded = encodeURIComponent(text);
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${sessionToken.current}&components=country:in&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch (e) {
      console.warn('Places autocomplete error:', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSuggestion = async (prediction) => {
    hideSearch();
    setSuggestions([]);
    const placeId = prediction.place_id;

    // Use the sessionToken for this Details call (completes the billing session)
    const token = sessionToken.current;
    sessionToken.current = null; // reset for next search session

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      const result = data.result;

      if (result && result.geometry) {
        const latitude = result.geometry.location.lat;
        const longitude = result.geometry.location.lng;
        const address = result.formatted_address || prediction.description;
        
        let city = '';
        if (result.address_components) {
          const cityObj = result.address_components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
          if (cityObj) city = cityObj.long_name;
        }

        openMapPreview({ latitude, longitude, address, city });
      }
    } catch (e) {
      console.warn('Place details error:', e);
    }
  };

  const [mapCity, setMapCity] = useState('');

  // ── Map preview ───────────────────────────────────────────────────────────

  const openMapPreview = ({ latitude, longitude, address, city }) => {
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setMapMarker({ latitude, longitude });
    setMapAddress(address);
    setMapCity(city || '');
    setLocationDisplay(address);
    setMapVisible(true);
    setConfirmed(false);
  };

  const handleConfirmLocation = () => {
    if (!mapMarker) return;
    const confirmed_data = {
      address: mapAddress,
      latitude: mapMarker.latitude,
      longitude: mapMarker.longitude,
      city: mapCity,
    };
    setLocationDisplay(mapAddress);
    setConfirmed(true);
    setMapVisible(false);
    onLocationConfirmed(confirmed_data);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Location display box */}
      <View style={styles.locationBox}>
        {confirmed && locationDisplay ? (
          <View style={styles.locationConfirmedRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
            <Text style={styles.locationText} numberOfLines={2}>{locationDisplay}</Text>
          </View>
        ) : (
          <Text style={styles.locationPlaceholder}>No location selected</Text>
        )}
      </View>

      {/* Two glassmorphism buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
          onPress={handleUseCurrentLocation}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          ) : (
            <Ionicons name="locate" size={16} color={COLORS.PRIMARY} style={styles.btnIcon} />
          )}
          <Text style={styles.glassButtonText}>Use current location</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.glassButton, pressed && styles.glassButtonPressed]}
          onPress={showSearch}
        >
          <Ionicons name="search" size={16} color={COLORS.PRIMARY} style={styles.btnIcon} />
          <Text style={styles.glassButtonText}>Search location</Text>
        </Pressable>
      </View>

      {/* GPS permission error */}
      {!!gpsError && (
        <Text style={styles.errorText}>{gpsError}</Text>
      )}

      {/* Search bar (slides in below buttons) */}
      {searchVisible && (
        <Animated.View style={[styles.searchContainer, { opacity: searchAnim }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.TEXT_PLACEHOLDER} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type your business name or address"
              placeholderTextColor={COLORS.TEXT_PLACEHOLDER}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.TEXT_PLACEHOLDER} />
              </Pressable>
            )}
            {searchLoading && <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginLeft: 6 }} />}
          </View>

          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {suggestions.map((item) => (
                <Pressable
                  key={item.place_id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons name="location-outline" size={14} color={COLORS.PRIMARY} style={{ marginRight: 8, marginTop: 2 }} />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionMain} numberOfLines={1}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>
                      {item.structured_formatting?.secondary_text || ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable onPress={hideSearch} style={styles.cancelSearch}>
            <Text style={styles.cancelSearchText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Map preview card */}
      {mapVisible && mapRegion && (
        <View style={styles.mapCard}>
          <MapErrorBoundary>
            <MapView
              style={styles.map}
              region={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              liteMode={true}
            >
              <Marker coordinate={mapMarker} pinColor={COLORS.PRIMARY} />
            </MapView>
          </MapErrorBoundary>
          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
            onPress={handleConfirmLocation}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.PRIMARY} style={{ marginRight: 6 }} />
            <Text style={styles.confirmBtnText}>Confirm this location</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  locationBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  locationPlaceholder: {
    color: COLORS.TEXT_PLACEHOLDER,
    fontSize: FONT_SIZES.SM,
  },
  locationText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: FONT_SIZES.SM,
    flex: 1,
    marginLeft: 6,
  },
  locationConfirmedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  glassButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 115, 232, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(26, 115, 232, 0.35)',
    paddingHorizontal: 8,
  },
  glassButtonPressed: {
    backgroundColor: 'rgba(26, 115, 232, 0.22)',
    borderColor: 'rgba(26, 115, 232, 0.6)',
  },
  btnIcon: {
    marginRight: 6,
  },
  glassButtonText: {
    color: '#1A73E8',
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    textAlign: 'center',
    flexShrink: 1,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: FONT_SIZES.XS,
    marginTop: 4,
  },
  searchContainer: {
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  suggestionsList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: { flex: 1 },
  suggestionMain: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  suggestionSecondary: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  cancelSearch: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelSearchText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONT_SIZES.SM,
  },
  mapCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    height: 180,
    width: '100%',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  confirmBtnPressed: {
    backgroundColor: '#F0F4FF',
  },
  confirmBtnText: {
    color: '#1A73E8',
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
});
