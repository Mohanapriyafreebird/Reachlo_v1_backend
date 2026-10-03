import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';
import sellerAnalyticsService from '../services/sellerAnalyticsService';
import { safeFormatNumber, safeGetNumber } from '../utils/formatters';

const TIME_FILTERS = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '3 Months', value: '90' },
  { label: '1 Year', value: '365' }
];

export default function SellerAnalyticsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    try {
      const response = await sellerAnalyticsService.getAnalytics(period);
      setData(response);
    } catch (error) {
      console.warn('Failed to load analytics', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const renderStatCard = (title, value, icon, color = theme.sellerPrimary) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: theme.text }]}>{safeFormatNumber(value)}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  const renderBarChart = () => {
    if (!data?.earnings?.history || data.earnings.history.length === 0) return null;
    const maxVal = Math.max(...data.earnings.history.map(d => d.value));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Earnings Over Time</Text>
        <View style={[styles.chartArea, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
          {data.earnings.history.map((item, index) => {
            const heightPerc = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.barBg, { backgroundColor: theme.divider }]}>
                  <View style={[styles.barFill, { height: `${heightPerc}%` }]} />
                </View>
                <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading && !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.sellerPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        {canGoBack && (
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Monitor your business performance</Text>
      </View>

      <View style={[styles.filterContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TIME_FILTERS.map(f => (
            <Text 
              key={f.value}
              onPress={() => setPeriod(f.value)}
              style={[
                styles.filterChip, 
                { backgroundColor: theme.surfaceSecondary, color: theme.textSecondary },
                period === f.value && { backgroundColor: `${theme.sellerPrimary}15`, color: theme.sellerPrimary }
              ]}
            >
              {f.label}
            </Text>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {data ? (
            <>
              {/* Overview Section */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
              <View style={styles.statsGrid}>
                {renderStatCard('Total Earnings', `₹${safeFormatNumber(data?.overview?.totalEarnings)}`, 'cash-outline', theme.success)}
                {renderStatCard('Total Reach', safeFormatNumber(data?.overview?.totalReach), 'eye-outline', theme.sellerPrimary)}
                {renderStatCard('Active Campaigns', data?.overview?.activeCampaigns ?? 0, 'megaphone-outline', '#F59E0B')}
                {renderStatCard('Conversion Rate', data?.overview?.conversionRate ?? '0%', 'trending-up-outline', '#10B981')}
              </View>

              {/* Earnings Breakdown */}
              <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Earnings Breakdown</Text>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>This Week</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>₹{safeFormatNumber(data?.earnings?.thisWeek)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Pending</Text>
                  <Text style={[styles.rowValue, { color: '#F59E0B' }]}>₹{safeFormatNumber(data?.earnings?.pending)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Total (Selected Period)</Text>
                  <Text style={[styles.rowValue, { color: theme.success, fontWeight: 'bold' }]}>₹{safeFormatNumber(data?.earnings?.total)}</Text>
                </View>
              </View>

              {/* Chart */}
              {renderBarChart()}

              {/* Campaign Performance */}
              <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Campaign Performance</Text>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Best Performing</Text>
                  <Text style={[styles.rowValue, { color: theme.text, flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={1}>{data?.campaignPerformance?.bestPerforming ?? 'N/A'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Total Engagement</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{safeFormatNumber(data?.campaignPerformance?.engagement)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Total Clicks</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{safeFormatNumber(data?.campaignPerformance?.clicks)}</Text>
                </View>
              </View>
              
              <View style={{height: 100}} />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>No analytics data available.</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { marginBottom: 8, padding: 4 },
  headerTitle: { fontSize: FONT_SIZES.XXL, fontWeight: FONT_WEIGHTS.BOLD },
  headerSubtitle: { fontSize: FONT_SIZES.SM, marginTop: 4 },
  filterContainer: { borderBottomWidth: 1, paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontSize: 14, fontWeight: '600', overflow: 'hidden' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.BOLD, marginBottom: 16, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, flexDirection: 'column' },
  iconWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statContent: { gap: 4 },
  statValue: { fontSize: FONT_SIZES.XL, fontWeight: '800' },
  statTitle: { fontSize: 12, fontWeight: '500' },
  infoCard: { borderRadius: 16, padding: 20, marginBottom: 24, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: FONT_SIZES.MD, fontWeight: FONT_WEIGHTS.BOLD, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowValue: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 4 },
  chartContainer: { marginBottom: 24 },
  chartArea: { borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  barColumn: { alignItems: 'center', flex: 1, gap: 8 },
  barBg: { width: 24, height: 130, borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#8B5CF6', borderRadius: 12 },
  barLabel: { fontSize: 10, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyStateText: { marginTop: 16, fontSize: 15, fontWeight: '500' }
});
