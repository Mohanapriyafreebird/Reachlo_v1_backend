import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BuyerGrowthDashboard({ views = 0, leads = 0, activeCampaigns = 1 }) {
  const cardWidth = (SCREEN_WIDTH - 48 - 24) / 3; // 3 cards + padding
  
  const animView = useRef(new Animated.Value(0)).current;
  const animLeads = useRef(new Animated.Value(0)).current;
  const animActive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger animation for each card
    Animated.stagger(100, [
      Animated.timing(animView, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animLeads, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animActive, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const createAnimatedCardStyle = (animValue) => ({
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
    opacity: animValue,
  });

  const StatCard = ({ number, label, icon, iconBgColor, animValue }) => (
    <Animated.View style={[styles.card, { width: cardWidth }, createAnimatedCardStyle(animValue)]}>
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Number */}
      <Text style={styles.number}>{number}</Text>

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Growth This Month</Text>

      <View style={styles.cardsRow}>
        <StatCard
          number={views}
          label="Views"
          icon="👁"
          iconBgColor="#3B82F6"
          animValue={animView}
        />
        <StatCard
          number={leads}
          label="Leads"
          icon="👥"
          iconBgColor="#10B981"
          animValue={animLeads}
        />
        <StatCard
          number={activeCampaigns}
          label="Active"
          icon="📣"
          iconBgColor="#F59E0B"
          animValue={animActive}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 20,
  },
  number: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: '#64748B',
  },
});
