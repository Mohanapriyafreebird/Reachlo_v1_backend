import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveMediaUrl } from '../config/apiConfig';
import {
  CAMPAIGN_CARD_WIDTH,
  CAMPAIGN_CARD_IMAGE_HEIGHT,
} from '../constants/campaignCardConstants';
import ImageCarousel from './ImageCarousel';
import BusinessVerifiedBadge from './BusinessVerifiedBadge';

export function formatCampaignEndDateShort(endDate) {
  if (!endDate) return 'No end date';
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 'No end date';
  return `${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function formatPrice(price) {
  if (price === null || price === undefined) return 'Price on request';
  try {
    return `₹${Number(price).toLocaleString('en-IN')}`;
  } catch (e) {
    return 'Price on request';
  }
}

export function getCampaignStatusBadge(campaign) {
  const end = campaign.endDate ? new Date(campaign.endDate) : null;
  let daysLeft = null;
  if (end && !Number.isNaN(end.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil((endDay - now) / (1000 * 60 * 60 * 24));
  }

  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 3) {
    return { label: '⏰ ENDING SOON', bg: '#FEF3C7', color: '#B45309' };
  }
  if (campaign.isBoosted) {
    return { label: '🔥 TRENDING', bg: '#FEE2E2', color: '#DC2626' };
  }
  if ((campaign.views || 0) >= 5) {
    return { label: '⭐ FEATURED', bg: '#EDE9FE', color: '#7C3AED' };
  }
  if (campaign.status === 'ACTIVE' || !campaign.status) {
    return { label: 'ACTIVE', bg: '#DCFCE7', color: '#15803D' };
  }
  return null;
}

export function getCampaignImages(campaign) {
  const raw = campaign.imageUrls?.length
    ? campaign.imageUrls
    : campaign.image_urls?.length
      ? campaign.image_urls
      : campaign.imageUrl
        ? [campaign.imageUrl]
        : campaign.image_url
          ? [campaign.image_url]
          : [];
  return raw.map((url) => resolveMediaUrl(url) || url).filter(Boolean);
}

export default function CampaignFeedCard({
  campaign,
  onPress,
  onToggleSave,
  compact = false,
  context = 'home', // 'home' | 'nearby' | 'seller'
}) {
  const images = getCampaignImages(campaign);
  const COMPACT_WIDTH = Math.floor(CAMPAIGN_CARD_WIDTH * 0.72);
  const cardWidth = compact ? COMPACT_WIDTH : CAMPAIGN_CARD_WIDTH;
  const imageWidth = cardWidth - 32; // 16px padding on both sides
  const imageHeight = compact ? 160 : (imageWidth * 0.75); // 4:3 aspect ratio to emphasize image
  
  const endLabel = formatCampaignEndDateShort(campaign.endDate);
  const priceLabel = formatPrice(campaign.price);
  const badge = getCampaignStatusBadge(campaign);
  const offerText = campaign.offerLine || campaign.offer;
  const isVerified = campaign.businessVerified ?? campaign.business_verified;

  const entryAnim = useRef(new Animated.Value(0)).current;
  const entryTranslate = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
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

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const handleHeartPress = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 0.85, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1.1, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onToggleSave?.();
  };

  const isActiveStatus = badge?.label === 'ACTIVE';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayPressIn={50}
    >
      <Animated.View
        style={[
          styles.card,
          compact && [styles.cardCompact, { width: cardWidth }],
          { opacity: entryAnim, transform: [{ scale: scaleAnim }, { translateY: entryTranslate }] },
        ]}
      >
        {/* ── IMAGE SECTION ── */}
        <View style={[styles.imageSection, { width: imageWidth, height: imageHeight }]}>
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              width={imageWidth}
              height={imageHeight}
              showDots={images.length > 1}
              rounded={true}
              borderRadius={20}
            />
          ) : (
            <LinearGradient colors={['#DBEAFE', '#EFF6FF']} style={[styles.posterPlaceholder, { borderRadius: 20 }]}>
              <Ionicons name="image-outline" size={36} color="#93C5FD" />
              <Text style={styles.posterPlaceholderText}>No Image</Text>
            </LinearGradient>
          )}

          <Animated.View style={[styles.floatingSaveBtn, { transform: [{ scale: heartScale }] }]}>
            <Pressable hitSlop={10} onPress={handleHeartPress} style={styles.floatingSaveBtnInner}>
              <Ionicons
                name={campaign.isSaved ? 'heart' : 'heart-outline'}
                size={18}
                color={campaign.isSaved ? '#EF4444' : '#EF4444'}
              />
            </Pressable>
          </Animated.View>

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
          </View>

          {/* Offer Badge Overlay (Bottom Left) */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />
          <View style={styles.imageOverlayContent} pointerEvents="none">
            {!!offerText && (
              <View style={styles.imageOfferBadge}>
                <Text style={styles.imageOfferBadgeText} numberOfLines={2}>🔥 {offerText}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── INFO CARD SECTION ── */}
        <View style={styles.bodySection}>
          <Text style={styles.titleText} numberOfLines={2}>{campaign.title}</Text>
          
          <View style={styles.companyRow}>
            <Text style={styles.companyText} numberOfLines={1}>{campaign.businessName}</Text>
            {isVerified && (
              <View style={{ marginLeft: 6 }}>
                <BusinessVerifiedBadge compact />
              </View>
            )}
          </View>

          {/* Context-Aware Metadata Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>📅 {endLabel}</Text>
            </View>

            {context === 'home' && campaign.city && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>📍 {campaign.city}</Text>
              </View>
            )}

            {context === 'nearby' && campaign.distance_km !== undefined && campaign.distance_km !== null && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  📍 {campaign.distance_km < 1 ? `${Math.round(campaign.distance_km * 1000)} m Away` : `${campaign.distance_km.toFixed(1)} KM Away`}
                </Text>
              </View>
            )}

            {context === 'seller' && (
              <>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>👁 {campaign.view_count || 0} Views</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>🎯 {campaign.lead_count || 0} Leads</Text>
                </View>
              </>
            )}

          </ScrollView>

          {/* Bottom Action Row */}
          <View style={styles.footerRow}>
            <View style={styles.viewDetailsBtn}>
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{priceLabel}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    marginBottom: 20,
    width: CAMPAIGN_CARD_WIDTH,
    alignSelf: 'center',
    shadowColor: '#1E40AF',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  cardCompact: {
    marginRight: 14,
    marginBottom: 0,
    padding: 12,
    borderRadius: 24,
  },
  imageSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 12,
  },
  floatingSaveBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  floatingSaveBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRightStack: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  glassBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  bodySection: {
    paddingTop: 16, // Spacing from image
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  viewDetailsBtn: {
    flex: 0.65,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  priceContainer: {
    flex: 0.35,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  imageOverlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    justifyContent: 'flex-end',
  },
  imageOfferBadge: {
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
  imageOfferBadgeText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
