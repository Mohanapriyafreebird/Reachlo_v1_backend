import React, { useState, useEffect, useRef } from 'react'
import { View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { API_CONFIG } from '../config/apiConfig'

/**
 * Non-intrusive autocomplete helper component.
 * Usage: render <PlacesAutocompleteProxy onPlaceSelected={place => { ... }} /> inside your existing Create Campaign UI.
 * It does not modify any screens automatically; it only calls the supplied callback when a place is chosen.
 */
export default function PlacesAutocompleteProxy({ onPlaceSelected, authToken = null, placeholder = 'Search business address' }) {
  const [q, setQ] = useState('')
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const sessionTokenRef = useRef(String(Date.now()))

  useEffect(() => {
    if (!q || q.length < 2) {
      setPredictions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPredictions(q)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  async function fetchPredictions(text) {
    setLoading(true)
    try {
      const url = `${API_CONFIG.BASE_URL}/campaigns/places/autocomplete?input=${encodeURIComponent(text)}&sessiontoken=${sessionTokenRef.current}`
      const resp = await fetch(url, {
        method: 'GET',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      if (!resp.ok) {
        setPredictions([])
        setLoading(false)
        return
      }
      const data = await resp.json()
      setPredictions(data || [])
    } catch (e) {
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }

  async function selectPrediction(pred) {
    // pred.place_id expected
    if (!pred || !pred.place_id) return
    try {
      const url = `${API_CONFIG.BASE_URL}/campaigns/places/details?place_id=${encodeURIComponent(pred.place_id)}`
      const resp = await fetch(url, { method: 'GET', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} })
      if (!resp.ok) return
      const details = await resp.json()
      if (onPlaceSelected) onPlaceSelected(details)
      // Optionally clear the query and predictions
      setQ(pred.description || '')
      setPredictions([])
    } catch (e) {
      // swallow
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize='none'
      />
      {loading && <ActivityIndicator size="small" />}
      {predictions.length > 0 && (
        <FlatList
          data={predictions}
          keyExtractor={(i) => i.place_id || i.description}
          keyboardShouldPersistTaps='handled'
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => selectPrediction(item)}>
              <Text style={styles.primary}>{item.structured_formatting?.main_text || item.description}</Text>
              {item.structured_formatting?.secondary_text ? (
                <Text style={styles.secondary}>{item.structured_formatting.secondary_text}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: { padding: 10, borderColor: '#ddd', borderWidth: 1, borderRadius: 8 },
  item: { paddingVertical: 10, paddingHorizontal: 6, borderBottomColor: '#eee', borderBottomWidth: 1 },
  primary: { fontSize: 14 },
  secondary: { fontSize: 12, color: '#666' },
})
