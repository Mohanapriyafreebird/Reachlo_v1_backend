import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import sellerAnalyticsService from '../services/sellerAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Period filter options ────────────────────────────────────────────────────
const TIME_FILTERS = [
  { label: '7 Days',   value: '7'   },
  { label: '30 Days',  value: '30'  },
  { label: '3 Months', value: '90'  },
  { label: '1 Year',   value: '365' },
];

// ─── Lead quality colour palette ─────────────────────────────────────────────
const LEAD_COLORS = {
  HOT:  { fill: '#EF4444', label: 'Hot',  icon: '🔴' },
  NEW:  { fill: '#6366F1', label: 'New',  icon: '🔵' },
  WARM: { fill: '#F59E0B', label: 'Warm', icon: '🟠' },
  COLD: { fill: '#94A3B8', label: 'Cold', icon: '⚪' },
};
const LEAD_ORDER = ['HOT', 'NEW', 'WARM', 'COLD'];

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ACTIVE:  { color: '#16A34A', bg: '#DCFCE7', label: 'Active'  },
  EXPIRED: { color: '#6B7280', bg: '#F3F4F6', label: 'Expired' },
  DRAFT:   { color: '#D97706', bg: '#FEF3C7', label: 'Draft'   },
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNT-UP HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1100, delay = 0) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target == null) return;
    animVal.setValue(0);
    const listener = animVal.addListener(({ value }) => {
      setDisplay(Math.floor(value));
    });
    const timer = setTimeout(() => {
      Animated.timing(animVal, {
        toValue: target,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => {
      clearTimeout(timer);
      animVal.removeListener(listener);
    };
  }, [target]);

  return display;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, rawValue, accent, theme, delay = 0 }) {
  const count = useCountUp(typeof rawValue === 'number' ? rawValue : null, 1100, delay);
  const displayValue = typeof rawValue === 'number' ? count.toLocaleString() : value;

  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
      <View style={[styles.kpiIconBg, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{displayValue}</Text>
      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONUT CHART (pure RN — two-arc approach, no SVG/library)
// ─────────────────────────────────────────────────────────────────────────────
const DONUT_SIZE  = 180;
const DONUT_THICK = 32;
const DONUT_R     = (DONUT_SIZE - DONUT_THICK) / 2;

function DonutSegment({ startDeg, sweepDeg, color, size, thick }) {
  // We draw each segment as two half-discs clamped by clip views.
  // If sweepDeg <= 0 skip rendering.
  if (sweepDeg <= 0) return null;

  const half = size / 2;
  const halfSweep = sweepDeg / 2;

  // Rotation of the entire segment so it begins at startDeg
  const segRotate = startDeg + halfSweep;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center' },
        { transform: [{ rotate: `${segRotate}deg` }] },
      ]}
      pointerEvents="none"
    >
      {/* Left half */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          overflow: 'hidden',
          transform: [{ rotate: `${-halfSweep}deg` }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              right: 0,
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: color,
              transform: [{ rotate: `${Math.max(0, halfSweep - 180)}deg` }],
            }}
          />
        </View>
      </View>

      {/* Right half */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          overflow: 'hidden',
          transform: [{ rotate: `${halfSweep}deg` }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: color,
              transform: [{ rotate: `${-Math.max(0, halfSweep - 180)}deg` }],
            }}
          />
        </View>
      </View>
    </View>
  );
}

