import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Linking,
  Switch,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

import * as Location from 'expo-location';

import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import apiService from '../../services/apiService';
import chatService from '../../services/chatService';

import {
  resolveMediaUrl,
} from '../../config/apiConfig';

import CampaignDetailScreen from './CampaignDetailScreen';
import RatingModal from '../../components/RatingModal';


// ============================================================
// BUYER COLORS
// ============================================================

const BUYER_LIGHT = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  elevated: '#FFFFFF',

  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',

  primarySoft: '#EAF2FF',
  primarySoftStrong: '#DCEAFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  input: '#FFFFFF',

  success: '#16A34A',
  successSoft: '#DCFCE7',

  warning: '#D97706',
  warningSoft: '#FEF3C7',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  nav: '#FFFFFF',

  shadow: '#0F172A',
};


const BUYER_DARK = {
  background: '#09111F',
  surface: '#111C2E',
  surfaceSecondary: '#142238',
  elevated: '#18263D',

  text: '#F8FAFC',
  textSecondary: '#A9B6C9',
  textTertiary: '#718198',

  primary: '#4F8CFF',
  primaryDark: '#3B82F6',
  primaryLight: '#60A5FA',

  primarySoft: 'rgba(79,140,255,0.14)',
  primarySoftStrong: 'rgba(79,140,255,0.22)',

  border: '#26364E',
  borderStrong: '#354762',

  input: '#0E192B',

  success: '#4ADE80',
  successSoft: 'rgba(34,197,94,0.14)',

  warning: '#FBBF24',
  warningSoft: 'rgba(245,158,11,0.14)',

  danger: '#F87171',
  dangerSoft: 'rgba(239,68,68,0.14)',

  nav: '#111C2E',

  shadow: '#000000',
};


// ============================================================
// CATEGORY DATA
// ============================================================

const SERVICES_DATA = [
  {
    id: 'it',
    title: 'IT & Technology',
    icon: require('../../../assets/ICONS/CATEGORY/it_and_technology.png'),
  },
  {
    id: 'edu',
    title: 'Education',
    icon: require('../../../assets/ICONS/CATEGORY/education.png'),
  },
  {
    id: 'health',
    title: 'Health',
    icon: require('../../../assets/ICONS/CATEGORY/health.png'),
  },
  {
    id: 'beauty',
    title: 'Beauty',
    icon: require('../../../assets/ICONS/CATEGORY/beauty.png'),
  },
  {
    id: 'food',
    title: 'Food',
    icon: require('../../../assets/ICONS/CATEGORY/food.png'),
  },
  {
    id: 'events',
    title: 'Events',
    icon: require('../../../assets/ICONS/CATEGORY/events.png'),
  },
  {
    id: 'realestate',
    title: 'Real Estate',
    icon: require('../../../assets/ICONS/CATEGORY/real_estate.jpg'),
  },
  {
    id: 'transport',
    title: 'Transport',
    icon: require('../../../assets/ICONS/CATEGORY/transport.jpg'),
  },
  {
    id: 'auto',
    title: 'Automotive',
    icon: require('../../../assets/ICONS/CATEGORY/automotive.jpg'),
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: require('../../../assets/ICONS/CATEGORY/finance.jpg'),
  },
  {
    id: 'legal',
    title: 'Legal Services',
    icon: require('../../../assets/ICONS/CATEGORY/legal.jpg'),
  },
  {
    id: 'home',
    title: 'Home Services',
    icon: require('../../../assets/ICONS/CATEGORY/home_services.jpg'),
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: require('../../../assets/ICONS/CATEGORY/travel.jpg'),
  },
  {
    id: 'shopping',
    title: 'Shopping',
    icon: require('../../../assets/ICONS/CATEGORY/shopping.jpg'),
  },
];

// Maps backend category strings (may contain subcategory after ::) to SERVICES_DATA ids
const CATEGORY_KEYWORD_MAP = [
  { keywords: ['it', 'technology', 'software', 'tech', 'digital', 'cyber', 'cloud', 'mobile app', 'web dev', 'ai', 'machine learning'], id: 'it' },
  { keywords: ['education', 'training', 'school', 'college', 'coaching', 'tutor', 'learning', 'course', 'academic'], id: 'edu' },
  { keywords: ['health', 'wellness', 'gym', 'fitness', 'yoga', 'medical', 'clinic', 'nutrition', 'physiotherapy', 'personal trainer'], id: 'health' },
  { keywords: ['beauty', 'personal care', 'salon', 'spa', 'grooming', 'cosmetic', 'skin', 'hair'], id: 'beauty' },
  { keywords: ['food', 'restaurant', 'cafe', 'dining', 'bakery', 'catering', 'kitchen', 'meal', 'cuisine'], id: 'food' },
  { keywords: ['event', 'entertainment', 'party', 'wedding', 'photography', 'music', 'concert', 'dj'], id: 'events' },
  { keywords: ['real estate', 'property', 'realty', 'housing', 'apartment', 'plot', 'construction'], id: 'realestate' },
  { keywords: ['transport', 'delivery', 'logistics', 'courier', 'shipping', 'packers', 'movers'], id: 'transport' },
  { keywords: ['automotive', 'auto', 'car', 'vehicle', 'bike', 'motor', 'garage', 'mechanic', 'tyre'], id: 'auto' },
  { keywords: ['finance', 'insurance', 'banking', 'loan', 'investment', 'tax', 'accounting', 'audit'], id: 'finance' },
  { keywords: ['legal', 'compliance', 'lawyer', 'advocate', 'law', 'court', 'attorney', 'notary'], id: 'legal' },
  { keywords: ['home', 'repair', 'interior', 'cleaning', 'plumbing', 'electrician', 'pest', 'painting', 'renovation'], id: 'home' },
  { keywords: ['travel', 'tourism', 'holiday', 'tour', 'trip', 'hotel', 'resort', 'vacation'], id: 'travel' },
  { keywords: ['shopping', 'retail', 'store', 'market', 'fashion', 'clothing', 'apparel', 'accessories', 'boutique'], id: 'shopping' },
];

function deriveCategoryServiceId(categoryString) {
  if (!categoryString) return undefined;
  const lower = categoryString.toLowerCase();
  for (const entry of CATEGORY_KEYWORD_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.id;
    }
  }
  return undefined;
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatPriceSafe = (price) => {
  if (price === null || price === undefined || price === '') {
    return null;
  }

  const numeric = Number(price);

  if (Number.isNaN(numeric)) {
    return String(price);
  }

  return `₹${numeric.toLocaleString('en-IN')}`;
};


const formatDateSafe = (date) => {
  if (!date) return null;

  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};


const getInitial = (name) => {
  if (!name) return 'B';

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
};


const getBusinessName = (campaign) => {
  return (
    campaign?.businessName ||
    campaign?.business_name ||
    campaign?.seller_name ||
    'Business'
  );
};


const getCampaignImage = (campaign) => {
  return (
    campaign?.imageUrls?.[0] ||
    campaign?.image_urls?.[0] ||
    campaign?.image_url ||
    campaign?.imageUrl ||
    null
  );
};


// ============================================================
// CATEGORY CARD
// ============================================================

const CategoryCard = ({
  item,
  count,
  selected,
  onPress,
  palette,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: selected
            ? palette.primarySoft
            : palette.surface,

          borderColor: selected
            ? palette.primary
            : palette.border,

          transform: [
            {
              scale: pressed ? 0.97 : 1,
            },
          ],
        },
      ]}
    >

      <View
        style={[
          styles.categoryIconContainer,
          {
            backgroundColor: selected
              ? palette.primarySoftStrong
              : palette.surfaceSecondary,

            borderColor: selected
              ? palette.primary
              : palette.border,
          },
        ]}
      >
        <Image
          source={item.icon}
          style={styles.categoryIcon}
        />
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.categoryTitle,
          {
            color: selected
              ? palette.primary
              : palette.text,
          },
        ]}
      >
        {item.title}
      </Text>

      {count > 0 && (
        <Text
          style={[
            styles.categoryCount,
            {
              color: palette.textTertiary,
            },
          ]}
        >
          {count} offers
        </Text>
      )}

    </Pressable>
  );
};


// ============================================================
// CAMPAIGN CARD
// ============================================================

// ============================================================
// CAMPAIGN CARD
// ============================================================

