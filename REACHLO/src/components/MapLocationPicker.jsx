import React, { useEffect, useState, useRef, Component } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

// Prevent native MapView crash from killing the parent screen
class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e) { console.warn('MapLocationPicker MapView error:', e?.message); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', gap: 8 }}>
          <Text style={{ color: '#64748B' }}>Map unavailable. Location is saved.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MapLocationPicker({ visible, onClose, onConfirm, initialLocation }) {
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        let loc = initialLocation;
        if (!loc) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            loc = { latitude: cur.coords.latitude, longitude: cur.coords.longitude };
          }
        }
        if (loc) {
          const r = { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
          setRegion(r);
          setMarker({ latitude: loc.latitude, longitude: loc.longitude });
        }
      } catch (e) {
        console.warn('MapLocationPicker init error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
  };

  const handleConfirm = async () => {
    if (!marker) return;
    // Reverse geocode via Expo Location
    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: marker.latitude, longitude: marker.longitude });
      const place = rev && rev.length ? rev[0] : null;
      const readable = place ? [place.name, place.street, place.subregion || place.region, place.region, place.country].filter(Boolean).join(', ') : '';
      onConfirm({ latitude: marker.latitude, longitude: marker.longitude, address: readable });
    } catch (e) {
      console.warn('Reverse geocode failed', e);
      onConfirm({ latitude: marker.latitude, longitude: marker.longitude, address: '' });
    }
  };

  const searchAddress = async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const q = encodeURIComponent(text);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ReachloApp/1.0' } });
      const json = await res.json();
      setSuggestions(json || []);
    } catch (e) {
      console.warn('Address search failed', e);
    }
  };

  const selectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const r = { latitude: lat, longitude: lon, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    setRegion(r);
    setMarker({ latitude: lat, longitude: lon });
    setSuggestions([]);
    setQuery(item.display_name || '');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextInput placeholder="Search your business" value={query} onChangeText={searchAddress} style={styles.searchInput} />
          <Pressable onPress={() => onClose()} style={styles.cancelBtn}><Text style={styles.cancelText}>Close</Text></Pressable>
        </View>
        {suggestions.length > 0 && (
          <FlatList data={suggestions} keyExtractor={(i) => i.place_id?.toString() || i.osm_id?.toString()} style={styles.suggestionsList}
            renderItem={({ item }) => (
              <Pressable style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                <Text>{item.display_name}</Text>
              </Pressable>
            )} />
        )}

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} />
        ) : (
          <MapErrorBoundary>
            <MapView 
              provider={PROVIDER_GOOGLE}
              style={styles.map} 
              region={region} 
              onPress={handleMapPress} 
              onRegionChangeComplete={setRegion} 
              liteMode={false}
            >
              {marker && (
                <Marker coordinate={marker} draggable onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)} />
              )}
            </MapView>
          </MapErrorBoundary>
        )}

        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={{ color: '#333' }}>{marker ? `${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}` : 'Tap to place marker'}</Text>
          </View>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}><Text style={styles.confirmText}>Confirm Location</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  footer: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee' },
  confirmBtn: { backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  confirmText: { color: '#fff', fontWeight: '600' },
  searchRow: { flexDirection: 'row', padding: 10, gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#E6E6E6', padding: 8, backgroundColor: '#fff' },
  cancelBtn: { paddingHorizontal: 10 },
  cancelText: { color: '#2563EB' },
  suggestionsList: { maxHeight: 160, backgroundColor: '#fff' },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderColor: '#f1f1f1' },
});
