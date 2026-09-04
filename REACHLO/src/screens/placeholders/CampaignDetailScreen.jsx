import React, {
  useState,
  useRef,
  useEffect,
  Component,
} from 'react';

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
import { Ionicons } from '@expo/vector-icons';

import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import { useTheme } from '../../context/ThemeContext';

import BusinessVerifiedBadge from '../../components/BusinessVerifiedBadge';

import {
  getCampaignImages,
  formatCampaignEndDateShort,
  formatPrice,
  getCampaignStatusBadge,
} from '../../components/CampaignFeedCard';

import { resolveMediaUrl } from '../../config/apiConfig';

const {
  width: SCREEN_W,
  height: SCREEN_H,
} = Dimensions.get('window');

const HERO_HEIGHT = Math.min(
  Math.floor(SCREEN_W * 0.70),
  390
);

/* ============================================================
   LIGHT THEME
============================================================ */

const LIGHT = {
  background: '#F6F8FC',

  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  surfaceMuted: '#EEF3F9',
  surfaceElevated: '#FFFFFF',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textTertiary: '#94A3B8',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',
  primaryTint: '#DBEAFE',

  success: '#16A34A',
  successSoft: '#DCFCE7',

  warning: '#D97706',
  warningSoft: '#FEF3C7',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  offerBg: '#FFF7ED',
  offerBorder: '#FED7AA',
  offerText: '#C2410C',

  heroPlaceholder: '#E8EEF8',

  sticky: '#FFFFFF',

  overlay: 'rgba(15,23,42,0.58)',

  cardShadow: '#0F172A',
};

/* ============================================================
   DARK THEME
============================================================ */

const DARK = {
  background: '#080D1A',

  surface: '#111827',
  surfaceSoft: '#151F31',
  surfaceMuted: '#1B273A',
  surfaceElevated: '#18243A',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textTertiary: '#718198',

  border: '#263449',
  borderStrong: '#34445B',

  primary: '#4F8CFF',
  primaryDark: '#2563EB',
  primarySoft: 'rgba(79,140,255,0.14)',
  primaryTint: 'rgba(79,140,255,0.22)',

  success: '#4ADE80',
  successSoft: 'rgba(34,197,94,0.14)',

  warning: '#FBBF24',
  warningSoft: 'rgba(245,158,11,0.14)',

  danger: '#F87171',
  dangerSoft: 'rgba(239,68,68,0.14)',

  offerBg: '#241A0F',
  offerBorder: '#5B3716',
  offerText: '#FDBA74',

  heroPlaceholder: '#182235',

  sticky: '#0F172A',

  overlay: 'rgba(0,0,0,0.78)',

  cardShadow: '#000000',
};

