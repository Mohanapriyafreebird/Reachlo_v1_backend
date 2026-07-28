import React, { useState, useRef, useEffect } from 'react';
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

const GOOGLE_PLACES_API_KEY = 'AIzaSyBqi9sSzxZk_uOmzlwESS0HPX5gRz9vnxo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PREMIUM_COLORS = {
  PRIMARY: '#2563EB',
  SECONDARY: '#0EA5E9',
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

function LeadNotificationCard({ lead, onDismiss, onCall, onWhatsApp, onView }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isUnread = lead.status === 'NEW' && !lead.isRead;

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
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dy) < 12,
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
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.notificationCardWrap,
        {
          opacity,
          transform: [{ translateX }, { scale }],
        },
      ]}
    >
      <Pressable onPress={onView} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <BlurView intensity={38} tint="light" style={styles.notificationCard}>
          <View style={styles.notificationTopRow}>
            <LinearGradient colors={['#56CCF2', '#2F80ED']} style={styles.buyerAvatar}>
              <Text style={styles.buyerAvatarText}>{getLeadInitials(lead.name)}</Text>
            </LinearGradient>

            <View style={styles.notificationInfo}>
              <View style={styles.notificationNameRow}>
                <Text style={styles.notificationName} numberOfLines={1}>{lead.name}</Text>
                <View style={styles.newLeadBadge}>
                  {isUnread ? <View style={styles.newLeadDot} /> : <Ionicons name="checkmark-circle" size={12} color="#2563EB" />}
                  <Text style={[styles.newLeadBadgeText, !isUnread && styles.newLeadBadgeReadText]}>
                    {isUnread ? 'NEW' : 'READ'}
                  </Text>
                </View>
              </View>

              <View style={styles.notificationMetaRow}>
                <Ionicons name="call-outline" size={13} color="#2563EB" />
                <Text style={styles.notificationMetaText}>{lead.phone}</Text>
              </View>
              <View style={styles.notificationMetaRow}>
                <Ionicons name="pricetag-outline" size={13} color="#2563EB" />
                <Text style={styles.notificationMetaText} numberOfLines={1}>
                  {lead.campaignTitle || 'Campaign offer'}
                </Text>
              </View>
            </View>

            <Text style={styles.notificationTime}>{getRelativeLeadTime(lead.createdAt)}</Text>
          </View>

          <View style={styles.notificationActions}>
            <Pressable style={styles.notificationActionBtn} onPress={onCall}>
              <Ionicons name="call" size={16} color="#2563EB" />
              <Text style={styles.notificationActionText}>Call</Text>
            </Pressable>
            <Pressable style={styles.notificationActionBtn} onPress={onWhatsApp}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#3B82F6" />
              <Text style={styles.notificationActionText}>Chat</Text>
            </Pressable>
            <Pressable style={styles.notificationActionBtn} onPress={onView}>
              <Ionicons name="eye-outline" size={16} color="#2563EB" />
              <Text style={styles.notificationActionText}>Details</Text>
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}
 
 // All major Indian cities
const ALL_INDIA_CITIES = [
  'Agra','Ahmedabad','Aizawl','Ajmer','Akola','Aligarh','Allahabad','Alwar','Amaravati','Amravati',
  'Amritsar','Anantapur','Asansol','Aurangabad','Bangalore','Bareilly','Belgaum','Bhilai','Bhopal',
  'Bhubaneswar','Bikaner','Chandigarh','Chennai','Coimbatore','Cuttack','Davanagere','Dehradun',
  'Delhi','Dhanbad','Durg','Erode','Faridabad','Firozabad','Ghaziabad','Gorakhpur','Guntur','Gurgaon',
  'Guwahati','Gwalior','Hubli','Hyderabad','Imphal','Indore','Itanagar','Jaipur','Jalandhar','Jammu',
  'Jamnagar','Jamshedpur','Jhansi','Jodhpur','Kakinada','Kochi','Kohima','Kolhapur','Kolkata','Kota',
  'Kozhikode','Ludhiana','Lucknow','Madurai','Mangalore','Meerut','Mumbai','Mysore','Nagpur','Nashik',
  'Nellore','Noida','Panaji','Patna','Pondicherry','Pune','Raipur','Rajkot','Ranchi','Rourkela',
  'Salem','Shillong','Shimla','Siliguri','Solapur','Srinagar','Surat','Thane','Thiruvananthapuram',
  'Tirunelveli','Tirupati','Udaipur','Ujjain','Vadodara','Varanasi','Vijayawada','Visakhapatnam',
  'Warangal','Rajkot','Tiruchirapalli','Hubli-Dharwad','Bhiwandi','Saharanpur','Gorakhpur','Guntur'
].sort();