const CampaignCard = ({
  campaign,
  palette,
  isDarkMode,
  onPress,
  onSave,
  compact = false,
}) => {
  const image = getCampaignImage(campaign);

  const imageUri = image
    ? resolveMediaUrl(image)
    : null;

  const businessName = getBusinessName(campaign);

  const price = formatPriceSafe(campaign?.price);

  const endDate = formatDateSafe(
    campaign?.endDate ||
    campaign?.end_date
  );

  const rating =
    campaign?.rating !== undefined &&
      campaign?.rating !== null
      ? Number(campaign.rating).toFixed(1)
      : null;

  const distance =
    campaign?.distance_km !== undefined &&
      campaign?.distance_km !== null
      ? `${Number(campaign.distance_km).toFixed(1)} km`
      : null;

  const saved = Boolean(campaign?.isSaved);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.campaignCard,
        {
          width: compact ? 300 : '100%',
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.shadow,

          opacity: pressed ? 0.97 : 1,

          transform: [
            {
              scale: pressed ? 0.985 : 1,
            },
          ],
        },
      ]}
    >

      {/* ====================================================
          CAMPAIGN IMAGE
      ==================================================== */}

      <View
        style={[
          styles.campaignImageContainer,
          {
            backgroundColor: palette.surfaceSecondary,
          },
        ]}
      >

        {imageUri ? (
          <Image
            source={{
              uri: imageUri,
            }}
            style={styles.campaignImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              {
                backgroundColor:
                  palette.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={42}
              color={palette.primary}
            />

            <Text
              style={[
                styles.imagePlaceholderText,
                {
                  color:
                    palette.textSecondary,
                },
              ]}
            >
              Campaign
            </Text>
          </View>
        )}

        {/* Image overlay */}

        <LinearGradient
          colors={[
            'rgba(0,0,0,0.30)',
            'rgba(0,0,0,0.03)',
            'rgba(0,0,0,0.58)',
          ]}
          style={StyleSheet.absoluteFill}
        />

        {/* ==================================================
            IMAGE TOP ACTIONS
        ================================================== */}

        <View style={styles.campaignImageTop}>

          {/* Active */}

          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(15,23,42,0.92)'
                  : 'rgba(255,255,255,0.95)',

                borderColor:
                  palette.success,
              },
            ]}
          >
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor:
                    palette.success,
                },
              ]}
            />

            <Text
              style={[
                styles.activeBadgeText,
                {
                  color:
                    palette.success,
                },
              ]}
            >
              ACTIVE
            </Text>
          </View>

          {/* Save */}

          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onSave?.();
            }}
            style={[
              styles.saveButton,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(9,17,31,0.90)'
                  : 'rgba(255,255,255,0.96)',
              },
            ]}
          >
            <Ionicons
              name={
                saved
                  ? 'heart'
                  : 'heart-outline'
              }
              size={22}
              color={
                saved
                  ? '#EF4444'
                  : palette.text
              }
            />
          </Pressable>

        </View>

        {/* ==================================================
            OFFER BADGE
        ================================================== */}

        {campaign?.offerLine && (
          <View
            style={[
              styles.offerBadge,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(23,34,56,0.96)'
                  : 'rgba(255,255,255,0.96)',

                borderColor:
                  palette.warning,
              },
            ]}
          >
            <Ionicons
              name="flash"
              size={14}
              color={palette.warning}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.offerBadgeText,
                {
                  color:
                    palette.warning,
                },
              ]}
            >
              {campaign.offerLine}
            </Text>
          </View>
        )}

      </View>


      {/* ====================================================
          CARD CONTENT
      ==================================================== */}

      <View
        style={[
          styles.campaignContent,
          {
            backgroundColor:
              palette.surface,
          },
        ]}
      >

        {/* ==================================================
            CAMPAIGN TITLE
        ================================================== */}

        <Text
          numberOfLines={2}
          style={[
            styles.campaignTitle,
            {
              color: palette.text,
            },
          ]}
        >
          {campaign?.title ||
            'Special Offer'}
        </Text>


        {/* ==================================================
            BUSINESS
            ONLY BUSINESS NAME
            CATEGORY REMOVED
        ================================================== */}

        <View
          style={[
            styles.businessRow,
            {
              marginTop: 14,
            },
          ]}
        >

          <View
            style={[
              styles.businessAvatar,
              {
                backgroundColor:
                  palette.primarySoft,
              },
            ]}
          >
            <Text
              style={[
                styles.businessAvatarText,
                {
                  color:
                    palette.primary,
                },
              ]}
            >
              {getInitial(
                businessName
              )}
            </Text>
          </View>

          <View
            style={[
              styles.businessInfo,
              {
                flex: 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.businessName,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              {businessName}
            </Text>
          </View>

        </View>


        {/* ==================================================
            DESCRIPTION REMOVED
        ==================================================

        The campaign description intentionally does NOT
        appear inside the campaign card.

        ================================================== */}


        {/* ==================================================
            METADATA
        ================================================== */}

        <View
          style={[
            styles.metadataRow,
            {
              marginTop: 16,
            },
          ]}
        >

          {/* End Date */}

          {endDate && (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor:
                    palette.surfaceSecondary,

                  borderColor:
                    palette.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={
                  palette.textSecondary
                }
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.metaText,
                  {
                    color:
                      palette.textSecondary,
                  },
                ]}
              >
                Ends {endDate}
              </Text>
            </View>
          )}


          {/* Rating */}

          {rating && (
            <View
              style={[
                styles.metaChip,
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
                size={13}
                color={
                  palette.warning
                }
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      palette.warning,
                  },
                ]}
              >
                {rating}
              </Text>
            </View>
          )}


          {/* Distance */}

          {distance && (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor:
                    palette.primarySoft,

                  borderColor:
                    palette.primary,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={
                  palette.primary
                }
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      palette.primary,
                  },
                ]}
              >
                {distance}
              </Text>
            </View>
          )}

        </View>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <View
          style={[
            styles.campaignFooter,
            {
              borderTopColor:
                palette.border,
            },
          ]}
        >

          {/* Price */}

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={[
                styles.priceLabel,
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
                styles.priceText,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              {price ||
                'Contact seller'}
            </Text>
          </View>


          {/* View Details */}

          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.viewButton,
              {
                backgroundColor:
                  palette.primary,

                opacity:
                  pressed ? 0.85 : 1,
              },
            ]}
          >

            <Text
              style={
                styles.viewButtonText
              }
            >
              View Details
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />

          </Pressable>

        </View>

      </View>

    </Pressable>
  );
};


// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  palette,
  icon = 'search-outline',
  title,
  message,
}) => {
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >

      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: palette.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={30}
          color={palette.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color: palette.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.emptyMessage,
          {
            color: palette.textSecondary,
          },
        ]}
      >
        {message}
      </Text>

    </View>
  );
};


// ============================================================
// MAIN SCREEN
// ============================================================