/* ============================================================
   MAP ERROR BOUNDARY
============================================================ */

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error) {
    console.warn(
      'MapView render error:',
      error?.message
    );
  }

  render() {
    const {
      fallbackUrl,
      palette,
    } = this.props;

    if (this.state.hasError) {
      return (
        <View
          style={[
            styles.mapFallback,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.mapFallbackIcon,
              {
                backgroundColor: palette.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="map-outline"
              size={25}
              color={palette.primary}
            />
          </View>

          <Text
            style={[
              styles.mapFallbackTitle,
              {
                color: palette.text,
              },
            ]}
          >
            Map unavailable
          </Text>

          <Text
            style={[
              styles.mapFallbackText,
              {
                color: palette.textMuted,
              },
            ]}
          >
            We couldn't load the map preview.
          </Text>

          {fallbackUrl ? (
            <Pressable
              onPress={() =>
                Linking.openURL(fallbackUrl)
              }
              style={[
                styles.mapFallbackButton,
                {
                  backgroundColor: palette.primary,
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={16}
                color="#FFFFFF"
              />

              <Text style={styles.mapFallbackButtonText}>
                Open Maps
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return this.props.children;
  }
}

/* ============================================================
   SAFE MAP
============================================================ */

function SafeMapView({
  latitude,
  longitude,
  palette,
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  const valid =
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  const mapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (!valid) {
    return (
      <View
        style={[
          styles.mapFallback,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.mapFallbackIcon,
            {
              backgroundColor: palette.primarySoft,
            },
          ]}
        >
          <Ionicons
            name="location-outline"
            size={25}
            color={palette.primary}
          />
        </View>

        <Text
          style={[
            styles.mapFallbackTitle,
            {
              color: palette.text,
            },
          ]}
        >
          Location unavailable
        </Text>

        <Text
          style={[
            styles.mapFallbackText,
            {
              color: palette.textMuted,
            },
          ]}
        >
          Location details are not available.
        </Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary
      fallbackUrl={mapsUrl}
      palette={palette}
    >
      <View
        style={[
          styles.mapContainer,
          {
            borderColor: palette.border,
          },
        ]}
      >
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: lat,
              longitude: lng,
            }}
            pinColor={palette.primary}
          />
        </MapView>

        <Pressable
          onPress={() =>
            Linking.openURL(mapsUrl)
          }
          style={[
            styles.mapOverlayBtn,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.mapOverlayIcon,
              {
                backgroundColor: palette.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="navigate-outline"
              size={16}
              color={palette.primary}
            />
          </View>

          <Text
            style={[
              styles.mapOverlayText,
              {
                color: palette.text,
              },
            ]}
          >
            Get Directions
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={palette.textMuted}
          />
        </Pressable>
      </View>
    </MapErrorBoundary>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function parseBenefits(description = '') {
  if (!description) {
    return [];
  }

  const lines = description
    .split(/[\n•\-\*]/)
    .map(item => item.trim())
    .filter(
      item =>
        item.length > 4 &&
        item.length < 100
    );

  return lines.slice(0, 6);
}

function getBusinessName(campaign) {
  return (
    campaign?.businessName ||
    campaign?.business_name ||
    campaign?.business?.name ||
    campaign?.seller_name ||
    'Business'
  );
}

function getCampaignImageSafe(campaign) {
  const raw =
    campaign?.imageUrls?.[0] ||
    campaign?.image_urls?.[0] ||
    campaign?.image_url ||
    campaign?.imageUrl ||
    null;
  return raw ? resolveMediaUrl(raw) || raw : null;
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon,
  title,
  palette,
  rightElement,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor: palette.primarySoft,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={palette.primary}
          />
        </View>

        <Text
          style={[
            styles.sectionHeading,
            {
              color: palette.text,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      {rightElement}
    </View>
  );
}

/* ============================================================
   THEMED RELATED CAMPAIGN CARD

   IMPORTANT:
   This is intentionally kept inside this file.
   It prevents the related campaigns from disappearing
   when the app switches between light and dark mode.
============================================================ */

function RelatedCampaignCard({
  campaign,
  palette,
  isDarkMode,
  onPress,
}) {
  const image = getCampaignImageSafe(campaign);

  const businessName = getBusinessName(campaign);

  const price =
    campaign?.price !== undefined &&
    campaign?.price !== null &&
    campaign?.price !== ''
      ? formatPrice(campaign.price)
      : null;

  const endDate =
    campaign?.endDate ||
    campaign?.end_date
      ? formatCampaignEndDateShort(
          campaign?.endDate ||
          campaign?.end_date
        )
      : null;

  const rating =
    campaign?.rating !== undefined &&
    campaign?.rating !== null
      ? Number(campaign.rating).toFixed(1)
      : null;

  const badge =
    getCampaignStatusBadge(campaign);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.relatedCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.cardShadow,
          opacity: pressed ? 0.96 : 1,
          transform: [
            {
              scale: pressed ? 0.985 : 1,
            },
          ],
        },
      ]}
    >
      {/* IMAGE */}

      <View
        style={[
          styles.relatedImageWrap,
          {
            backgroundColor:
              palette.surfaceMuted,
          },
        ]}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.relatedImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={
              isDarkMode
                ? ['#172554', '#111827']
                : ['#EFF6FF', '#DBEAFE']
            }
            style={styles.relatedImage}
          >
            <Ionicons
              name="image-outline"
              size={34}
              color={palette.primary}
            />
          </LinearGradient>
        )}

        {/* Image readability gradient */}

        <LinearGradient
          colors={[
            'rgba(0,0,0,0.18)',
            'transparent',
            'rgba(0,0,0,0.60)',
          ]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ACTIVE */}

        {badge ? (
          <View
            style={[
              styles.relatedActiveBadge,
              {
                backgroundColor:
                  isDarkMode
                    ? 'rgba(8,13,26,0.92)'
                    : 'rgba(255,255,255,0.95)',

                borderColor:
                  badge.isActive
                    ? palette.success
                    : palette.borderStrong,
              },
            ]}
          >
            <View
              style={[
                styles.relatedActiveDot,
                {
                  backgroundColor:
                    badge.isActive
                      ? palette.success
                      : palette.textMuted,
                },
              ]}
            />

            <Text
              style={[
                styles.relatedActiveText,
                {
                  color:
                    badge.isActive
                      ? palette.success
                      : palette.textSecondary,
                },
              ]}
            >
              {badge.label ||
                badge.text ||
                'AVAILABLE'}
            </Text>
          </View>
        ) : null}

        {/* OFFER */}

        {campaign?.offerLine ? (
          <View
            style={[
              styles.relatedOfferBadge,
              {
                backgroundColor:
                  isDarkMode
                    ? '#172238'
                    : '#FFFFFF',
                borderColor:
                  palette.warning,
              },
            ]}
          >
            <Ionicons
              name="flash"
              size={13}
              color={palette.warning}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.relatedOfferText,
                {
                  color: palette.warning,
                },
              ]}
            >
              {campaign.offerLine}
            </Text>
          </View>
        ) : null}
      </View>

      {/* CONTENT */}

      <View style={styles.relatedContent}>
        <Text
          numberOfLines={2}
          style={[
            styles.relatedTitle,
            {
              color: palette.text,
            },
          ]}
        >
          {campaign?.title ||
            'Special Offer'}
        </Text>

        {/* BUSINESS */}

        <View style={styles.relatedBusinessRow}>
          <View
            style={[
              styles.relatedAvatar,
              {
                backgroundColor:
                  palette.primarySoft,
              },
            ]}
          >
            <Text
              style={[
                styles.relatedAvatarText,
                {
                  color: palette.primary,
                },
              ]}
            >
              {businessName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.relatedBusinessName,
              {
                color: palette.text,
              },
            ]}
          >
            {businessName}
          </Text>
        </View>

        {/* META */}

        <View style={styles.relatedMetaRow}>
          {endDate ? (
            <View
              style={[
                styles.relatedMetaChip,
                {
                  backgroundColor:
                    palette.surfaceSoft,
                  borderColor:
                    palette.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={palette.textSecondary}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.relatedMetaText,
                  {
                    color:
                      palette.textSecondary,
                  },
                ]}
              >
                Ends {endDate}
              </Text>
            </View>
          ) : null}

          {rating ? (
            <View
              style={[
                styles.relatedRatingChip,
                {
                  backgroundColor:
                    palette.warningSoft,
                  borderColor:
                    palette.warning,
                },
              ]}
            >
              <Ionicons
                name="star"
                size={12}
                color={palette.warning}
              />

              <Text
                style={[
                  styles.relatedMetaText,
                  {
                    color:
                      palette.warning,
                  },
                ]}
              >
                {rating}
              </Text>
            </View>
          ) : null}
        </View>

        {/* FOOTER */}

        <View
          style={[
            styles.relatedFooter,
            {
              borderTopColor:
                palette.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.relatedPriceLabel,
                {
                  color:
                    palette.textTertiary,
                },
              ]}
            >
              OFFER PRICE
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.relatedPrice,
                {
                  color: palette.text,
                },
              ]}
            >
              {price || 'Contact seller'}
            </Text>
          </View>

          <View
            style={[
              styles.relatedViewButton,
              {
                backgroundColor:
                  palette.primary,
              },
            ]}
          >
            <Text style={styles.relatedViewButtonText}>
              View
            </Text>

            <Ionicons
              name="arrow-forward"
              size={15}
              color="#FFFFFF"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================
   MAIN SCREEN
============================================================ */

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
  const {
    isDarkMode,
  } = useTheme();

  const palette = isDarkMode
    ? DARK
    : LIGHT;

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [
    descExpanded,
    setDescExpanded,
  ] = useState(false);

  const [
    tcExpanded,
    setTcExpanded,
  ] = useState(false);

  const [
    isSaved,
    setIsSaved,
  ] = useState(
    campaign?.isSaved ?? false
  );

  /* ----------------------------------------------------------
     ANIMATIONS
  ---------------------------------------------------------- */

  const slideAnim = useRef(
    new Animated.Value(SCREEN_H)
  ).current;

  const heroOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const heartScale = useRef(
    new Animated.Value(1)
  ).current;

  const ctaScale = useRef(
    new Animated.Value(1)
  ).current;

  const activePulse = useRef(
    new Animated.Value(1)
  ).current;

  /* ----------------------------------------------------------
     OPEN / CLOSE
  ---------------------------------------------------------- */

  useEffect(() => {
    if (visible && campaign) {
      setActiveImageIndex(0);
      setDescExpanded(false);
      setTcExpanded(false);

      setIsSaved(
        campaign?.isSaved ?? false
      );

      slideAnim.setValue(SCREEN_H);
      heroOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(
          slideAnim,
          {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          heroOpacity,
          {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }
        ),
      ]).start();

      const pulseLoop =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              activePulse,
              {
                toValue: 1.04,
                duration: 700,
                useNativeDriver: true,
              }
            ),

            Animated.timing(
              activePulse,
              {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
              }
            ),

            Animated.delay(1600),
          ])
        );

      pulseLoop.start();

      return () => {
        pulseLoop.stop();
      };
    }

    Animated.timing(
      slideAnim,
      {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }
    ).start();

    heroOpacity.setValue(0);
  }, [visible, campaign]);

  /* ----------------------------------------------------------
     CLOSE
  ---------------------------------------------------------- */

  const handleClose = () => {
    Animated.timing(
      slideAnim,
      {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }
    ).start(() => {
      onClose?.();
    });
  };

  /* ----------------------------------------------------------
     SAVE
  ---------------------------------------------------------- */

  const handleHeartPress = () => {
    Animated.sequence([
      Animated.spring(
        heartScale,
        {
          toValue: 0.82,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        heartScale,
        {
          toValue: 1.12,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        heartScale,
        {
          toValue: 1,
          useNativeDriver: true,
        }
      ),
    ]).start();

    setIsSaved(
      previous => !previous
    );

    onToggleSave?.();
  };

  /* ----------------------------------------------------------
     CTA
  ---------------------------------------------------------- */

  const handleCtaPressIn = () => {
    Animated.spring(
      ctaScale,
      {
        toValue: 0.97,
        useNativeDriver: true,
      }
    ).start();
  };

  const handleCtaPressOut = () => {
    Animated.spring(
      ctaScale,
      {
        toValue: 1,
        useNativeDriver: true,
      }
    ).start();
  };

  /* ----------------------------------------------------------
     GUARD
  ---------------------------------------------------------- */

  if (!campaign) {
    return null;
  }

  /* ----------------------------------------------------------
     DATA
  ---------------------------------------------------------- */

  const images =
    getCampaignImages(campaign) || [];

  const hasImages =
    images.length > 0;

  const badge =
    getCampaignStatusBadge(campaign);

  const priceLabel =
    formatPrice(
      campaign.price
    );

  const endLabel =
    formatCampaignEndDateShort(
      campaign.endDate ||
      campaign.end_date
    );

  const description =
    campaign.description || '';

  const benefits =
    parseBenefits(description);

  const shouldCollapseDescription =
    description.length > 260;

  const displayedDescription =
    descExpanded ||
    !shouldCollapseDescription
      ? description
      : `${description
          .slice(0, 260)
          .trim()}...`;

  const businessName =
    getBusinessName(campaign);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* ======================================================
          BACKDROP
      ====================================================== */}

      <Pressable
        style={[
          styles.backdrop,
          {
            backgroundColor:
              palette.overlay,
          },
        ]}
        onPress={handleClose}
      />

      {/* ======================================================
          MAIN SHEET
      ====================================================== */}

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor:
              palette.background,

            transform: [
              {
                translateY:
                  slideAnim,
              },
            ],
          },
        ]}
      >
        <SafeAreaView
          style={styles.safeSheet}
          edges={[
            'top',
            'bottom',
          ]}
        >

          {/* ==================================================
              HERO
          ================================================== */}

          <Animated.View
            style={[
              styles.heroWrap,
              {
                opacity:
                  heroOpacity,
                backgroundColor:
                  palette.heroPlaceholder,
              },
            ]}
          >
            {hasImages ? (
              <FlatList
                data={images}
                keyExtractor={(
                  item,
                  index
                ) =>
                  `${item}-${index}`
                }
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={
                  false
                }
                onMomentumScrollEnd={
                  event => {
                    const index =
                      Math.round(
                        event
                          .nativeEvent
                          .contentOffset
                          .x /
                          SCREEN_W
                      );

                    setActiveImageIndex(
                      index
                    );
                  }
                }
                renderItem={({
                  item,
                }) => (
                  <Image
                    source={{
                      uri: item,
                    }}
                    style={
                      styles.heroImage
                    }
                    resizeMode="cover"
                  />
                )}
              />
            ) : (
              <LinearGradient
                colors={
                  isDarkMode
                    ? [
                        '#111827',
                        '#172554',
                      ]
                    : [
                        '#EFF6FF',
                        '#DBEAFE',
                      ]
                }
                style={
                  styles.heroImage
                }
              >
                <View
                  style={[
                    styles.emptyHeroIcon,
                    {
                      backgroundColor:
                        isDarkMode
                          ? '#1E3A8A'
                          : '#FFFFFF',
                    },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={38}
                    color={
                      palette.primary
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.emptyHeroText,
                    {
                      color:
                        palette.textSecondary,
                    },
                  ]}
                >
                  Campaign Image
                </Text>
              </LinearGradient>
            )}

            {/* HERO GRADIENT */}

            <LinearGradient
              colors={
                isDarkMode
                  ? [
                      'transparent',
                      'rgba(0,0,0,0.78)',
                    ]
                  : [
                      'transparent',
                      'rgba(15,23,42,0.46)',
                    ]
              }
              style={
                styles.heroGradientOverlay
              }
              pointerEvents="none"
            />

            {/* BACK */}

            <Pressable
              style={
                styles.heroBackBtn
              }
              onPress={
                handleClose
              }
            >
              <View
                style={[
                  styles.heroActionCircle,
                  {
                    backgroundColor:
                      isDarkMode
                        ? 'rgba(8,13,26,0.92)'
                        : 'rgba(255,255,255,0.95)',

                    borderColor:
                      isDarkMode
                        ? 'rgba(255,255,255,0.14)'
                        : 'rgba(255,255,255,0.82)',
                  },
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color={
                    isDarkMode
                      ? '#F8FAFC'
                      : '#0F172A'
                  }
                />
              </View>
            </Pressable>

            {/* SAVE + SHARE */}

            <View
              style={
                styles.heroTopRight
              }
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale:
                        heartScale,
                    },
                  ],
                }}
              >
                <Pressable
                  onPress={
                    handleHeartPress
                  }
                >
                  <View
                    style={[
                      styles.heroActionCircle,
                      {
                        backgroundColor:
                          isDarkMode
                            ? 'rgba(8,13,26,0.92)'
                            : 'rgba(255,255,255,0.95)',

                        borderColor:
                          isDarkMode
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(255,255,255,0.82)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSaved
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={22}
                      color={
                        isSaved
                          ? palette.danger
                          : isDarkMode
                          ? '#F8FAFC'
                          : '#0F172A'
                      }
                    />
                  </View>
                </Pressable>
              </Animated.View>

              <Pressable
                onPress={() =>
                  Share.share({
                    message:
                      `Check out this campaign: ${campaign.title} on Reachlo!`,
                  })
                }
              >
                <View
                  style={[
                    styles.heroActionCircle,
                    {
                      backgroundColor:
                        isDarkMode
                          ? 'rgba(8,13,26,0.92)'
                          : 'rgba(255,255,255,0.95)',

                      borderColor:
                        isDarkMode
                          ? 'rgba(255,255,255,0.14)'
                          : 'rgba(255,255,255,0.82)',
                    },
                  ]}
                >
                  <Ionicons
                    name="share-outline"
                    size={22}
                    color={
                      isDarkMode
                        ? '#F8FAFC'
                        : '#0F172A'
                    }
                  />
                </View>
              </Pressable>
            </View>

            {/* STATUS */}

            {badge ? (
              <Animated.View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor:
                      isDarkMode
                        ? 'rgba(8,13,26,0.92)'
                        : 'rgba(255,255,255,0.95)',

                    borderColor:
                      badge.isActive
                        ? palette.success
                        : palette.borderStrong,

                    transform: [
                      {
                        scale:
                          badge.isActive
                            ? activePulse
                            : 1,
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.heroBadgeDot,
                    {
                      backgroundColor:
                        badge.isActive
                          ? palette.success
                          : palette.textMuted,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.heroBadgeText,
                    {
                      color:
                        badge.isActive
                          ? palette.success
                          : palette.textSecondary,
                    },
                  ]}
                >
                  {badge.label ||
                    badge.text ||
                    'AVAILABLE'}
                </Text>
              </Animated.View>
            ) : null}

            {/* IMAGE DOTS */}

            {images.length > 1 ? (
              <View
                style={
                  styles.heroDots
                }
              >
                {images.map(
                  (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.heroDot,
                        {
                          width:
                            index ===
                            activeImageIndex
                              ? 20
                              : 7,

                          backgroundColor:
                            index ===
                            activeImageIndex
                              ? '#FFFFFF'
                              : 'rgba(255,255,255,0.55)',
                        },
                      ]}
                    />
                  )
                )}
              </View>
            ) : null}
          </Animated.View>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={[
              styles.contentScroll,
              {
                paddingBottom: 130,
              },
            ]}
          >

            {/* ==================================================
                BUSINESS CARD
            ================================================== */}

            <View
              style={[
                styles.businessCard,
                {
                  backgroundColor:
                    palette.surface,
                  borderColor:
                    palette.border,
                  shadowColor:
                    palette.cardShadow,
                },
              ]}
            >
              <View
                style={
                  styles.businessHeader
                }
              >
                <View
                  style={[
                    styles.businessAvatar,
                    {
                      backgroundColor:
                        palette.primary,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.businessAvatarText
                    }
                  >
                    {businessName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={
                    styles.businessInfo
                  }
                >
                  <View
                    style={
                      styles.businessNameRow
                    }
                  >
                    <Text
                      style={[
                        styles.businessNameText,
                        {
                          color:
                            palette.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {businessName}
                    </Text>

                    <BusinessVerifiedBadge />
                  </View>

                  <View
                    style={
                      styles.businessMeta
                    }
                  >
                    <Text
                      style={[
                        styles.businessSubText,
                        {
                          color:
                            palette.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {campaign.category ||
                        campaign.business?.category ||
                        'Business'}
                    </Text>

                    {campaign.rating ? (
                      <>
                        <View
                          style={[
                            styles.metaDot,
                            {
                              backgroundColor:
                                palette.textMuted,
                            },
                          ]}
                        />

                        <Ionicons
                          name="star"
                          size={13}
                          color={
                            palette.warning
                          }
                        />

                        <Text
                          style={[
                            styles.businessSubText,
                            {
                              color:
                                palette.textSecondary,
                            },
                          ]}
                        >
                          {campaign.rating}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* CONTACT ACTIONS */}

              <View
                style={[
                  styles.contactActions,
                  {
                    borderTopColor:
                      palette.border,
                  },
                ]}
              >
                {/* CALL */}

                <Pressable
                  style={
                    styles.contactBtn
                  }
                  onPress={
                    onCallPress
                  }
                >
                  <View
                    style={[
                      styles.contactIconWrap,
                      {
                        backgroundColor:
                          palette.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={21}
                      color={
                        palette.primary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.contactBtnText,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    Call
                  </Text>
                </Pressable>

                {/* WHATSAPP */}

                <Pressable
                  style={
                    styles.contactBtn
                  }
                  onPress={
                    onWhatsAppPress
                  }
                >
                  <View
                    style={[
                      styles.contactIconWrap,
                      {
                        backgroundColor:
                          palette.successSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={21}
                      color={
                        palette.success
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.contactBtnText,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    WhatsApp
                  </Text>
                </Pressable>

                {/* CHAT */}

                <Pressable
                  style={
                    styles.contactBtn
                  }
                  onPress={
                    onEnquirePress
                  }
                >
                  <View
                    style={[
                      styles.contactIconWrap,
                      {
                        backgroundColor:
                          palette.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={21}
                      color={
                        palette.primary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.contactBtnText,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    Chat
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ==================================================
                TITLE
            ================================================== */}

            <View
              style={
                styles.campaignTitleSection
              }
            >
              <Text
                style={[
                  styles.detailTitle,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                {campaign.title}
              </Text>

              {campaign.category ? (
                <View
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor:
                        palette.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color={
                      palette.primary
                    }
                  />

                  <Text
                    style={[
                      styles.categoryPillText,
                      {
                        color:
                          palette.primary,
                      },
                    ]}
                  >
                    {campaign.category}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ==================================================
                SPECIAL OFFER
            ================================================== */}

            {campaign.offer ||
            campaign.discount ||
            campaign.price ? (
              <View
                style={[
                  styles.offerHighlightCard,
                  {
                    backgroundColor:
                      palette.offerBg,
                    borderColor:
                      palette.offerBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.offerIconWrap,
                    {
                      backgroundColor:
                        isDarkMode
                          ? '#3B2611'
                          : '#FFEDD5',
                    },
                  ]}
                >
                  <Ionicons
                    name="gift-outline"
                    size={23}
                    color={
                      palette.offerText
                    }
                  />
                </View>

                <View
                  style={
                    styles.offerTextWrap
                  }
                >
                  <Text
                    style={[
                      styles.offerHighlightTitle,
                      {
                        color:
                          palette.offerText,
                      },
                    ]}
                  >
                    Special Offer
                  </Text>

                  <Text
                    style={[
                      styles.offerHighlightDesc,
                      {
                        color:
                          palette.offerText,
                      },
                    ]}
                  >
                    {campaign.offer ||
                      campaign.discount ||
                      'Special offer available'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ==================================================
                QUICK INFO
            ================================================== */}

            <View
              style={[
                styles.quickInfoCard,
                {
                  backgroundColor:
                    palette.surface,
                  borderColor:
                    palette.border,
                },
              ]}
            >
              {/* PRICE */}

              <View
                style={
                  styles.quickInfoItem
                }
              >
                <View
                  style={[
                    styles.quickInfoIcon,
                    {
                      backgroundColor:
                        palette.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={18}
                    color={
                      palette.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.quickInfoTextWrap
                  }
                >
                  <Text
                    style={[
                      styles.quickInfoLabel,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    OFFER PRICE
                  </Text>

                  <Text
                    style={[
                      styles.quickInfoValue,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {priceLabel}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.quickInfoDivider,
                  {
                    backgroundColor:
                      palette.border,
                  },
                ]}
              />

              {/* VALID UNTIL */}

              <View
                style={
                  styles.quickInfoItem
                }
              >
                <View
                  style={[
                    styles.quickInfoIcon,
                    {
                      backgroundColor:
                        palette.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={
                      palette.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.quickInfoTextWrap
                  }
                >
                  <Text
                    style={[
                      styles.quickInfoLabel,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    VALID UNTIL
                  </Text>

                  <Text
                    style={[
                      styles.quickInfoValue,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {endLabel ||
                      'Available now'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================================================
                DESCRIPTION
            ================================================== */}

            {description ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor:
                      palette.surface,
                    borderColor:
                      palette.border,
                  },
                ]}
              >
                <SectionHeader
                  icon="document-text-outline"
                  title="About this campaign"
                  palette={
                    palette
                  }
                />

                <Text
                  style={[
                    styles.descText,
                    {
                      color:
                        palette.textSecondary,
                    },
                  ]}
                >
                  {displayedDescription}
                </Text>

                {shouldCollapseDescription ? (
                  <Pressable
                    style={
                      styles.readMoreBtn
                    }
                    onPress={() =>
                      setDescExpanded(
                        previous =>
                          !previous
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.readMoreText,
                        {
                          color:
                            palette.primary,
                        },
                      ]}
                    >
                      {descExpanded
                        ? 'Show less'
                        : 'Read more'}
                    </Text>

                    <Ionicons
                      name={
                        descExpanded
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={15}
                      color={
                        palette.primary
                      }
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* ==================================================
                BENEFITS
            ================================================== */}

            {benefits.length > 0 ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor:
                      palette.surface,
                    borderColor:
                      palette.border,
                  },
                ]}
              >
                <SectionHeader
                  icon="checkmark-circle-outline"
                  title="What's included"
                  palette={
                    palette
                  }
                />

                <View
                  style={
                    styles.benefitsGrid
                  }
                >
                  {benefits.map(
                    (
                      benefit,
                      index
                    ) => (
                      <View
                        key={`${benefit}-${index}`}
                        style={
                          styles.benefitItem
                        }
                      >
                        <View
                          style={[
                            styles.benefitCheck,
                            {
                              backgroundColor:
                                palette.successSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={17}
                            color={
                              palette.success
                            }
                          />
                        </View>

                        <Text
                          style={[
                            styles.benefitText,
                            {
                              color:
                                palette.textSecondary,
                            },
                          ]}
                        >
                          {benefit}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            ) : null}

            {/* ==================================================
                LOCATION
            ================================================== */}

            {(
              campaign.address ||
              campaign.location ||
              campaign.city
            ) ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor:
                      palette.surface,
                    borderColor:
                      palette.border,
                  },
                ]}
              >
                <SectionHeader
                  icon="location-outline"
                  title="Location"
                  palette={
                    palette
                  }
                />

                <View
                  style={[
                    styles.addressBox,
                    {
                      backgroundColor:
                        palette.surfaceSoft,
                      borderColor:
                        palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.addressIcon,
                      {
                        backgroundColor:
                          palette.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={
                        palette.primary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.addressText,
                      {
                        color:
                          palette.textSecondary,
                      },
                    ]}
                  >
                    {campaign.address ||
                      campaign.location ||
                      campaign.city}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ==================================================
                MAP
            ================================================== */}

            {(
              campaign.latitude ||
              campaign.lat
            ) &&
            (
              campaign.longitude ||
              campaign.lng
            ) ? (
              <View
                style={
                  styles.mapSection
                }
              >
                <SectionHeader
                  icon="map-outline"
                  title="Find us"
                  palette={
                    palette
                  }
                />

                <SafeMapView
                  latitude={
                    campaign.latitude ??
                    campaign.lat
                  }
                  longitude={
                    campaign.longitude ??
                    campaign.lng
                  }
                  palette={
                    palette
                  }
                />
              </View>
            ) : null}

            {/* ==================================================
                TERMS
            ================================================== */}

            {(
              campaign.terms ||
              campaign.termsAndConditions ||
              campaign.tc
            ) ? (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor:
                      palette.surface,
                    borderColor:
                      palette.border,
                  },
                ]}
              >
                <Pressable
                  style={
                    styles.tcHeader
                  }
                  onPress={() =>
                    setTcExpanded(
                      previous =>
                        !previous
                    )
                  }
                >
                  <View
                    style={
                      styles.sectionHeaderLeft
                    }
                  >
                    <View
                      style={[
                        styles.sectionIcon,
                        {
                          backgroundColor:
                            palette.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={
                          palette.primary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.sectionHeading,
                        {
                          color:
                            palette.text,
                        },
                      ]}
                    >
                      Terms & Conditions
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.chevronCircle,
                      {
                        backgroundColor:
                          palette.surfaceMuted,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        tcExpanded
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={18}
                      color={
                        palette.textSecondary
                      }
                    />
                  </View>
                </Pressable>

                {tcExpanded ? (
                  <View
                    style={[
                      styles.tcContent,
                      {
                        borderTopColor:
                          palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tcText,
                        {
                          color:
                            palette.textSecondary,
                        },
                      ]}
                    >
                      {campaign.terms ||
                        campaign.termsAndConditions ||
                        campaign.tc}
                    </Text>

                    <Text
                      style={[
                        styles.tcText,
                        {
                          color:
                            palette.textSecondary,
                        },
                      ]}
                    >
                      • Subject to availability
                      at the business premises.
                    </Text>

                    <Text
                      style={[
                        styles.tcText,
                        {
                          color:
                            palette.textSecondary,
                        },
                      ]}
                    >
                      • Show this campaign
                      screen to claim the offer.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ==================================================
                YOU MAY ALSO LIKE

                IMPORTANT:
                Do NOT use CampaignFeedCard here.
                This local card guarantees dark/light support.
            ================================================== */}

            {relatedCampaigns &&
            relatedCampaigns.length > 0 ? (
              <View
                style={
                  styles.relatedSection
                }
              >
                <SectionHeader
                  icon="sparkles-outline"
                  title="You may also like"
                  palette={
                    palette
                  }
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.relatedScroll
                  }
                >
                  {relatedCampaigns.map(
                    related => (
                      <RelatedCampaignCard
                        key={
                          related.id
                        }
                        campaign={
                          related
                        }
                        palette={
                          palette
                        }
                        isDarkMode={
                          isDarkMode
                        }
                        onPress={() =>
                          onRelatedPress?.(
                            related
                          )
                        }
                      />
                    )
                  )}
                </ScrollView>
              </View>
            ) : null}

            <View
              style={{
                height: 30,
              }}
            />
          </ScrollView>

          {/* ==================================================
              STICKY CTA
          ================================================== */}

          <View
            style={[
              styles.stickyBar,
              {
                backgroundColor:
                  palette.sticky,

                borderTopColor:
                  palette.border,

                shadowColor:
                  palette.cardShadow,
              },
            ]}
          >
            <View
              style={
                styles.stickyPriceCol
              }
            >
              <Text
                style={[
                  styles.stickyPriceLabel,
                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                Offer price
              </Text>

              <Text
                style={[
                  styles.stickyPrice,
                  {
                    color:
                      palette.text,
                  },
                ]}
                numberOfLines={1}
              >
                {priceLabel}
              </Text>
            </View>

            <Animated.View
              style={[
                styles.ctaAnimated,
                {
                  transform: [
                    {
                      scale:
                        ctaScale,
                    },
                  ],
                },
              ]}
            >
              <Pressable
                onPressIn={
                  handleCtaPressIn
                }
                onPressOut={
                  handleCtaPressOut
                }
                onPress={
                  onEnquirePress
                }
                style={
                  styles.ctaBtn
                }
              >
                <LinearGradient
                  colors={[
                    palette.primary,
                    palette.primaryDark,
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={
                    styles.ctaGradient
                  }
                >
                  <Ionicons
                    name="flash-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.ctaText
                    }
                  >
                    Grab This Deal
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
     ROOT
  ========================================================== */

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  safeSheet: {
    flex: 1,
  },

  /* ==========================================================
     HERO
  ========================================================== */

  heroWrap: {
    width: SCREEN_W,
    height: HERO_HEIGHT,

    overflow: 'hidden',

    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  heroImage: {
    width: SCREEN_W,
    height: HERO_HEIGHT,

    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyHeroIcon: {
    width: 72,
    height: 72,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 10,
  },

  emptyHeroText: {
    fontSize: 13,
    fontWeight: '700',
  },

  heroGradientOverlay: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    height: 175,
  },

  heroBackBtn: {
    position: 'absolute',

    top:
      Platform.OS === 'ios'
        ? 18
        : 24,

    left: 16,

    zIndex: 20,
  },

  heroTopRight: {
    position: 'absolute',

    top:
      Platform.OS === 'ios'
        ? 18
        : 24,

    right: 16,

    zIndex: 20,

    flexDirection: 'row',

    gap: 10,
  },

  heroActionCircle: {
    width: 48,
    height: 48,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.18,
    shadowRadius: 8,

    elevation: 6,
  },

  heroBadge: {
    position: 'absolute',

    bottom: 18,
    left: 17,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 18,

    borderWidth: 1,

    zIndex: 15,
  },

  heroBadgeDot: {
    width: 8,
    height: 8,

    borderRadius: 4,
  },

  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',

    letterSpacing: 0.5,
  },

  heroDots: {
    position: 'absolute',

    bottom: 20,

    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    zIndex: 15,
  },

  heroDot: {
    height: 7,

    borderRadius: 5,
  },

  /* ==========================================================
     CONTENT
  ========================================================== */

  contentScroll: {
    paddingTop: 17,
    paddingHorizontal: 16,
  },

  /* ==========================================================
     BUSINESS
  ========================================================== */

  businessCard: {
    borderRadius: 23,

    borderWidth: 1,

    padding: 17,

    marginBottom: 18,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.08,
    shadowRadius: 14,

    elevation: 3,
  },

  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  businessAvatar: {
    width: 56,
    height: 56,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },

  businessAvatarText: {
    color: '#FFFFFF',

    fontSize: 22,

    fontWeight: '900',
  },

  businessInfo: {
    flex: 1,

    marginLeft: 13,
  },

  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,
  },

  businessNameText: {
    flex: 1,

    fontSize: 17,

    fontWeight: '900',
  },

  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 5,

    gap: 5,
  },

  businessSubText: {
    fontSize: 12.5,

    fontWeight: '600',
  },

  metaDot: {
    width: 3,
    height: 3,

    borderRadius: 2,
  },

  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 17,

    paddingTop: 16,

    borderTopWidth: 1,
  },

  contactBtn: {
    flex: 1,

    alignItems: 'center',
  },

  contactIconWrap: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 6,
  },

  contactBtnText: {
    fontSize: 12,

    fontWeight: '800',
  },

  /* ==========================================================
     TITLE
  ========================================================== */

  campaignTitleSection: {
    marginBottom: 17,
  },

  detailTitle: {
    fontSize: 28,

    lineHeight: 35,

    fontWeight: '900',

    letterSpacing: -0.5,
  },

  categoryPill: {
    alignSelf: 'flex-start',

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 12,
    paddingVertical: 7,

    borderRadius: 14,

    marginTop: 11,
  },

  categoryPillText: {
    fontSize: 11.5,

    fontWeight: '900',
  },

  /* ==========================================================
     OFFER
  ========================================================== */

  offerHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 20,

    borderWidth: 1,

    padding: 15,

    marginBottom: 14,
  },

  offerIconWrap: {
    width: 48,
    height: 48,

    borderRadius: 15,

    alignItems: 'center',
    justifyContent: 'center',
  },

  offerTextWrap: {
    flex: 1,

    marginLeft: 13,
  },

  offerHighlightTitle: {
    fontSize: 13,

    fontWeight: '900',

    marginBottom: 3,
  },

  offerHighlightDesc: {
    fontSize: 14.5,

    lineHeight: 20,

    fontWeight: '700',
  },

  /* ==========================================================
     QUICK INFO
  ========================================================== */

  quickInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 20,

    borderWidth: 1,

    padding: 14,

    marginBottom: 18,
  },

  quickInfoItem: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    minWidth: 0,
  },

  quickInfoIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  quickInfoTextWrap: {
    flex: 1,

    minWidth: 0,
  },

  quickInfoLabel: {
    fontSize: 10.5,

    fontWeight: '700',

    marginBottom: 2,
  },

  quickInfoValue: {
    fontSize: 14,

    fontWeight: '900',
  },

  quickInfoDivider: {
    width: 1,

    height: 40,

    marginHorizontal: 8,
  },

  /* ==========================================================
     SECTION
  ========================================================== */

  sectionCard: {
    borderRadius: 21,

    borderWidth: 1,

    padding: 17,

    marginBottom: 17,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,
    shadowRadius: 8,

    elevation: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 14,
  },

  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1,
  },

  sectionIcon: {
    width: 35,
    height: 35,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  sectionHeading: {
    fontSize: 16,

    fontWeight: '900',
  },

  /* ==========================================================
     DESCRIPTION
  ========================================================== */

  descText: {
    fontSize: 14.5,

    lineHeight: 23,

    fontWeight: '500',
  },

  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 4,

    alignSelf: 'flex-start',

    marginTop: 10,
  },

  readMoreText: {
    fontSize: 13.5,

    fontWeight: '900',
  },

  /* ==========================================================
     BENEFITS
  ========================================================== */

  benefitsGrid: {
    gap: 11,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  benefitCheck: {
    width: 27,
    height: 27,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,

    marginTop: 1,
  },

  benefitText: {
    flex: 1,

    fontSize: 14,

    lineHeight: 21,

    fontWeight: '500',
  },

  /* ==========================================================
     ADDRESS
  ========================================================== */

  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 15,

    borderWidth: 1,

    padding: 12,
  },

  addressIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  addressText: {
    flex: 1,

    fontSize: 14,

    lineHeight: 21,

    fontWeight: '500',
  },

  /* ==========================================================
     MAP
  ========================================================== */

  mapSection: {
    marginBottom: 17,
  },

  mapContainer: {
    height: 205,

    borderRadius: 21,

    overflow: 'hidden',

    borderWidth: 1,
  },

  map: {
    flex: 1,
  },

  mapOverlayBtn: {
    position: 'absolute',

    left: 13,
    right: 13,
    bottom: 13,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 9,

    borderRadius: 15,

    borderWidth: 1,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.16,
    shadowRadius: 8,

    elevation: 5,
  },

  mapOverlayIcon: {
    width: 31,
    height: 31,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  mapOverlayText: {
    flex: 1,

    fontSize: 13,

    fontWeight: '800',
  },

  mapFallback: {
    height: 205,

    borderRadius: 21,

    borderWidth: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 20,
  },

  mapFallbackIcon: {
    width: 52,
    height: 52,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 9,
  },

  mapFallbackTitle: {
    fontSize: 15,

    fontWeight: '900',

    marginBottom: 3,
  },

  mapFallbackText: {
    fontSize: 12.5,

    textAlign: 'center',

    marginBottom: 12,
  },

  mapFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    paddingHorizontal: 14,
    paddingVertical: 9,

    borderRadius: 13,
  },

  mapFallbackButtonText: {
    color: '#FFFFFF',

    fontSize: 12.5,

    fontWeight: '900',
  },

  /* ==========================================================
     TERMS
  ========================================================== */

  tcHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  chevronCircle: {
    width: 32,
    height: 32,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',
  },

  tcContent: {
    borderTopWidth: 1,

    marginTop: 14,

    paddingTop: 14,

    gap: 8,
  },

  tcText: {
    fontSize: 13.5,

    lineHeight: 21,

    fontWeight: '500',
  },

  /* ==========================================================
     RELATED CAMPAIGNS
  ========================================================== */

  relatedSection: {
    marginBottom: 10,
  },

  relatedScroll: {
    gap: 14,

    paddingBottom: 10,

    paddingRight: 6,
  },

  relatedCard: {
    width: 300,

    borderRadius: 22,

    borderWidth: 1,

    overflow: 'hidden',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 3,
  },

  relatedImageWrap: {
    height: 175,

    overflow: 'hidden',

    position: 'relative',
  },

  relatedImage: {
    width: '100%',
    height: '100%',
  },

  relatedActiveBadge: {
    position: 'absolute',

    top: 12,
    left: 12,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 15,

    borderWidth: 1,
  },

  relatedActiveDot: {
    width: 7,
    height: 7,

    borderRadius: 4,
  },

  relatedActiveText: {
    fontSize: 10,

    fontWeight: '900',

    letterSpacing: 0.3,
  },

  relatedOfferBadge: {
    position: 'absolute',

    left: 12,
    right: 12,
    bottom: 12,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    paddingHorizontal: 11,
    paddingVertical: 9,

    borderRadius: 13,

    borderWidth: 1,
  },

  relatedOfferText: {
    flex: 1,

    fontSize: 12,

    fontWeight: '900',
  },

  relatedContent: {
    padding: 15,
  },

  relatedTitle: {
    fontSize: 17,

    lineHeight: 22,

    fontWeight: '900',

    marginBottom: 13,
  },

  relatedBusinessRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 13,
  },

  relatedAvatar: {
    width: 34,
    height: 34,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  relatedAvatarText: {
    fontSize: 14,

    fontWeight: '900',
  },

  relatedBusinessName: {
    flex: 1,

    fontSize: 13,

    fontWeight: '800',
  },

  relatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    marginBottom: 13,
  },

  relatedMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    maxWidth: 190,

    paddingHorizontal: 9,
    paddingVertical: 7,

    borderRadius: 11,

    borderWidth: 1,
  },

  relatedRatingChip: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 4,

    paddingHorizontal: 9,
    paddingVertical: 7,

    borderRadius: 11,

    borderWidth: 1,
  },

  relatedMetaText: {
    fontSize: 11,

    fontWeight: '800',
  },

  relatedFooter: {
    flexDirection: 'row',
    alignItems: 'center',

    borderTopWidth: 1,

    paddingTop: 12,
  },

  relatedPriceLabel: {
    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.5,

    marginBottom: 2,
  },

  relatedPrice: {
    fontSize: 18,

    fontWeight: '900',
  },

  relatedViewButton: {
    height: 42,

    paddingHorizontal: 14,

    borderRadius: 13,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'center',

    gap: 5,
  },

  relatedViewButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '900',
  },

  /* ==========================================================
     STICKY CTA
  ========================================================== */

  stickyBar: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    minHeight: 92,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,

    paddingTop: 10,

    paddingBottom:
      Platform.OS === 'ios'
        ? 22
        : 14,

    borderTopWidth: 1,

    shadowOffset: {
      width: 0,
      height: -5,
    },

    shadowOpacity: 0.14,
    shadowRadius: 15,

    elevation: 16,

    zIndex: 100,
  },

  stickyPriceCol: {
    width: 92,

    justifyContent:
      'center',

    marginRight: 10,
  },

  stickyPriceLabel: {
    fontSize: 10.5,

    fontWeight: '700',

    marginBottom: 2,
  },

  stickyPrice: {
    fontSize: 21,

    fontWeight: '900',
  },

  ctaAnimated: {
    flex: 1,
  },

  ctaBtn: {
    height: 56,

    borderRadius: 17,

    overflow: 'hidden',

    shadowColor: '#2563EB',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.28,
    shadowRadius: 12,

    elevation: 7,
  },

  ctaGradient: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  ctaText: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '900',
  },
});