export default function SellerDashboardScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useAuth();
  
  // Navigation State: 'Home' | 'Campaigns' | 'Profile'
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
        leads: fetchedLeads.filter(l => l.campaign_id === camp.id).map(l => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          status: l.label,
          message: l.message,
          isRead: l.is_read,
          createdAt: l.created_at,
          campaignTitle: l.campaign_title || camp.title,
        })),
        businessName: camp.business_name || user?.name || 'Your Business',
        businessVerified: camp.business_verified ?? user?.verified ?? false,
      }));
      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

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
    if (liveSortBy === 'views') return b.views - a.views;
    return b.leadsCount - a.leadsCount;
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
        business: { name: lead.name } // Buyer's name
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
    const unread = leads.filter(lead => lead.status === 'NEW' && !lead.isRead);
    if (unread.length === 0) return;
    
    // Optimistic local update
    setCampaigns(prev => prev.map(camp => ({
      ...camp,
      leads: camp.leads.map(lead => (
        unread.some(item => item.id === lead.id)
          ? { ...lead, isRead: true }
          : lead
      )),
    })));

    try {
      await Promise.all(unread.map(lead => apiService.put(`/leads/${lead.id}`, { is_read: true })));
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

  const handleTabChange = (tab) => {
    contentFadeAnim.setValue(0);
    setActiveTab(tab);
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
    setLocationAddress(camp.locationAddress || '');
    setLocationLat(camp.latitude ?? null);
    setLocationLon(camp.longitude ?? null);
    setLocationPlaceId(camp.google_place_id || null);
    setLocationSelected(Boolean(camp.locationAddress || camp.latitude || camp.longitude));
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
    if (!campCategory.trim() || !campSubCategory.trim() || !campCity.trim()) {
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

  const pickImage = async () => {
    if (campImages.length >= MAX_CAMPAIGN_IMAGES) {
      Alert.alert('Image Limit', `You can upload up to ${MAX_CAMPAIGN_IMAGES} images per campaign.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setIsSmartCropping(true);
        try {
          const cropped = await smartCenterCrop(result.assets[0].uri);
          setImageReview({
            uri: cropped.uri,
            meta: {
              fileName: cropped.fileName,
              mimeType: cropped.mimeType,
            },
            sourceUri: result.assets[0].uri,
          });
        } catch (err) {
          console.warn('Smart crop failed:', err);
          Alert.alert('Error', 'Could not process image. Please try again.');
        } finally {
          setIsSmartCropping(false);
        }
      }
    } catch (err) {
      console.warn('ImagePicker error:', err);
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    }
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
      case 'NEW': return '#3B82F6';
      case 'COLD': return '#6B7280';
      default: return COLORS.TEXT_SECONDARY;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['50%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* SECTION 1: HEADER */}
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
        <Text style={[styles.logoText, { color: '#2563EB' }]}>Reachlo</Text>
        <View style={styles.headerRight}>
          <Pressable 
            style={[styles.bellContainer, { marginRight: 8 }]}
            onPress={() => navigation.navigate('SellerMessages')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#1E293B" />
          </Pressable>
          <Pressable 
            style={styles.bellContainer}
            onPress={() => setNotificationsModalVisible(true)}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {allNewLeads.length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{allNewLeads.length}</Text>
              </View>
            )}
          </Pressable>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#38BDF8' }]}>
            <Text style={[styles.avatarText, { color: '#2563EB' }]}>
              {getFirstLetter(user?.name)}
            </Text>
          </View>
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
              <LinearGradient colors={['#0C1445', '#1E3A8A']} style={styles.glassPremiumCard}>
                <View style={styles.premiumBannerInner}>
                  <View style={styles.premiumBannerLeft}>
                    <Text style={styles.premiumCrownIcon}>👑</Text>
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
              <Text style={styles.growthMonthLabel}>YOUR GROWTH THIS MONTH</Text>
              <View style={styles.kpiRow}>
                <BlurView intensity={20} tint="light" style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>👁️</Text>
                  <View>
                    <Text style={styles.kpiValue}>{totalViews}</Text>
                    <Text style={styles.kpiLabel}>Views</Text>
                  </View>
                </BlurView>
                <BlurView intensity={20} tint="light" style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>⚡</Text>
                  <View>
                    <Text style={styles.kpiValue}>{totalLeads}</Text>
                    <Text style={styles.kpiLabel}>Leads</Text>
                  </View>
                </BlurView>
                <BlurView intensity={20} tint="light" style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>📢</Text>
                  <View>
                    <Text style={styles.kpiValue}>{activeCount}</Text>
                    <Text style={styles.kpiLabel}>Active</Text>
                  </View>
                </BlurView>
              </View>

              {/* SECTION 3: Action Cards (Replaces old Main CTA) */}
              <Text style={[styles.subsectionTitle, { marginBottom: 12 }]}>Launch Campaign</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingRight: 20, paddingBottom: 16, gap: 12 }}
              >
                {/* Card 1: Generate with AI (Placed first to emphasize) */}
                <Pressable 
                  onPress={() => navigation.navigate('AICampaignGenerate')} 
                  style={{ width: 180, height: 140, borderRadius: 16, overflow: 'hidden' }}
                >
                  <LinearGradient colors={['#38BDF8', '#1A73E8']} style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>NEW</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Generate with AI</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Instant, professional campaigns</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Card 2: Build Manually */}
                <Pressable 
                  onPress={openCreateCampaign} 
                  style={{ width: 180, height: 140, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 16, justifyContent: 'space-between' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="construct-outline" size={20} color="#1A73E8" />
                  </View>
                  <View>
                    <Text style={{ color: '#1F2937', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Build Manually</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>Create your campaign step by step</Text>
                  </View>
                </Pressable>
              </ScrollView>

              {/* SECTION 4: MY CAMPAIGNS */}

              {/* Your Campaigns Section */}
              <Text style={styles.subsectionTitle}>Your Campaigns</Text>
              {liveCampaigns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Create Your First Campaign</Text>
                  <Text style={styles.emptyText}>
                    Reach local buyers, generate leads, and grow your business without expensive advertising.
                  </Text>
                  <PrimaryButton
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
              <Text style={styles.sectionTitle}>All Campaigns</Text>
              <Text style={styles.sectionSubtitle}>
                Manage and view statistics of all campaigns you have run.
              </Text>

              {/* LIVE CAMPAIGNS SECTION */}
              <View style={styles.campaignSectionHeaderRow}>
                <Text style={styles.subsectionTitle}>Live Campaigns</Text>
                <View style={styles.sortToggleRow}>
                  <Text style={styles.sortLabel}>Sort by:</Text>
                  <Pressable 
                    style={[styles.sortBtn, liveSortBy === 'views' && styles.sortBtnActive]}
                    onPress={() => setLiveSortBy('views')}
                  >
                    <Text style={[styles.sortBtnText, liveSortBy === 'views' && styles.sortBtnTextActive]}>Views</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.sortBtn, liveSortBy === 'leads' && styles.sortBtnActive]}
                    onPress={() => setLiveSortBy('leads')}
                  >
                    <Text style={[styles.sortBtnText, liveSortBy === 'leads' && styles.sortBtnTextActive]}>Leads</Text>
                  </Pressable>
                </View>
              </View>

              {sortedLiveCampaigns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Live Campaigns</Text>
                  <Text style={styles.emptyText}>You don't have any currently active campaigns.</Text>
                  <PrimaryButton
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
                <Text style={styles.subsectionTitle}>Past Campaigns</Text>
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
              {/* Premium Profile Header */}
              <View style={styles.sellerProfileHeaderMinimal}>
                <View style={styles.sellerProfileGlassCard}>
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
                      <Image source={{ uri: resolveMediaUrl(user.profile_picture) }} style={styles.sellerAvatarImage} />
                    ) : (
                      <View style={styles.sellerAvatarFallback}>
                        <Text style={styles.sellerAvatarFallbackText}>
                          {(user?.name || 'S').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.sellerCameraIconBadge}>
                      <Ionicons name="camera" size={12} color="#FFF" />
                    </View>
                  </Pressable>

                  <Text style={styles.sellerProfileNameTextMinimal}>{user?.name || 'Seller Name'}</Text>
                  <Text style={styles.sellerBusinessNameTextMinimal}>{businessName || 'Business Name'}</Text>
                </View>
              </View>

              {/* Business Statistics Card */}
              <View style={styles.statsCardPremium}>
                <View style={styles.statItemPremium}>
                  <View style={styles.statIconBadge}>
                    <Ionicons name="megaphone-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.statValuePremium}>{activeCount}</Text>
                  <Text style={styles.statLabelPremium}>Campaigns</Text>
                </View>
                <View style={styles.statItemPremium}>
                  <View style={styles.statIconBadge}>
                    <Ionicons name="people-outline" size={20} color="#059669" />
                  </View>
                  <Text style={styles.statValuePremium}>{totalLeads}</Text>
                  <Text style={styles.statLabelPremium}>Leads</Text>
                </View>
                <View style={styles.statItemPremium}>
                  <View style={styles.statIconBadge}>
                    <Ionicons name="eye-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValuePremium}>{totalViews}</Text>
                  <Text style={styles.statLabelPremium}>Views</Text>
                </View>
              </View>

              {/* Account Settings Section */}
              <View style={styles.sellerSettingsCard}>
                <Text style={styles.sellerCardHeaderTitle}>Account Settings</Text>

                {/* Edit Profile */}
                <Pressable 
                  onPress={() => navigation.navigate('SellerEditProfile')}
                  style={({ pressed }) => [styles.sellerOptionRow, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <Ionicons name="person-outline" size={20} color="#2563EB" style={styles.sellerOptionIcon} />
                    <Text style={styles.sellerOptionLabelText}>Edit Profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* Change Password */}
                <Pressable 
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={({ pressed }) => [styles.sellerOptionRow, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <Ionicons name="lock-closed-outline" size={20} color="#2563EB" style={styles.sellerOptionIcon} />
                    <Text style={styles.sellerOptionLabelText}>Change Password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* Edit Business Details */}
                <Pressable 
                  onPress={() => navigation.navigate('SellerEditBusiness')}
                  style={({ pressed }) => [styles.sellerOptionRow, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <Ionicons name="business-outline" size={20} color="#2563EB" style={styles.sellerOptionIcon} />
                    <Text style={styles.sellerOptionLabelText}>Edit Business Details</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* Help & Support */}
                <Pressable 
                  onPress={() => Alert.alert('Help & Support', 'For seller assistance, email partner@reachlo.com')}
                  style={({ pressed }) => [styles.sellerOptionRow, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <Ionicons name="help-circle-outline" size={20} color="#2563EB" style={styles.sellerOptionIcon} />
                    <Text style={styles.sellerOptionLabelText}>Help & Support</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>

                {/* About Reachlo */}
                <Pressable 
                  onPress={() => Alert.alert('About Reachlo', 'Reachlo Seller Dashboard v1.0.0. Grow Your Business.')}
                  style={({ pressed }) => [styles.sellerOptionRow, pressed && styles.sellerOptionPressed]}
                >
                  <View style={styles.sellerOptionLeft}>
                    <Ionicons name="information-circle-outline" size={20} color="#2563EB" style={styles.sellerOptionIcon} />
                    <Text style={styles.sellerOptionLabelText}>About Reachlo</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
                  style={({ pressed }) => [styles.sellerLogoutButton, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.sellerLogoutButtonText}>Log Out</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </Animated.View>

      {/* FLOATING GLASS BOTTOM NAV */}
      <View style={styles.sellerFloatingNavWrapper}>
        <BlurView intensity={60} tint="light" style={styles.sellerFloatingNav}>
          <Pressable
            onPress={() => handleTabChange('Home')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Home' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.sellerNavActivePill}>
                <Text style={styles.sellerNavActiveIcon}>🏠</Text>
                <Text style={styles.sellerNavLabelActive}>Home</Text>
              </LinearGradient>
            ) : (
              <>
                <Text style={styles.sellerNavInactiveIcon}>🏠</Text>
                <Text style={styles.sellerNavLabel}>Home</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('Campaigns')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Campaigns' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.sellerNavActivePill}>
                <Text style={styles.sellerNavActiveIcon}>📢</Text>
                <Text style={styles.sellerNavLabelActive}>Campaigns</Text>
              </LinearGradient>
            ) : (
              <>
                <Text style={styles.sellerNavInactiveIcon}>📢</Text>
                <Text style={styles.sellerNavLabel}>Campaigns</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('Profile')}
            style={styles.sellerNavItem}
          >
            {activeTab === 'Profile' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.sellerNavActivePill}>
                <Text style={styles.sellerNavActiveIcon}>👤</Text>
                <Text style={styles.sellerNavLabelActive}>Profile</Text>
              </LinearGradient>
            ) : (
              <>
                <Text style={styles.sellerNavInactiveIcon}>👤</Text>
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
          <View style={styles.plansModalContent}>
            <View style={styles.plansModalHeader}>
              <Text style={styles.plansModalTitle}>Choose Your Growth Plan</Text>
              <Pressable onPress={() => setPlansModalVisible(false)} style={styles.plansCloseBtn}>
                <Text style={styles.plansCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.plansScrollContent}>
              {/* STARTER CARD */}
              <View style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>STARTER</Text>
                  <Text style={styles.planPrice}>₹0<Text style={styles.planPricePeriod}>/month</Text></Text>
                </View>
                <Text style={styles.planDesc}>Perfect for getting started</Text>
                <View style={styles.planDivider} />
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeatureText}>✓ 2 Active Campaigns</Text>
                  <Text style={styles.planFeatureText}>✓ Lead Inbox</Text>
                  <Text style={styles.planFeatureText}>✓ Basic Analytics</Text>
                  <Text style={styles.planFeatureText}>✓ Business Profile</Text>
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
              <View style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>SCALE</Text>
                  <Text style={styles.planPrice}>₹1,499<Text style={styles.planPricePeriod}>/month</Text></Text>
                </View>
                <Text style={styles.planDesc}>Best for serious growth</Text>
                <View style={styles.planDivider} />
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeatureText}>✓ Unlimited Campaigns</Text>
                  <Text style={styles.planFeatureText}>✓ Advanced Analytics</Text>
                  <Text style={styles.planFeatureText}>✓ Lead Export (CSV)</Text>
                  <Text style={styles.planFeatureText}>✓ Verified Business Badge</Text>
                  <Text style={styles.planFeatureText}>✓ Priority Support</Text>
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
              <View style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>AGENCY</Text>
                  <Text style={styles.planPrice}>₹3,999<Text style={styles.planPricePeriod}>/month</Text></Text>
                </View>
                <Text style={styles.planDesc}>For agencies & teams</Text>
                <View style={styles.planDivider} />
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeatureText}>✓ Unlimited Campaigns</Text>
                  <Text style={styles.planFeatureText}>✓ Manage 5 Accounts</Text>
                  <Text style={styles.planFeatureText}>✓ Team Access</Text>
                  <Text style={styles.planFeatureText}>✓ Dedicated Support</Text>
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

          <Animated.View style={[styles.premiumModalSheet, { transform: [{ translateY: slideModalAnim }] }]}>
            {/* Glass Handle Bar */}
            <View style={styles.glassHandleWrap}>
              <View style={styles.modalHandle} />
            </View>

            {showSuccess ? (
              <View style={styles.successContainer}>
                <Animated.Text style={[styles.successIcon, { transform: [{ scale: successScaleAnim }] }]}>
                  ✓
                </Animated.Text>
                <Text style={styles.successTitle}>Campaign Live</Text>
                <Text style={styles.successSubtitle}>Your offer is now visible to buyers</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.premiumScrollContent}>
                <View style={styles.modalContentHeader}>
                  <Text style={styles.premiumModalTitle}>
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
                    <Text style={[styles.stepLabelText, step === 1 && styles.stepLabelActive]}>Basic Info</Text>
                    <Text style={[styles.stepLabelText, step === 2 && styles.stepLabelActive]}>Audience</Text>
                    <Text style={[styles.stepLabelText, step === 3 && styles.stepLabelActive]}>Publish</Text>
                  </View>
                </View>

                {/* STEP 1: Basic Info */}
                {step === 1 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.premiumInputSectionTitle}>Basic Info</Text>

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
                            <Text style={styles.uploadAreaTitle}>Campaign Image</Text>
                            <Text style={styles.uploadAreaSubtitle}>Drag or Upload</Text>
                            <Text style={styles.uploadAreaHint}>Recommended: 1200×900 (4:3)</Text>
                            <Text style={styles.uploadAreaFormats}>PNG, JPG</Text>
                            <View style={styles.uploadDivider} />
                          </>
                        )}
                      </Pressable>
                    )}

                    <View style={styles.cardInput}>
                      <Text style={styles.cardInputLabel}>Campaign Title</Text>
                      <TextInput
                        value={campTitle}
                        onChangeText={setCampTitle}
                        placeholder="e.g. Transform Your Mind and Body with Yoga"
                        placeholderTextColor="#94A3B8"
                        style={styles.cardInputField}
                      />
                    </View>

                    <View style={styles.cardInput}>
                      <Text style={styles.cardInputLabel}>Description</Text>
                      <TextInput
                        value={campDesc}
                        onChangeText={setCampDesc}
                        placeholder="Describe what customers get, instructions, terms..."
                        placeholderTextColor="#94A3B8"
                        style={[styles.cardInputField, styles.cardInputMultiline]}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <View style={styles.cardInput}>
                      <Text style={styles.cardInputLabel}>Offer Line</Text>
                      <TextInput
                        value={campOfferLine}
                        onChangeText={setCampOfferLine}
                        placeholder="e.g. First Week Free"
                        placeholderTextColor="#94A3B8"
                        style={styles.cardInputField}
                      />
                    </View>

                                    <View style={styles.locationCardWrapper}>
                                      <BlurView intensity={55} tint="light" style={styles.locationCard}>
                                        <View style={styles.locationTopRow}>
                                          <Text style={styles.locationTitle}>📍 Business Location</Text>
                                          <Text style={styles.locationNote}>Optional but recommended for better nearby recommendations.</Text>
                                        </View>

                                        {/* Glassmorphism address display box */}
                                        <BlurView intensity={30} tint="light" style={styles.locationAddressBox}>
                                          <Ionicons name="location" size={16} color={locationSelected ? '#2563EB' : '#94A3B8'} style={{ marginRight: 8 }} />
                                          <Text style={[styles.locationAddressBoxText, !locationSelected && styles.locationAddressBoxPlaceholder]} numberOfLines={3}>
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
                                            <BlurView intensity={60} tint="light" style={styles.locationGlassBtnInner}>
                                              <Ionicons name="locate" size={16} color="#2563EB" style={{ marginRight: 6 }} />
                                              <Text style={styles.locationGlassBtnText}>Use Current Location</Text>
                                            </BlurView>
                                          </Pressable>

                                        </View>

                                        {/* Inline Search Bar */}
                                        <View style={styles.inlineLocationSearchBar}>
                                          <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                                          <TextInput
                                            style={styles.inlineLocationSearchInput}
                                            placeholder="Search business address..."
                                            placeholderTextColor="#94A3B8"
                                            value={locationSearch}
                                            onChangeText={handleLocationSearchChange}
                                            returnKeyType="search"
                                          />
                                          {locationSearchLoading && <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 6 }} />}
                                          {locationSearch.length > 0 && !locationSearchLoading && (
                                            <Pressable onPress={() => { setLocationSearch(''); setLocationSuggestions([]); }}>
                                              <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                            </Pressable>
                                          )}
                                        </View>

                                        {/* Suggestions */}
                                        {locationSuggestions.length > 0 && (
                                          <View style={styles.inlineLocationSuggestionsList}>
                                            {locationSuggestions.map((pred) => (
                                              <Pressable
                                                key={pred.place_id}
                                                style={({ pressed }) => [styles.inlineLocationSuggestionItem, pressed && { backgroundColor: '#F0F9FF' }]}
                                                onPress={() => handleSelectLocationSuggestion(pred)}
                                              >
                                                <Ionicons name="location-outline" size={14} color="#2563EB" style={{ marginRight: 8, marginTop: 2 }} />
                                                <View style={{ flex: 1 }}>
                                                  <Text style={styles.inlineLocationSuggestionMain} numberOfLines={1}>
                                                    {pred.structured_formatting?.main_text || pred.description}
                                                  </Text>
                                                  <Text style={styles.inlineLocationSuggestionSub} numberOfLines={1}>
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
                    <Text style={styles.premiumInputSectionTitle}>Audience</Text>

                    <Text style={styles.premiumLabel}>Category</Text>
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
                            campCategory === cat && styles.categoryChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              campCategory === cat && styles.categoryChipTextSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {truncateChipLabel(cat, 3)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.premiumLabel}>Subcategory</Text>
                    <View style={styles.categoryGrid}>
                      {(CATEGORY_MAP[campCategory] || []).map((sub) => (
                        <Pressable
                          key={sub}
                          onPress={() => setCampSubCategory(sub)}
                          style={[
                            styles.categoryChipGrid,
                            campSubCategory === sub && styles.categoryChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              campSubCategory === sub && styles.categoryChipTextSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {truncateChipLabel(sub, 4)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.premiumLabel}>Target Cities</Text>
                    <View style={styles.cardInput}>
                      {/* All over India toggle */}
                      <Pressable
                        style={[
                          styles.allIndiaBtn,
                          selectedCities.includes(ALL_INDIA_TAG) && styles.allIndiaBtnActive
                        ]}
                        onPress={toggleAllIndia}
                      >
                        <Ionicons
                          name={selectedCities.includes(ALL_INDIA_TAG) ? 'checkmark-circle' : 'earth-outline'}
                          size={16}
                          color={selectedCities.includes(ALL_INDIA_TAG) ? '#FFFFFF' : '#2563EB'}
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
                    <Text style={styles.premiumInputSectionTitle}>Pricing & Preview</Text>

                    <View style={styles.cardInput}>
                      <Text style={styles.cardInputLabel}>Price (₹)</Text>
                      <TextInput
                        value={campPrice}
                        onChangeText={setCampPrice}
                        placeholder="e.g. 5000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={styles.cardInputField}
                      />
                    </View>

                    <Text style={styles.premiumLabel}>Campaign Start Date</Text>
                    <Pressable
                      onPress={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); setCalendarDate(campStartDate ? new Date(campStartDate) : new Date()); }}
                      style={styles.cardInput}
                    >
                      <Text style={[styles.cardInputField, !campStartDate && styles.placeholderText]}>
                        {campStartDate || 'Select start date'}
                      </Text>
                    </Pressable>

                    {showStartCalendar && (() => {
                      const yr = calendarDate.getFullYear();
                      const mo = calendarDate.getMonth();
                      const firstDay = new Date(yr, mo, 1).getDay();
                      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                      const today = new Date();
                      return (
                        <View style={styles.calendarCard}>
                          <View style={styles.calendarHeader}>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo - 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>‹</Text></Pressable>
                            <Text style={styles.calendarMonth}>{MONTHS[mo]} {yr}</Text>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo + 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>›</Text></Pressable>
                          </View>
                          <View style={styles.calendarWeekRow}>
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
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

                    <Text style={styles.premiumLabel}>Campaign End Date</Text>
                    <Pressable
                      onPress={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); setCalendarDate(campEndDate ? new Date(campEndDate) : (campStartDate ? new Date(campStartDate) : new Date())); }}
                      style={styles.cardInput}
                    >
                      <Text style={[styles.cardInputField, !campEndDate && styles.placeholderText]}>
                        {campEndDate || 'Select end date'}
                      </Text>
                    </Pressable>

                    {showEndCalendar && (() => {
                      const yr = calendarDate.getFullYear();
                      const mo = calendarDate.getMonth();
                      const firstDay = new Date(yr, mo, 1).getDay();
                      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                      return (
                        <View style={styles.calendarCard}>
                          <View style={styles.calendarHeader}>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo - 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>‹</Text></Pressable>
                            <Text style={styles.calendarMonth}>{MONTHS[mo]} {yr}</Text>
                            <Pressable onPress={() => setCalendarDate(new Date(yr, mo + 1, 1))} style={styles.calendarNavBtn}><Text style={styles.calendarNavText}>›</Text></Pressable>
                          </View>
                          <View style={styles.calendarWeekRow}>
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
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

                    <Text style={styles.premiumLabel}>Live Preview</Text>
                    <CampaignFeedCard
                      campaign={{
                        title: campTitle || 'Campaign Title',
                        offerLine: campOfferLine || 'Offer Line',
                        description: campDesc,
                        businessName: businessName || `${user?.name || 'Your'} Business`,
                        businessVerified: businessVerified,
                        city: campCity,
                        endDate: campEndDate,
                        price: campPrice ? parseFloat(campPrice) : 0,
                        imageUrl: campImages[0]?.uri,
                        imageUrls: campImages.map((img) => img.serverUrl || img.uri),
                        views: 0,
                        status: 'ACTIVE',
                      }}
                      onPress={() => {}}
                      onToggleSave={() => {}}
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

      {/* LEAD INBOX MODAL */}
      <Modal
        visible={leadsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLeadsModalVisible(false)}
      >
        <View style={styles.notificationsOverlay}>
          <BlurView intensity={65} tint="light" style={styles.notificationsPanel}>
            <View style={styles.notificationsHeader}>
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.notificationsBell}>
                <Ionicons name="mail-open-outline" size={34} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationsTitle}>Lead Inbox</Text>
                <Text style={styles.notificationsSubtitle} numberOfLines={1}>
                  {selectedCampaignForLeads?.leads?.filter(lead => lead.status === 'NEW' && !lead.isRead).length || 0} new leads
                </Text>
              </View>
            </View>
            <Text style={styles.notificationsCampaignName} numberOfLines={1}>
              {selectedCampaignForLeads?.title || 'Campaign leads'}
            </Text>

            <ScrollView style={styles.leadsScrollView} showsVerticalScrollIndicator={false}>
              {(selectedCampaignForLeads?.leads || []).filter(lead => !dismissedLeadIds.includes(lead.id)).length === 0 ? (
                <View style={styles.emptyNotificationsContainer}>
                  <BlurView intensity={35} tint="light" style={styles.emptyBellWrap}>
                    <Ionicons name="notifications-outline" size={54} color="#2563EB" />
                  </BlurView>
                  <Text style={styles.emptyNotificationsTitle}>No new notifications.</Text>
                  <Text style={styles.emptyNotificationsText}>
                    We'll notify you whenever a buyer shows interest.
                  </Text>
                </View>
              ) : (
                (selectedCampaignForLeads?.leads || [])
                  .filter(lead => !dismissedLeadIds.includes(lead.id))
                  .map((lead) => (
                    <LeadNotificationCard
                      key={lead.id}
                      lead={{ ...lead, campaignTitle: lead.campaignTitle || selectedCampaignForLeads?.title }}
                      onDismiss={dismissLeadNotification}
                      onCall={() => callLead(lead)}
                      onWhatsApp={() => chatLead({ ...lead, campaignTitle: lead.campaignTitle || selectedCampaignForLeads?.title })}
                      onView={() => viewLeadDetails({ ...lead, campaignTitle: lead.campaignTitle || selectedCampaignForLeads?.title })}
                    />
                  ))
              )}
            </ScrollView>

            <View style={styles.notificationsFooter}>
              <Pressable
                onPress={() => markLeadListAsRead(selectedCampaignForLeads?.leads || [])}
                style={styles.markReadBtn}
              >
                <Text style={styles.markReadText}>Mark all as Read</Text>
              </Pressable>
              <Pressable onPress={() => setLeadsModalVisible(false)} style={styles.doneGradientWrap}>
                <LinearGradient colors={['#2F80ED', '#56CCF2']} style={styles.doneGradientBtn}>
                  <Text style={styles.doneGradientText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL (NEW LEADS) */}
      <Modal
        visible={notificationsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.notificationsOverlay}>
          <BlurView intensity={65} tint="light" style={styles.notificationsPanel}>
            <View style={styles.notificationsHeader}>
              <LinearGradient colors={['#56CCF2', '#2F80ED']} style={styles.notificationsBell}>
                <Ionicons name="notifications" size={34} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationsTitle}>New Leads</Text>
                <Text style={styles.notificationsSubtitle}>{newLeadsTodayCount} fresh inquiries</Text>
              </View>
            </View>

            <ScrollView style={styles.leadsScrollView} showsVerticalScrollIndicator={false}>
              {allNewLeads.length === 0 ? (
                <View style={styles.emptyNotificationsContainer}>
                  <BlurView intensity={35} tint="light" style={styles.emptyBellWrap}>
                    <Ionicons name="notifications-outline" size={54} color="#2563EB" />
                  </BlurView>
                  <Text style={styles.emptyNotificationsTitle}>No new notifications.</Text>
                  <Text style={styles.emptyNotificationsText}>
                    We'll notify you whenever a buyer shows interest.
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
                  />
                ))
              )}
            </ScrollView>

            <View style={styles.notificationsFooter}>
              <Pressable onPress={() => markLeadListAsRead(allNewLeads)} style={styles.markReadBtn}>
                <Text style={styles.markReadText}>Mark all as Read</Text>
              </Pressable>
              <Pressable onPress={() => setNotificationsModalVisible(false)} style={styles.doneGradientWrap}>
                <LinearGradient colors={['#2F80ED', '#56CCF2']} style={styles.doneGradientBtn}>
                  <Text style={styles.doneGradientText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
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
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: COLORS.PRIMARY_LIGHT,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_ULTRA_LIGHT,
  },
  growthBannerTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: PREMIUM_COLORS.PRIMARY,
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
    color: '#2563EB',
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
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  kpiIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  kpiValue: {
    fontSize: 16,
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
    shadowColor: '#2563EB',
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
    color: '#2563EB',
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
    color: PREMIUM_COLORS.PRIMARY,
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
    shadowColor: '#2563EB',
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
    borderColor: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  imageActionBtnText: {
    color: '#2563EB',
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
    color: '#2563EB',
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
    color: '#2563EB',
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
    backgroundColor: '#2563EB',
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
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
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
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    borderColor: PREMIUM_COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
    borderColor: PREMIUM_COLORS.PRIMARY,
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
    color: COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
    borderColor: PREMIUM_COLORS.PRIMARY,
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
    shadowColor: PREMIUM_COLORS.PRIMARY,
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
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    shadowColor: '#2563EB',
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
    shadowColor: '#2563EB',
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
    color: '#2563EB',
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
    borderColor: 'rgba(37,99,235,0.22)',
    overflow: 'hidden',
  },
  newLeadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  newLeadBadgeText: {
    color: '#2563EB',
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
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  doneGradientWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2563EB',
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
    borderColor: 'rgba(37,99,235,0.14)',
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
    borderColor: PREMIUM_COLORS.PRIMARY,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    color: PREMIUM_COLORS.PRIMARY,
  },
  planPrice: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  planPriceFeatured: {
    color: PREMIUM_COLORS.PRIMARY,
  },
  planPricePeriod: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  planPricePeriodFeatured: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.PRIMARY_LIGHT,
  },
  planDesc: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 14,
  },
  planDescFeatured: {
    fontSize: FONT_SIZES.XS,
    color: PREMIUM_COLORS.PRIMARY,
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
    backgroundColor: PREMIUM_COLORS.PRIMARY,
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
    borderColor: PREMIUM_COLORS.PRIMARY,
  },
  planBtnTextContact: {
    color: PREMIUM_COLORS.PRIMARY,
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
    borderColor: 'rgba(37,99,235,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginVertical: 12,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#2563EB',
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
    borderColor: 'rgba(37,99,235,0.35)',
    shadowColor: '#2563EB',
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
    paddingBottom: 120,
  },
  sellerProfileHeaderMinimal: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  sellerProfileGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  sellerAvatarContainer: {
    position: 'relative',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sellerAvatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sellerAvatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarFallbackText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2563EB',
  },
  sellerCameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2563EB',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sellerProfileNameTextMinimal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
  },
  sellerBusinessNameTextMinimal: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
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
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sellerCardHeaderTitle: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: '#1E293B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sellerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sellerOptionPressed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  sellerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerOptionIcon: {
    marginRight: 12,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sellerOptionLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sellerLogoutSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sellerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
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
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    marginTop: 4,
    marginBottom: 8,
  },
  allIndiaBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  allIndiaBtnText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
});
