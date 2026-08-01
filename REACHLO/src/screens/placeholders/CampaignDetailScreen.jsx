import React, { useState, useRef, useEffect, useCallback, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Modal,
  Linking,
  Share,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BusinessVerifiedBadge from '../../components/BusinessVerifiedBadge';
import CampaignFeedCard, {
  getCampaignImages,
  formatCampaignEndDateShort,
  formatPrice,
  getCampaignStatusBadge,
} from '../../components/CampaignFeedCard';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = Math.floor(SCREEN_W * 0.75); // 4:3 ratio (W:H)

// ── Error boundary to prevent MapView crash from killing the whole screen ──
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('MapView render error caught by boundary:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ height: 180, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="map-outline" size={32} color="#94A3B8" />
          <Text style={{ color: '#64748B', fontSize: 13 }}>Map unavailable</Text>
          {this.props.fallbackUrl ? (
            <Pressable onPress={() => Linking.openURL(this.props.fallbackUrl)} style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Open in Google Maps</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Safe map view: validates coords and wraps in error boundary ────────────
function SafeMapView({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (!valid) {
    return (
      <View style={{ height: 180, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#64748B', fontSize: 13 }}>Location not available</Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary fallbackUrl={mapsUrl}>
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor="#2563EB" />
        </MapView>
        <Pressable
          onPress={() => Linking.openURL(mapsUrl)}
          style={styles.mapOverlayBtn}
        >
          <Ionicons name="navigate" size={18} color="#2563EB" />
          <Text style={styles.mapOverlayText}>Get Directions</Text>
        </Pressable>
      </View>
    </MapErrorBoundary>
  );
}

// Parse description into benefit bullet lines
function parseBenefits(description = '') {
  if (!description) return [];
  const lines = description
    .split(/[\n•\-\*]/)
    .map(l => l.trim())
    .filter(l => l.length > 4 && l.length < 80);
  return lines.slice(0, 6);
}

export default function CampaignDetailScreen({
  campaign,
  visible,
  onClose,
  onToggleSave,
  onCallPress,
  onWhatsAppPress,
  onEnquirePress,
  relatedCampaigns = [],
  onRelatedPress,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [tcExpanded, setTcExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(campaign?.isSaved ?? false);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const activePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setActiveImageIndex(0);
      setDescExpanded(false);
      setTcExpanded(false);
      setIsSaved(campaign?.isSaved ?? false);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(activePulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(activePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.delay(1200),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 280,
        useNativeDriver: true,
      }).start();
      heroOpacity.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 260,
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const handleHeartPress = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 0.8, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setIsSaved(prev => !prev);
    onToggleSave?.();
  };

  const handleCtaPressIn = () =>
    Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true }).start();
  const handleCtaPressOut = () =>
    Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true }).start();

  if (!campaign) return null;

  const images = getCampaignImages(campaign);
  const hasImages = images.length > 0;
  const badge = getCampaignStatusBadge(campaign);
  const priceLabel = formatPrice(campaign.price);
  const endLabel = formatCampaignEndDateShort(campaign.endDate);
  const benefits = parseBenefits(campaign.description);
  const distanceLabel = null; // Distance is only shown in the Offers Near You section

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.safeSheet} edges={['top', 'bottom']}>
          {/* ══════════════════════════════════
              HERO IMAGE SECTION
          ══════════════════════════════════ */}
          <Animated.View style={[styles.heroWrap, { opacity: heroOpacity }]}>
            {hasImages ? (
              <FlatList
                data={images}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
                  setActiveImageIndex(index);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
                )}
              />
            ) : (
              <LinearGradient colors={['#DBEAFE', '#EFF6FF']} style={styles.heroImage}>
                <Ionicons name="image-outline" size={60} color="#93C5FD" />
              </LinearGradient>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(15,23,42,0.4)']}
              style={styles.heroGradientOverlay}
              pointerEvents="none"
            />

            {images.length > 1 && (
              <View style={styles.heroDots}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[styles.heroDot, index === activeImageIndex && styles.heroDotActive]}
                  />
                ))}
              </View>
            )}

            <Pressable style={styles.heroBackBtn} onPress={handleClose}>
              <BlurView intensity={72} tint="light" style={styles.heroActionBlur}>
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </BlurView>
            </Pressable>

            {/* TOP RIGHT: Favorite + Share */}
            <View style={styles.heroTopRight}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Pressable style={styles.heroActionBtn} onPress={handleHeartPress}>
                  <BlurView intensity={72} tint="light" style={styles.heroActionBlur}>
                    <Ionicons
                      name={isSaved ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isSaved ? '#EF4444' : '#0F172A'}
                    />
                  </BlurView>
                </Pressable>
              </Animated.View>
              <Pressable
                style={styles.heroActionBtn}
                onPress={() => Share.share({ message: `Check out this campaign: ${campaign.title} on Reachlo!` })}
              >
                <BlurView intensity={72} tint="light" style={styles.heroActionBlur}>
                  <Ionicons name="share-outline" size={22} color="#0F172A" />
                </BlurView>
              </Pressable>
            </View>

            {/* Status badge on hero */}
            {badge && (
              <Animated.View style={[styles.heroBadge, { transform: [{ scale: activePulse }] }]}>
                {badge.label === 'ACTIVE' && <View style={styles.heroBadgeDot} />}
                <Text style={styles.heroBadgeText}>
                  {badge.label === 'ACTIVE' ? 'ACTIVE NOW' : badge.label}
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* ══════════════════════════════════
              SCROLLABLE CONTENT
          ══════════════════════════════════ */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentScroll}
          >
            {/* BUSINESS INFO CARD */}
            <View style={styles.businessCard}>
              <View style={styles.businessHeader}>
                <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.businessAvatar}>
                  <Text style={styles.businessAvatarText}>
                    {(campaign.businessName || 'B').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.businessInfo}>
                  <View style={styles.businessNameRow}>
                    <Text style={styles.businessNameText} numberOfLines={1}>{campaign.businessName}</Text>
                    {campaign.businessVerified && <BusinessVerifiedBadge compact />}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <Text style={styles.businessSubText} numberOfLines={1}>
                      {campaign.category || 'Local Business'}
                    </Text>
                    <Text style={styles.businessSubText}>•</Text>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.businessSubText}>
                      {(campaign.rating ?? 4.8).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.contactActions}>
                <Pressable style={styles.contactBtn} onPress={onCallPress}>
                  <View style={[styles.contactIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="call" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.contactBtnText}>Call</Text>
                </Pressable>
                
                <Pressable style={styles.contactBtn} onPress={onWhatsAppPress}>
                  <View style={[styles.contactIconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
                  </View>
                  <Text style={styles.contactBtnText}>WhatsApp</Text>
                </Pressable>
                
                <Pressable style={styles.contactBtn} onPress={onEnquirePress}>
                  <View style={[styles.contactIconWrap, { backgroundColor: '#F8FAFC' }]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#475569" />
                  </View>
                  <Text style={styles.contactBtnText}>Chat</Text>
                </Pressable>
              </View>
            </View>

            {/* CAMPAIGN INFORMATION & OFFER CARD */}
            <View style={styles.campaignInfoContainer}>
              <Text style={styles.detailTitle}>{campaign.title}</Text>
              
              {!!campaign.offerLine && (
                <LinearGradient
                  colors={['#FFEDD5', '#FFF7ED']}
                  style={styles.offerHighlightCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.offerIconWrap}>
                    <Ionicons name="gift" size={24} color="#EA580C" />
                  </View>
                  <View style={styles.offerTextWrap}>
                    <Text style={styles.offerHighlightTitle}>Special Offer</Text>
                    <Text style={styles.offerHighlightDesc}>{campaign.offerLine}</Text>
                  </View>
                </LinearGradient>
              )}
            </View>

            {/* WHAT'S INCLUDED */}
            {!!campaign.description && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>What's Included</Text>
                <Text style={styles.descText}>{campaign.description}</Text>
              </View>
            )}


            {/* LOCATION CARD (GLASSMORPHISM) */}
            {!!campaign.locationAddress && (
              <View style={[styles.sectionBlock, { marginBottom: 16 }]}>
                <BlurView intensity={60} tint="light" style={{ padding: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
                  <Text style={styles.sectionHeading}>Location Address</Text>
                  <Text style={{ fontSize: 14, color: '#334155' }}>{campaign.locationAddress}</Text>
                </BlurView>
              </View>
            )}

            {/* LOCATION MAP */}
            {!!campaign.latitude && !!campaign.longitude && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Location</Text>
                <SafeMapView latitude={campaign.latitude} longitude={campaign.longitude} />
              </View>
            )}


            {/* TERMS & CONDITIONS (Collapsible) */}
            <View style={styles.sectionBlock}>
              <Pressable style={styles.tcHeader} onPress={() => setTcExpanded(!tcExpanded)}>
                <Text style={styles.sectionHeading}>Terms & Conditions</Text>
                <Ionicons name={tcExpanded ? "chevron-up" : "chevron-down"} size={24} color="#64748B" />
              </Pressable>
              {tcExpanded && (
                <View style={styles.tcContent}>
                  <Text style={styles.tcText}>• Offer valid until {endLabel}.</Text>
                  <Text style={styles.tcText}>• Cannot be combined with other offers.</Text>
                  <Text style={styles.tcText}>• Subject to availability at the business premises.</Text>
                  <Text style={styles.tcText}>• Show this campaign screen to claim the offer.</Text>
                </View>
              )}
            </View>

            {/* RELATED CAMPAIGNS */}
            {relatedCampaigns.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Similar Campaigns</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedScroll}
                >
                  {relatedCampaigns.map(camp => (
                    <CampaignFeedCard
                      key={camp.id}
                      campaign={camp}
                      compact
                      onPress={() => onRelatedPress?.(camp)}
                      onToggleSave={() => {}}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* ══════════════════════════════════
              STICKY BOTTOM CTA BAR
          ══════════════════════════════════ */}
          <View style={styles.stickyBar}>
            <View style={styles.stickyPriceCol}>
              <Text style={styles.stickyPriceLabel}>Price</Text>
              <Text style={styles.stickyPrice}>{priceLabel}</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: ctaScale }], flex: 1 }}>
              <Pressable
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                onPress={onEnquirePress}
                style={styles.ctaBtn}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Grab This Deal</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
  },
  safeSheet: {
    flex: 1,
  },
  
  // HERO
  heroWrap: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    backgroundColor: '#E2E8F0',
  },
  heroImage: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroBackBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 20,
  },
  heroTopRight: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 20,
    gap: 12,
    alignItems: 'flex-end',
  },
  heroActionBtn: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  heroActionBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroDots: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },

  // CONTENT
  contentScroll: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  
  // BUSINESS CARD
  businessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  businessAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  businessInfo: {
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  businessNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  businessSubText: {
    fontSize: 13,
    color: '#64748B',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // CAMPAIGN INFO
  campaignInfoContainer: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 16,
  },
  offerHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  offerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTextWrap: {
    flex: 1,
  },
  offerHighlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 2,
  },
  offerHighlightDesc: {
    fontSize: 14,
    color: '#C2410C',
    fontWeight: '500',
  },
  descriptionSection: {
    marginTop: 8,
  },
  descText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  readMoreBtn: {
    marginTop: 8,
  },
  readMoreText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
  },

  // GENERAL SECTIONS
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  
  // BENEFITS
  benefitsGrid: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitItemText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },

  // REVIEWS
  reviewSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  reviewScoreBox: {
    alignItems: 'center',
    marginRight: 24,
  },
  reviewScoreNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  reviewCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewBars: {
    flex: 1,
    gap: 6,
  },
  reviewBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    width: 10,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },

  // MAP
  mapContainer: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  map: {
    flex: 1,
  },
  mapOverlayBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mapOverlayText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  // T&C
  tcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tcContent: {
    marginTop: 8,
    gap: 6,
  },
  tcText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // RELATED
  relatedScroll: {
    paddingBottom: 8,
    gap: 16,
  },

  // STICKY BAR
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -5 },
    shadowRadius: 15,
    elevation: 10,
  },
  stickyPriceCol: {
    justifyContent: 'center',
  },
  stickyPriceLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  stickyPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  ctaBtn: {
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