export default function DiscoveryFeedScreen() {

  const {
    buyerTheme,
    isBuyerDarkMode,
    toggleBuyerDark,
  } = useTheme();

  const {
    user,
    logout,
    updateUserProfile,
  } = useAuth();

  const navigation = useNavigation();
  const route = useRoute();

  const isDarkMode = isBuyerDarkMode;

  const palette = isDarkMode
    ? BUYER_DARK
    : BUYER_LIGHT;


  // ==========================================================
  // STATES
  // ==========================================================

  const [activeTab, setActiveTab] =
    useState('Home');

  const [searchQuery, setSearchQuery] =
    useState('');

  const [campaigns, setCampaigns] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [selectedCampaign, setSelectedCampaign] =
    useState(null);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [offersNearby, setOffersNearby] =
    useState([]);

  const [buyerLocation, setBuyerLocation] =
    useState(null);

  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);

  const [fetchingNearby, setFetchingNearby] =
    useState(false);

  const [recentlyViewed, setRecentlyViewed] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [showFiltersModal, setShowFiltersModal] =
    useState(false);

  const [priceFilter, setPriceFilter] =
    useState('');

  const [ratingFilter, setRatingFilter] =
    useState('');

  const [cityFilter, setCityFilter] =
    useState(user?.city || 'Chennai');

  const [appliedPrice, setAppliedPrice] =
    useState(null);

  const [appliedRating, setAppliedRating] =
    useState(null);

  const [showRatingModal, setShowRatingModal] =
    useState(false);

  const [msgNotifVisible, setMsgNotifVisible] =
    useState(false);

  const [msgNotifSenders, setMsgNotifSenders] =
    useState([]);


  const contentFadeAnim =
    useRef(new Animated.Value(1)).current;

  const msgNotifAnim =
    useRef(new Animated.Value(0)).current;

  const msgNotifTimer =
    useRef(null);


  // ==========================================================
  // GREETING
  // ==========================================================

  const getGreeting = () => {

    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good Morning';
    }

    if (hour < 18) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  };


  // ==========================================================
  // TAB CHANGE
  // ==========================================================

  const handleTabChange = (tab) => {

    setActiveTab(tab);

    Animated.timing(
      contentFadeAnim,
      {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }
    ).start(() => {

      Animated.timing(
        contentFadeAnim,
        {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }
      ).start();

    });
  };


  // ==========================================================
  // CATEGORY ROUTE
  // ==========================================================

  useEffect(() => {

    if (!route.params?.selectedCategoryId) {
      return;
    }

    const category =
      SERVICES_DATA.find(
        item =>
          item.id ===
          route.params.selectedCategoryId
      );

    if (category) {
      setSelectedCategory(category);
      handleTabChange('Home');
    }

  }, [
    route.params?.selectedCategoryId,
  ]);


  // ==========================================================
  // LOAD SAVED + RECENTLY VIEWED
  // ==========================================================

  useEffect(() => {

    if (!user?.email) {
      return;
    }

    const loadActivity = async () => {

      try {

        const savedRaw =
          await AsyncStorage.getItem(
            `savedCampaigns_${user.email}`
          );

        const recentRaw =
          await AsyncStorage.getItem(
            `recentlyViewed_${user.email}`
          );

        const savedIds =
          savedRaw
            ? JSON.parse(savedRaw)
            : [];

        const recent =
          recentRaw
            ? JSON.parse(recentRaw)
            : [];

        setRecentlyViewed(recent);

        setCampaigns(prev =>
          prev.map(item => ({
            ...item,
            isSaved:
              savedIds.includes(item.id),
          }))
        );

      } catch (error) {

        console.warn(
          'Failed loading activity',
          error
        );

      }

    };

    loadActivity();

  }, [user?.email]);


  // ==========================================================
  // FETCH CAMPAIGNS
  // ==========================================================

  const fetchCampaigns = async () => {

    setLoading(true);

    try {

      const response =
        await apiService.get('/campaigns');

      const fetched =
        Array.isArray(response)
          ? response
          : [];

      const savedRaw =
        await AsyncStorage.getItem(
          `savedCampaigns_${user?.email || ''}`
        );

      const savedIds =
        savedRaw
          ? JSON.parse(savedRaw)
          : [];

      const normalized =
        fetched.map(item => ({
          ...item,

          isSaved:
            savedIds.includes(item.id),

          businessName:
            item.businessName ||
            item.business_name ||
            item.seller_name ||
            'Business',

          imageUrls:
            item.imageUrls ||
            item.image_urls ||
            [],

          endDate:
            item.endDate ||
            item.end_date,

          offerLine:
            item.offerLine ||
            item.offer_line,

          serviceId:
            item.serviceId ||
            item.service_id ||
            deriveCategoryServiceId(item.category),
        }));

      setCampaigns(normalized);

    } catch (error) {

      console.warn(
        'Failed to fetch campaigns',
        error
      );

      Alert.alert(
        'Unable to load offers',
        'Please check your connection and try again.'
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    fetchCampaigns();

  }, []);


  // ==========================================================
  // UNREAD MESSAGES
  // ==========================================================

  useEffect(() => {

    if (!user?.email) {
      return;
    }

    const checkMessages = async () => {

      try {

        const threads =
          await apiService.get(
            '/chat/threads'
          );

        const unread =
          (threads || []).filter(
            thread =>
              Number(
                thread.buyer_unread_count || 0
              ) > 0
          );

        const total =
          unread.reduce(
            (sum, item) =>
              sum +
              Number(
                item.buyer_unread_count || 0
              ),
            0
          );

        setUnreadCount(total);

        if (!unread.length) {
          return;
        }

        const names =
          [
            ...new Set(
              unread.map(
                item =>
                  item.seller_name ||
                  'A seller'
              )
            ),
          ].slice(0, 3);

        setMsgNotifSenders(names);

        setMsgNotifVisible(true);

        Animated.spring(
          msgNotifAnim,
          {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }
        ).start();

        msgNotifTimer.current =
          setTimeout(
            dismissMessageNotification,
            10000
          );

      } catch (error) {

        console.warn(
          'Message check failed',
          error
        );

      }
    };


    const timer =
      setTimeout(
        checkMessages,
        1500
      );

    return () => {

      clearTimeout(timer);

      if (msgNotifTimer.current) {
        clearTimeout(
          msgNotifTimer.current
        );
      }

    };

  }, [user?.email]);


  // ==========================================================
  // MESSAGE NOTIFICATION
  // ==========================================================

  const dismissMessageNotification =
    () => {

      if (msgNotifTimer.current) {
        clearTimeout(
          msgNotifTimer.current
        );
      }

      Animated.timing(
        msgNotifAnim,
        {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }
      ).start(() => {
        setMsgNotifVisible(false);
      });

    };


  // ==========================================================
  // LOCATION
  // ==========================================================

  const requestBuyerLocationAndFetch =
    async () => {

      setFetchingNearby(true);

      try {

        const {
          status,
        } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {

          setLocationPermissionDenied(true);
          setFetchingNearby(false);

          return;

        }

        setLocationPermissionDenied(false);

        const location =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.Balanced,
          });

        const coords =
          location.coords;

        setBuyerLocation(coords);

        try {

          const nearby =
            await apiService.get(
              `/campaigns/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius_km=10`
            );

          setOffersNearby(
            Array.isArray(nearby)
              ? nearby
              : []
          );

        } catch (error) {

          console.warn(
            'Nearby campaigns failed',
            error
          );

          setOffersNearby([]);

        }

      } catch (error) {

        console.warn(
          'Location error',
          error
        );

      } finally {

        setFetchingNearby(false);

      }
    };


  useEffect(() => {

    requestBuyerLocationAndFetch();

  }, []);


  // ==========================================================
  // SAVE CAMPAIGN
  // ==========================================================

  const toggleSaveCampaign =
    async (campaignId) => {

      setCampaigns(prev => {

        const updated =
          prev.map(item =>
            item.id === campaignId
              ? {
                ...item,
                isSaved:
                  !item.isSaved,
              }
              : item
          );

        const savedIds =
          updated
            .filter(item => item.isSaved)
            .map(item => item.id);

        if (user?.email) {

          AsyncStorage.setItem(
            `savedCampaigns_${user.email}`,
            JSON.stringify(savedIds)
          ).catch(error =>
            console.warn(
              'Failed saving campaign',
              error
            )
          );

        }

        return updated;

      });


      setSelectedCampaign(prev => {

        if (
          !prev ||
          prev.id !== campaignId
        ) {
          return prev;
        }

        return {
          ...prev,
          isSaved:
            !prev.isSaved,
        };

      });

      // Also update offersNearby and recentlyViewed which are separate state arrays
      setOffersNearby(prev =>
        prev.map(item =>
          item.id === campaignId
            ? { ...item, isSaved: !item.isSaved }
            : item
        )
      );

      setRecentlyViewed(prev =>
        prev.map(item =>
          item.id === campaignId
            ? { ...item, isSaved: !item.isSaved }
            : item
        )
      );

    };


  // ==========================================================
  // CAMPAIGN CLICK
  // ==========================================================

  const handleCampaignClick =
    async (campaign) => {

      try {

        const updatedRecent =
          [
            campaign,
            ...recentlyViewed.filter(
              item =>
                item.id !== campaign.id
            ),
          ].slice(0, 6);

        setRecentlyViewed(
          updatedRecent
        );

        if (user?.email) {

          await AsyncStorage.setItem(
            `recentlyViewed_${user.email}`,
            JSON.stringify(
              updatedRecent
            )
          );

        }

      } catch (error) {

        console.warn(
          'Recently viewed failed',
          error
        );

      }


      const enriched = {
        ...campaign,
      };


      // Calculate distance

      try {

        if (
          buyerLocation &&
          campaign.latitude &&
          campaign.longitude
        ) {

          const toRadians =
            value =>
              value *
              Math.PI /
              180;

          const R = 6371;

          const lat1 =
            buyerLocation.latitude;

          const lon1 =
            buyerLocation.longitude;

          const lat2 =
            Number(
              campaign.latitude
            );

          const lon2 =
            Number(
              campaign.longitude
            );

          const dLat =
            toRadians(
              lat2 - lat1
            );

          const dLon =
            toRadians(
              lon2 - lon1
            );

          const a =
            Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +
            Math.cos(
              toRadians(lat1)
            ) *
            Math.cos(
              toRadians(lat2)
            ) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

          const c =
            2 *
            Math.atan2(
              Math.sqrt(a),
              Math.sqrt(1 - a)
            );

          enriched.distance_km =
            Number(
              (R * c).toFixed(2)
            );

        }

      } catch {
        // Ignore distance error
      }


      setSelectedCampaign(
        enriched
      );


      try {

        await apiService.post(
          `/campaigns/${campaign.id}/view`
        );

      } catch (error) {

        console.warn(
          'View logging failed',
          error
        );

      }

    };


  // ==========================================================
  // CREATE LEAD
  // ==========================================================

  const createLead =
    async (
      campaign,
      message
    ) => {

      return apiService.post(
        `/leads?campaign_id=${campaign.id}`,
        {
          name:
            user?.name ||
            'Anonymous Buyer',

          phone:
            user?.phone ||
            '0000000000',

          message,
        }
      );

    };


  // ==========================================================
  // RATING
  // ==========================================================

  const triggerRating =
    async () => {

      try {

        const rated =
          await AsyncStorage.getItem(
            'has_rated_reachlo_buyer'
          );

        if (!rated) {

          await AsyncStorage.setItem(
            'has_rated_reachlo_buyer',
            'true'
          );

          setShowRatingModal(true);

        }

      } catch (error) {

        console.warn(
          'Rating status failed',
          error
        );

      }

    };


  // ==========================================================
  // CALL
  // ==========================================================

  const handleQuickCall =
    async campaign => {

      try {

        await createLead(
          campaign,
          'Called seller directly via CTA'
        );

        const phone =
          campaign.seller_phone ||
          campaign.phone ||
          campaign.seller_whatsapp;

        if (!phone) {

          Alert.alert(
            'Phone unavailable',
            'This seller has not provided a phone number.'
          );

          return;

        }

        await Linking.openURL(
          `tel:${phone}`
        );

        triggerRating();

      } catch {

        Alert.alert(
          'Error',
          'Could not register your interest.'
        );

      }

    };


  // ==========================================================
  // WHATSAPP
  // ==========================================================

  const handleQuickWhatsApp =
    async campaign => {

      try {

        await createLead(
          campaign,
          'Contacted seller via WhatsApp'
        );

        const phone =
          campaign.seller_whatsapp ||
          campaign.seller_phone ||
          campaign.phone;

        if (!phone) {

          Alert.alert(
            'WhatsApp unavailable',
            'Seller contact information is unavailable.'
          );

          return;

        }

        const message =
          `Hi, I am interested in your offer on Reachlo: ${campaign.offerLine ||
          campaign.title ||
          'your campaign'
          }`;

        await Linking.openURL(
          `whatsapp://send?text=${encodeURIComponent(
            message
          )}&phone=${phone}`
        );

        triggerRating();

      } catch {

        Alert.alert(
          'Error',
          'Could not open WhatsApp.'
        );

      }

    };


  // ==========================================================
  // CHAT
  // ==========================================================

  const handleQuickEnquire =
    async campaign => {

      if (!user) {

        Alert.alert(
          'Login Required',
          'Please login to chat with sellers.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Login',
              onPress: () =>
                navigation.navigate(
                  'Landing'
                ),
            },
          ]
        );

        return;

      }


      try {

        const lead =
          await createLead(
            campaign,
            `Enquired about: ${campaign.offerLine ||
            campaign.title
            }`
          );


        if (!lead?.id) {

          throw new Error(
            'Lead creation failed'
          );

        }


        const thread =
          await chatService.createThread(
            lead.id
          );


        setSelectedCampaign(
          null
        );


        navigation.navigate(
          'ChatScreen',
          {
            threadId:
              thread.id,

            campaign: {
              title:
                campaign.title,

              offer:
                campaign.offerLine,

              category:
                campaign.category,

              image_url:
                getCampaignImage(
                  campaign
                ),
            },

            business: {
              name:
                getBusinessName(
                  campaign
                ),

              phone:
                campaign.phone ||
                campaign.seller_phone,
            },
          }
        );


        triggerRating();

      } catch (error) {

        console.warn(
          'Chat failed',
          error
        );

        Alert.alert(
          'Error',
          'Could not open chat.'
        );

      }

    };


  // ==========================================================
  // FILTER LOGIC
  // ==========================================================

  const filteredCampaigns =
    useMemo(() => {

      const query =
        searchQuery
          .trim()
          .toLowerCase();


      return campaigns.filter(
        campaign => {

          const searchable = [
            campaign.title,
            campaign.description,
            campaign.businessName,
            campaign.business_name,
            campaign.category,
            campaign.subService,
            campaign.offerLine,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


          const searchMatches =
            !query ||
            searchable.includes(query) ||
            searchable.indexOf(query) !== -1;


          const priceMatches =
            !appliedPrice ||
            Number(
              campaign.price || 0
            ) <= appliedPrice;


          const ratingMatches =
            !appliedRating ||
            Number(
              campaign.rating || 0
            ) >= appliedRating;


          const categoryMatches =
            !selectedCategory ||
            campaign.serviceId ===
            selectedCategory.id;


          return (
            searchMatches &&
            priceMatches &&
            ratingMatches &&
            categoryMatches
          );

        }
      );

    }, [
      campaigns,
      searchQuery,
      appliedPrice,
      appliedRating,
      selectedCategory,
    ]);


  // ==========================================================
  // SAVED
  // ==========================================================

  const savedCampaigns =
    campaigns.filter(
      item => item.isSaved
    );


  // ==========================================================
  // FILTER ACTIONS
  // ==========================================================

  const applyFilters = () => {

    const price =
      priceFilter.trim()
        ? Number(priceFilter)
        : null;

    const rating =
      ratingFilter.trim()
        ? Number(ratingFilter)
        : null;

    setAppliedPrice(
      Number.isNaN(price)
        ? null
        : price
    );

    setAppliedRating(
      Number.isNaN(rating)
        ? null
        : rating
    );

    setShowFiltersModal(
      false
    );

  };


  const resetFilters = () => {

    setPriceFilter('');
    setRatingFilter('');

    setAppliedPrice(null);
    setAppliedRating(null);

    setShowFiltersModal(
      false
    );

  };


  // ==========================================================
  // PROFILE
  // ==========================================================

  const handleLogout =
    () => {

      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: logout,
          },
        ]
      );

    };


  // ==========================================================
  // RENDER HEADER
  // ==========================================================

  const renderHeader = () => {

    return (
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              palette.surface,

            borderBottomColor:
              palette.border,
          },
        ]}
      >

        <View
          style={styles.headerLeft}
        >

          <Text
            style={[
              styles.greetingSmall,
              {
                color:
                  palette.textSecondary,
              },
            ]}
          >
            {getGreeting()} ☀️
          </Text>


          <Text
            style={[
              styles.helloText,
              {
                color:
                  palette.text,
              },
            ]}
          >
            Hello,{' '}

            <Text
              style={{
                color:
                  palette.primary,

                fontWeight: '900',
              }}
            >
              {user?.name?.split(
                ' '
              )[0] || 'Buyer'}
            </Text>

            {' '}
          </Text>


          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  palette.textSecondary,
              },
            ]}
          >
            Discover deals tailored for you
          </Text>

        </View>


        <View
          style={styles.headerActions}
        >

          <Pressable
            onPress={() =>
              navigation.navigate(
                'BuyerInbox'
              )
            }
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  palette.primarySoft,

                borderColor:
                  palette.border,
              },
            ]}
          >

            <Ionicons
              name="chatbubbles-outline"
              size={22}
              color={
                palette.primary
              }
            />

            {unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  {
                    backgroundColor:
                      '#EF4444',
                  },
                ]}
              >
                <Text
                  style={
                    styles.unreadBadgeText
                  }
                >
                  {unreadCount > 99
                    ? '99+'
                    : unreadCount}
                </Text>
              </View>
            )}

          </Pressable>


          <Pressable
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  palette.primarySoft,

                borderColor:
                  palette.border,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={
                palette.primary
              }
            />
          </Pressable>


          <Pressable
            onPress={() =>
              handleTabChange(
                'Profile'
              )
            }
          >

            <LinearGradient
              colors={[
                '#60A5FA',
                '#2563EB',
              ]}
              style={
                styles.profileAvatar
              }
            >

              <Text
                style={
                  styles.profileAvatarText
                }
              >
                {getInitial(
                  user?.name
                )}
              </Text>

            </LinearGradient>

          </Pressable>

        </View>

      </View>
    );
  };


  // ==========================================================
  // SEARCH
  // ==========================================================

  const renderSearch = () => {

    return (
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor:
              palette.surface,

            borderColor:
              palette.border,

            shadowColor:
              palette.shadow,
          },
        ]}
      >

        <Ionicons
          name="search-outline"
          size={21}
          color={palette.primary}
        />


        <TextInput
          value={searchQuery}
          onChangeText={
            setSearchQuery
          }
          placeholder="Search offers, services, businesses..."
          placeholderTextColor={
            palette.textTertiary
          }
          style={[
            styles.searchInput,
            {
              color:
                palette.text,
            },
          ]}
        />


        {searchQuery.length > 0 && (
          <Pressable
            onPress={() =>
              setSearchQuery('')
            }
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={
                palette.textTertiary
              }
            />
          </Pressable>
        )}


        <Pressable
          onPress={() =>
            setShowFiltersModal(
              true
            )
          }
          style={[
            styles.filterButton,
            {
              backgroundColor:
                palette.primarySoft,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={
              palette.primary
            }
          />
        </Pressable>

      </View>
    );
  };


  // ==========================================================
  // SECTION HEADER
  // ==========================================================

  const SectionHeader = ({
    icon,
    title,
    action,
    onAction,
  }) => {

    return (
      <View
        style={
          styles.sectionHeader
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
              name={icon}
              size={17}
              color={
                palette.primary
              }
            />

          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  palette.text,
              },
            ]}
          >
            {title}
          </Text>

        </View>


        {action && (
          <Pressable
            onPress={onAction}
          >
            <Text
              style={[
                styles.sectionAction,
                {
                  color:
                    palette.primary,
                },
              ]}
            >
              {action}
            </Text>
          </Pressable>
        )}

      </View>
    );
  };


  // ==========================================================
  // HOME CONTENT
  // ==========================================================

  const renderHome = () => {

    const nearbyList =
      offersNearby.length
        ? offersNearby
        : campaigns.slice(0, 6);


    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {renderSearch()}


        {/* =================================================
            LOCATION / NEARBY
        ================================================= */}

        <SectionHeader
          icon="location"
          title={
            buyerLocation
              ? 'Offers Near You'
              : `Popular in ${user?.city ||
              'Your City'
              }`
          }
          action="Refresh"
          onAction={
            requestBuyerLocationAndFetch
          }
        />


        {fetchingNearby ? (

          <View
            style={[
              styles.loadingBox,
              {
                backgroundColor:
                  palette.surface,
                borderColor:
                  palette.border,
              },
            ]}
          >

            <ActivityIndicator
              color={
                palette.primary
              }
            />

            <Text
              style={[
                styles.loadingText,
                {
                  color:
                    palette.textSecondary,
                },
              ]}
            >
              Finding offers near you...
            </Text>

          </View>

        ) : nearbyList.length > 0 ? (

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalCampaignList
            }
          >

            {nearbyList.map(
              campaign => (

                <CampaignCard
                  key={
                    campaign.id
                  }

                  campaign={
                    campaign
                  }

                  palette={
                    palette
                  }

                  isDarkMode={
                    isDarkMode
                  }

                  compact

                  onPress={() =>
                    handleCampaignClick(
                      campaign
                    )
                  }

                  onSave={() =>
                    toggleSaveCampaign(
                      campaign.id
                    )
                  }
                />

              )
            )}

          </ScrollView>

        ) : (

          <EmptyState
            palette={palette}
            icon="location-outline"
            title="No nearby offers"
            message="There are currently no campaigns available near your location."
          />

        )}


        {/* =================================================
            CATEGORIES
        ================================================= */}

        <SectionHeader
          icon="grid-outline"
          title="Explore Categories"
          action="See All"
          onAction={() =>
            navigation.navigate(
              'AllCategories'
            )
          }
        />


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.categoryList
          }
        >

          {SERVICES_DATA.slice(
            0,
            8
          ).map(category => {

            const count =
              campaigns.filter(
                campaign =>
                  campaign.serviceId ===
                  category.id
              ).length;


            return (
              <CategoryCard
                key={
                  category.id
                }

                item={
                  category
                }

                count={
                  count
                }

                selected={
                  selectedCategory?.id ===
                  category.id
                }

                palette={
                  palette
                }

                onPress={() => {

                  setSelectedCategory(
                    category
                  );

                }}
              />
            );

          })}

        </ScrollView>


        {/* =================================================
            ALL / FILTERED OFFERS
        ================================================= */}

        <SectionHeader
          icon="sparkles-outline"
          title={
            selectedCategory
              ? selectedCategory.title
              : searchQuery
                ? 'Search Results'
                : 'Latest Offers'
          }
          action={
            selectedCategory ||
              searchQuery
              ? 'Clear'
              : null
          }
          onAction={() => {

            setSelectedCategory(
              null
            );

            setSearchQuery('');

          }}
        />


        {loading ? (

          <View
            style={[
              styles.loadingBox,
              {
                backgroundColor:
                  palette.surface,
                borderColor:
                  palette.border,
              },
            ]}
          >

            <ActivityIndicator
              color={
                palette.primary
              }
            />

            <Text
              style={[
                styles.loadingText,
                {
                  color:
                    palette.textSecondary,
                },
              ]}
            >
              Loading offers...
            </Text>

          </View>

        ) : filteredCampaigns.length > 0 ? (

          <View
            style={
              styles.verticalCampaignList
            }
          >

            {filteredCampaigns
              .slice(0, 10)
              .map(campaign => (

                <CampaignCard
                  key={
                    campaign.id
                  }

                  campaign={
                    campaign
                  }

                  palette={
                    palette
                  }

                  isDarkMode={
                    isDarkMode
                  }

                  onPress={() =>
                    handleCampaignClick(
                      campaign
                    )
                  }

                  onSave={() =>
                    toggleSaveCampaign(
                      campaign.id
                    )
                  }
                />

              ))}

          </View>

        ) : (

          <EmptyState
            palette={palette}
            title="No offers found"
            message="Try another search term or adjust your filters."
          />

        )}


        {/* =================================================
            RECENTLY VIEWED
        ================================================= */}

        {recentlyViewed.length > 0 && (
          <>
            <SectionHeader
              icon="time-outline"
              title="Recently Viewed"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.horizontalCampaignList
              }
            >

              {recentlyViewed.map(
                campaign => (

                  <CampaignCard
                    key={
                      campaign.id
                    }

                    campaign={
                      campaign
                    }

                    palette={
                      palette
                    }

                    isDarkMode={
                      isDarkMode
                    }

                    compact

                    onPress={() =>
                      handleCampaignClick(
                        campaign
                      )
                    }

                    onSave={() =>
                      toggleSaveCampaign(
                        campaign.id
                      )
                    }
                  />

                )
              )}

            </ScrollView>
          </>
        )}


        <View
          style={
            styles.bottomSpacer
          }
        />

      </ScrollView>
    );
  };


  // ==========================================================
  // SAVED SCREEN
  // ==========================================================

  const renderSaved = () => {

    return (
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        <View
          style={styles.pageTitleBlock}
        >

          <Text
            style={[
              styles.pageTitle,
              {
                color:
                  palette.text,
              },
            ]}
          >
            Saved Offers
          </Text>

          <Text
            style={[
              styles.pageSubtitle,
              {
                color:
                  palette.textSecondary,
              },
            ]}
          >
            Your favourite deals in one place
          </Text>

        </View>


        {savedCampaigns.length > 0 ? (

          <View
            style={
              styles.verticalCampaignList
            }
          >

            {savedCampaigns.map(
              campaign => (

                <CampaignCard
                  key={
                    campaign.id
                  }

                  campaign={
                    campaign
                  }

                  palette={
                    palette
                  }

                  isDarkMode={
                    isDarkMode
                  }

                  onPress={() =>
                    handleCampaignClick(
                      campaign
                    )
                  }

                  onSave={() =>
                    toggleSaveCampaign(
                      campaign.id
                    )
                  }
                />

              )
            )}

          </View>

        ) : (

          <EmptyState
            palette={palette}
            icon="heart-outline"
            title="No saved offers yet"
            message="Tap the heart icon on any campaign to save it here."
          />

        )}

        <View
          style={
            styles.bottomSpacer
          }
        />

      </ScrollView>
    );
  };


  // ==========================================================
  // PROFILE
  // ==========================================================

  const renderProfile = () => {

    const personalizationOptions = [
      {
        icon: 'person-outline',
        title: 'Edit Personal Details',
        onPress: () =>
          navigation.navigate(
            'SellerEditProfile'
          ),
      },
      {
        icon: 'lock-closed-outline',
        title: 'Change Password',
        onPress: () =>
          navigation.navigate(
            'SellerChangePasswordScreen'
          ),
      },
    ];

    const appSettingsOptions = [
      {
        icon: 'help-buoy-outline',
        title: 'Help & Support',
        onPress: () =>
          navigation.navigate(
            'HelpSupport',
            { themeRole: 'BUYER' }
          ),
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Privacy Policy',
        onPress: () =>
          navigation.navigate(
            'PrivacyPolicy',
            { themeRole: 'BUYER' }
          ),
      },
      {
        icon: 'information-circle-outline',
        title: 'About REACHLO',
        onPress: () =>
          navigation.navigate(
            'AboutReachlo',
            { themeRole: 'BUYER' }
          ),
      },
      {
        icon: 'star-outline',
        title: 'Rate REACHLO',
        onPress: () =>
          setShowRatingModal(true),
      },
    ];


    return (
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.profileScroll
        }
      >

        {/* Profile summary */}

        <View
          style={[
            styles.profileSummary,
            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.border,

              shadowColor:
                palette.shadow,
            },
          ]}
        >

          <LinearGradient
            colors={
              isDarkMode
                ? [
                  '#17243A',
                  '#13213A',
                ]
                : [
                  '#EEF5FF',
                  '#FFFFFF',
                ]
            }
            style={
              styles.profileSummaryGradient
            }
          >

            <View
              style={[
                styles.largeAvatar,
                {
                  backgroundColor:
                    palette.primarySoft,

                  borderColor:
                    palette.primary,
                },
              ]}
            >

              <Text
                style={[
                  styles.largeAvatarText,
                  {
                    color:
                      palette.primary,
                  },
                ]}
              >
                {getInitial(
                  user?.name
                )}
              </Text>

            </View>


            <View
              style={
                styles.profileInfo
              }
            >

              <Text
                numberOfLines={1}
                style={[
                  styles.profileName,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                {user?.name ||
                  'Buyer'}
              </Text>


              <Text
                numberOfLines={1}
                style={[
                  styles.profileEmail,
                  {
                    color:
                      palette.textSecondary,
                  },
                ]}
              >
                {user?.email ||
                  'buyer@example.com'}
              </Text>


              {user?.city && (
                <View
                  style={[
                    styles.locationChip,
                    {
                      backgroundColor:
                        palette.primarySoft,
                    },
                  ]}
                >

                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={
                      palette.primary
                    }
                  />

                  <Text
                    style={[
                      styles.locationChipText,
                      {
                        color:
                          palette.primary,
                      },
                    ]}
                  >
                    {user.city}
                  </Text>

                </View>
              )}

            </View>

          </LinearGradient>

        </View>


        {/* Personalization Section */}
        <View
          style={[
            styles.profileSettingsCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              marginBottom: 16,
            },
          ]}
        >
          <Text style={[styles.profileSectionTitle, { color: palette.text }]}>
            PERSONALIZATION
          </Text>

          {personalizationOptions.map(
            option => (
              <Pressable
                key={option.title}
                onPress={option.onPress}
                style={({ pressed }) => [
                  styles.profileOption,
                  {
                    borderBottomColor: palette.border,
                    backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
                  },
                ]}
              >
                <View style={styles.profileOptionLeft}>
                  <View style={[styles.profileOptionIcon, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name={option.icon} size={20} color={palette.primary} />
                  </View>
                  <Text style={[styles.profileOptionText, { color: palette.text }]}>
                    {option.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={palette.textTertiary} />
              </Pressable>
            )
          )}
        </View>

        {/* App Settings & Support Section */}
        <View
          style={[
            styles.profileSettingsCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.profileSectionTitle, { color: palette.text }]}>
            APP SETTINGS & SUPPORT
          </Text>

          {appSettingsOptions.map(
            option => (
              <Pressable
                key={option.title}
                onPress={option.onPress}
                style={({ pressed }) => [
                  styles.profileOption,
                  {
                    borderBottomColor: palette.border,
                    backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
                  },
                ]}
              >
                <View style={styles.profileOptionLeft}>
                  <View style={[styles.profileOptionIcon, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name={option.icon} size={20} color={palette.primary} />
                  </View>
                  <Text style={[styles.profileOptionText, { color: palette.text }]}>
                    {option.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={palette.textTertiary} />
              </Pressable>
            )
          )}


          {/* Dark mode */}

          <View
            style={[
              styles.profileOption,
              {
                borderBottomWidth:
                  0,
              },
            ]}
          >

            <View
              style={
                styles.profileOptionLeft
              }
            >

              <View
                style={[
                  styles.profileOptionIcon,
                  {
                    backgroundColor:
                      palette.primarySoft,
                  },
                ]}
              >

                <Ionicons
                  name={
                    isDarkMode
                      ? 'moon'
                      : 'sunny-outline'
                  }
                  size={20}
                  color={
                    palette.primary
                  }
                />

              </View>


              <View>

                <Text
                  style={[
                    styles.profileOptionText,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Dark Mode
                </Text>

                <Text
                  style={[
                    styles.profileOptionDescription,
                    {
                      color:
                        palette.textTertiary,
                    },
                  ]}
                >
                  {isDarkMode
                    ? 'Dark appearance enabled'
                    : 'Light appearance enabled'}
                </Text>

              </View>

            </View>


            <Switch
              value={
                isDarkMode
              }
              onValueChange={
                toggleBuyerDark
              }
              trackColor={{
                false:
                  '#CBD5E1',
                true:
                  palette.primary,
              }}
              thumbColor="#FFFFFF"
            />

          </View>

        </View>


        {/* Logout */}

        <Pressable
          onPress={
            handleLogout
          }
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.danger,

              opacity:
                pressed ? 0.8 : 1,
            },
          ]}
        >

          <Ionicons
            name="log-out-outline"
            size={21}
            color={
              palette.danger
            }
          />

          <Text
            style={[
              styles.logoutText,
              {
                color:
                  palette.danger,
              },
            ]}
          >
            Log Out
          </Text>

        </Pressable>


        <View
          style={
            styles.bottomSpacer
          }
        />

      </ScrollView>
    );
  };


  // ==========================================================
  // MESSAGE NOTIFICATION
  // ==========================================================

  const renderMessageNotification =
    () => {

      if (!msgNotifVisible) {
        return null;
      }

      const senderText =
        msgNotifSenders.length === 1
          ? `${msgNotifSenders[0]} sent you a message.`
          : `${msgNotifSenders
            .slice(0, -1)
            .join(', ')} and ${msgNotifSenders[
          msgNotifSenders.length -
          1
          ]
          } sent you messages.`;


      return (
        <Animated.View
          style={[
            styles.messageNotification,
            {
              opacity:
                msgNotifAnim,

              transform: [
                {
                  translateY:
                    msgNotifAnim.interpolate({
                      inputRange: [
                        0,
                        1,
                      ],
                      outputRange: [
                        -90,
                        0,
                      ],
                    }),
                },
              ],
            },
          ]}
        >

          <LinearGradient
            colors={[
              '#2563EB',
              '#3B82F6',
            ]}
            style={
              styles.messageGradient
            }
          >

            <View
              style={
                styles.messageIcon
              }
            >

              <Ionicons
                name="chatbubbles"
                size={23}
                color="#FFFFFF"
              />

            </View>


            <View
              style={
                styles.messageTextArea
              }
            >

              <Text
                style={
                  styles.messageTitle
                }
              >
                New Messages
              </Text>

              <Text
                numberOfLines={2}
                style={
                  styles.messageBody
                }
              >
                {senderText}
              </Text>

            </View>


            <Pressable
              onPress={() => {

                dismissMessageNotification();

                navigation.navigate(
                  'BuyerInbox'
                );

              }}
              style={
                styles.messageViewButton
              }
            >

              <Text
                style={
                  styles.messageViewText
                }
              >
                View
              </Text>

            </Pressable>


            <Pressable
              onPress={
                dismissMessageNotification
              }
              style={
                styles.messageClose
              }
            >

              <Ionicons
                name="close"
                size={18}
                color="rgba(255,255,255,0.8)"
              />

            </Pressable>

          </LinearGradient>

        </Animated.View>
      );
    };


  // ==========================================================
  // FILTER MODAL
  // ==========================================================

  const renderFilterModal = () => {

    return (
      <Modal
        visible={
          showFiltersModal
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowFiltersModal(
            false
          )
        }
      >

        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                'rgba(0,0,0,0.55)',
            },
          ]}
        >

          <View
            style={[
              styles.filterModal,
              {
                backgroundColor:
                  palette.surface,

                borderColor:
                  palette.border,
              },
            ]}
          >

            <View
              style={
                styles.modalHeader
              }
            >

              <View>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Filters
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        palette.textSecondary,
                    },
                  ]}
                >
                  Refine your offers
                </Text>

              </View>


              <Pressable
                onPress={() =>
                  setShowFiltersModal(
                    false
                  )
                }
              >

                <Ionicons
                  name="close"
                  size={25}
                  color={
                    palette.textSecondary
                  }
                />

              </Pressable>

            </View>


            {/* Price */}

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              Maximum Price
            </Text>


            <View
              style={[
                styles.filterInputContainer,
                {
                  backgroundColor:
                    palette.input,

                  borderColor:
                    palette.border,
                },
              ]}
            >

              <Text
                style={[
                  styles.currencySymbol,
                  {
                    color:
                      palette.primary,
                  },
                ]}
              >
                ₹
              </Text>

              <TextInput
                value={
                  priceFilter
                }
                onChangeText={
                  setPriceFilter
                }
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor={
                  palette.textTertiary
                }
                style={[
                  styles.filterInput,
                  {
                    color:
                      palette.text,
                  },
                ]}
              />

            </View>


            {/* Rating */}

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              Minimum Rating
            </Text>


            <View
              style={[
                styles.filterInputContainer,
                {
                  backgroundColor:
                    palette.input,

                  borderColor:
                    palette.border,
                },
              ]}
            >

              <Ionicons
                name="star"
                size={18}
                color={
                  palette.warning
                }
              />

              <TextInput
                value={
                  ratingFilter
                }
                onChangeText={
                  setRatingFilter
                }
                keyboardType="decimal-pad"
                placeholder="e.g. 4.5"
                placeholderTextColor={
                  palette.textTertiary
                }
                style={[
                  styles.filterInput,
                  {
                    color:
                      palette.text,
                  },
                ]}
              />

            </View>


            {/* Buttons */}

            <View
              style={
                styles.modalButtons
              }
            >

              <Pressable
                onPress={
                  resetFilters
                }
                style={[
                  styles.resetButton,
                  {
                    backgroundColor:
                      palette.surfaceSecondary,

                    borderColor:
                      palette.border,
                  },
                ]}
              >

                <Text
                  style={[
                    styles.resetButtonText,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Reset
                </Text>

              </Pressable>


              <Pressable
                onPress={
                  applyFilters
                }
                style={[
                  styles.applyButton,
                  {
                    backgroundColor:
                      palette.primary,
                  },
                ]}
              >

                <Text
                  style={
                    styles.applyButtonText
                  }
                >
                  Apply Filters
                </Text>

              </Pressable>

            </View>

          </View>

        </View>

      </Modal>
    );
  };


  // ==========================================================
  // BOTTOM NAV
  // ==========================================================

  const renderBottomNav = () => {

    const items = [
      {
        key: 'Home',
        icon: 'home-outline',
        activeIcon: 'home',
        label: 'Home',
      },

      {
        key: 'Saved',
        icon: 'bookmark-outline',
        activeIcon: 'bookmark',
        label: 'Saved',
      },

      {
        key: 'Profile',
        icon: 'person-outline',
        activeIcon: 'person',
        label: 'Profile',
      },
    ];


    return (
      <View
        style={[
          styles.bottomNavWrapper,
          {
            backgroundColor:
              palette.background,
          },
        ]}
      >

        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor:
                palette.nav,

              borderColor:
                palette.border,

              shadowColor:
                palette.shadow,
            },
          ]}
        >

          {items.map(item => {

            const active =
              activeTab ===
              item.key;


            return (
              <Pressable
                key={
                  item.key
                }
                onPress={() =>
                  handleTabChange(
                    item.key
                  )
                }
                style={
                  styles.bottomNavItem
                }
              >

                {active ? (

                  <LinearGradient
                    colors={[
                      '#60A5FA',
                      '#2563EB',
                    ]}
                    style={
                      styles.activeNavPill
                    }
                  >

                    <Ionicons
                      name={
                        item.activeIcon
                      }
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.activeNavText
                      }
                    >
                      {item.label}
                    </Text>

                  </LinearGradient>

                ) : (

                  <View
                    style={
                      styles.inactiveNav
                    }
                  >

                    <Ionicons
                      name={
                        item.icon
                      }
                      size={22}
                      color={
                        palette.textTertiary
                      }
                    />

                    <Text
                      style={[
                        styles.inactiveNavText,
                        {
                          color:
                            palette.textTertiary,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                  </View>

                )}

              </Pressable>
            );

          })}

        </View>

      </View>
    );
  };


  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <SafeAreaView
      edges={[
        'top',
        'bottom',
      ]}
      style={[
        styles.container,
        {
          backgroundColor:
            palette.background,
        },
      ]}
    >

      {renderMessageNotification()}


      {/* HEADER */}

      {renderHeader()}


      {/* CONTENT */}

      <Animated.View
        style={[
          styles.content,
          {
            opacity:
              contentFadeAnim,
          },
        ]}
      >

        {activeTab ===
          'Home' &&
          renderHome()}

        {activeTab ===
          'Saved' &&
          renderSaved()}

        {activeTab ===
          'Profile' &&
          renderProfile()}

      </Animated.View>


      {/* FILTER */}

      {renderFilterModal()}


      {/* CAMPAIGN DETAIL */}

      <CampaignDetailScreen
        campaign={
          selectedCampaign
        }

        visible={
          selectedCampaign !==
          null
        }

        onClose={() =>
          setSelectedCampaign(
            null
          )
        }

        onToggleSave={() => {

          if (
            selectedCampaign
          ) {
            toggleSaveCampaign(
              selectedCampaign.id
            );
          }

        }}

        onCallPress={() => {

          if (
            selectedCampaign
          ) {
            handleQuickCall(
              selectedCampaign
            );
          }

        }}

        onWhatsAppPress={() => {

          if (
            selectedCampaign
          ) {
            handleQuickWhatsApp(
              selectedCampaign
            );
          }

        }}

        onEnquirePress={() => {

          if (
            selectedCampaign
          ) {
            handleQuickEnquire(
              selectedCampaign
            );
          }

        }}

        relatedCampaigns={
          selectedCampaign
            ? campaigns
              .filter(
                item =>
                  item.serviceId ===
                  selectedCampaign.serviceId &&
                  item.id !==
                  selectedCampaign.id
              )
              .slice(0, 6)
            : []
        }

        onRelatedPress={
          campaign => {

            setSelectedCampaign(
              null
            );

            setTimeout(
              () =>
                handleCampaignClick(
                  campaign
                ),
              250
            );

          }
        }

      />


      {/* BOTTOM NAV */}

      {renderBottomNav()}


      {/* RATING */}

      <RatingModal
        visible={
          showRatingModal
        }

        onClose={() =>
          setShowRatingModal(
            false
          )
        }

        userRole="buyer"
      />

    </SafeAreaView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    minHeight: 116,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 20,

    paddingTop: 8,

    paddingBottom: 15,

    borderBottomWidth: 1,
  },

  headerLeft: {
    flex: 1,

    paddingRight: 10,
  },

  greetingSmall: {
    fontSize: 13,

    fontWeight: '600',

    marginBottom: 5,
  },

  helloText: {
    fontSize: 23,

    fontWeight: '800',

    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 13,

    marginTop: 4,

    fontWeight: '500',
  },

  headerActions: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,
  },

  headerIcon: {
    width: 43,

    height: 43,

    borderRadius: 15,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    position: 'relative',
  },

  unreadBadge: {
    position: 'absolute',

    top: -5,

    right: -5,

    minWidth: 18,

    height: 18,

    borderRadius: 9,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 2,

    borderColor: '#FFFFFF',
  },

  unreadBadgeText: {
    color: '#FFFFFF',

    fontSize: 8,

    fontWeight: '900',
  },

  profileAvatar: {
    width: 45,

    height: 45,

    borderRadius: 23,

    alignItems: 'center',

    justifyContent: 'center',

    marginLeft: 3,
  },

  profileAvatarText: {
    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '900',
  },


  // ==========================================================
  // SEARCH
  // ==========================================================

  scrollContent: {
    paddingHorizontal: 18,

    paddingTop: 18,

    paddingBottom: 20,
  },

  searchContainer: {
    minHeight: 56,

    borderRadius: 18,

    borderWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.05,

    shadowRadius: 12,

    elevation: 2,

    marginBottom: 22,
  },

  searchInput: {
    flex: 1,

    fontSize: 14,

    marginLeft: 10,

    paddingVertical: 8,

    fontWeight: '500',
  },

  filterButton: {
    width: 38,

    height: 38,

    borderRadius: 12,

    alignItems: 'center',

    justifyContent: 'center',

    marginLeft: 8,
  },


  // ==========================================================
  // SECTION
  // ==========================================================

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 12,

    marginTop: 4,
  },

  sectionHeaderLeft: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  sectionIcon: {
    width: 31,

    height: 31,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 9,
  },

  sectionTitle: {
    fontSize: 18,

    fontWeight: '800',

    letterSpacing: -0.2,
  },

  sectionAction: {
    fontSize: 13,

    fontWeight: '800',
  },


  // ==========================================================
  // CATEGORY
  // ==========================================================

  categoryList: {
    gap: 10,

    paddingBottom: 24,
  },

  categoryCard: {
    width: 106,

    minHeight: 137,

    borderRadius: 18,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 8,

    paddingVertical: 11,
  },

  categoryIconContainer: {
    width: 52,

    height: 52,

    borderRadius: 16,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 9,

    overflow: 'hidden',
  },

  categoryIcon: {
    width: 36,

    height: 36,

    resizeMode: 'cover',

    borderRadius: 10,
  },

  categoryTitle: {
    fontSize: 11,

    lineHeight: 15,

    fontWeight: '800',

    textAlign: 'center',
  },

  categoryCount: {
    fontSize: 9,

    fontWeight: '600',

    marginTop: 4,
  },


  // ==========================================================
  // CAMPAIGN CARD
  // ==========================================================

  horizontalCampaignList: {
    gap: 14,

    paddingBottom: 22,
  },

  verticalCampaignList: {
    gap: 15,
  },

  campaignCard: {
    borderRadius: 22,

    borderWidth: 1,

    overflow: 'hidden',

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.07,

    shadowRadius: 16,

    elevation: 3,
  },

  campaignImageContainer: {
    height: 184,

    position: 'relative',

    overflow: 'hidden',
  },

  campaignImage: {
    width: '100%',

    height: '100%',

    resizeMode: 'cover',
  },

  imagePlaceholder: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',
  },

  imagePlaceholderText: {
    marginTop: 6,

    fontSize: 12,

    fontWeight: '700',
  },

  campaignImageTop: {
    position: 'absolute',

    top: 12,

    left: 12,

    right: 12,

    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',
  },

  activeBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 999,

    borderWidth: 1,

    paddingHorizontal: 10,

    paddingVertical: 7,
  },

  activeDot: {
    width: 7,

    height: 7,

    borderRadius: 4,

    marginRight: 6,
  },

  activeBadgeText: {
    fontSize: 10,

    fontWeight: '900',

    letterSpacing: 0.5,
  },

  saveButton: {
    width: 39,

    height: 39,

    borderRadius: 20,

    alignItems: 'center',

    justifyContent: 'center',
  },

  offerBadge: {
    position: 'absolute',

    left: 12,

    bottom: 12,

    maxWidth: '82%',

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 12,

    borderWidth: 1,

    paddingHorizontal: 10,

    paddingVertical: 7,
  },

  offerBadgeText: {
    marginLeft: 6,

    fontSize: 11,

    fontWeight: '900',
  },

  campaignContent: {
    padding: 16,
  },

  campaignTitle: {
    fontSize: 18,

    lineHeight: 23,

    fontWeight: '900',

    marginBottom: 11,

    letterSpacing: -0.3,
  },

  businessRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 10,
  },

  businessAvatar: {
    width: 34,

    height: 34,

    borderRadius: 11,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 9,
  },

  businessAvatarText: {
    fontSize: 14,

    fontWeight: '900',
  },

  businessInfo: {
    flex: 1,
  },

  businessName: {
    fontSize: 13,

    fontWeight: '800',
  },

  businessCategory: {
    fontSize: 11,

    marginTop: 2,

    fontWeight: '500',
  },

  campaignDescription: {
    fontSize: 12,

    lineHeight: 18,

    marginBottom: 11,
  },

  metadataRow: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 7,

    marginBottom: 14,
  },

  metaChip: {
    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 9,

    borderWidth: 1,

    paddingHorizontal: 8,

    paddingVertical: 6,
  },

  metaText: {
    fontSize: 10,

    fontWeight: '700',

    marginLeft: 5,
  },

  campaignFooter: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    borderTopWidth: 1,

    paddingTop: 13,
  },

  priceLabel: {
    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 0.8,

    marginBottom: 2,
  },

  priceText: {
    fontSize: 19,

    fontWeight: '900',
  },

  viewButton: {
    minHeight: 42,

    borderRadius: 13,

    paddingHorizontal: 14,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,
  },

  viewButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '900',
  },


  // ==========================================================
  // LOADING
  // ==========================================================

  loadingBox: {
    minHeight: 110,

    borderRadius: 18,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 18,
  },

  loadingText: {
    fontSize: 12,

    marginTop: 10,

    fontWeight: '600',
  },


  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyState: {
    minHeight: 190,

    borderRadius: 22,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 25,

    marginBottom: 20,
  },

  emptyIcon: {
    width: 58,

    height: 58,

    borderRadius: 20,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,

    fontWeight: '800',

    marginBottom: 5,
  },

  emptyMessage: {
    fontSize: 12,

    lineHeight: 18,

    textAlign: 'center',

    maxWidth: 280,
  },


  // ==========================================================
  // PROFILE
  // ==========================================================

  profileScroll: {
    paddingHorizontal: 18,

    paddingTop: 18,

    paddingBottom: 30,
  },

  profileSummary: {
    borderRadius: 24,

    borderWidth: 1,

    overflow: 'hidden',

    marginBottom: 18,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.06,

    shadowRadius: 15,

    elevation: 2,
  },

  profileSummaryGradient: {
    minHeight: 145,

    flexDirection: 'row',

    alignItems: 'center',

    padding: 20,
  },

  largeAvatar: {
    width: 82,

    height: 82,

    borderRadius: 41,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 2,

    marginRight: 16,
  },

  largeAvatarText: {
    fontSize: 31,

    fontWeight: '900',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 22,

    fontWeight: '900',

    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 12,

    fontWeight: '500',
  },

  locationChip: {
    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 9,

    paddingHorizontal: 8,

    paddingVertical: 5,

    marginTop: 9,
  },

  locationChipText: {
    fontSize: 10,

    fontWeight: '800',

    marginLeft: 4,
  },

  profileSettingsCard: {
    borderRadius: 22,

    borderWidth: 1,

    paddingHorizontal: 16,

    paddingTop: 19,

    marginBottom: 16,
  },

  profileSectionTitle: {
    fontSize: 12,

    fontWeight: '900',

    letterSpacing: 1,

    marginBottom: 5,
  },

  profileOption: {
    minHeight: 68,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    borderBottomWidth: 1,

    paddingVertical: 10,
  },

  profileOptionLeft: {
    flexDirection: 'row',

    alignItems: 'center',

    flex: 1,
  },

  profileOptionIcon: {
    width: 42,

    height: 42,

    borderRadius: 13,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 12,
  },

  profileOptionText: {
    fontSize: 14,

    fontWeight: '800',
  },

  profileOptionDescription: {
    fontSize: 10,

    marginTop: 3,
  },

  logoutButton: {
    height: 54,

    borderRadius: 17,

    borderWidth: 1.3,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  logoutText: {
    fontSize: 14,

    fontWeight: '900',
  },


  // ==========================================================
  // BOTTOM NAVIGATION
  // ==========================================================

  bottomNavWrapper: {
    paddingHorizontal: 18,

    paddingBottom: 8,

    paddingTop: 5,
  },

  bottomNav: {
    minHeight: 68,

    borderRadius: 25,

    borderWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-around',

    paddingHorizontal: 6,

    shadowOffset: {
      width: 0,
      height: -3,
    },

    shadowOpacity: 0.06,

    shadowRadius: 12,

    elevation: 7,
  },

  bottomNavItem: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    height: 58,
  },

  activeNavPill: {
    minWidth: 91,

    height: 45,

    borderRadius: 16,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 12,

    gap: 7,
  },

  activeNavText: {
    color: '#FFFFFF',

    fontSize: 11,

    fontWeight: '900',
  },

  inactiveNav: {
    alignItems: 'center',

    justifyContent: 'center',

    gap: 3,
  },

  inactiveNavText: {
    fontSize: 9,

    fontWeight: '700',
  },


  // ==========================================================
  // MESSAGE NOTIFICATION
  // ==========================================================

  messageNotification: {
    position: 'absolute',

    top: 8,

    left: 12,

    right: 12,

    zIndex: 100,

    borderRadius: 18,

    overflow: 'hidden',

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.22,

    shadowRadius: 16,

    elevation: 15,
  },

  messageGradient: {
    minHeight: 70,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,

    paddingVertical: 10,
  },

  messageIcon: {
    width: 42,

    height: 42,

    borderRadius: 14,

    backgroundColor:
      'rgba(255,255,255,0.18)',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 10,
  },

  messageTextArea: {
    flex: 1,

    paddingRight: 7,
  },

  messageTitle: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',

    marginBottom: 2,
  },

  messageBody: {
    color:
      'rgba(255,255,255,0.85)',

    fontSize: 10,

    lineHeight: 15,
  },

  messageViewButton: {
    backgroundColor:
      'rgba(255,255,255,0.18)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.25)',

    borderRadius: 10,

    paddingHorizontal: 10,

    paddingVertical: 7,

    marginRight: 5,
  },

  messageViewText: {
    color: '#FFFFFF',

    fontSize: 10,

    fontWeight: '900',
  },

  messageClose: {
    padding: 5,
  },


  // ==========================================================
  // FILTER MODAL
  // ==========================================================

  modalOverlay: {
    flex: 1,

    justifyContent: 'flex-end',
  },

  filterModal: {
    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    borderWidth: 1,

    padding: 22,

    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 21,

    fontWeight: '900',
  },

  modalSubtitle: {
    fontSize: 12,

    marginTop: 4,
  },

  inputLabel: {
    fontSize: 12,

    fontWeight: '800',

    marginBottom: 7,

    marginTop: 5,
  },

  filterInputContainer: {
    minHeight: 52,

    borderRadius: 14,

    borderWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 13,

    marginBottom: 15,
  },

  currencySymbol: {
    fontSize: 17,

    fontWeight: '900',

    marginRight: 8,
  },

  filterInput: {
    flex: 1,

    fontSize: 14,

    fontWeight: '600',
  },

  modalButtons: {
    flexDirection: 'row',

    gap: 10,

    marginTop: 12,
  },

  resetButton: {
    flex: 1,

    height: 50,

    borderRadius: 14,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',
  },

  resetButtonText: {
    fontSize: 13,

    fontWeight: '800',
  },

  applyButton: {
    flex: 1.5,

    height: 50,

    borderRadius: 14,

    alignItems: 'center',

    justifyContent: 'center',
  },

  applyButtonText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',
  },


  // ==========================================================
  // PAGE
  // ==========================================================

  pageTitleBlock: {
    marginBottom: 20,

    paddingTop: 5,
  },

  pageTitle: {
    fontSize: 26,

    fontWeight: '900',

    letterSpacing: -0.5,
  },

  pageSubtitle: {
    fontSize: 13,

    marginTop: 5,
  },

  bottomSpacer: {
    height: 100,
  },

});
