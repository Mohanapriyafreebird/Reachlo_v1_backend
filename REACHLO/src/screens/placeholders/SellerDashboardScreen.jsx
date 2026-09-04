import React, { useState, useRef, useEffect, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  Linking,
  PanResponder,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import chatService from '../../services/chatService';
import API_CONFIG, { resolveMediaUrl } from '../../config/apiConfig';
import * as FileSystem from 'expo-file-system/legacy';
import ImageCropModal, { smartCenterCrop } from '../../components/ImageCropModal';
import * as Location from 'expo-location';
import SellerCampaignCard from '../../components/SellerCampaignCard';
import CampaignFeedCard from '../../components/CampaignFeedCard';
import { truncateChipLabel } from '../../constants/campaignCardConstants';
import PlacesAutocompleteProxy from '../../components/PlacesAutocompleteProxy';
import PlacesAdjustMap from '../../components/PlacesAdjustMap';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapLocationPicker from '../../components/MapLocationPicker';
import RatingModal from '../../components/RatingModal';
import { useTheme } from '../../context/ThemeContext';
import SellerMessagesScreen from './SellerMessagesScreen';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBqi9sSzxZk_uOmzlwESS0HPX5gRz9vnxo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// â”€â”€ Error boundary to prevent MapView crash from killing the whole screen â”€â”€
class MiniMapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('SellerDashboard MapView error caught by boundary:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ height: 120, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="map-outline" size={24} color="#94A3B8" />
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Map unavailable</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function SafeMiniMapView({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (!valid) return null;
  return (
    <MiniMapErrorBoundary>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ height: 120, borderRadius: 12 }}
        region={{ latitude: lat, longitude: lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor="#7C3AED" />
      </MapView>
    </MiniMapErrorBoundary>
  );
}

const PREMIUM_COLORS = {
  PRIMARY: '#7C3AED',
  SECONDARY: '#8B5CF6',
  ACCENT: '#7C3AED',
  BACKGROUND: '#F8FAFC',
  CARD: '#FFFFFF',
  SUCCESS: '#22C55E',
};

const CATEGORY_MAP = {
  'IT & Technology Services': ['Website Development', 'Mobile App Development', 'UI/UX Design', 'Software Development', 'Cloud Consulting', 'Cybersecurity Services'],
  'Education & Training': ['Spoken English Classes', 'IELTS Coaching', 'UPSC Coaching', 'NEET/JEE Coaching', 'Coding Bootcamps', 'AI Courses'],
  'Health & Wellness': ['Gyms', 'Fitness Centers', 'Yoga Studios', 'Personal Trainers', 'Nutrition Consultants', 'Physiotherapy Clinics'],
  'Beauty & Personal Care': ['Salons', 'Spas', 'Skin Clinics', 'Hair Treatments', 'Bridal Makeup', 'Grooming Packages'],
  'Food & Restaurants': ['Cafes', 'Restaurants', 'Bakeries', 'Cloud Kitchens', 'Catering Services'],
  'Events & Entertainment': ['Wedding Planners', 'Event Organizers', 'Photography Services', 'DJ Services', 'Birthday Event Packages'],
  'Real Estate & Property': ['Property Sales', 'Rental Services', 'PG & Hostels', 'Commercial Spaces', 'Interior Design', 'Vastu Consultation'],
  'Transport & Delivery': ['Peer-to-Peer Parcel Delivery', 'Courier Services', 'Packers & Movers', 'Cab Services', 'Bike Taxi', 'Freight Transport'],
  'Automotive Services': ['Car Service & Repair', 'Bike Service', 'Car Wash & Detailing', 'Driving Schools', 'Vehicle Insurance', 'Spare Parts'],
  'Finance & Insurance': ['Tax Consultants', 'Insurance Agents', 'Loan Services', 'Investment Advisory', 'CA Services', 'Mutual Funds'],
  'Legal & Compliance': ['Lawyers', 'Document Services', 'Property Registration', 'Company Registration', 'GST Filing', 'Patent & Trademark'],
  'Home & Repair Services': ['Electricians', 'Plumbers', 'AC Repair', 'Painting', 'Pest Control', 'Cleaning Services'],
  'Travel & Tourism': ['Travel Agencies', 'Tour Packages', 'Visa Assistance', 'Hotel Booking', 'Pilgrimage Tours', 'Adventure Activities'],
  'Shopping & Retail': ['Clothing & Fashion', 'Electronics', 'Grocery Stores', 'Jewellery', 'Furniture', 'Gift Shops'],
  'Others': ['Other'],
};
const CATEGORIES = Object.keys(CATEGORY_MAP);

function getLeadInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'BY').toUpperCase();
}

function getRelativeLeadTime(value) {
  if (!value) return 'Just now';
  const dateStr = value.endsWith('Z') ? value : value + 'Z';
  const created = new Date(dateStr);
  if (Number.isNaN(created.getTime())) return 'Just now';
  const diffMs = Date.now() - created.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  if (hours < 48) return 'Yesterday';
  return created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function LeadNotificationCard({
  lead,
  onDismiss,
  onCall,
  onWhatsApp,
  onView,
  theme,
  isDarkMode,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const isUnread = lead.status === 'NEW' && !lead.isRead;

  const colors = {
    card: isDarkMode ? '#111C31' : '#FFFFFF',
    cardBorder: isDarkMode ? '#263653' : '#E2E8F0',
    title: isDarkMode ? '#F8FAFC' : '#0F172A',
    secondary: isDarkMode ? '#B7C3D7' : '#475569',
    muted: isDarkMode ? '#8492A8' : '#94A3B8',
    actionBg: isDarkMode ? '#17243C' : '#F8FAFC',
    actionBorder: isDarkMode ? '#30415F' : '#E2E8F0',
    purple: '#8B5CF6',
    blue: '#3B82F6',
  };

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -420,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss?.(lead.id));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dy) < 12,

      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.min(gesture.dx, 0));
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -90) {
          dismiss();
          return;
        }

        Animated.spring(translateX, {
          toValue: 0,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.notificationCardWrap,
        {
          opacity,
          transform: [
            { translateX },
            { scale },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onView}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.notificationCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: isDarkMode ? '#000000' : '#64748B',
              shadowOpacity: isDarkMode ? 0.3 : 0.08,
            },
          ]}
        >
          {/* TOP ROW */}
          <View style={styles.notificationTopRow}>

            <LinearGradient
              colors={
                isDarkMode
                  ? ['#8B5CF6', '#4F46E5']
                  : ['#56CCF2', '#2F80ED']
              }
              style={styles.buyerAvatar}
            >
              <Text style={styles.buyerAvatarText}>
                {getLeadInitials(lead.name)}
              </Text>
            </LinearGradient>

            <View style={styles.notificationInfo}>

              <View style={styles.notificationNameRow}>

                <Text
                  style={[
                    styles.notificationName,
                    { color: colors.title },
                  ]}
                  numberOfLines={1}
                >
                  {lead.name}
                </Text>

                <View
                  style={[
                    styles.newLeadBadge,
                    {
                      backgroundColor: isUnread
                        ? isDarkMode
                          ? 'rgba(34,197,94,0.16)'
                          : '#ECFDF5'
                        : isDarkMode
                          ? '#202C43'
                          : '#F1F5F9',

                      borderColor: isUnread
                        ? isDarkMode
                          ? 'rgba(34,197,94,0.35)'
                          : '#BBF7D0'
                        : isDarkMode
                          ? '#35445F'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  {isUnread ? (
                    <View style={styles.newLeadDot} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={isDarkMode ? '#94A3B8' : '#7C3AED'}
                    />
                  )}

                  <Text
                    style={[
                      styles.newLeadBadgeText,
                      {
                        color: isUnread
                          ? '#22C55E'
                          : isDarkMode
                            ? '#AAB7CB'
                            : '#64748B',
                      },
                    ]}
                  >
                    {isUnread ? 'NEW' : 'READ'}
                  </Text>
                </View>
              </View>

              {/* PHONE */}
              <View style={styles.notificationMetaRow}>
                <Ionicons
                  name="call-outline"
                  size={13}
                  color={isDarkMode ? '#A78BFA' : '#7C3AED'}
                />

                <Text
                  style={[
                    styles.notificationMetaText,
                    { color: colors.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {lead.phone}
                </Text>
              </View>

              {/* CAMPAIGN */}
              <View style={styles.notificationMetaRow}>
                <Ionicons
                  name="pricetag-outline"
                  size={13}
                  color={isDarkMode ? '#A78BFA' : '#7C3AED'}
                />

                <Text
                  style={[
                    styles.notificationMetaText,
                    { color: colors.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {lead.campaignTitle || 'Campaign offer'}
                </Text>
              </View>

            </View>

            <Text
              style={[
                styles.notificationTime,
                { color: colors.muted },
              ]}
            >
              {getRelativeLeadTime(lead.createdAt)}
            </Text>

          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.notificationActions}>

            <Pressable
              style={[
                styles.notificationActionBtn,
                {
                  backgroundColor: colors.actionBg,
                  borderColor: colors.actionBorder,
                },
              ]}
              onPress={onCall}
            >
              <Ionicons
                name="call"
                size={16}
                color={isDarkMode ? '#A78BFA' : '#7C3AED'}
              />

              <Text
                style={[
                  styles.notificationActionText,
                  {
                    color: isDarkMode ? '#DDD6FE' : '#1E3A8A',
                  },
                ]}
              >
                Call
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.notificationActionBtn,
                {
                  backgroundColor: colors.actionBg,
                  borderColor: colors.actionBorder,
                },
              ]}
              onPress={onWhatsApp}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={isDarkMode ? '#67E8F9' : '#2563EB'}
              />

              <Text
                style={[
                  styles.notificationActionText,
                  {
                    color: isDarkMode ? '#BAE6FD' : '#1E3A8A',
                  },
                ]}
              >
                Chat
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.notificationActionBtn,
                {
                  backgroundColor: colors.actionBg,
                  borderColor: colors.actionBorder,
                },
              ]}
              onPress={onView}
            >
              <Ionicons
                name="eye-outline"
                size={16}
                color={isDarkMode ? '#A78BFA' : '#7C3AED'}
              />

              <Text
                style={[
                  styles.notificationActionText,
                  {
                    color: isDarkMode ? '#DDD6FE' : '#1E3A8A',
                  },
                ]}
              >
                Details
              </Text>
            </Pressable>

          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// All major Indian cities
const ALL_INDIA_CITIES = [
  'Agra', 'Ahmedabad', 'Aizawl', 'Ajmer', 'Akola', 'Aligarh', 'Allahabad', 'Alwar', 'Amaravati', 'Amravati',
  'Amritsar', 'Anantapur', 'Asansol', 'Aurangabad', 'Bangalore', 'Bareilly', 'Belgaum', 'Bhilai', 'Bhopal',
  'Bhubaneswar', 'Bikaner', 'Chandigarh', 'Chennai', 'Coimbatore', 'Cuttack', 'Davanagere', 'Dehradun',
  'Delhi', 'Dhanbad', 'Durg', 'Erode', 'Faridabad', 'Firozabad', 'Ghaziabad', 'Gorakhpur', 'Guntur', 'Gurgaon',
  'Guwahati', 'Gwalior', 'Hubli', 'Hyderabad', 'Imphal', 'Indore', 'Itanagar', 'Jaipur', 'Jalandhar', 'Jammu',
  'Jamnagar', 'Jamshedpur', 'Jhansi', 'Jodhpur', 'Kakinada', 'Kochi', 'Kohima', 'Kolhapur', 'Kolkata', 'Kota',
  'Kozhikode', 'Ludhiana', 'Lucknow', 'Madurai', 'Mangalore', 'Meerut', 'Mumbai', 'Mysore', 'Nagpur', 'Nashik',
  'Nellore', 'Noida', 'Panaji', 'Patna', 'Pondicherry', 'Pune', 'Raipur', 'Rajkot', 'Ranchi', 'Rourkela',
  'Salem', 'Shillong', 'Shimla', 'Siliguri', 'Solapur', 'Srinagar', 'Surat', 'Thane', 'Thiruvananthapuram',
  'Tirunelveli', 'Tirupati', 'Udaipur', 'Ujjain', 'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam',
  'Warangal', 'Rajkot', 'Tiruchirapalli', 'Hubli-Dharwad', 'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Guntur'
].sort();

export const getLeadStatus = (lead) => {
  if (lead.status === 'CLOSED') return 'CLOSED';

  const thread = lead.thread;
  if (!thread || !thread.last_seller_reply_at) {
    return 'NEW';
  }

  const now = new Date().getTime();
  const buyerTime = thread.last_buyer_message_at ? new Date(thread.last_buyer_message_at).getTime() : 0;
  const sellerTime = thread.last_seller_reply_at ? new Date(thread.last_seller_reply_at).getTime() : 0;

  const latestActivity = Math.max(buyerTime, sellerTime);
  const inactiveHours = (now - latestActivity) / (1000 * 60 * 60);

  let sellerMissedResponse = false;
  if (buyerTime > sellerTime) {
    const hoursSinceBuyerMsg = (now - buyerTime) / (1000 * 60 * 60);
    if (hoursSinceBuyerMsg > 36) {
      sellerMissedResponse = true;
    }
  }

  if (inactiveHours > 24 || sellerMissedResponse) {
    return 'CONTACTED';
  }

  return 'ACTIVE';
};

const formatLeadDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
};

function CRMLeadCard({ lead, onCall, onWhatsApp, theme, isDarkMode }) {
  const initials = getLeadInitials(lead.name);
  const calculatedStatus = getLeadStatus(lead);

  const getAccentColor = (status) => {
    switch (status) {
      case 'NEW': return '#8B5CF6';
      case 'ACTIVE': return '#14B8A6'; // Teal
      case 'CONTACTED': return '#8B5CF6'; // Indigo/Violet
      case 'CLOSED': return '#94A3B8';
      default: return '#8B5CF6';
    }
  };

  const getAvatarGradient = (status) => {
    switch (status) {
      case 'NEW': return ['#8B5CF6', '#4F46E5'];
      case 'ACTIVE': return ['#34D399', '#059669']; // Green/Teal
      case 'CONTACTED': return ['#A78BFA', '#6366F1'];
      case 'CLOSED': return ['#94A3B8', '#64748B'];
      default: return ['#8B5CF6', '#4F46E5'];
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6' };
      case 'ACTIVE': return { bg: 'rgba(20, 184, 166, 0.12)', text: '#14B8A6' };
      case 'CONTACTED': return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6' };
      case 'CLOSED': return { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748B' };
      default: return { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748B' };
    }
  };

  const accentColor = getAccentColor(calculatedStatus);
  const avatarColors = getAvatarGradient(calculatedStatus);
  const badgeColors = getStatusBadge(calculatedStatus);

  return (
    <View style={[styles.crmCard, { borderLeftColor: accentColor, backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
      <View style={styles.crmCardHeader}>
        <View style={styles.crmCardLeft}>
          <LinearGradient colors={avatarColors} style={styles.crmAvatar}>
            <Text style={styles.crmAvatarText}>{initials}</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.crmBuyerName, { color: theme.text }]}>{lead.name}</Text>
            <View style={styles.crmPhoneRow}>
              <Ionicons name="call-outline" size={12} color={theme.textTertiary} />
              <Text style={[styles.crmBuyerPhone, { color: theme.textSecondary }]}>{lead.phone}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.crmBadge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[styles.crmBadgeText, { color: badgeColors.text }]}>{calculatedStatus}</Text>
        </View>
      </View>

      <View style={[styles.crmCardDivider, { backgroundColor: theme.border }]} />

      <View style={styles.crmCardFooter}>
        <View style={[styles.crmDateRow, { flexDirection: 'row', alignItems: 'center' }]}>
          <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} style={{ marginRight: 4 }} />
          <Text style={[styles.crmDate, { color: theme.textSecondary }]}>{formatLeadDate(lead.createdAt)}</Text>
        </View>
        <View style={styles.crmActions}>
          <Pressable style={[styles.crmActionBtn, { borderColor: accentColor + '60' }]} onPress={onCall}>
            <Ionicons name="call-outline" size={14} color={accentColor} />
            <Text style={[styles.crmActionText, { color: accentColor }]}>Call</Text>
          </Pressable>
          <Pressable style={[styles.crmActionBtn, { borderColor: accentColor + '60' }]} onPress={onWhatsApp}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={accentColor} />
            <Text style={[styles.crmActionText, { color: accentColor }]}>Chat</Text>
          </Pressable>
        </View>
      </View>
    </View>

  );
}

function CRMLeadsModal({ visible, onClose, campaign, dismissedLeadIds, onCall, onWhatsApp, markAllRead, theme, isDarkMode }) {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  if (!campaign) return null;

  const leads = campaign.leads || [];
  const filters = ['All', 'New', 'Active', 'Contacted', 'Closed'];

  const filteredLeads = leads.filter(lead => {
    if (dismissedLeadIds && dismissedLeadIds.includes(lead.id)) return false;

    // Status Filter
    const calcStatus = getLeadStatus(lead);
    if (filter !== 'All') {
      if (filter === 'New' && calcStatus !== 'NEW') return false;
      if (filter === 'Active' && calcStatus !== 'ACTIVE') return false;
      if (filter === 'Contacted' && calcStatus !== 'CONTACTED') return false;
      if (filter === 'Closed' && calcStatus !== 'CLOSED') return false;
    }

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const n = (lead.name || '').toLowerCase();
      const p = (lead.phone || '').toLowerCase();
      const c = (lead.campaignTitle || campaign.title || '').toLowerCase();
      if (!n.includes(q) && !p.includes(q) && !c.includes(q)) return false;
    }

    return true;

  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={isDarkMode ? [theme.background, theme.surface, theme.background] : ['#FFFFFF', '#F1F5F9', '#E2E8F0']} style={styles.crmContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.crmHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Pressable onPress={onClose} style={styles.crmBackBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
            {isSearchActive ? (
              <View style={[styles.crmHeaderTitles, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: theme.text, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: theme.cardBackground, borderRadius: 8, marginRight: 8, borderColor: theme.border, borderWidth: 1 }}
                  placeholder="Search leads..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <Pressable onPress={() => { setIsSearchActive(false); setSearchQuery(''); }} hitSlop={12}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.crmHeaderTitles}>
                  <Text style={[styles.crmHeaderTitle, { color: theme.text }]}>View Leads</Text>
                  <Text style={[styles.crmHeaderSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{campaign.title}</Text>
                </View>
                <Pressable style={styles.crmSearchBtn} hitSlop={12} onPress={() => setIsSearchActive(true)}>
                  <Ionicons name="search" size={22} color={theme.text} />
                </Pressable>
              </>
            )}
          </View>

          {/* Filter Chips */}
          <View style={[styles.crmFilterWrapper, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crmFilterContainer}>
              {filters.map(f => (
                <Pressable
                  key={f}
                  style={[styles.crmFilterChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }, filter === f && styles.crmFilterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.crmFilterText, { color: theme.textSecondary }, filter === f && styles.crmFilterTextActive]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* List */}
          <FlatList
            data={filteredLeads}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.crmListContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: lead }) => (
              <CRMLeadCard
                lead={{ ...lead, campaignTitle: lead.campaignTitle || campaign.title }}
                onCall={() => onCall(lead)}
                onWhatsApp={() => onWhatsApp({ ...lead, campaignTitle: lead.campaignTitle || campaign.title })}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            )}
            ListEmptyComponent={
              <View style={styles.crmEmpty}>
                <Ionicons name="inbox-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.crmEmptyText, { color: theme.textSecondary }]}>No {filter !== 'All' ? filter : ''} leads are currently matching this view.</Text>
              </View>
            }
          />

          {leads.length > 0 && (
            <View style={styles.crmFloatingFooter}>
              <BlurView intensity={40} tint="light" style={styles.crmMarkReadBtn}>
                <Pressable onPress={() => markAllRead(leads)} style={styles.crmMarkReadPressable}>
                  <Ionicons name="checkmark" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                  <Text style={styles.crmMarkReadText}>Mark all as Read</Text>
                </Pressable>
              </BlurView>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </Modal>

  );
}

export default function SellerDashboardScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useAuth();

  // Navigation State: 'Home' | 'Campaigns' | 'Profile'
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('Home');

  // Animation values
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Campaigns State
  const [campaigns, setCampaigns] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Premium Create Campaign Modal Flow State
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null); // null = Create, otherwise edit
  const [step, setStep] = useState(1);
  const [campTitle, setCampTitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campOfferLine, setCampOfferLine] = useState('');
  const [campImageEmoji, setCampImageEmoji] = useState('🎁');
  const [campCategory, setCampCategory] = useState(CATEGORIES[0]);
  const [campSubCategory, setCampSubCategory] = useState(CATEGORY_MAP[CATEGORIES[0]][0]);
  const [selectedCities, setSelectedCities] = useState([user?.city || 'Chennai']);
  const [citySearchText, setCitySearchText] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const cityInputRef = useRef(null);
  const ALL_INDIA_TAG = 'All over India';

  const handleCitySearchChange = (text) => {
    setCitySearchText(text);
    if (text.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    const lower = text.toLowerCase();
    const matches = ALL_INDIA_CITIES.filter(
      (c) =>
        c.toLowerCase().startsWith(lower) &&
        !selectedCities.includes(c) &&
        !selectedCities.includes(ALL_INDIA_TAG)
    ).slice(0, 6);
    setCitySuggestions(matches);
  };

  const addCity = (city) => {
    if (city === ALL_INDIA_TAG) {
      setSelectedCities([ALL_INDIA_TAG]);
    } else if (!selectedCities.includes(city) && !selectedCities.includes(ALL_INDIA_TAG)) {
      setSelectedCities((prev) => [...prev, city]);
    }
    setCitySearchText('');
    setCitySuggestions([]);
  };

  const removeCity = (city) => {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
  };

  const handleLocationSearchChange = async (text) => {
    setLocationSearch(text);
    if (text.length < 3) { setLocationSuggestions([]); return; }
    if (!locationSessionToken.current) {
      locationSessionToken.current = Math.random().toString(36).substring(2);
    }
    setLocationSearchLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${locationSessionToken.current}&components=country:in&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn('Location autocomplete API error:', data.status, data.error_message);
      }
      setLocationSuggestions(data.predictions || []);
    } catch (e) {
      console.warn('Location autocomplete error:', e);
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const handleSelectLocationSuggestion = async (prediction) => {
    setLocationSuggestions([]);
    const placeId = prediction.place_id;
    const token = locationSessionToken.current;
    locationSessionToken.current = null;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status && data.status !== 'OK') {
        console.warn('Location details API error:', data.status, data.error_message);
      }
      const result = data.result;
      if (result?.geometry) {
        const latitude = result.geometry.location.lat;
        const longitude = result.geometry.location.lng;
        const address = result.formatted_address || prediction.description;
        setLocationAddress(address);
        setLocationLat(latitude);
        setLocationLon(longitude);
        setLocationPlaceId(null);
        setLocationSelected(true);
        setLocationSearch('');
      }
    } catch (e) {
      console.warn('Location details error:', e);
    }
  };

  const toggleAllIndia = () => {
    if (selectedCities.includes(ALL_INDIA_TAG)) {
      setSelectedCities([]);
    } else {
      setSelectedCities([ALL_INDIA_TAG]);
    }
  };

  // Date picker state
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Price (single value entered by seller)
  const [campPrice, setCampPrice] = useState('');
  const [campImageMeta, setCampImageMeta] = useState(null);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [pendingCropUri, setPendingCropUri] = useState(null);

  const [campStartDate, setCampStartDate] = useState('');
  const [campEndDate, setCampEndDate] = useState('');
  const [campImages, setCampImages] = useState([]);
  const MAX_CAMPAIGN_IMAGES = 5;
  const [imageReview, setImageReview] = useState(null);
  const [isSmartCropping, setIsSmartCropping] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessVerified, setBusinessVerified] = useState(false);
  // Location fields for campaign (optional)
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState(null);
  const [locationLon, setLocationLon] = useState(null);
  const [locationPlaceId, setLocationPlaceId] = useState(null);
  const [locationSelected, setLocationSelected] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const locationSessionToken = useRef(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [autocompleteModalVisible, setAutocompleteModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);

  // Animation Refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideModalAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  // Loading States
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Leads modal state
  const [leadsModalVisible, setLeadsModalVisible] = useState(false);
  const [selectedCampaignForLeads, setSelectedCampaignForLeads] = useState(null);

  // Upgrade plans modal state
  const [plansModalVisible, setPlansModalVisible] = useState(false);

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Notifications state
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [dismissedLeadIds, setDismissedLeadIds] = useState([]);

  // Live campaigns sort state
  const [liveSortBy, setLiveSortBy] = useState('views');

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const fetchedCampaigns = await apiService.get('/campaigns?seller_mode=true');
      const fetchedLeads = await apiService.get('/leads');
      const threads = await chatService.getThreads();

      const mappedCampaigns = fetchedCampaigns
        .filter(camp => camp.image_url)
        .map(camp => ({
          ...camp,
          offerLine: camp.offer,
          startDate: camp.start_date ? camp.start_date.split('T')[0] : '',
          endDate: camp.end_date ? camp.end_date.split('T')[0] : '',
          price: camp.price ?? 0,
          imageUrl: resolveMediaUrl(camp.image_url),
          image_urls: camp.image_urls || (camp.image_url ? [camp.image_url] : []),
          views: camp.view_count,
          leadsCount: camp.lead_count,
          locationAddress: camp.location_address || camp.locationAddress || '',
          latitude: camp.latitude ?? null,
          longitude: camp.longitude ?? null,
          google_place_id: camp.google_place_id || camp.googlePlaceId || null,
          leads: fetchedLeads.filter(l => l.campaign_id === camp.id).map(l => {
            const thread = threads.find(t => t.lead_id === l.id);
            return {
              id: l.id,
              name: l.name,
              phone: l.phone,
              status: l.label,
              message: l.message,
              isRead: l.is_read,
              createdAt: l.created_at,
              campaignTitle: l.campaign_title || camp.title,
              thread: thread || null,
            };
          }),
          businessName: camp.business_name || user?.name || 'Your Business',
          businessVerified: camp.business_verified ?? user?.verified ?? false,
        }));
      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Fallback to dummy data for now
      const mockCampaign = {
        id: 'mock-1',
        title: 'Push Your Limits (Mock)',
        image_url: 'https://via.placeholder.com/600x400/9333EA/FFFFFF?text=Push+Your+Limits',
        image_urls: ['https://via.placeholder.com/600x400/9333EA/FFFFFF?text=Push+Your+Limits'],
        imageUrl: 'https://via.placeholder.com/600x400/9333EA/FFFFFF?text=Push+Your+Limits',
        offerLine: 'Join today and get 50% OFF on your first month',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 864000000).toISOString(),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 864000000).toISOString().split('T')[0],
        price: 2000,
        view_count: 15,
        views: 15,
        lead_count: 4,
        leadsCount: 4,
        businessName: 'EASY FIT Unisex Fitness Centre',
        business_verified: true,
        businessVerified: true,
        leads: [
          { id: 'l1', name: 'Hasini', phone: '7893750665', status: 'NEW', createdAt: new Date().toISOString() },
          { id: 'l2', name: 'Samantha', phone: '9846746191', status: 'NEW', createdAt: new Date(Date.now() - 864000000).toISOString() },
          { id: 'l3', name: 'Mayon', phone: '9597733035', status: 'CONTACTED', createdAt: new Date(Date.now() - 1728000000).toISOString() },
          { id: 'l4', name: 'Swetha', phone: '6363452739', status: 'NEW', createdAt: new Date(Date.now() - 2592000000).toISOString() },
        ]
      };
      setCampaigns([mockCampaign]);
    } finally {
      setLoadingData(false);
    }

  };

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // â”€â”€ New Message Notification (10-second popup on login) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sellerMsgNotifVisible, setSellerMsgNotifVisible] = useState(false);
  const [sellerMsgNotifCount, setSellerMsgNotifCount] = useState(0);
  const sellerMsgNotifAnim = useRef(new Animated.Value(0)).current;
  const sellerMsgNotifTimer = useRef(null);

  const showSellerMsgNotif = (count) => {
    setSellerMsgNotifCount(count);
    setSellerMsgNotifVisible(true);
    Animated.spring(sellerMsgNotifAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    sellerMsgNotifTimer.current = setTimeout(() => dismissSellerMsgNotif(), 10000);
  };

  const dismissSellerMsgNotif = () => {
    if (sellerMsgNotifTimer.current) clearTimeout(sellerMsgNotifTimer.current);
    Animated.timing(sellerMsgNotifAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setSellerMsgNotifVisible(false);
    });
  };

  useEffect(() => {
    if (!user?.email) return;
    const checkSellerMessages = async () => {
      try {
        const threads = await chatService.getThreads();
        const unreadThreads = (threads || []).filter(t => (t.seller_unread_count || 0) > 0);
        if (unreadThreads.length === 0) return;
        const totalUnread = unreadThreads.reduce((sum, t) => sum + (t.seller_unread_count || 0), 0);
        showSellerMsgNotif(totalUnread);
      } catch (e) {
        console.warn('[SellerMsgNotif] Failed to check unread threads:', e);
      }
    };
    const delayTimer = setTimeout(checkSellerMessages, 2000);
    return () => {
      clearTimeout(delayTimer);
      if (sellerMsgNotifTimer.current) clearTimeout(sellerMsgNotifTimer.current);
    };
  }, [user?.email]);
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const business = await apiService.get('/businesses/me');
        if (business?.name) setBusinessName(business.name);
        if (business?.verified) setBusinessVerified(business.verified);
      } catch {
        // Business profile may not exist yet
      }
    };
    loadBusiness();
  }, []);

  // Derived states for campaigns and leads
  const todayDate = new Date().toISOString().split('T')[0];
  const liveCampaigns = campaigns.filter(c => (!c.endDate || c.endDate >= todayDate) && c.status !== 'DELETED');
  const pastCampaigns = campaigns.filter(c => (c.endDate && c.endDate < todayDate) || c.status === 'DELETED');

  const totalViews = liveCampaigns.reduce((sum, camp) => sum + (camp.views || 0), 0);
  const totalLeads = liveCampaigns.reduce((sum, camp) => sum + (camp.leadsCount || 0), 0);
  const activeCount = liveCampaigns.length;

  const sortedLiveCampaigns = [...liveCampaigns].sort((a, b) => {
    if (liveSortBy === 'views') return (b.views || 0) - (a.views || 0);
    const aLeads = a.leads?.length ?? a.leadsCount ?? 0;
    const bLeads = b.leads?.length ?? b.leadsCount ?? 0;
    return bLeads - aLeads;
  });

  const allNewLeads = campaigns
    .flatMap(c => c.leads.map(l => ({ ...l, campaignTitle: l.campaignTitle || c.title })))
    .filter(l => l.status === 'NEW' && !l.isRead && !dismissedLeadIds.includes(l.id));
  const newLeadsTodayCount = allNewLeads.filter((lead) => {
    if (!lead.createdAt) return true;
    return new Date(lead.createdAt).toDateString() === new Date().toDateString();
  }).length;

  const dismissLeadNotification = (leadId) => {
    setDismissedLeadIds(prev => (prev.includes(leadId) ? prev : [...prev, leadId]));
  };

  const callLead = (lead) => {
    if (lead?.phone) Linking.openURL(`tel:${lead.phone}`);
  };

  const chatLead = async (lead) => {
    try {
      // Get or create thread
      const threads = await chatService.getThreads();
      let thread = threads.find(t => t.lead_id === lead.id);
      if (!thread) {
        // Should not happen for seller usually, but just in case
        thread = await chatService.createThread(lead.id);
      }
      const campaign = campaigns.find(c => c.id === lead.campaign_id) || { title: lead.campaignTitle };
      navigation.navigate('ChatScreen', {
        threadId: thread.id,
        campaign: campaign,
        // Pass buyer info so ChatScreen header shows actual buyer name (not fallback "Buyer")
        buyer: { name: lead.name, phone: lead.phone },
      });
    } catch (e) {
      console.log('Failed to open chat', e);
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const viewLeadDetails = (lead) => {
    Alert.alert(
      lead.name || 'Lead',
      `Phone: ${lead.phone}\nCampaign: ${lead.campaignTitle || 'Campaign offer'}${lead.message ? `\n\n${lead.message}` : ''}`
    );
  };

  const markLeadListAsRead = async (leads = []) => {
    const unreadLeads = leads.filter(lead => !lead.isRead || (lead.thread && lead.thread.seller_unread_count > 0));
    if (unreadLeads.length === 0) return;

    // Optimistic local update
    setCampaigns(prev => prev.map(camp => ({
      ...camp,
      leads: camp.leads.map(lead => (
        unreadLeads.some(item => item.id === lead.id)
          ? { ...lead, isRead: true, thread: lead.thread ? { ...lead.thread, seller_unread_count: 0 } : null }
          : lead
      )),
    })));

    try {
      await Promise.all(unreadLeads.map(async lead => {
        const p1 = lead.isRead ? Promise.resolve() : apiService.put(`/leads/${lead.id}`, { is_read: true });
        const p2 = (lead.thread && lead.thread.seller_unread_count > 0) ? apiService.post(`/chat/threads/${lead.thread.id}/read`) : Promise.resolve();
        return Promise.all([p1, p2]);
      }));
      await loadDashboardData(); // Refresh UI to ensure perfectly in sync
    } catch (error) {
      console.error('Failed to mark leads as read:', error);
    }

  };

  // Profile Form State
  const [profName, setProfName] = useState(user?.name || '');
  const [profCity, setProfCity] = useState(user?.city || '');
  const [profPhone, setProfPhone] = useState(user?.phone || '');

  useEffect(() => {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Animate Modal Up/Down
  useEffect(() => {
    if (campaignModalVisible) {
      Animated.spring(slideModalAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideModalAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [campaignModalVisible]);

  // Animate Progress Bar when step changes
  useEffect(() => {
    const progress = step === 1 ? 0 : step === 2 ? 0.5 : 1;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const isTabChanging = useRef(false);
  const handleTabChange = (tab) => {
    if (activeTab === tab) return;
    if (isTabChanging.current) return;
    isTabChanging.current = true;
    contentFadeAnim.setValue(0);
    setActiveTab(tab);
    setTimeout(() => {
      isTabChanging.current = false;
    }, 300);
  };

  const getFirstLetter = (name) => {
    if (!name) return 'B';
    return name.trim().charAt(0).toUpperCase();
  };

  // Campaign functions
  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setStep(1);
    setCampTitle('');
    setCampDesc('');
    setCampOfferLine('');
    setCampImageEmoji('🎁');
    setCampCategory(CATEGORIES[0]);
    setCampSubCategory(CATEGORY_MAP[CATEGORIES[0]][0]);
    setSelectedCities([user?.city || 'Chennai']);
    setCitySearchText('');
    setCitySuggestions([]);
    setCampPrice('');
    setCampImageMeta(null);
    setCropModalVisible(false);
    setPendingCropUri(null);
    setCampStartDate('');
    setCampEndDate('');
    setCampImages([]);
    setImageReview(null);
    setEditingImageIndex(null);
    setLocationAddress('');
    setLocationLat(null);
    setLocationLon(null);
    setLocationPlaceId(null);
    setLocationSelected(false);
    setLocationPickerVisible(false);
    setAutocompleteModalVisible(false);
    setAdjustModalVisible(false);
    setShowSuccess(false);
    successScaleAnim.setValue(0);
    setCampaignModalVisible(true);
  };

  const openEditCampaign = (camp) => {
    setEditingCampaign(camp);
    setStep(1);
    setCampTitle(camp.title);
    setCampDesc(camp.description);
    setCampOfferLine(camp.offerLine || '');

    const cat = camp.category || '';
    if (cat.includes('::')) {
      const parts = cat.split('::');
      setCampCategory(parts[0]);
      setCampSubCategory(parts[1] || CATEGORY_MAP[parts[0]]?.[0] || '');
    } else {
      setCampCategory(cat || CATEGORIES[0]);
      setCampSubCategory(CATEGORY_MAP[cat || CATEGORIES[0]]?.[0] || '');
    }

    let cities = [];
    if (camp.target_cities) {
      try {
        cities = typeof camp.target_cities === 'string' ? JSON.parse(camp.target_cities) : camp.target_cities;
      } catch (e) {
        cities = [camp.city || 'Chennai'];
      }
    } else {
      cities = [camp.city || 'Chennai'];
    }
    setSelectedCities(cities);
    setCitySearchText('');
    setCitySuggestions([]);
    setCampStartDate(camp.startDate || '');
    setCampEndDate(camp.endDate || '');
    setCampPrice(camp.price != null && camp.price > 0 ? String(camp.price) : '');
    setCampImageMeta(null);
    setCropModalVisible(false);
    setPendingCropUri(null);
    const existingUrls = camp.image_urls?.length
      ? camp.image_urls
      : camp.image_url
        ? [camp.image_url]
        : [];
    setCampImages(existingUrls.map((url) => ({
      uri: resolveMediaUrl(url) || url,
      serverUrl: url,
      isLocal: false,
    })));
    const existingLocationAddress = camp.locationAddress || camp.location_address || '';
    const existingLatitude = camp.latitude ?? camp.location_latitude ?? null;
    const existingLongitude = camp.longitude ?? camp.location_longitude ?? null;

    setLocationAddress(existingLocationAddress);
    setLocationLat(existingLatitude);
    setLocationLon(existingLongitude);
    setLocationPlaceId(camp.google_place_id || null);
    setLocationSelected(Boolean(existingLocationAddress || existingLatitude || existingLongitude));
    setLocationPickerVisible(false);
    setAutocompleteModalVisible(false);
    setAdjustModalVisible(false);
    setImageReview(null);
    setEditingImageIndex(null);
    setShowSuccess(false);
    successScaleAnim.setValue(0);
    setCampaignModalVisible(true);

  };

  const validateStep1 = () => {
    if (!campTitle.trim() || !campDesc.trim() || !campOfferLine.trim()) {
      Alert.alert('Details Required', 'Please fill in Title, Description, and Offer Line');
      return false;
    }
    if (campImages.length === 0) {
      Alert.alert('Image Required', 'Please add at least one campaign image');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!campCategory.trim() || !campSubCategory.trim() || selectedCities.length === 0) {
      Alert.alert('Audience Required', 'Please select category, subcategory, and target city');
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const goToPrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCameraCapture = async (mediaType) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: [mediaType],
        allowsEditing: false,
        quality: 1,
      });
      await processMediaResult(result, mediaType);
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 1,
      });
      await processMediaResult(result, result.assets?.[0]?.type === 'video' ? 'videos' : 'images');
    } catch (err) {
      console.warn('ImagePicker error:', err);
    }
  };

  const processMediaResult = async (result, mediaType) => {
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setIsSmartCropping(true);
      try {
        if (mediaType === 'videos' || asset.type === 'video') {
          setImageReview({
            uri: asset.uri,
            meta: { fileName: asset.fileName || 'video.mp4', mimeType: asset.mimeType || 'video/mp4' },
            sourceUri: asset.uri,
            isVideo: true
          });
        } else {
          const cropped = await smartCenterCrop(asset.uri);
          setImageReview({
            uri: cropped.uri,
            meta: {
              fileName: cropped.fileName,
              mimeType: cropped.mimeType,
            },
            sourceUri: asset.uri,
          });
        }
      } catch (err) {
        console.warn('Media processing failed:', err);
        // Fallback for image
        if (mediaType !== 'videos' && asset.type !== 'video') {
          setImageReview({
            uri: asset.uri,
            meta: { fileName: asset.fileName || 'image.jpg', mimeType: asset.mimeType || 'image/jpeg' },
            sourceUri: asset.uri,
          });
        } else {
          Alert.alert('Error', 'Could not process media. Please try again.');
        }
      } finally {
        setIsSmartCropping(false);
      }
    }
  };

  const pickImage = () => {
    if (campImages.length >= MAX_CAMPAIGN_IMAGES) {
      Alert.alert('Media Limit', `You can upload up to ${MAX_CAMPAIGN_IMAGES} media files per campaign.`);
      return;
    }

    Alert.alert(
      'Upload Media',
      'Choose the source of your media',
      [
        { text: 'Take Photo', onPress: () => handleCameraCapture('images') },
        { text: 'Take Video', onPress: () => handleCameraCapture('videos') },
        { text: 'Choose from Gallery', onPress: handleGalleryPick },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );

  };

  const confirmImageReview = () => {
    if (!imageReview) return;
    const nextImage = {
      uri: imageReview.uri,
      meta: imageReview.meta,
      isLocal: true,
    };
    setCampImages((prev) => [...prev, nextImage].slice(0, MAX_CAMPAIGN_IMAGES));
    setCampImageMeta(nextImage.meta);
    setImageReview(null);
  };

  const adjustImageReview = () => {
    if (!imageReview) return;
    setPendingCropUri(imageReview.sourceUri || imageReview.uri);
    setEditingImageIndex(null);
    setCropModalVisible(true);
  };

  const editCampImage = (index) => {
    const img = campImages[index];
    setPendingCropUri(img.uri);
    setEditingImageIndex(index);
    setCropModalVisible(true);
  };

  const handleCropConfirm = (cropped) => {
    const nextImage = {
      uri: cropped.uri,
      meta: {
        fileName: cropped.fileName,
        mimeType: cropped.mimeType,
      },
      isLocal: true,
    };

    if (editingImageIndex !== null) {
      setCampImages((prev) =>
        prev.map((img, i) => (i === editingImageIndex ? nextImage : img))
      );
    } else if (imageReview) {
      setImageReview({
        ...imageReview,
        uri: cropped.uri,
        meta: nextImage.meta,
      });
    } else {
      setCampImages((prev) => [...prev, nextImage].slice(0, MAX_CAMPAIGN_IMAGES));
    }

    setCampImageMeta(nextImage.meta);
    setCropModalVisible(false);
    setPendingCropUri(null);
    setEditingImageIndex(null);

  };

  const removeCampImage = (index) => {
    setCampImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCropCancel = () => {
    setCropModalVisible(false);
    setPendingCropUri(null);
    setEditingImageIndex(null);
  };

  const handlePublish = async () => {
    if (
      !campTitle.trim() ||
      !campDesc.trim() ||
      !campOfferLine.trim() ||
      !campCategory.trim() ||
      selectedCities.length === 0 ||
      !campStartDate.trim() ||
      !campEndDate.trim() ||
      campImages.length === 0
    ) {
      Alert.alert('Required Fields', 'Please fill in all campaign fields and add at least one image before publishing.');
      return;
    }

    setIsPublishing(true);
    try {
      const uploadedUrls = [];
      for (const img of campImages) {
        if (!img.isLocal) {
          uploadedUrls.push(img.serverUrl || img.uri);
          continue;
        }
        const fileName = img.meta?.fileName || `campaign_${Date.now()}.jpg`;
        const mimeType = img.meta?.mimeType || 'image/jpeg';

        try {
          const uploadUrl = `${API_CONFIG.BASE_URL}/upload/image`;
          const headers = await apiService.getHeaders();

          const uploadRes = await FileSystem.uploadAsync(uploadUrl, img.uri, {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: 1, // FileSystemUploadType.MULTIPART
            mimeType: mimeType,
            headers: headers,
          });

          if (uploadRes.status >= 200 && uploadRes.status < 300) {
            const data = JSON.parse(uploadRes.body);
            uploadedUrls.push(data.url);
          } else {
            throw new Error(`Upload failed with status ${uploadRes.status}: ${uploadRes.body}`);
          }
        } catch (e) {
          console.error("FileSystem.uploadAsync error:", e);
          throw new Error("Failed to upload image. Please try again.");
        }
      }

      const payload = {
        title: campTitle.trim(),
        description: campDesc.trim(),
        offer: campOfferLine.trim(),
        category: `${campCategory}::${campSubCategory}`,
        target_cities: selectedCities.length > 0 ? JSON.stringify(selectedCities) : null,
        image_url: uploadedUrls[0] || undefined,
        image_urls: uploadedUrls.length ? uploadedUrls : undefined,
        price: campPrice.trim() ? parseFloat(campPrice) : undefined,
        start_date: new Date(campStartDate).toISOString(),
        end_date: new Date(campEndDate).toISOString(),
        // optional location fields
        location_address: locationAddress || undefined,
        latitude: locationLat || undefined,
        longitude: locationLon || undefined,
        google_place_id: locationPlaceId || undefined,
      };

      if (editingCampaign) {
        await apiService.put(`/campaigns/${editingCampaign.id}`, payload);
      } else {
        await apiService.post('/campaigns', payload);
      }

      setIsPublishing(false);
      setShowSuccess(true);

      // Animate success checkmark
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setCampaignModalVisible(false);
        loadDashboardData();
      }, 1500);

    } catch (error) {
      setIsPublishing(false);
      Alert.alert("Error", error.message || "Failed to publish campaign");
    }

  };

  const handleDeleteCampaign = (id) => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to end and delete this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/campaigns/${id}`);
              setCampaignModalVisible(false);
              Alert.alert('Deleted', 'Campaign moved to past campaigns.');
              loadDashboardData();
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete campaign");
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = () => {
    if (!profName.trim() || !profCity.trim() || !profPhone.trim()) {
      Alert.alert('Error', 'Please fill in all profile fields');
      return;
    }
    if (updateUserProfile) {
      updateUserProfile({
        name: profName.trim(),
        city: profCity.trim(),
        phone: profPhone.trim(),
      });
    }
    Alert.alert('Success', 'Profile updated successfully!');
  };

  // Leads helper
  const openLeadsView = (camp) => {
    setSelectedCampaignForLeads(camp);
    setLeadsModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'HOT': return '#EF4444';
      case 'WARM': return '#F59E0B';
      case 'NEW': return '#8B5CF6';
      case 'COLD': return '#6B7280';
      default: return COLORS.TEXT_SECONDARY;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['50%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* â”€â”€ New Message Notification Popup (Seller) â”€â”€ */}
      {sellerMsgNotifVisible && (
        <Animated.View
          style={[
            styles.sellerMsgNotifContainer,
            {
              opacity: sellerMsgNotifAnim,
              transform: [{ translateY: sellerMsgNotifAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
            },
          ]}
        >
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.sellerMsgNotifGradient}>
            <View style={styles.sellerMsgNotifLeft}>
              <Ionicons name="chatbubbles" size={22} color="#fff" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerMsgNotifTitle}>💬 New Messages from Buyers!</Text>
                <Text style={styles.sellerMsgNotifBody}>
                  You have {sellerMsgNotifCount} unread {sellerMsgNotifCount === 1 ? 'message' : 'messages'} from your buyers.
                </Text>
              </View>
            </View>
            <View style={styles.sellerMsgNotifRight}>
              <Pressable
                style={styles.sellerMsgNotifViewBtn}
                onPress={() => { dismissSellerMsgNotif(); navigation.navigate('SellerMessages'); }}
              >
                <Text style={styles.sellerMsgNotifViewText}>View</Text>
              </Pressable>
              <Pressable onPress={dismissSellerMsgNotif} style={{ padding: 4 }}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* SECTION 1: HEADER */}

      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
        <Text style={[styles.logoText, { color: theme.sellerPrimary }]}>Reachlo</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.bellContainer, { marginRight: 8 }]}
            onPress={() => navigation.navigate('SellerMessages')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={theme.text} />
          </Pressable>
          <Pressable
            style={styles.bellContainer}
            onPress={() => setNotificationsModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {allNewLeads.length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{allNewLeads.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => handleTabChange('Profile')}
            style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#9333EA' }]}
          >
            <Text style={[styles.avatarText, { color: theme.sellerPrimary }]}>
              {getFirstLetter(user?.name)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main body area switching based on tab */}
      <Animated.View style={[styles.mainBody, { opacity: contentFadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >


          {activeTab === 'Home' && (
            <>
              {/* SECTION 2: UPGRADE YOUR SELLER EXPERIENCE */}
              <LinearGradient colors={['#4C1D95', '#6D28D9']} style={styles.glassPremiumCard}>
                <View style={styles.premiumBannerInner}>
                  <View style={styles.premiumBannerLeft}>
                    <Ionicons name="star" size={28} color="#FFD700" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={styles.glassPremiumTitle}>Unlock Premium Features</Text>
                      <Text style={styles.glassPremiumDesc}>Boost campaigns & reach more buyers.</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setPlansModalVisible(true)} style={styles.glassPremiumBtn}>
                    <Text style={styles.glassPremiumBtnText}>Upgrade</Text>
                  </Pressable>
                </View>
              </LinearGradient>

              {/* SECTION 3: YOUR GROWTH THIS MONTH + KPI ANALYTICS */}
              <Text style={[styles.growthMonthLabel, { color: theme.textSecondary }]}>YOUR GROWTH THIS MONTH</Text>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, flex: 1, marginHorizontal: 4 }]}>
                  <Ionicons name="eye-outline" size={24} color={theme.sellerPrimary} style={styles.kpiIcon} />
                  <View>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{totalViews}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Views</Text>
                  </View>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, flex: 1, marginHorizontal: 4 }]}>
                  <Ionicons name="flash-outline" size={24} color={theme.sellerPrimary} style={styles.kpiIcon} />
                  <View>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{activeCount}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Active</Text>
                  </View>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, flex: 1, marginHorizontal: 4 }]}>
                  <Ionicons name="people-outline" size={24} color={theme.sellerPrimary} style={styles.kpiIcon} />
                  <View>
                    <Text style={[styles.kpiValue, { color: theme.text }]}>{totalLeads}</Text>
                    <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Leads</Text>
                  </View>
                </View>
              </View>

              {/* SECTION 3: Action Cards (Replaces old Main CTA) */}
              <Text style={[styles.subsectionTitle, { marginBottom: 12, color: theme.text }]}>Launch Campaign</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {/* Card 1: Generate with AI (Placed first to emphasize) */}
                <Pressable
                  onPress={() => navigation.navigate('AICampaignGenerate')}
                  style={{ flex: 1, height: 140, borderRadius: 16, overflow: 'hidden' }}
                >
                  <LinearGradient colors={['#A78BFA', '#7C3AED']} style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>NEW</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>Generate with AI</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }} numberOfLines={2}>Instant, professional campaigns</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Card 2: Build Manually */}
                <Pressable
                  onPress={openCreateCampaign}
                  style={{ flex: 1, height: 140, borderRadius: 16, backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, padding: 14, justifyContent: 'space-between' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surfaceSecondary, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="construct-outline" size={20} color={theme.buyerPrimary} />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>Build Manually</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }} numberOfLines={2}>Create your campaign step by step</Text>
                  </View>
                </Pressable>
              </View>

              {/* SECTION 4: MY CAMPAIGNS */}

              {/* Your Campaigns Section */}
              <Text style={[styles.subsectionTitle, { color: theme.text }]}>Your Campaigns</Text>
              {liveCampaigns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Create Your First Campaign</Text>
                  <Text style={styles.emptyText}>
                    Reach local buyers, generate leads, and grow your business without expensive advertising.
                  </Text>
                  <PrimaryButton theme="seller"
                    title="+ Create New Campaign"
                    onPress={openCreateCampaign}
                    style={styles.emptyBtn}
                  />
                </View>
              ) : (
                liveCampaigns.map((camp) => (
                  <SellerCampaignCard
                    key={camp.id}
                    campaign={camp}
                    onEdit={() => openEditCampaign(camp)}
                    onDelete={() => handleDeleteCampaign(camp.id)}
                    onViewLeads={() => openLeadsView(camp)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'Campaigns' && (
            <>

              {/* LIVE CAMPAIGNS SECTION */}
              <View style={styles.campaignSectionHeaderRow}>
                <Text style={[styles.subsectionTitle, { color: theme.text }]}>Live Campaigns</Text>
              </View>

              {sortedLiveCampaigns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Live Campaigns</Text>
                  <Text style={styles.emptyText}>You don't have any currently active campaigns.</Text>
                  <PrimaryButton theme="seller"
                    title="+ Create New Campaign"
                    onPress={openCreateCampaign}
                    style={styles.emptyBtn}
                  />
                </View>
              ) : (
                sortedLiveCampaigns.map((camp) => (
                  <SellerCampaignCard
                    key={camp.id}
                    campaign={camp}
                    onEdit={() => openEditCampaign(camp)}
                    onDelete={() => handleDeleteCampaign(camp.id)}
                    onViewLeads={() => openLeadsView(camp)}
                  />
                ))
              )}

              {/* PAST CAMPAIGNS SECTION */}
              <View style={[styles.campaignsHeaderRow, { marginTop: 24 }]}>
                <Text style={[styles.subsectionTitle, { color: theme.text }]}>Past Campaigns</Text>
              </View>

              {pastCampaigns.length === 0 ? (
                <Text style={styles.emptyText}>No past campaigns found.</Text>
              ) : (
                pastCampaigns.map((camp) => (
                  <SellerCampaignCard
                    key={camp.id}
                    campaign={camp}
                    dimmed
                    showActionsMenu={false}
                    onViewLeads={() => openLeadsView(camp)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'Profile' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sellerProfileScrollContent}>
              {/* Horizontal Profile Header Card */}
              <View style={[
                styles.sellerProfileGlassCard,
                {
                  backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : '#E8EDF5',
                  shadowColor: isDarkMode ? '#000' : '#64748B',
                }
              ]}>
                {/* Avatar on left */}
                <Pressable onPress={async () => {
                    try {
                      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (permission.status !== 'granted') {
                        Alert.alert('Permission Required', 'Please allow access to your photo library to change your logo.');
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      if (!result.canceled && result.assets?.length > 0) {
                        const localUri = result.assets[0].uri;
                        const uploadUrl = `${API_CONFIG.BASE_URL}/upload/image`;
                        const headers = await apiService.getHeaders();
                        const uploadRes = await FileSystem.uploadAsync(uploadUrl, localUri, {
                          fieldName: 'file',
                          httpMethod: 'POST',
                          uploadType: 1,
                          mimeType: 'image/jpeg',
                          headers: headers,
                        });
                        if (uploadRes.status >= 200 && uploadRes.status < 300) {
                          const data = JSON.parse(uploadRes.body);
                          await apiService.request('/auth/me', {
                            method: 'PATCH',
                            body: { profile_picture: data.url },
                          });
                          if (updateUserProfile) {
                            updateUserProfile({ profile_picture: data.url });
                          }
                          Alert.alert('Success', 'Business logo updated successfully!');
                        }
                      }
                    } catch (e) {
                      console.warn('Logo upload error:', e);
                      Alert.alert('Error', 'Failed to upload logo.');
                    }
                  }} style={styles.sellerAvatarContainer}>
                    {user?.profile_picture ? (
                      <Image source={{ uri: resolveMediaUrl(user.profile_picture) }} style={[
                        styles.sellerAvatarImage,
                        { borderColor: theme.sellerPrimary }
                      ]} />
                    ) : (
                      <View style={[
                        styles.sellerAvatarFallback,
                        {
                          backgroundColor: isDarkMode ? '#1E2D4A' : '#EDE9FE',
                          borderColor: theme.sellerPrimary,
                        }
                      ]}>
                        <Text style={[styles.sellerAvatarFallbackText, { color: theme.sellerPrimary }]}>
                          {(user?.name || 'S').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.sellerCameraIconBadge, { backgroundColor: theme.sellerPrimary, borderColor: isDarkMode ? '#111A2D' : '#FFFFFF' }]}>
                      <Ionicons name="camera" size={12} color="#FFF" />
                    </View>
                  </Pressable>

                {/* Name + Business on right */}
                <View style={styles.sellerProfileTextBlock}>
                  <Text style={[styles.sellerProfileNameTextMinimal, { color: isDarkMode ? '#F8FAFF' : '#111827' }]} numberOfLines={1}>
                    {user?.name || 'Seller Name'}
                  </Text>
                  <Text style={[styles.sellerBusinessNameTextMinimal, { color: isDarkMode ? '#AAB6CC' : '#667085' }]} numberOfLines={2}>
                    {businessName || 'Business Name'}
                  </Text>
                  <View style={[styles.sellerVerifiedBadge, { backgroundColor: isDarkMode ? 'rgba(74,222,128,0.12)' : '#F0FDF4', borderColor: isDarkMode ? 'rgba(74,222,128,0.25)' : '#BBF7D0' }]}>
                    <Ionicons name="shield-checkmark" size={11} color={isDarkMode ? '#4ADE80' : '#16A34A'} />
                    <Text style={[styles.sellerVerifiedText, { color: isDarkMode ? '#4ADE80' : '#16A34A' }]}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* Business Statistics Card */}
              <View style={[styles.statsCardPremium, {
                backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : '#E8EDF5',
                shadowColor: isDarkMode ? '#000' : '#64748B',
              }]}>
                <View style={styles.statItemPremium}>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="megaphone-outline" size={20} color={theme.sellerPrimary} />
                  </View>
                  <Text style={[styles.statValuePremium, { color: theme.text }]}>{activeCount}</Text>
                  <Text style={[styles.statLabelPremium, { color: theme.textSecondary }]}>Campaigns</Text>
                </View>
                <View style={styles.statItemPremium}>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="eye-outline" size={20} color={theme.buyerPrimary} />
                  </View>
                  <Text style={[styles.statValuePremium, { color: theme.text }]}>{totalViews}</Text>
                  <Text style={[styles.statLabelPremium, { color: theme.textSecondary }]}>Views</Text>
                </View>
              </View>

              {/* Account Settings Section */}
              <View style={[styles.sellerSettingsCard, {
                backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : '#EEF2F8',
                shadowColor: isDarkMode ? '#000' : '#64748B',
              }]}>
                <Text style={[styles.sellerCardHeaderTitle, { color: isDarkMode ? '#AAB6CC' : '#64748B' }]}>ACCOUNT SETTINGS</Text>

                {/* Edit Profile */}
                <Pressable
                  onPress={() => navigation.navigate('SellerEditProfile')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="person-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Edit Profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Settings */}
                <Pressable
                  onPress={() => navigation.navigate('SellerSettings')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="settings-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Settings</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Change Password */}
                <Pressable
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Change Password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Edit Business Details */}
                <Pressable
                  onPress={() => navigation.navigate('SellerEditBusiness')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="business-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Edit Business Details</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Help & Support */}
                <Pressable
                  onPress={() => navigation.navigate('HelpSupport')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="help-buoy-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Help & Support</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Privacy Policy */}
                <Pressable
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Privacy Policy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* About Reachlo */}
                <Pressable
                  onPress={() => navigation.navigate('AboutReachlo')}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
                      <Ionicons name="information-circle-outline" size={20} color={theme.sellerPrimary} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>About REACHLO</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>

                {/* Rate REACHLO */}
                <Pressable
                  onPress={() => setShowRatingModal(true)}
                  style={({ pressed }) => [styles.sellerOptionRow, { borderBottomWidth: 0 }, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <View style={[styles.sellerOptionIconWrap, { backgroundColor: isDarkMode ? 'rgba(251,191,36,0.15)' : '#FFFBEB' }]}>
                      <Ionicons name="star-outline" size={20} color={theme.warning} />
                    </View>
                    <Text style={[styles.sellerOptionLabelText, { color: isDarkMode ? '#F8FAFF' : '#1E293B' }]}>Rate REACHLO</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#4A5A74' : '#CBD5E1'} />
                </Pressable>
              </View>

              {/* Logout Section */}
              <View style={styles.sellerLogoutSection}>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Confirm Logout',
                      'Are you sure you want to log out?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Log Out', style: 'destructive', onPress: logout }
                      ]
                    );
                  }}
                  style={({ pressed }) => [styles.sellerLogoutButton, {
                    backgroundColor: isDarkMode ? '#1E1010' : '#FFFFFF',
                    borderColor: isDarkMode ? '#65262A' : '#FCA5A5',
                  }, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="log-out-outline" size={20} color={theme.error} style={{ marginRight: 8 }} />
                  <Text style={[styles.sellerLogoutButtonText, { color: theme.error }]}>Log Out</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </Animated.View>

      {/* FLOATING GLASS BOTTOM NAV */}
      <View style={[styles.sellerFloatingNavWrapper, { shadowColor: isDarkMode ? "#000" : "#7C3AED" }]}>
        <BlurView intensity={isDarkMode ? 40 : 60} tint={isDarkMode ? "dark" : "light"} style={[styles.sellerFloatingNav, { backgroundColor: theme.navBackground, borderColor: theme.navBorder }]}>
          <Pressable
            onPress={() => handleTabChange('Home')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Home' ? (
              <LinearGradient colors={['#9333EA', '#7C3AED']} style={styles.sellerNavActivePill}>
                <Ionicons name="home" size={14} color="#FFFFFF" />
                <Text style={styles.sellerNavLabelActive}>Home</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="home-outline" size={20} color={theme.navTabInactive} />
                <Text style={styles.sellerNavLabel}>Home</Text>
              </>
            )}
          </Pressable>



          <Pressable
            onPress={() => handleTabChange('Campaigns')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Campaigns' ? (
              <LinearGradient colors={['#9333EA', '#7C3AED']} style={styles.sellerNavActivePill}>
                <Ionicons name="megaphone" size={14} color="#FFFFFF" />
                <Text style={styles.sellerNavLabelActive}>Campaigns</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={20} color={theme.navTabInactive} />
                <Text style={styles.sellerNavLabel}>Campaigns</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('Profile')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Profile' ? (
              <LinearGradient colors={['#9333EA', '#7C3AED']} style={styles.sellerNavActivePill}>
                <Ionicons name="person" size={14} color="#FFFFFF" />
                <Text style={styles.sellerNavLabelActive}>Profile</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="person-outline" size={20} color={theme.navTabInactive} />
                <Text style={styles.sellerNavLabel}>Profile</Text>
              </>
            )}
          </Pressable>
        </BlurView>
      </View>

      {/* CHOOSE PLAN MODAL */}
      <Modal
        visible={plansModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPlansModalVisible(false)}
      >
        <View style={styles.plansModalOverlay}>
          <View style={[styles.plansModalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
            <View style={[styles.plansModalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.plansModalTitle, { color: theme.text }]}>Choose Your Growth Plan</Text>
              <Pressable onPress={() => setPlansModalVisible(false)} style={styles.plansCloseBtn}>
                <Text style={[styles.plansCloseBtnText, { color: theme.textTertiary }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.plansScrollContent}>
              {/* STARTER CARD */}
              <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.text }]}>STARTER</Text>
                  <Text style={[styles.planPrice, { color: theme.text }]}>₹0<Text style={[styles.planPricePeriod, { color: theme.textSecondary }]}>/month</Text></Text>
                </View>
                <Text style={[styles.planDesc, { color: theme.textSecondary }]}>Perfect for getting started</Text>
                <View style={[styles.planDivider, { backgroundColor: theme.border }]} />
                <View style={styles.planFeatures}>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ 2 Active Campaigns</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Lead Inbox</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Basic Analytics</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Business Profile</Text>
                </View>
                <Pressable style={[styles.planBtn, styles.planBtnCurrent]} disabled={true}>
                  <Text style={styles.planBtnTextCurrent}>Current Plan</Text>
                </Pressable>
              </View>

              {/* GROW CARD */}
              <View style={[styles.planCard, styles.planCardFeatured]}>
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>POPULAR</Text>
                </View>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, styles.planNameFeatured]}>GROW</Text>
                  <Text style={[styles.planPrice, styles.planPriceFeatured]}>₹499<Text style={styles.planPricePeriodFeatured}>/month</Text></Text>
                </View>
                <Text style={styles.planDescFeatured}>For growing businesses</Text>
                <View style={styles.planDivider} />
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeatureTextFeatured}>✓ 10 Active Campaigns</Text>
                  <Text style={styles.planFeatureTextFeatured}>✓ Campaign Boost</Text>
                  <Text style={styles.planFeatureTextFeatured}>✓ Enhanced Analytics</Text>
                  <Text style={styles.planFeatureTextFeatured}>✓ Priority Verification</Text>
                </View>
                <Pressable
                  style={[styles.planBtn, styles.planBtnUpgrade]}
                  onPress={() => {
                    Alert.alert('Upgrade Plan', 'Proceeding to Grow plan checkout...');
                    setPlansModalVisible(false);
                  }}
                >
                  <Text style={styles.planBtnTextUpgrade}>Upgrade</Text>
                </Pressable>
              </View>

              {/* SCALE CARD */}
              <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.text }]}>SCALE</Text>
                  <Text style={[styles.planPrice, { color: theme.text }]}>₹1,499<Text style={[styles.planPricePeriod, { color: theme.textSecondary }]}>/month</Text></Text>
                </View>
                <Text style={[styles.planDesc, { color: theme.textSecondary }]}>Best for serious growth</Text>
                <View style={[styles.planDivider, { backgroundColor: theme.border }]} />
                <View style={styles.planFeatures}>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Unlimited Campaigns</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Advanced Analytics</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Lead Export (CSV)</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Verified Business Badge</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Priority Support</Text>
                </View>
                <Pressable
                  style={[styles.planBtn, styles.planBtnPro]}
                  onPress={() => {
                    Alert.alert('Upgrade Plan', 'Proceeding to Scale plan checkout...');
                    setPlansModalVisible(false);
                  }}
                >
                  <Text style={styles.planBtnTextPro}>Go Pro</Text>
                </Pressable>
              </View>

              {/* AGENCY CARD */}
              <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.text }]}>AGENCY</Text>
                  <Text style={[styles.planPrice, { color: theme.text }]}>₹3,999<Text style={[styles.planPricePeriod, { color: theme.textSecondary }]}>/month</Text></Text>
                </View>
                <Text style={[styles.planDesc, { color: theme.textSecondary }]}>For agencies & teams</Text>
                <View style={[styles.planDivider, { backgroundColor: theme.border }]} />
                <View style={styles.planFeatures}>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Unlimited Campaigns</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Manage 5 Accounts</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Team Access</Text>
                  <Text style={[styles.planFeatureText, { color: theme.text }]}>✓ Dedicated Support</Text>
                </View>
                <Pressable
                  style={[styles.planBtn, styles.planBtnContact]}
                  onPress={() => {
                    Alert.alert('Contact Sales', 'Thank you for your interest! Our team will contact you shortly.');
                    setPlansModalVisible(false);
                  }}
                >
                  <Text style={styles.planBtnTextContact}>Contact Sales</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PREMIUM MULTI-STEP CREATE / EDIT CAMPAIGN FLOATING MODAL */}
      <Modal
        visible={campaignModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setCampaignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Dimmed Blurred Background */}
          <Pressable style={styles.modalOverlayDismiss} onPress={() => setCampaignModalVisible(false)} />

          <Animated.View style={[styles.premiumModalSheet, { backgroundColor: theme.cardBackground, transform: [{ translateY: slideModalAnim }] }]}>
            {/* Glass Handle Bar */}
            <View style={styles.glassHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            {showSuccess ? (
              <View style={styles.successContainer}>
                <Animated.Text style={[styles.successIcon, { transform: [{ scale: successScaleAnim }] }]}>
                </Animated.Text>
                <Text style={styles.successTitle}>Campaign Live</Text>
                <Text style={styles.successSubtitle}>Your offer is now visible to buyers</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.premiumScrollContent}>
                <View style={styles.modalContentHeader}>
                  <Text style={[styles.premiumModalTitle, { color: theme.text }]}>
                    {editingCampaign ? 'Edit Campaign' : 'Campaign Setup'}
                  </Text>
                </View>

                {/* Step Indicator */}
                <View style={styles.stepIndicatorWrap}>
                  <View style={styles.stepDotsRow}>
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={styles.stepLineTrack}>
                      <Animated.View
                        style={[
                          styles.stepLineFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: ['0%', '50%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                    <View style={styles.stepLineTrack}>
                      <Animated.View
                        style={[
                          styles.stepLineFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: ['0%', '0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
                  </View>
                  <View style={styles.stepLabelsRow}>
                    <Text style={[styles.stepLabelText, { color: isDarkMode ? '#7B8FAB' : '#94A3B8' }, step === 1 && styles.stepLabelActive]}>Basic Info</Text>
                    <Text style={[styles.stepLabelText, { color: isDarkMode ? '#7B8FAB' : '#94A3B8' }, step === 2 && styles.stepLabelActive]}>Audience</Text>
                    <Text style={[styles.stepLabelText, { color: isDarkMode ? '#7B8FAB' : '#94A3B8' }, step === 3 && styles.stepLabelActive]}>Publish</Text>
                  </View>
                </View>

                {/* STEP 1: Basic Info */}
                {step === 1 && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.premiumInputSectionTitle, { color: theme.text }]}>Basic Info</Text>

                    {/* Image Upload Area */}
                    {imageReview ? (
                      <View style={styles.imageReviewCard}>
                        <Text style={styles.imageReviewTitle}>Suggested Thumbnail Generated</Text>
                        <Image source={{ uri: imageReview.uri }} style={styles.imageReviewPreview} resizeMode="cover" />
                        <View style={styles.imageReviewActions}>
                          <Pressable style={styles.looksGoodBtn} onPress={confirmImageReview}>
                            <Text style={styles.looksGoodBtnText}>✓ Looks Good</Text>
                          </Pressable>
                          <Pressable style={styles.adjustBtn} onPress={adjustImageReview}>
                            <Text style={styles.adjustBtnText}>Adjust</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : campImages.length > 0 ? (
                      <View style={styles.uploadedImageCard}>
                        <Image
                          source={{ uri: resolveMediaUrl(campImages[0].serverUrl || campImages[0].uri) || campImages[0].uri }}
                          style={styles.uploadedImagePreview}
                          resizeMode="cover"
                        />
                        <View style={styles.uploadedImageActions}>
                          <Pressable style={styles.imageActionBtn} onPress={() => editCampImage(0)}>
                            <Text style={styles.imageActionBtnText}>Edit</Text>
                          </Pressable>
                          <Pressable style={styles.imageActionBtnDanger} onPress={() => removeCampImage(0)}>
                            <Text style={styles.imageActionBtnDangerText}>Remove</Text>
                          </Pressable>
                        </View>
                        {campImages.length < MAX_CAMPAIGN_IMAGES && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            {campImages.slice(1).map((img, index) => (
                              <View key={`${img.uri}-${index + 1}`} style={styles.uploadThumbWrap}>
                                <Image
                                  source={{ uri: resolveMediaUrl(img.serverUrl || img.uri) || img.uri }}
                                  style={styles.uploadThumb}
                                  resizeMode="cover"
                                />
                                <Pressable style={styles.uploadThumbRemove} onPress={() => removeCampImage(index + 1)}>
                                  <Text style={styles.uploadThumbRemoveText}>✕</Text>
                                </Pressable>
                              </View>
                            ))}
                            <Pressable style={styles.uploadAddTileSmall} onPress={pickImage}>
                              <Text style={styles.uploadAddTileText}>+ Add</Text>
                            </Pressable>
                          </ScrollView>
                        )}
                      </View>
                    ) : (
                      <Pressable style={styles.imageUploadArea} onPress={pickImage} disabled={isSmartCropping}>
                        {isSmartCropping ? (
                          <ActivityIndicator color="#2563EB" size="large" />
                        ) : (
                          <>
                            <View style={styles.uploadDivider} />
                            <Text style={[styles.uploadAreaTitle, { color: theme.text }]}>Campaign Image *</Text>
                            <Text style={[styles.uploadAreaSubtitle, { color: theme.textSecondary }]}>Drag or Upload</Text>
                            <Text style={[styles.uploadAreaHint, { color: theme.textTertiary }]}>Recommended: 1200×900 (4:3)</Text>
                            <Text style={styles.uploadAreaFormats}>PNG, JPG</Text>
                            <View style={styles.uploadDivider} />
                          </>
                        )}
                      </Pressable>
                    )}

                    <View style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.cardInputLabel, { color: theme.text }]}>Campaign Title *</Text>
                      <TextInput
                        value={campTitle}
                        onChangeText={setCampTitle}
                        style={[styles.cardInputField, { color: theme.text }]}
                        placeholder="e.g. 50% Off Summer Collection"
                        placeholderTextColor={theme.textTertiary}
                      />
                    </View>

                    <View style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.cardInputLabel, { color: theme.text }]}>Description *</Text>
                      <TextInput
                        value={campDesc}
                        onChangeText={setCampDesc}
                        style={[styles.cardInputField, styles.cardInputMultiline, { color: theme.text }]}
                        placeholder="Describe your offer in detail..."
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <View style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.cardInputLabel, { color: theme.text }]}>Offer Line *</Text>
                      <TextInput
                        value={campOfferLine}
                        onChangeText={setCampOfferLine}
                        placeholder="e.g. First Week Free"
                        placeholderTextColor={theme.textTertiary}
                        style={[styles.cardInputField, { color: theme.text }]}
                      />
                    </View>

                    <View style={styles.locationCardWrapper}>
                      <BlurView
                        intensity={isDarkMode ? 25 : 55}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={[
                          styles.locationCard,
                          {
                            backgroundColor: isDarkMode ? theme.surface : 'rgba(255,255,255,0.75)',
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.locationTopRow}>
                          <Text style={[styles.locationTitle, { color: theme.text }]}>📍 Business Location</Text>
                          <Text style={[styles.locationNote, { color: theme.textSecondary }]}>Optional but recommended for better nearby recommendations.</Text>
                        </View>

                        {/* Glassmorphism address display box */}
                        <BlurView
                          intensity={isDarkMode ? 18 : 30}
                          tint={isDarkMode ? 'dark' : 'light'}
                          style={[
                            styles.locationAddressBox,
                            {
                              backgroundColor: isDarkMode ? theme.inputBackground : 'rgba(255,255,255,0.55)',
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Ionicons name="location" size={16} color={locationSelected ? theme.sellerPrimary : theme.textTertiary} style={{ marginRight: 8 }} />
                          <Text style={[styles.locationAddressBoxText, { color: locationSelected ? theme.text : theme.textTertiary }]} numberOfLines={3}>
                            {locationSelected && locationAddress
                              ? locationAddress
                              : 'No location selected yet. Use the buttons below to set one.'}
                          </Text>
                          {locationSelected && (
                            <Pressable onPress={() => { setLocationSelected(false); setLocationAddress(''); setLocationLat(null); setLocationLon(null); }}>
                              <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </Pressable>
                          )}
                        </BlurView>

                        {/* Two horizontal blue glassmorphism buttons */}
                        <View style={styles.locationBtnsRow}>
                          <Pressable
                            onPress={async () => {
                              try {
                                const { status } = await Location.requestForegroundPermissionsAsync();
                                if (status !== 'granted') {
                                  Alert.alert('Permission denied', 'Allow location to use current location');
                                  return;
                                }
                                const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
                                const rev = await Location.reverseGeocodeAsync({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });
                                const place = rev && rev.length ? rev[0] : null;
                                const readable = place ? [place.name, place.street, place.subregion || place.region, place.region].filter(Boolean).join(', ') : '';
                                setLocationAddress(readable);
                                setLocationLat(cur.coords.latitude);
                                setLocationLon(cur.coords.longitude);
                                setLocationPlaceId(null);
                                setLocationSelected(true);
                              } catch (e) {
                                console.warn('Use current location failed', e);
                                Alert.alert('Error', 'Unable to detect location. Please search manually.');
                              }
                            }}
                            style={({ pressed }) => [styles.locationGlassBtn, pressed && styles.locationGlassBtnPressed]}
                          >
                            <BlurView
                              intensity={isDarkMode ? 25 : 60}
                              tint={isDarkMode ? 'dark' : 'light'}
                              style={[
                                styles.locationGlassBtnInner,
                                { backgroundColor: isDarkMode ? theme.surfaceSecondary : 'rgba(219,234,254,0.75)' },
                              ]}
                            >
                              <Ionicons name="locate" size={16} color={theme.sellerPrimary} style={{ marginRight: 6 }} />
                              <Text style={[styles.locationGlassBtnText, { color: theme.sellerPrimary }]}>Use Current Location</Text>
                            </BlurView>
                          </Pressable>

                        </View>

                        {/* Inline Search Bar */}
                        <View style={[styles.inlineLocationSearchBar, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
                          <Ionicons name="search-outline" size={16} color={theme.textTertiary} style={{ marginRight: 8 }} />
                          <TextInput
                            style={[styles.inlineLocationSearchInput, { color: theme.text }]}
                            placeholder="Search business address..."
                            placeholderTextColor={theme.textTertiary}
                            value={locationSearch}
                            onChangeText={handleLocationSearchChange}
                            returnKeyType="search"
                          />
                          {locationSearchLoading && <ActivityIndicator size="small" color={theme.sellerPrimary} style={{ marginLeft: 6 }} />}
                          {locationSearch.length > 0 && !locationSearchLoading && (
                            <Pressable onPress={() => { setLocationSearch(''); setLocationSuggestions([]); }}>
                              <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
                            </Pressable>
                          )}
                        </View>

                        {/* Suggestions */}
                        {locationSuggestions.length > 0 && (
                          <View style={[styles.inlineLocationSuggestionsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            {locationSuggestions.map((pred) => (
                              <Pressable
                                key={pred.place_id}
                                style={({ pressed }) => [
                                  styles.inlineLocationSuggestionItem,
                                  { borderBottomColor: theme.border },
                                  pressed && { backgroundColor: theme.surfaceSecondary },
                                ]}
                                onPress={() => handleSelectLocationSuggestion(pred)}
                              >
                                <Ionicons name="location-outline" size={14} color={theme.sellerPrimary} style={{ marginRight: 8, marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.inlineLocationSuggestionMain, { color: theme.text }]} numberOfLines={1}>
                                    {pred.structured_formatting?.main_text || pred.description}
                                  </Text>
                                  <Text style={[styles.inlineLocationSuggestionSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {pred.structured_formatting?.secondary_text || ''}
                                  </Text>
                                </View>
                              </Pressable>
                            ))}
                          </View>
                        )}

                      </BlurView>
                    </View>
                  </View>
                )}

                {/* STEP 2: Audience */}
                {step === 2 && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.premiumInputSectionTitle, { color: theme.text }]}>Audience</Text>

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Category *</Text>
                    <View style={styles.categoryGrid}>
                      {CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          onPress={() => {
                            setCampCategory(cat);
                            setCampSubCategory(CATEGORY_MAP[cat][0]);
                          }}
                          style={[
                            styles.categoryChipGrid,
                            { backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF', borderColor: theme.sellerPrimary },
                            campCategory === cat && { backgroundColor: theme.sellerPrimary, borderColor: theme.sellerPrimary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: isDarkMode ? '#FFFFFF' : '#1E293B' },
                              campCategory === cat && { color: '#FFFFFF', fontWeight: 'bold' },
                            ]}
                            numberOfLines={2}
                          >
                            {truncateChipLabel(cat, 3)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Subcategory *</Text>
                    <View style={styles.categoryGrid}>
                      {(CATEGORY_MAP[campCategory] || []).map((sub) => (
                        <Pressable
                          key={sub}
                          onPress={() => setCampSubCategory(sub)}
                          style={[
                            styles.categoryChipGrid,
                            { backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF', borderColor: theme.sellerPrimary },
                            campSubCategory === sub && { backgroundColor: theme.sellerPrimary, borderColor: theme.sellerPrimary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: isDarkMode ? '#FFFFFF' : '#1E293B' },
                              campSubCategory === sub && { color: '#FFFFFF', fontWeight: 'bold' },
                            ]}
                            numberOfLines={2}
                          >
                            {truncateChipLabel(sub, 4)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {campCategory === 'Others' && (
                      <View style={[styles.cardInput, { marginTop: 12, backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.cardInputLabel, { color: theme.text }]}>Custom Category Name *</Text>
                        <TextInput
                          value={campSubCategory === 'Other' ? '' : campSubCategory}
                          onChangeText={setCampSubCategory}
                          placeholder="e.g. Pet Grooming"
                          placeholderTextColor={theme.textTertiary}
                          style={[styles.cardInputField, { color: theme.text }]}
                        />
                      </View>
                    )}

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Target Cities *</Text>
                    <View style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {/* All over India toggle */}
                      <Pressable
                        style={[
                          styles.allIndiaBtn,
                          { backgroundColor: isDarkMode ? '#111A2D' : '#FFFFFF', borderColor: theme.sellerPrimary },
                          selectedCities.includes(ALL_INDIA_TAG) && { backgroundColor: theme.sellerPrimary, borderColor: theme.sellerPrimary }
                        ]}
                        onPress={toggleAllIndia}
                      >
                        <Ionicons
                          name={selectedCities.includes(ALL_INDIA_TAG) ? 'checkmark-circle' : 'earth-outline'}
                          size={16}
                          color={selectedCities.includes(ALL_INDIA_TAG) ? '#FFFFFF' : theme.sellerPrimary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[
                          styles.allIndiaBtnText,
                          selectedCities.includes(ALL_INDIA_TAG) && styles.allIndiaBtnTextActive
                        ]}>
                          All over India
                        </Text>
                      </Pressable>

                      {/* Selected city tags */}
                      {selectedCities.length > 0 && !selectedCities.includes(ALL_INDIA_TAG) && (
                        <View style={styles.tagsContainer}>
                          {selectedCities.map((city) => (
                            <View key={city} style={styles.cityTag}>
                              <Text style={styles.cityTagText}>{city}</Text>
                              <Pressable onPress={() => removeCity(city)} hitSlop={6}>
                                <Ionicons name="close-circle" size={16} color="#2563EB" style={{ marginLeft: 4 }} />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* City search input */}
                      {!selectedCities.includes(ALL_INDIA_TAG) && (
                        <View style={styles.citySearchWrapper}>
                          <View style={styles.citySearchBar}>
                            <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                            <TextInput
                              ref={cityInputRef}
                              style={styles.citySearchInput}
                              placeholder="Type a city name, e.g. Chennai..."
                              placeholderTextColor="#94A3B8"
                              value={citySearchText}
                              onChangeText={handleCitySearchChange}
                              returnKeyType="done"
                              onSubmitEditing={() => {
                                const match = ALL_INDIA_CITIES.find(
                                  (c) => c.toLowerCase() === citySearchText.trim().toLowerCase()
                                );
                                if (match) addCity(match);
                              }}
                            />
                          </View>

                          {/* Suggestions dropdown */}
                          {citySuggestions.length > 0 && (
                            <View style={styles.suggestionsBox}>
                              {citySuggestions.map((city) => (
                                <Pressable
                                  key={city}
                                  style={styles.suggestionItem}
                                  onPress={() => addCity(city)}
                                >
                                  <Ionicons name="location-outline" size={14} color="#2563EB" style={{ marginRight: 8 }} />
                                  <Text style={styles.suggestionText}>{city}</Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* STEP 3: Pricing & Publish */}
                {step === 3 && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.premiumInputSectionTitle, { color: theme.text }]}>Pricing & Preview</Text>

                    <View style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.cardInputLabel, { color: theme.text }]}>Price (₹)</Text>
                      <TextInput
                        value={campPrice}
                        onChangeText={setCampPrice}
                        placeholder="e.g. 5000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={[styles.cardInputField, { color: theme.text }]}
                      />
                    </View>

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Campaign Start Date *</Text>
                    <Pressable
                      onPress={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); setCalendarDate(campStartDate ? new Date(campStartDate) : new Date()); }}
                      style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <Text style={[styles.cardInputField, { color: theme.text }, !campStartDate && styles.placeholderText]}>
                        {campStartDate || 'Select start date'}
                      </Text>
                    </Pressable>

                    {showStartCalendar && (() => {
                      const yr = calendarDate.getFullYear();
                      const mo = calendarDate.getMonth();
                      const firstDay = new Date(yr, mo, 1).getDay();
                      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const today = new Date();
                      return (
                        <View style={styles.calendarCard}>
                          <View style={styles.calendarHeader}>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo - 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>‹</Text></Pressable>
                            <Text style={styles.calendarMonth}>{MONTHS[mo]} {yr}</Text>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo + 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>›</Text></Pressable>
                          </View>
                          <View style={styles.calendarWeekRow}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <View key={d} style={styles.calendarWeekCell}><Text style={styles.calendarWeekText}>{d}</Text></View>
                            ))}
                          </View>
                          <View style={styles.calendarDaysGrid}>
                            {Array(firstDay).fill(null).map((_, i) => <View key={`e${i}`} style={styles.calendarDayCell} />)}
                            {Array(daysInMonth).fill(null).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isSelected = campStartDate === dateStr;
                              const isPast = new Date(dateStr) < new Date(today.toDateString());
                              return (
                                <Pressable key={day} onPress={() => { if (!isPast) { setCampStartDate(dateStr); setShowStartCalendar(false); } }} style={styles.calendarDayCell}>
                                  <View style={[styles.calendarDayInner, isSelected && styles.calendarDaySelected]}>
                                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isPast && styles.calendarDayPast]}>{day}</Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Campaign End Date *</Text>
                    <Pressable
                      onPress={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); setCalendarDate(campEndDate ? new Date(campEndDate) : (campStartDate ? new Date(campStartDate) : new Date())); }}
                      style={[styles.cardInput, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <Text style={[styles.cardInputField, { color: theme.text }, !campEndDate && styles.placeholderText]}>
                        {campEndDate || 'Select end date'}
                      </Text>
                    </Pressable>

                    {showEndCalendar && (() => {
                      const yr = calendarDate.getFullYear();
                      const mo = calendarDate.getMonth();
                      const firstDay = new Date(yr, mo, 1).getDay();
                      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return (
                        <View style={styles.calendarCard}>
                          <View style={styles.calendarHeader}>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo - 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>‹</Text></Pressable>
                            <Text style={styles.calendarMonth}>{MONTHS[mo]} {yr}</Text>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo + 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>›</Text></Pressable>
                          </View>
                          <View style={styles.calendarWeekRow}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <View key={d} style={styles.calendarWeekCell}><Text style={styles.calendarWeekText}>{d}</Text></View>
                            ))}
                          </View>
                          <View style={styles.calendarDaysGrid}>
                            {Array(firstDay).fill(null).map((_, i) => <View key={`e${i}`} style={styles.calendarDayCell} />)}
                            {Array(daysInMonth).fill(null).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isSelected = campEndDate === dateStr;
                              const isBeforeStart = campStartDate && dateStr <= campStartDate;
                              return (
                                <Pressable key={day} onPress={() => { if (!isBeforeStart) { setCampEndDate(dateStr); setShowEndCalendar(false); } }} style={styles.calendarDayCell}>
                                  <View style={[styles.calendarDayInner, isSelected && styles.calendarDaySelected]}>
                                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isBeforeStart && styles.calendarDayPast]}>{day}</Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}

                    <Text style={[styles.premiumLabel, { color: theme.text }]}>Live Preview</Text>
                    <CampaignFeedCard
                      campaign={{
                        title: campTitle || 'Campaign Title',
                        offerLine: campOfferLine || 'Offer Line',
                        description: campDesc,
                        businessName: businessName || `${user?.name || 'Your'} Business`,
                        businessVerified: businessVerified,
                        city: selectedCities.length > 0 ? selectedCities.join(', ') : '',
                        endDate: campEndDate,
                        price: campPrice ? parseFloat(campPrice) : 0,
                        imageUrl: campImages[0]?.uri,
                        imageUrls: campImages.map((img) => img.serverUrl || img.uri),
                        views: 0,
                        status: 'ACTIVE',
                      }}
                      onPress={() => { }}
                      onToggleSave={() => { }}
                    />
                  </View>
                )}

                {/* Navigation Buttons */}
                <View style={styles.premiumModalButtonRow}>
                  {step > 1 ? (
                    <Pressable onPress={goToPrevStep} style={styles.modalBackBtn}>
                      <Text style={styles.modalBackText}>← Back</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setCampaignModalVisible(false)} style={styles.modalCancelBtn}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                  )}

                  {step < 3 ? (
                    <Pressable onPress={goToNextStep} style={styles.publishActionBtn}>
                      <Text style={styles.publishActionBtnText}>Continue</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handlePublish}
                      style={[styles.publishActionBtn, isPublishing && styles.publishActionBtnDisabled]}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Text style={styles.publishActionBtnText}>Publishing...</Text>
                      ) : (
                        <Text style={styles.publishActionBtnText}>PUBLISH CAMPAIGN</Text>
                      )}
                    </Pressable>
                  )}
                </View>

                {editingCampaign && step === 3 && (
                  <Pressable
                    onPress={() => handleDeleteCampaign(editingCampaign.id)}
                    style={styles.deleteCampaignBtn}
                  >
                    <Text style={styles.deleteCampaignBtnText}>Delete Campaign</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      <ImageCropModal
        visible={cropModalVisible}
        imageUri={pendingCropUri}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      <MapLocationPicker
        visible={locationPickerVisible}
        initialLocation={locationLat && locationLon ? { latitude: locationLat, longitude: locationLon } : null}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={(res) => {
          setLocationPickerVisible(false);
          if (res) {
            setLocationLat(res.latitude);
            setLocationLon(res.longitude);
            setLocationAddress(res.address || '');
            setLocationPlaceId(null);
            setLocationSelected(true);
          }
        }}
      />

      {/* Autocomplete Modal (optional) - non-intrusive; opens when user taps 'Search Location' */}
      <Modal visible={autocompleteModalVisible} animationType="slide" onRequestClose={() => setAutocompleteModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <PlacesAutocompleteProxy
            onPlaceSelected={(place) => {
              if (!place) return;
              setLocationAddress(place.formatted_address || '');
              setLocationLat(place.latitude || null);
              setLocationLon(place.longitude || null);
              setLocationPlaceId(place.place_id || null);
              setLocationSelected(true);
              setAutocompleteModalVisible(false);
              // Optionally allow manual fine-tuning after selection
              setAdjustModalVisible(true);
            }}
            authToken={null}
          />
          <Pressable style={{ padding: 12 }} onPress={() => setAutocompleteModalVisible(false)}>
            <Text style={{ color: '#7C3AED' }}>Close</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      <PlacesAdjustMap
        visible={adjustModalVisible}
        initialRegion={locationLat && locationLon ? { latitude: locationLat, longitude: locationLon } : null}
        onClose={() => setAdjustModalVisible(false)}
        onSave={(coords) => {
          if (coords) {
            setLocationLat(coords.latitude);
            setLocationLon(coords.longitude);
            setLocationPlaceId(null);
            setLocationSelected(true);
          }
          setAdjustModalVisible(false);
        }}
      />

      {/* LEAD INBOX MODAL */}
      <CRMLeadsModal
        visible={leadsModalVisible}
        onClose={() => setLeadsModalVisible(false)}
        campaign={selectedCampaignForLeads}
        dismissedLeadIds={dismissedLeadIds}
        onCall={callLead}
        onWhatsApp={chatLead}
        markAllRead={markLeadListAsRead}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      {/* NOTIFICATIONS MODAL (NEW LEADS) */}
      {/* =========================================================
    NOTIFICATIONS MODAL
    DARK + LIGHT MODE SAFE
========================================================= */}

<Modal
  visible={notificationsModalVisible}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setNotificationsModalVisible(false)}
>
  <View
    style={[
      styles.notificationsOverlay,
      {
        backgroundColor: isDarkMode
          ? 'rgba(2, 6, 23, 0.78)'
          : 'rgba(15, 23, 42, 0.42)',
      },
    ]}
  >

    <View
      style={[
        styles.notificationsPanel,
        {
          backgroundColor: isDarkMode
            ? '#0F172A'
            : '#FFFFFF',

          borderColor: isDarkMode
            ? '#263653'
            : '#E2E8F0',

          shadowColor: isDarkMode
            ? '#000000'
            : '#7C3AED',
        },
      ]}
    >

      {/* HEADER */}
      <View style={styles.notificationsHeader}>

        <LinearGradient
          colors={
            isDarkMode
              ? ['#8B5CF6', '#4F46E5']
              : ['#56CCF2', '#2F80ED']
          }
          style={styles.notificationsBell}
        >
          <Ionicons
            name="notifications"
            size={31}
            color="#FFFFFF"
          />
        </LinearGradient>

        <View style={{ flex: 1 }}>

          <Text
            style={[
              styles.notificationsTitle,
              {
                color: isDarkMode
                  ? '#F8FAFC'
                  : '#0F172A',
              },
            ]}
          >
            New Leads
          </Text>

          <Text
            style={[
              styles.notificationsSubtitle,
              {
                color: isDarkMode
                  ? '#A78BFA'
                  : '#7C3AED',
              },
            ]}
          >
            {newLeadsTodayCount} fresh inquiries
          </Text>

        </View>

        {/* CLOSE */}
        <Pressable
          onPress={() =>
            setNotificationsModalVisible(false)
          }
          style={[
            styles.notificationCloseButton,
            {
              backgroundColor: isDarkMode
                ? '#17243C'
                : '#F8FAFC',

              borderColor: isDarkMode
                ? '#30415F'
                : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name="close"
            size={20}
            color={
              isDarkMode
                ? '#CBD5E1'
                : '#475569'
            }
          />
        </Pressable>

      </View>

      {/* DIVIDER */}
      <View
        style={[
          styles.notificationDivider,
          {
            backgroundColor: isDarkMode
              ? '#263653'
              : '#E2E8F0',
          },
        ]}
      />

      {/* CONTENT */}
      <ScrollView
        style={styles.leadsScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 8,
        }}
      >

        {allNewLeads.length === 0 ? (

          <View style={styles.emptyNotificationsContainer}>

            <View
              style={[
                styles.emptyBellWrap,
                {
                  backgroundColor: isDarkMode
                    ? '#17243C'
                    : '#F8FAFC',

                  borderColor: isDarkMode
                    ? '#35445F'
                    : '#E2E8F0',
                },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={50}
                color={
                  isDarkMode
                    ? '#A78BFA'
                    : '#7C3AED'
                }
              />
            </View>

            <Text
              style={[
                styles.emptyNotificationsTitle,
                {
                  color: isDarkMode
                    ? '#F8FAFC'
                    : '#0F172A',
                },
              ]}
            >
              No new notifications
            </Text>

            <Text
              style={[
                styles.emptyNotificationsText,
                {
                  color: isDarkMode
                    ? '#94A3B8'
                    : '#64748B',
                },
              ]}
            >
              We'll notify you whenever a buyer
              shows interest.
            </Text>

          </View>

        ) : (

          allNewLeads.map((lead, index) => (

            <LeadNotificationCard
              key={`new-lead-${lead.id}-${index}`}
              lead={lead}
              onDismiss={dismissLeadNotification}
              onCall={() => callLead(lead)}
              onWhatsApp={() => chatLead(lead)}
              onView={() => viewLeadDetails(lead)}
              theme={theme}
              isDarkMode={isDarkMode}
            />

          ))

        )}

      </ScrollView>

      {/* FOOTER */}
      <View
        style={[
          styles.notificationsFooter,
          {
            borderTopColor: isDarkMode
              ? '#263653'
              : '#E2E8F0',
          },
        ]}
      >

        <Pressable
          onPress={() =>
            markLeadListAsRead(allNewLeads)
          }
          style={[
            styles.markReadBtn,
            {
              backgroundColor: isDarkMode
                ? '#17243C'
                : '#F8FAFC',

              borderColor: isDarkMode
                ? '#30415F'
                : '#E2E8F0',
            },
          ]}
        >

          <Ionicons
            name="checkmark-done-outline"
            size={17}
            color={
              isDarkMode
                ? '#A78BFA'
                : '#7C3AED'
            }
          />

          <Text
            style={[
              styles.markReadText,
              {
                color: isDarkMode
                  ? '#C4B5FD'
                  : '#7C3AED',
              },
            ]}
          >
            Mark all as Read
          </Text>

        </Pressable>

        <Pressable
          onPress={() =>
            setNotificationsModalVisible(false)
          }
          style={styles.doneGradientWrap}
        >

          <LinearGradient
            colors={
              isDarkMode
                ? ['#7C3AED', '#4F46E5']
                : ['#2F80ED', '#56CCF2']
            }
            style={styles.doneGradientBtn}
          >

            <Text style={styles.doneGradientText}>
              Done
            </Text>

          </LinearGradient>

        </Pressable>

      </View>

    </View>

  </View>
</Modal>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        userRole="seller"
      />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9FE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  logoText: {
    fontWeight: '700',
    fontSize: 24,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  bellIcon: {
    fontSize: 22,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: COLORS.WHITE,
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.SELLER_PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  mainBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100, // Extra space for compact floating nav bar
    paddingTop: 16,
  },

  // GROWTH STATS HERO BANNER
  growthBanner: {
    backgroundColor: COLORS.SELLER_PRIMARY_LIGHT,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.SELLER_PRIMARY_ULTRA_LIGHT,
  },
  growthBannerTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  growthStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  growthStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  growthStatValue: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  growthStatLabel: {
    fontSize: 9,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    textAlign: 'center',
  },
  growthStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.BORDER,
  },

  growthMonthLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  kpiIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C1445',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },

  glassLaunchCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  glassLaunchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  glassLaunchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  glassLaunchDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  glassLaunchBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  glassLaunchBtnText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 13,
  },
  launchRocketIcon: {
    fontSize: 40,
    transform: [{ rotate: '15deg' }],
    marginLeft: 10,
  },

  glassPremiumCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#0C1445',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  premiumBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumCrownIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  glassPremiumTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  glassPremiumDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  glassPremiumBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 12,
  },
  glassPremiumBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  subsectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  pastCampaignCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  pastCampaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pastCampaignTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: 10,
  },
  editLink: {
    fontSize: FONT_SIZES.XS,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  pastCampaignDesc: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: FONT_SIZES.SM * LINE_HEIGHTS.NORMAL,
    marginBottom: 16,
  },
  pastCampaignStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  statMiniLabel: {
    fontSize: 9,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginBottom: 4,
  },
  statMiniValue: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  viewLeadsBtn: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewLeadsBtnText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 16,
  },
  emptyIllustration: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    width: '100%',
  },

  // PROFILE FORM
  profileForm: {
    marginTop: 10,
  },
  saveProfileBtn: {
    marginTop: 16,
  },
  logoutSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 24,
    alignItems: 'center',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // FLOATING GLASS BOTTOM TAB NAVIGATION
  sellerFloatingNavWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  sellerFloatingNav: {
    flexDirection: 'row',
    height: 60, // Reduced from 68
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  sellerNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  sellerNavActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, // Reduced from 14
    paddingVertical: 6, // Reduced from 8
    borderRadius: 20, // Reduced from 24
    gap: 4,
  },
  sellerNavActiveIcon: {
    fontSize: 16,
  },
  sellerNavInactiveIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  sellerNavLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  sellerNavLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },

  // MODAL OVERLAY (BACKGROUND DARK DIMMED AND BLURRED EFFECT)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slate-900 with 0.6 opacity
    justifyContent: 'flex-end',
  },
  modalOverlayDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  premiumModalSheet: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '90%',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(203, 213, 225, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  glassHandleWrap: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  stepIndicatorWrap: {
    marginBottom: 20,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  stepLineTrack: {
    width: 60,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  stepLineFill: {
    height: '100%',
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderRadius: 2,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepLabelText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    flex: 1,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  cardInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardInputLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  cardInputField: {
    fontSize: FONT_SIZES.BASE,
    color: COLORS.TEXT_PRIMARY,
    padding: 0,
  },
  cardInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  imageUploadArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  uploadAreaTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  uploadAreaSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: '#64748B',
    marginBottom: 8,
  },
  uploadAreaHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  uploadAreaFormats: {
    fontSize: 12,
    color: '#94A3B8',
  },
  imageReviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageReviewTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: '#15803D',
    marginBottom: 10,
  },
  imageReviewPreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#E2E8F0',
  },
  imageReviewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  looksGoodBtn: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  looksGoodBtnText: {
    color: '#15803D',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  adjustBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adjustBtnText: {
    color: '#475569',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  uploadedImageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadedImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  uploadedImageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  imageActionBtn: {
    flex: 1,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  imageActionBtnText: {
    color: '#7C3AED',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: 12,
  },
  imageActionBtnDanger: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  imageActionBtnDangerText: {
    color: '#DC2626',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: 12,
  },
  uploadAddTileSmall: {
    width: 72,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  citySelectedHint: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginTop: 8,
  },
  cityDropdown: {
    maxHeight: 160,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cityDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cityDropdownText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: FONT_SIZES.SM,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 8,
  },
  calendarNavText: {
    fontSize: 18,
    color: '#7C3AED',
  },
  calendarMonth: {
    fontWeight: '700',
    color: '#1E3A8A',
    fontSize: 15,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarWeekText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: '#7C3AED',
  },
  calendarDayText: {
    fontSize: 13,
    color: '#1E293B',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayPast: {
    color: '#CBD5E1',
  },
  modalBackBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  modalBackText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  // --- PREMIUM DASHBOARD PROFILE STYLES ---
  profileHeaderPremium: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  profileAvatarLargeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0284C7',
  },
  editPhotoIconWrap: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editPhotoIcon: {
    fontSize: 12,
  },
  profileNamePremium: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileLocationPremium: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  profileContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileContactText: {
    fontSize: 13,
    color: '#475569',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
    width: '100%',
  },
  statsCardPremium: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItemPremium: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconPremium: {
    fontSize: 20,
    marginBottom: 8,
  },
  statValuePremium: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabelPremium: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoCardPremium: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoInputWrap: {
    marginBottom: 15,
  },
  infoInputLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  infoInputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 56,
  },
  infoInputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  infoInputText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  saveChangesBtnWrap: {
    marginTop: 10,
    shadowColor: '#29B6FF',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 15,
    elevation: 6,
  },
  saveChangesBtnGradient: {
    borderRadius: 20,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingsListPremium: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingsRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingsRowIcon: {
    fontSize: 18,
    marginRight: 16,
  },
  settingsRowText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  settingsRowArrow: {
    fontSize: 18,
    color: '#94A3B8',
  },
  logoutWrapPremium: {
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 20,
  },
  logoutBtnPremium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutBtnTextPremium: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomNavPremium: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  navItemPremium: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  navIconPremium: {
    fontSize: 22,
    opacity: 0.4,
    marginBottom: 4,
  },
  navIconActivePremium: {
    opacity: 1,
  },
  navLabelPremium: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  navLabelActivePremium: {
    color: '#29B6FF',
    fontWeight: '700',
  },
  navIndicatorPremium: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    backgroundColor: '#29B6FF',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  premiumScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  modalContentHeader: {
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  premiumModalSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  stepProgressPercentage: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderRadius: 3,
  },
  stepContent: {
    marginTop: 8,
  },
  premiumInputSectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  premiumLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 10,
  },
  modalTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageEmojiSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
  },
  emojiChipSelected: {
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
    backgroundColor: COLORS.SELLER_PRIMARY_LIGHT,
  },
  emojiChipText: {
    fontSize: 20,
  },
  uploadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 20,
  },
  uploadPreviewText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  uploadPreviewEmoji: {
    fontSize: 32,
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  horizontalChipRow: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  categoryChipGrid: {
    width: '48%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 8,
  },
  categoryListWrap: {
    marginBottom: 12,
    gap: 8,
  },
  categoryRowItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryRowItemSelected: {
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  categoryRowText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  categoryRowTextSelected: {
    color: COLORS.WHITE,
  },
  categoryChipHorizontal: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    maxWidth: 180,
    minWidth: 100,
  },
  uploadThumbWrap: {
    width: 96,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
  },
  uploadThumb: {
    width: '100%',
    height: '100%',
  },
  uploadThumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadThumbRemoveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadAddTile: {
    width: 96,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  uploadAddTileText: {
    color: COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
    textAlign: 'center',
  },
  categoryChip: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  categoryChipSelected: {
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  categoryChipTextSelected: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  livePreviewCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: PREMIUM_COLORS.SECONDARY,
    shadowColor: PREMIUM_COLORS.SELLER_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    marginBottom: 24,
  },
  livePreviewEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  livePreviewContent: {
    flex: 1,
  },
  livePreviewTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  livePreviewOffer: {
    fontSize: FONT_SIZES.SM,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginTop: 2,
  },
  livePreviewCity: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  publishActionBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishActionBtnDisabled: {
    opacity: 0.7,
  },
  publishActionBtnText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  closeLeadsBtnText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // NEW SORT UI STYLES
  campaignSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sortLabel: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    marginRight: 6,
    marginLeft: 6,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortBtnActive: {
    backgroundColor: COLORS.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortBtnText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  sortBtnTextActive: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  premiumModalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  // SUCCESS ANIMATION STYLES
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: PREMIUM_COLORS.SUCCESS,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },

  // MODAL STYLING DEFAULT (LEADS)
  modalContentLeads: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  modalSubmitBtn: {
    flex: 2,
  },
  deleteCampaignBtn: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  deleteCampaignBtnText: {
    color: '#EF4444',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },

  premiumModalButtonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalBackBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  modalBackText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 16,
  },
  publishActionBtn: {
    flex: 2,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  publishActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  publishActionBtnDisabled: {
    opacity: 0.6,
  },

  // LEADS VIEW MODAL SPECIFICS
  leadsScrollView: {
    marginVertical: 12,
  },
  emptyLeadsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  leadCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  leadCardInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  leadPhone: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  leadStatusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadStatusText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  closeLeadsBtn: {
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  closeLeadsBtnText: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.BASE,
  },
  notificationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  notificationsPanel: {
    maxHeight: '86%',
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.48)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 18,
    overflow: 'hidden',
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  notificationsBell: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  notificationsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  notificationsSubtitle: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '700',
    marginTop: 2,
  },
  notificationsCampaignName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 6,
  },
  notificationCardWrap: {
    marginVertical: 8,
  },
  notificationCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 7,
    overflow: 'hidden',
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  buyerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  notificationInfo: {
    flex: 1,
    gap: 5,
  },
  notificationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  notificationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  notificationMetaText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '800',
    maxWidth: 70,
    textAlign: 'right',
  },
  newLeadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(219,234,254,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237,0.22)',
    overflow: 'hidden',
  },
  newLeadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  newLeadBadgeText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
  },
  newLeadBadgeReadText: {
    color: '#475569',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  notificationActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 2,
  },
  notificationActionText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '800',
  },
  notificationsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  markReadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  markReadText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
  },
  doneGradientWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  doneGradientBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  doneGradientText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyNotificationsContainer: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 10,
  },
  emptyBellWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237,0.14)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  emptyNotificationsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyNotificationsText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },

  // PLANS MODAL SPECIFICS
  plansModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  plansModalContent: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    height: '85%',
  },
  plansModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  plansModalTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  plansCloseBtn: {
    padding: 6,
  },
  plansCloseBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  plansScrollContent: {
    paddingBottom: 20,
  },
  planCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    position: 'relative',
  },
  planCardFeatured: {
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  featuredBadgeText: {
    color: COLORS.WHITE,
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planName: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  planNameFeatured: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  planPrice: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  planPriceFeatured: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  planPricePeriod: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  planPricePeriodFeatured: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.SELLER_PRIMARY_LIGHT,
  },
  planDesc: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 14,
  },
  planDescFeatured: {
    fontSize: FONT_SIZES.XS,
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    marginBottom: 14,
  },
  planDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginBottom: 14,
  },
  planFeatures: {
    marginBottom: 18,
    gap: 8,
  },
  planFeatureText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  planFeatureTextFeatured: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  planBtnCurrent: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  planBtnTextCurrent: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  planBtnUpgrade: {
    backgroundColor: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  planBtnTextUpgrade: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  planBtnPro: {
    backgroundColor: COLORS.TEXT_PRIMARY,
  },
  planBtnTextPro: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  planBtnContact: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: PREMIUM_COLORS.SELLER_PRIMARY,
  },
  planBtnTextContact: {
    color: PREMIUM_COLORS.SELLER_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },

  // --- LOCATION GLASSMORPHISM STYLES ---
  locationAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginVertical: 12,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  locationAddressBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 20,
  },
  locationAddressBoxPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  locationBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  locationGlassBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237,0.35)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  locationGlassBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  locationGlassBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(219,234,254,0.75)',
    overflow: 'hidden',
  },
  locationGlassBtnText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },

  // --- SELLER PROFILE REDESIGN STYLES ---
  sellerProfileScrollContent: {
    paddingBottom: 140,
  },
  sellerProfileGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sellerAvatarContainer: {
    position: 'relative',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerAvatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
  },
  sellerAvatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarFallbackText: {
    fontSize: 34,
    fontWeight: '800',
  },
  sellerCameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  sellerProfileTextBlock: {
    flex: 1,
    marginLeft: 16,
    minWidth: 0,
    justifyContent: 'center',
  },
  sellerVerifiedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 4,
  },
  sellerVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sellerProfileNameTextMinimal: {
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
    marginBottom: 2,
  },
  sellerBusinessNameTextMinimal: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    marginBottom: 4,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  sellerSettingsCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    paddingTop: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  sellerCardHeaderTitle: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sellerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  sellerOptionPressed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  sellerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  sellerOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  sellerOptionLabelText: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  sellerLogoutSection: {
    marginHorizontal: 12,
    marginBottom: 24,
  },
  sellerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  sellerLogoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // --- TARGET CITIES MULTI-SELECT STYLES ---
  allIndiaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
    marginTop: 4,
    marginBottom: 8,
  },
  allIndiaBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  allIndiaBtnText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: '#7C3AED',
  },
  allIndiaBtnTextActive: {
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityTagText: {
    fontSize: FONT_SIZES.SM,
    color: '#1E40AF',
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  citySearchWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  citySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  citySearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: '#0F172A',
    padding: 0,
  },
  suggestionsBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionItemPressed: {
    backgroundColor: '#F0F9FF',
  },
  suggestionText: {
    fontSize: FONT_SIZES.SM,
    color: '#0F172A',
  },

  // --- INLINE LOCATION SEARCH STYLES ---
  inlineLocationSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  inlineLocationSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0C1445',
    padding: 0,
  },
  inlineLocationSuggestionsList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  inlineLocationSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inlineLocationSuggestionMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C1445',
  },
  inlineLocationSuggestionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // â”€â”€ Seller New Message Notification Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sellerMsgNotifContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 20,
  },
  sellerMsgNotifGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sellerMsgNotifLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerMsgNotifTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  sellerMsgNotifBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    lineHeight: 17,
  },
  sellerMsgNotifRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerMsgNotifViewBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sellerMsgNotifViewText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  crmContainer: {
    flex: 1,
  },
  crmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  crmBackBtn: {
    marginRight: 16,
  },
  crmHeaderTitles: {
    flex: 1,
  },
  crmHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  crmHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  crmSearchBtn: {
    marginLeft: 16,
  },
  crmFilterWrapper: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  crmFilterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  crmFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  crmFilterChipActive: {
    backgroundColor: 'rgba(139, 92, 246,0.08)',
    borderColor: 'rgba(139, 92, 246,0.3)',
  },
  crmFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  crmFilterTextActive: {
    color: '#7C3AED',
  },
  crmListContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  crmCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // Revert to softer translucency
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderLeftWidth: 5,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  crmCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  crmCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  crmAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  crmAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  crmBuyerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  crmPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crmBuyerPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  crmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crmBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  crmCardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 14,
  },
  crmCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crmDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crmDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  crmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  crmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    gap: 4,
  },
  crmActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  crmEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  crmEmptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  crmFloatingFooter: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 100,
  },
  crmMarkReadBtn: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  crmMarkReadPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  crmMarkReadText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
  },
});
