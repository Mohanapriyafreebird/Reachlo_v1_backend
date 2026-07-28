import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView } from 'react-native';
import {
  getCampaignImages,
  getCampaignStatusBadge,
  formatCampaignEndDateShort,
  formatPrice,
} from './CampaignFeedCard';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import {
  CAMPAIGN_CARD_WIDTH,
  CAMPAIGN_CARD_IMAGE_HEIGHT,
} from '../constants/campaignCardConstants';
import ImageCarousel from './ImageCarousel';
import BusinessVerifiedBadge from './BusinessVerifiedBadge';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function SellerCampaignCard({
  campaign,
  onEdit,
  onDelete,
  onViewLeads,
  showActionsMenu = true,
  dimmed = false,
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const images = getCampaignImages(campaign);
  const leadCount = campaign.leads?.length ?? campaign.leadsCount ?? 0;
  const badge = getCampaignStatusBadge(campaign);
  const endLabel = formatCampaignEndDateShort(campaign.endDate);
  const priceLabel = formatPrice(campaign.price);
  const offerText = campaign.offerLine || campaign.offer;
  const businessName = campaign.businessName || campaign.business_name || 'Your Business';
  const isVerified = campaign.businessVerified ?? campaign.business_verified;

  // Entry animation
  const entryAnim = useRef(new Animated.Value(0)).current;
  const entryTranslate = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(entryTranslate, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(1800),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const closeMenu = () => setMenuVisible(false);
  const isActiveStatus = badge?.label === 'ACTIVE';

  return (
    <View style={[styles.cardWrapper, menuVisible && styles.cardWrapperMenuOpen]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.card,
            dimmed && styles.cardDimmed,
            {
              opacity: entryAnim,
              transform: [{ scale: scaleAnim }, { translateY: entryTranslate }],
            },
          ]}
        >
          {/* ── IMAGE SECTION ── */}
          <View style={styles.posterWrap}>
            {images.length > 0 ? (
              <ImageCarousel
                images={images}
                width={CAMPAIGN_CARD_WIDTH}
                height={CAMPAIGN_CARD_WIDTH * 0.75}
                showDots={images.length > 1}
                rounded={false}
              />
            ) : (
              <LinearGradient colors={['#DBEAFE', '#EFF6FF']} style={styles.posterPlaceholder}>
                <Ionicons name="image-outline" size={36} color="#93C5FD" />
                <Text style={styles.posterPlaceholderText}>No Thumbnail</Text>
              </LinearGradient>
            )}

            {/* Bottom gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.32)']}
              style={styles.imageGradientOverlay}
              pointerEvents="none"
            />

            {/* Top Right: Status Badge + Menu Dots stacked */}
            <View style={styles.topRightStack}>
              {badge && (
                <Animated.View style={[
                  styles.glassBadge,
                  { backgroundColor: badge.bg },
                  isActiveStatus && { transform: [{ scale: pulseAnim }] },
                ]}>
                  {isActiveStatus && <View style={styles.activeDot} />}
                  <Text style={[styles.glassBadgeText, { color: badge.color }]}>
                    {isActiveStatus ? 'ACTIVE' : badge.label}
                  </Text>
                </Animated.View>
              )}

              {showActionsMenu && (
                <Pressable
                  hitSlop={8}
                  style={styles.menuDotBtn}
                  onPress={() => setMenuVisible(true)}
                >
                  <Text style={styles.menuDotBtnText}>⋮</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ── BODY SECTION ── */}
          <View style={styles.bodySection}>
            {/* Offer Badge */}
            {offerText ? (
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText} numberOfLines={2}>🔥 {offerText}</Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>{campaign.title}</Text>

            {/* Business Name */}
            <View style={styles.businessRow}>
              <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
              {isVerified && <BusinessVerifiedBadge compact />}
            </View>

            {/* Stats Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <View style={styles.chip}>
                <Text style={styles.chipText}>📅 {endLabel}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>👁 {campaign.views ?? 0} views</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>🎯 {campaign.leadsCount ?? leadCount} leads</Text>
              </View>
            </ScrollView>

            {/* CTA + Price Row */}
            <View style={styles.footerRow}>
              <Pressable style={styles.viewLeadsBtn} onPress={onViewLeads}>
                <Text style={styles.viewLeadsBtnText}>View Leads</Text>
              </Pressable>
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.priceGradient}
              >
                <Text style={styles.priceLarge}>{priceLabel}</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Actions Bottom Sheet */}
      {/* Actions Menu — inline overlay (no Modal to avoid nested-Modal crash on Android APK) */}
      {menuVisible && (
        <>
          {/* Tap-outside-to-close backdrop */}
          <Pressable
            style={styles.menuBackdrop}
            onPress={closeMenu}
          />
          {/* Menu panel anchored below the ⋮ button */}
          <View style={styles.menuPanel}>
            <View style={styles.menuHandle} />
            <Pressable
              style={styles.menuItem}
              onPress={() => { closeMenu(); onEdit?.(); }}
            >
              <Ionicons name="create-outline" size={20} color="#0C1445" style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Edit Campaign</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => { closeMenu(); onDelete?.(); }}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" style={{ marginRight: 10 }} />
              <Text style={styles.menuItemTextDanger}>Delete Campaign</Text>
            </Pressable>
            <Pressable style={styles.menuCancelBtn} onPress={closeMenu}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
    zIndex: 1,
    // overflow must be visible to allow menu panel to extend beyond card bounds
  },
  cardWrapperMenuOpen: {
    zIndex: 200, // elevate above sibling cards when menu is open
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    width: CAMPAIGN_CARD_WIDTH,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#1E40AF',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  cardDimmed: {
    opacity: 0.6,
  },
  posterWrap: {
    width: '100%',
    height: CAMPAIGN_CARD_WIDTH * 0.75, // 4:3 aspect ratio
    backgroundColor: '#CBD5E1',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  posterPlaceholderText: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 12,
  },

  topRightStack: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 10,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  glassBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  menuDotBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  menuDotBtnText: {
    fontSize: 20,
    color: '#0C1445',
    fontWeight: '800',
    lineHeight: 24,
  },

  bodySection: {
    padding: 14,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    gap: 6,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    maxWidth: '95%',
  },
  offerBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0C1445',
    lineHeight: 23,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  businessName: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  descPreview: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  viewLeadsBtn: {
    flex: 0.65,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLeadsBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  priceGradient: {
    flex: 0.35,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLarge: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Menu (inline, no Modal)
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 50,
  },
  menuPanel: {
    position: 'absolute',
    top: 48,   // just below the ⋮ button
    right: 10,
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 24,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: FONT_SIZES.BASE,
    color: '#0C1445',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  menuItemTextDanger: {
    fontSize: FONT_SIZES.BASE,
    color: '#DC2626',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  menuCancelBtn: {
    marginTop: 6,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  menuCancelText: {
    color: '#64748B',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    fontSize: 14,
  },
});