function DonutChart({ leadQuality, theme }) {
  const total = LEAD_ORDER.reduce((s, k) => s + (leadQuality[k] || 0), 0);
  const animProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    animProgress.setValue(0);
    const listener = animProgress.addListener(({ value }) => setProgress(value));
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animProgress.removeListener(listener);
  }, [leadQuality]);

  // Build segments
  let cursor = -90; // start from top
  const segments = LEAD_ORDER.map((key) => {
    const val = leadQuality[key] || 0;
    const sweepDeg = total > 0 ? (val / total) * 360 * progress : 0;
    const seg = { key, color: LEAD_COLORS[key].fill, startDeg: cursor, sweepDeg };
    cursor += sweepDeg;
    return seg;
  });

  const center = DONUT_SIZE / 2;

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Quality</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Breakdown of your leads by engagement level
      </Text>

      <View style={styles.donutWrapper}>
        {/* Donut ring */}
        <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
          {/* Background ring */}
          <View
            style={{
              position: 'absolute',
              width: DONUT_SIZE,
              height: DONUT_SIZE,
              borderRadius: DONUT_SIZE / 2,
              backgroundColor: theme.divider || '#E2E8F0',
            }}
          />
          {/* Colored segments */}
          {segments.map((s) => (
            <DonutSegment
              key={s.key}
              startDeg={s.startDeg}
              sweepDeg={s.sweepDeg}
              color={s.color}
              size={DONUT_SIZE}
              thick={DONUT_THICK}
            />
          ))}
          {/* Inner white hole — creates the donut effect */}
          <View
            style={{
              position: 'absolute',
              top: DONUT_THICK,
              left: DONUT_THICK,
              width: DONUT_SIZE - DONUT_THICK * 2,
              height: DONUT_SIZE - DONUT_THICK * 2,
              borderRadius: (DONUT_SIZE - DONUT_THICK * 2) / 2,
              backgroundColor: theme.cardBackground,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[styles.donutCenter, { color: theme.text }]}>
              {total.toLocaleString()}
            </Text>
            <Text style={[styles.donutCenterSub, { color: theme.textSecondary }]}>
              Total Leads
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.donutLegend}>
          {LEAD_ORDER.map((key) => {
            const val = leadQuality[key] || 0;
            const pct = total > 0 ? ((val / total) * 100).toFixed(0) : '0';
            return (
              <View key={key} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: LEAD_COLORS[key].fill }]} />
                <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
                  {LEAD_COLORS[key].label}
                </Text>
                <Text style={[styles.legendValue, { color: theme.text }]}>
                  {val.toLocaleString()}
                </Text>
                <Text style={[styles.legendPct, { color: theme.textTertiary }]}>
                  {pct}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {total === 0 && (
        <Text style={[styles.emptyNote, { color: theme.textTertiary }]}>
          No leads yet in this period. Share your campaigns to start getting leads!
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP CAMPAIGNS BAR CHART
// ─────────────────────────────────────────────────────────────────────────────
const BAR_PALETTE = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];

function CampaignBar({ campaign, maxLeads, index, theme }) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    barAnim.setValue(0);
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 800,
      delay: 150 + index * 120,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: false,
    }).start();
  }, [campaign, maxLeads]);

  const fraction = maxLeads > 0 ? (campaign.leads / maxLeads) : 0;
  const barColor = BAR_PALETTE[index] || BAR_PALETTE[BAR_PALETTE.length - 1];
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.EXPIRED;

  return (
    <View style={styles.barRow}>
      {/* Campaign title + status */}
      <View style={styles.barMeta}>
        <Text style={[styles.barTitle, { color: theme.text }]} numberOfLines={1}>
          {campaign.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Animated bar */}
      <View style={[styles.barTrack, { backgroundColor: theme.divider || '#E2E8F0' }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: barAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${Math.max(fraction * 100, 2)}%`],
              }),
            },
          ]}
        />
      </View>

      {/* Stats row */}
      <View style={styles.barStats}>
        <Text style={[styles.barStatText, { color: theme.textSecondary }]}>
          <Ionicons name="people-outline" size={11} /> {campaign.leads.toLocaleString()} leads
        </Text>
        <Text style={[styles.barStatText, { color: theme.textTertiary }]}>
          <Ionicons name="eye-outline" size={11} /> {campaign.views.toLocaleString()} views
        </Text>
        {campaign.views > 0 && (
          <Text style={[styles.barStatText, { color: theme.textTertiary }]}>
            {((campaign.leads / campaign.views) * 100).toFixed(1)}% conv.
          </Text>
        )}
      </View>
    </View>
  );
}

function TopCampaigns({ campaigns, theme }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Campaigns</Text>
        <Text style={[styles.emptyNote, { color: theme.textTertiary }]}>
          No campaigns found in this period. Create your first campaign to see analytics here!
        </Text>
      </View>
    );
  }

  const maxLeads = Math.max(...campaigns.map((c) => c.leads), 1);

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Campaigns</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Ranked by leads generated · {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
      </Text>
      {campaigns.map((c, i) => (
        <CampaignBar
          key={c.title + i}
          campaign={c}
          maxLeads={maxLeads}
          index={i}
          theme={theme}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN MIX INSIGHT CARD
// ─────────────────────────────────────────────────────────────────────────────
function InsightCard({ overview, theme }) {
  const { totalCampaigns = 0, activeCampaigns = 0, aiGeneratedCount = 0 } = overview || {};
  const manualCount = totalCampaigns - aiGeneratedCount;

  const chips = [];
  if (totalCampaigns > 0) {
    chips.push({ icon: 'megaphone-outline', text: `${totalCampaigns} campaign${totalCampaigns !== 1 ? 's' : ''} in this period`, color: '#7C3AED' });
  }
  if (activeCampaigns > 0) {
    chips.push({ icon: 'radio-button-on-outline', text: `${activeCampaigns} currently active`, color: '#16A34A' });
  }
  if (aiGeneratedCount > 0) {
    chips.push({ icon: 'sparkles-outline', text: `${aiGeneratedCount} AI-generated`, color: '#6366F1' });
  }
  if (manualCount > 0) {
    chips.push({ icon: 'create-outline', text: `${manualCount} created manually`, color: '#0284C7' });
  }

  if (chips.length === 0) return null;

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Campaign Insights</Text>
      {chips.map((chip, i) => (
        <View key={i} style={styles.insightChip}>
          <View style={[styles.insightIconBg, { backgroundColor: `${chip.color}15` }]}>
            <Ionicons name={chip.icon} size={16} color={chip.color} />
          </View>
          <Text style={[styles.insightText, { color: theme.textSecondary }]}>{chip.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function SellerAnalyticsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();

    try {
      const response = await sellerAnalyticsService.getAnalytics(period);
      setData(response);
    } catch (err) {
      console.warn('Analytics load error:', err);
      setError('Could not load analytics. Please try again.');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !data) {
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
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={theme.sellerPrimary || '#7C3AED'} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading analytics…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Destructure safely ────────────────────────────────────────────────────
  const overview     = data?.overview     || {};
  const leadQuality  = data?.leadQuality  || { NEW: 0, HOT: 0, WARM: 0, COLD: 0 };
  const topCampaigns = data?.topCampaigns || [];

  const totalReach       = overview.totalReach       || 0;
  const totalLeads       = overview.totalLeads       || 0;
  const conversionRate   = overview.conversionRate   || '0.0%';
  const activeCampaigns  = overview.activeCampaigns  || 0;

  const accent = theme.sellerPrimary || '#7C3AED';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        {canGoBack && (
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Monitor your business performance</Text>
      </View>

      {/* ── Period Filter ── */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border || '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TIME_FILTERS.map((f) => {
            const active = period === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => setPeriod(f.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? `${accent}18` : (theme.surfaceSecondary || '#F8FAFC'),
                    borderColor: active ? accent : (theme.border || '#E2E8F0'),
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? accent : theme.textSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {loading && <ActivityIndicator size="small" color={accent} style={styles.filterSpinner} />}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Error Banner */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={loadData}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* ── KPI Cards 2×2 ── */}
          <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>Overview</Text>
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="eye-outline"
              label="Total Reach"
              rawValue={totalReach}
              accent="#7C3AED"
              theme={theme}
              delay={0}
            />
            <KpiCard
              icon="people-outline"
              label="Total Leads"
              rawValue={totalLeads}
              accent="#2563EB"
              theme={theme}
              delay={100}
            />
            <KpiCard
              icon="trending-up-outline"
              label="Conv. Rate"
              value={conversionRate}
              accent="#16A34A"
              theme={theme}
              delay={200}
            />
            <KpiCard
              icon="megaphone-outline"
              label="Active Now"
              rawValue={activeCampaigns}
              accent="#D97706"
              theme={theme}
              delay={300}
            />
          </View>

          {/* ── Donut Chart — Lead Quality ── */}
          <DonutChart leadQuality={leadQuality} theme={theme} />

          {/* ── Top Campaigns Bar Chart ── */}
          <TopCampaigns campaigns={topCampaigns} theme={theme} />

          {/* ── Campaign Insight Chips ── */}
          <InsightCard overview={overview} theme={theme} />

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    marginBottom: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },

  // ── Period Filter ─────────────────────────────────────────────────────────
  filterBar: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterSpinner: {
    marginRight: 16,
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollContent: {
    padding: 16,
  },

  // ── Error Banner ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    textDecorationLine: 'underline',
  },

  // ── Group Label ───────────────────────────────────────────────────────────
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── KPI Grid ──────────────────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,   // half width minus padding and gap
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  // ── Section Card (shared wrapper) ─────────────────────────────────────────
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 20,
  },
  emptyNote: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 16,
    lineHeight: 20,
  },

  // ── Donut Chart ───────────────────────────────────────────────────────────
  donutWrapper: {
    alignItems: 'center',
    gap: 20,
  },
  donutCenter: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  donutCenterSub: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  donutLegend: {
    width: '100%',
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },

  // ── Campaign Bar ──────────────────────────────────────────────────────────
  barRow: {
    marginBottom: 16,
  },
  barMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  barTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barStats: {
    flexDirection: 'row',
    gap: 12,
  },
  barStatText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Insight Card ──────────────────────────────────────────────────────────
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  insightIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
