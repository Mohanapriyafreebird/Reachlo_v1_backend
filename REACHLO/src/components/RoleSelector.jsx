import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

export default function RoleSelector({ selectedRole, onSelect }) {
  const sellerScale = useRef(new Animated.Value(1)).current;
  const buyerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(sellerScale, {
      toValue: selectedRole === 'SELLER' ? 1.03 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();

    Animated.spring(buyerScale, {
      toValue: selectedRole === 'BUYER' ? 1.03 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [selectedRole]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: sellerScale }] }]}>
        <Pressable
          onPress={() => onSelect('SELLER')}
          style={[
            styles.card,
            selectedRole === 'SELLER' ? styles.sellerSelected : styles.unselected,
          ]}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedRole === 'SELLER' }}
          accessibilityLabel="Business Owner Role"
        >
          <Text style={[styles.emoji, selectedRole === 'SELLER' && styles.sellerText]}>🏢</Text>
          <Text style={[
            styles.label,
            selectedRole === 'SELLER' ? styles.sellerText : styles.unselectedText
          ]}>
            Business Owner
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: buyerScale }] }]}>
        <Pressable
          onPress={() => onSelect('BUYER')}
          style={[
            styles.card,
            selectedRole === 'BUYER' ? styles.buyerSelected : styles.unselected,
          ]}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedRole === 'BUYER' }}
          accessibilityLabel="Buyer Role"
        >
          <Text style={[styles.emoji, selectedRole === 'BUYER' && styles.buyerText]}>👤</Text>
          <Text style={[
            styles.label,
            selectedRole === 'BUYER' ? styles.buyerText : styles.unselectedText
          ]}>
            I'm a Buyer
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginHorizontal: 6, // creates visual gap between flex: 1 items
  },
  unselected: {
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  sellerSelected: {
    borderColor: COLORS.SELLER_PRIMARY,
    backgroundColor: COLORS.SELLER_SURFACE,
  },
  buyerSelected: {
    borderColor: COLORS.BUYER_ACCENT,
    backgroundColor: '#EFF6FF',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  label: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  sellerText: {
    color: COLORS.SELLER_PRIMARY,
  },
  buyerText: {
    color: COLORS.BUYER_ACCENT,
  },
  unselectedText: {
    color: COLORS.TEXT_SECONDARY,
  },
});
