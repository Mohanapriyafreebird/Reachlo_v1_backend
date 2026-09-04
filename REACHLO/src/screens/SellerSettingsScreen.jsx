import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function SellerSettingsScreen() {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Personal Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, shadowColor: theme.sellerPrimary }]}>

        {/* Analytics Option */}
        <Pressable
          onPress={() => navigation.navigate('SellerAnalytics')}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed, { borderBottomColor: theme.border }]}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme.sellerSurface }]}>
              <Ionicons name="bar-chart-outline" size={20} color={theme.sellerPrimary} />
            </View>
            <Text style={[styles.optionLabelText, { color: theme.text }]}>Analytics</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </Pressable>

        {/* Wallet Option */}
        <Pressable
          onPress={() => navigation.navigate('SellerWallet')}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed, { borderBottomColor: theme.border }]}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme.sellerSurface }]}>
              <Ionicons name="wallet-outline" size={20} color={theme.sellerPrimary} />
            </View>
            <Text style={[styles.optionLabelText, { color: theme.text }]}>Wallet</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </Pressable>

        {/* Dark Mode Toggle */}
        <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
          <View style={styles.optionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme.sellerSurface }]}>
              <Ionicons name={isDarkMode ? "moon-outline" : "sunny-outline"} size={20} color={theme.sellerPrimary} />
            </View>
            <Text style={[styles.optionLabelText, { color: theme.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
            thumbColor={theme.switchThumb}
            ios_backgroundColor={theme.switchTrackInactive}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
