import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_WEIGHTS } from '../constants/typography';

export default function BusinessVerifiedBadge({ compact = false }) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.icon, compact && styles.iconCompact]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompact: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.BOLD,
    lineHeight: 12,
  },
  iconCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
});
