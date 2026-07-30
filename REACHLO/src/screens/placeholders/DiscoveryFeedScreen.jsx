import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import { resolveMediaUrl } from '../../config/apiConfig';
import CampaignFeedCard, { formatCampaignEndDate, formatPrice } from '../../components/CampaignFeedCard';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import API_CONFIG from '../../config/apiConfig';
import BusinessVerifiedBadge from '../../components/BusinessVerifiedBadge';
import { truncateChipLabel } from '../../constants/campaignCardConstants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import chatService from '../../services/chatService';
import CampaignDetailScreen from './CampaignDetailScreen';
// Service Data with Emoji icons and offer counts as specified
const SERVICES_DATA = [
  {
    id: 'it',
    title: 'IT & Technology',
    icon: require('../../../assets/ICONS/CATEGORY/it_and_technology.png'),
    offersCount: 125,
    subServices: [
      'Website Development',
      'Mobile App Development',
      'UI/UX Design',
      'Software Development',
      'Cloud Consulting',
      'Cybersecurity Services'
    ]
  },
  {
    id: 'edu',
    title: 'Education',
    icon: require('../../../assets/ICONS/CATEGORY/education.png'),
    offersCount: 84,
    subServices: [
      'Spoken English Classes',
      'IELTS Coaching',
      'UPSC Coaching',
      'NEET/JEE Coaching',
      'Coding Bootcamps',
      'AI Courses'
    ]
  },
  {
    id: 'health',
    title: 'Health',
    icon: require('../../../assets/ICONS/CATEGORY/health.png'),
    offersCount: 62,
    subServices: [
      'Gyms',
      'Fitness Centers',
      'Yoga Studios',
      'Personal Trainers',
      'Nutrition Consultants',
      'Physiotherapy Clinics'
    ]
  },
  {
    id: 'beauty',
    title: 'Beauty',
    icon: require('../../../assets/ICONS/CATEGORY/beauty.png'),
    offersCount: 95,
    subServices: [
      'Salons',
      'Spas',
      'Skin Clinics',
      'Hair Treatments',
      'Bridal Makeup',
      'Grooming Packages'
    ]
  },
  {
    id: 'food',
    title: 'Food',
    icon: require('../../../assets/ICONS/CATEGORY/food.png'),
    offersCount: 110,
    subServices: [
      'Cafes',
      'Restaurants',
      'Bakeries',
      'Cloud Kitchens',
      'Catering Services'
    ]
  },
  {
    id: 'events',
    title: 'Events',
    icon: require('../../../assets/ICONS/CATEGORY/events.png'),
    offersCount: 45,
    subServices: [
      'Wedding Planners',
      'Event Organizers',
      'Photography Services',
      'DJ Services',
      'Birthday Event Packages'
    ]
  },
  {
    id: 'realestate',
    title: 'Real Estate',
    icon: require('../../../assets/ICONS/CATEGORY/real_estate.jpg'),
    offersCount: 38,
    subServices: [
      'Property Sales',
      'Rental Services',
      'PG & Hostels',
      'Commercial Spaces',
      'Interior Design',
      'Vastu Consultation'
    ]
  },
  {
    id: 'transport',
    title: 'Transport & Delivery',
    icon: require('../../../assets/ICONS/CATEGORY/transport.jpg'),
    offersCount: 52,
    subServices: [
      'Peer-to-Peer Parcel Delivery',
      'Courier Services',
      'Packers & Movers',
      'Cab Services',
      'Bike Taxi',
      'Freight Transport'
    ]
  },
  {
    id: 'auto',
    title: 'Automotive',
    icon: require('../../../assets/ICONS/CATEGORY/automotive.jpg'),
    offersCount: 41,
    subServices: [
      'Car Service & Repair',
      'Bike Service',
      'Car Wash & Detailing',
      'Driving Schools',
      'Vehicle Insurance',
      'Spare Parts'
    ]
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: require('../../../assets/ICONS/CATEGORY/finance.jpg'),
    offersCount: 29,
    subServices: [
      'Tax Consultants',
      'Insurance Agents',
      'Loan Services',
      'Investment Advisory',
      'CA Services',
      'Mutual Funds'
    ]
  },
  {
    id: 'legal',
    title: 'Legal Services',
    icon: require('../../../assets/ICONS/CATEGORY/legal.jpg'),
    offersCount: 18,
    subServices: [
      'Lawyers',
      'Document Services',
      'Property Registration',
      'Company Registration',
      'GST Filing',
      'Patent & Trademark'
    ]
  },
  {
    id: 'home',
    title: 'Home Services',
    icon: require('../../../assets/ICONS/CATEGORY/home_services.jpg'),
    offersCount: 73,
    subServices: [
      'Electricians',
      'Plumbers',
      'AC Repair',
      'Painting',
      'Pest Control',
      'Cleaning Services'
    ]
  },
  {
    id: 'travel',
    title: 'Travel & Tourism',
    icon: require('../../../assets/ICONS/CATEGORY/travel.jpg'),
    offersCount: 34,
    subServices: [
      'Travel Agencies',
      'Tour Packages',
      'Visa Assistance',
      'Hotel Booking',
      'Pilgrimage Tours',
      'Adventure Activities'
    ]
  },
  {
    id: 'shopping',
    title: 'Shopping & Retail',
    icon: require('../../../assets/ICONS/CATEGORY/shopping.jpg'),
    offersCount: 67,
    subServices: [
      'Clothing & Fashion',
      'Electronics',
      'Grocery Stores',
      'Jewellery',
      'Furniture',
      'Gift Shops'
    ]
  }
];

const CategoryItem = ({ service, isSelected, onPress }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: isSelected ? 1.04 : 1,
      tension: 80,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isSelected ? 1.04 : 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: isSelected ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isSelected]);

  const borderColor = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(226,232,240,0.6)', 'rgba(37,99,235,0.8)'],
  });
  const shadowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.35],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.categoryCard,
          {
            borderColor: borderColor,
            shadowOpacity: shadowOpacity,
          },
          isSelected && styles.categoryCardSelected,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {/* Icon container */}
        {isSelected ? (
          <LinearGradient
            colors={['#DBEAFE', '#EFF6FF']}
            style={styles.categoryIconWrap}
          >
            <Image source={service.icon} style={styles.categoryIcon} />
          </LinearGradient>
        ) : (
          <View style={styles.categoryIconWrap}>
            <Image source={service.icon} style={styles.categoryIcon} />
          </View>
        )}

        {/* Name */}
        <Text
          style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}
          numberOfLines={1}
        >
          {service.title}
        </Text>

        {/* Offer count pill */}
        <View style={[styles.offerCountPill, isSelected && styles.offerCountPillActive]}>
          <Text style={[styles.offerCountText, isSelected && styles.offerCountTextActive]}>
            {service.offersCount}+ offers
          </Text>
        </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export default function DiscoveryFeedScreen() {
  const { user, logout, updateUserProfile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (route.params?.selectedCategoryId) {
      const categoryId = route.params.selectedCategoryId;
      const found = SERVICES_DATA.find((s) => s.id === categoryId);
      if (found) {
        setSelectedService(found);
        setSelectedSubService(found.subServices[0]);
        setActiveTab('Home');
      }
    }
  }, [route.params?.selectedCategoryId]);

  // Tabs: 'Home' | 'Saved' | 'Profile'
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');

  // Workflow states
  const [selectedService, setSelectedService] = useState(null); 
  const [selectedSubService, setSelectedSubService] = useState(null); 

  // Campaigns list
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offersNearby, setOffersNearby] = useState([]);
  const [fetchingNearby, setFetchingNearby] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [buyerLocation, setBuyerLocation] = useState(null);

  const displayServicesData = useMemo(() => {
    return SERVICES_DATA.map((service) => {
      const matchingCampaigns = campaigns.filter((camp) => camp.serviceId === service.id);
      const actualSubServices = Array.from(new Set(matchingCampaigns.map((camp) => camp.subService).filter(Boolean)));
      return {
        ...service,
        offersCount: matchingCampaigns.length,
        subServices: actualSubServices.length > 0 ? actualSubServices : service.subServices,
      };
    });
  }, [campaigns]);

  // Filter values
  const [priceFilter, setPriceFilter] = useState(''); 
  const [ratingFilter, setRatingFilter] = useState(''); 
  const [cityFilter, setCityFilter] = useState(user?.city || 'Chennai');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Active filters applied in logic
  const [appliedPrice, setAppliedPrice] = useState(null);
  const [appliedRating, setAppliedRating] = useState(null);
  const [appliedCity, setAppliedCity] = useState(user?.city || 'Chennai');
  // persist recently viewed and saved campaigns so activity survives logout
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const rv = await AsyncStorage.getItem(`recentlyViewed_${user.email}`);
        const sv = await AsyncStorage.getItem(`savedCampaigns_${user.email}`);
        if (rv) {
          const parsedRv = JSON.parse(rv);
          try {
            const rvIds = parsedRv.map(c => c.id);
            const activeIds = await apiService.post('/campaigns/filter-active', rvIds);
            const validRv = parsedRv.filter(c => activeIds.includes(c.id));
            setRecentlyViewed(validRv);
            if (validRv.length !== parsedRv.length) {
              await AsyncStorage.setItem(`recentlyViewed_${user.email}`, JSON.stringify(validRv));
            }
          } catch (e) {
            console.warn('Failed to filter active campaigns:', e);
            setRecentlyViewed(parsedRv);
          }
        }
        if (sv) {
          const parsed = JSON.parse(sv);
          setCampaigns(prev => prev.map(c => ({ ...c, isSaved: parsed.includes(c.id) })));
        }
      } catch (e) {
        console.warn('Failed to load persisted activity:', e);
      }
    })();
  }, [user?.email]);

  const fetchFeedCampaigns = async () => {
    setLoading(true);
    try {
      const url = appliedCity ? `/campaigns?city=${encodeURIComponent(appliedCity)}` : '/campaigns';
      const fetched = await apiService.get(url);
      const sv = await AsyncStorage.getItem(`savedCampaigns_${user?.email || ''}`);
      const savedIds = sv ? JSON.parse(sv) : [];
      const mapped = fetched.map(camp => {
        let categoryName = camp.category || '';
        let subCategoryName = categoryName;
        if (categoryName.includes('::')) {
          const parts = categoryName.split('::');
          categoryName = parts[0];
          subCategoryName = parts[1];
        }

        let serviceId = 'it';
        if (categoryName === 'IT & Technology Services') serviceId = 'it';
        else if (categoryName === 'Education & Training') serviceId = 'edu';
        else if (categoryName === 'Health & Wellness') serviceId = 'health';
        else if (categoryName === 'Beauty & Personal Care') serviceId = 'beauty';
        else if (categoryName === 'Food & Restaurants') serviceId = 'food';
        else if (categoryName === 'Events & Entertainment') serviceId = 'events';
        else if (categoryName === 'Real Estate & Property') serviceId = 'realestate';
        else if (categoryName === 'Transport & Delivery') serviceId = 'transport';
        else if (categoryName === 'Automotive Services') serviceId = 'auto';
        else if (categoryName === 'Finance & Insurance') serviceId = 'finance';
        else if (categoryName === 'Legal & Compliance') serviceId = 'legal';
        else if (categoryName === 'Home & Repair Services') serviceId = 'home';
        else if (categoryName === 'Travel & Tourism') serviceId = 'travel';
        else if (categoryName === 'Shopping & Retail') serviceId = 'shopping';
        else serviceId = 'other';
        
        return {
          id: camp.id,
          title: camp.title,
          description: camp.description,
          offerLine: camp.offer,
          category: categoryName,
          subService: subCategoryName,
          serviceId: serviceId,
          city: camp.city,
          businessName: camp.business_name || 'Partner Business',
          businessVerified: camp.business_verified ?? false,
          views: camp.view_count,
          rating: 4.8,
          price: camp.price ?? null,
          endDate: camp.end_date,
          status: camp.status,
          isBoosted: camp.is_boosted ?? false,
          isSaved: savedIds.includes(camp.id),
          phone: camp.cta_value,
          whatsapp: camp.cta_value,
          imageUrls: (camp.image_urls || (camp.image_url ? [camp.image_url] : [])).map(resolveMediaUrl),
          image_url: camp.image_url,
          image_urls: camp.image_urls,
          latitude: camp.latitude,
          longitude: camp.longitude,
          locationAddress: camp.location_address,
        };
      });
      setCampaigns(mapped);
    } catch (error) {
      console.error("Failed to fetch campaigns for feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedCampaigns();
  }, [appliedCity]);

  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const fetchNearbyOffers = async (lat, lon) => {
    setFetchingNearby(true);
    try {
      // Real-time GPS: fetch campaigns within 10 km radius using buyer's exact coordinates
      console.log(`[Offers Near You] Fetching nearby with GPS: lat=${lat}, lon=${lon}`);
      const res = await apiService.get(`/campaigns/nearby?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&radius_km=10`);
      const mapped = (res || []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        offerLine: c.offer,
        businessName: c.business_name || 'Partner Business',
        imageUrl: c.image_url,
        image_url: c.image_url,
        imageUrls: (c.image_urls || (c.image_url ? [c.image_url] : [])).map(resolveMediaUrl),
        price: c.price ?? null,
        endDate: c.end_date || null,
        distance_km: c.distance_km,
        latitude: c.latitude,
        longitude: c.longitude,
        locationAddress: c.location_address,
      }));
      setOffersNearby(mapped);
    } catch (e) {
      console.warn('Nearby fetch failed', e);
      setOffersNearby([]);
    } finally {
      setFetchingNearby(false);
    }
  };

  // On mount, request buyer REAL-TIME GPS and fetch nearby offers
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermissionDenied(true);
          console.warn('[Offers Near You] Location permission denied — showing city campaigns.');
          return;
        }
        setLocationPermissionDenied(false);
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = cur.coords;
        console.log(`[Offers Near You] Buyer GPS obtained: lat=${latitude}, lon=${longitude}`);
        setBuyerLocation({ latitude, longitude, timestamp: Date.now() });
        await fetchNearbyOffers(latitude, longitude);
      } catch (e) {
        console.warn('Auto buyer location fetch failed', e);
      }
    })();
  }, []);

  const requestBuyerLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        return;
      }
      setLocationPermissionDenied(false);
      setFetchingNearby(true);
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = cur.coords;
      console.log(`[Offers Near You] Manual refresh GPS: lat=${latitude}, lon=${longitude}`);
      setBuyerLocation({ latitude, longitude, timestamp: Date.now() });
      await fetchNearbyOffers(latitude, longitude);
    } catch (e) {
      console.warn('Buyer location fetch failed', e);
      setFetchingNearby(false);
    }
  };

  const [selectedCampaign, setSelectedCampaign] = useState(null); 

  // Profile fields state
  const [profName, setProfName] = useState(user?.name || '');
  const [profCity, setProfCity] = useState(user?.city || '');
  const [profPhone, setProfPhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState(user?.profile_picture || null);
  const [profPreferences, setProfPreferences] = useState(user?.preferences || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Animation values
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab, selectedService, selectedSubService]);

  const handleTabChange = (tab) => {
    if (tab === 'Home') {
      setSelectedService(null);
      setSelectedSubService(null);
    }
    contentFadeAnim.setValue(0);
    setActiveTab(tab);
  };

  const handlePickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
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
        setSavingProfile(true);

        const uploadUrl = `${API_CONFIG.BASE_URL}/upload/image`;
        const headers = await apiService.getHeaders();
        const uploadRes = await FileSystem.uploadAsync(uploadUrl, localUri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART
          mimeType: 'image/jpeg',
          headers: headers,
        });

        if (uploadRes.status >= 200 && uploadRes.status < 300) {
          const data = JSON.parse(uploadRes.body);
          setProfileImage(data.url);
          // Auto-save the new picture
          await apiService.request('/auth/me', {
            method: 'PATCH',
            body: { profile_picture: data.url },
          });
          if (updateUserProfile) {
            updateUserProfile({ profile_picture: data.url });
          }
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          throw new Error('Upload failed');
        }
      }
    } catch (e) {
      console.warn('Image upload error:', e);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profName.trim() || !profCity.trim() || !profPhone.trim()) {
      Alert.alert('Error', 'Please fill in all required profile fields (Name, City, Phone)');
      return;
    }
    setSavingProfile(true);
    try {
      const body = {
        name: profName.trim(),
        phone: profPhone.replace(/[^0-9]/g, ''),
        city: profCity.trim(),
        preferences: profPreferences.trim(),
      };
      
      const response = await apiService.request('/auth/me', {
        method: 'PATCH',
        body: body,
      });

      if (updateUserProfile) {
        updateUserProfile({
          name: response.name,
          phone: response.phone,
          city: response.city,
          preferences: response.preferences,
        });
      }
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      console.warn('Profile save error:', e);
      Alert.alert('Error', e.message || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleSaveCampaign = async (id) => {
    setCampaigns(prev => {
      const updated = prev.map(c => (c.id === id ? { ...c, isSaved: !c.isSaved } : c));
      (async () => {
        if (!user?.email) return;
        try {
          const savedIds = updated.filter(x => x.isSaved).map(x => x.id);
          await AsyncStorage.setItem(`savedCampaigns_${user.email}`, JSON.stringify(savedIds));
        } catch (e) {
          console.warn('Failed to persist saved campaigns:', e);
        }
      })();
      return updated;
    });
  };

  const handleCampaignClick = async (camp) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(c => c.id !== camp.id);
      const next = [camp, ...filtered].slice(0, 6);
      (async () => {
        if (!user?.email) return;
        try {
          await AsyncStorage.setItem(`recentlyViewed_${user.email}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist recently viewed:', e);
        }
      })();
      return next;
    });

    // attach distance if buyer location available
    const campWithDistance = { ...camp };
    try {
      if (buyerLocation && (camp.latitude || camp.longitude)) {
        const lat1 = buyerLocation.latitude;
        const lon1 = buyerLocation.longitude;
        const lat2 = Number(camp.latitude);
        const lon2 = Number(camp.longitude);
        if (!Number.isNaN(lat2) && !Number.isNaN(lon2)) {
          const haversine = (lat1, lon1, lat2, lon2) => {
            const toRad = (v) => (v * Math.PI) / 180;
            const R = 6371; // km
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          };
          campWithDistance.distance_km = Number(haversine(lat1, lon1, lat2, lon2).toFixed(3));
        }
      }
    } catch (e) {
      // ignore
    }

    setSelectedCampaign(campWithDistance);

    try {
      await apiService.post(`/campaigns/${camp.id}/view`);
    } catch (e) {
      console.warn("Failed to log view count:", e);
    }
  };

  const navigateToCampaignCategory = (camp) => {
    const service = SERVICES_DATA.find(s => s.id === camp.serviceId) || null;
    if (service) {
      contentFadeAnim.setValue(0);
      setSelectedService(service);
      setSelectedSubService(camp.subService || service.subServices[0]);
    }
  };

  // Helper to log lead in database when buyer connects
  const createLead = async (camp, message) => {
    return await apiService.post(`/leads?campaign_id=${camp.id}`, {
      name: user?.name || "Anonymous Buyer",
      phone: user?.phone || "0000000000",
      message: message
    });
  };

  // Quick Action triggers
  const handleQuickCall = async (camp) => {
    try {
      await createLead(camp, "Called seller directly via CTA");
      Alert.alert('Call Seller', `Connecting you to ${camp.businessName}...\nPhone: ${camp.phone || '+91 98765 43210'}`);
    } catch (e) {
      Alert.alert('Error', 'Could not register your interest. Please try again.');
    }
  };

  const handleQuickWhatsApp = async (camp) => {
    try {
      await createLead(camp, "Contacted seller via WhatsApp CTA");
      Alert.alert('WhatsApp Chat', `Opening WhatsApp conversation with ${camp.businessName}...\nNumber: ${camp.whatsapp || '+91 98765 43210'}`);
    } catch (e) {
      Alert.alert('Error', 'Could not register your interest. Please try again.');
    }
  };

  const handleQuickEnquire = async (camp) => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to chat with sellers.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Landing') }
      ]);
      return;
    }

    try {
      const response = await createLead(camp, `Enquired about: ${camp.offerLine || camp.title}`);
      if (response && response.id) {
        const thread = await chatService.createThread(response.id);
        setSelectedCampaign(null);
        // Pass full campaign + business info so ChatScreen header shows the
        // actual business name (not the generic fallback "Business")
        navigation.navigate('ChatScreen', {
          threadId: thread.id,
          campaign: {
            title: camp.title,
            offer: camp.offerLine,
            category: camp.category,
            image_url: camp.image_urls?.[0] || camp.image_url || null,
          },
          business: {
            name: camp.businessName,
            phone: camp.phone,
          },
        });
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    }
  };

  const handleContactSeller = async (camp) => {
    handleQuickEnquire(camp);
  };

  const handleApplyFilters = () => {
    setAppliedPrice(priceFilter ? parseFloat(priceFilter) : null);
    setAppliedRating(ratingFilter ? parseFloat(ratingFilter) : null);
    setAppliedCity(cityFilter.trim() || 'Chennai');
    setShowFiltersModal(false);
  };

  const handleResetFilters = () => {
    setPriceFilter('');
    setRatingFilter('');
    setCityFilter(user?.city || 'Chennai');
    setAppliedPrice(null);
    setAppliedRating(null);
    setAppliedCity(user?.city || 'Chennai');
    setShowFiltersModal(false);
  };

  const handleBackToServices = () => {
    contentFadeAnim.setValue(0);
    setSelectedService(null);
    setSelectedSubService(null);
  };

  // Filter Logic
  const getFilteredCampaigns = (subServiceName = null) => {
    return campaigns.filter(c => {
      // 1. Matches Search query
      const matchesSearch = searchQuery.trim() === '' || 
        (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.businessName && c.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.subService && c.subService.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Matches sub-service selection if provided
      const matchesSubService = !subServiceName || (c.subService && c.subService.toLowerCase().trim() === subServiceName.toLowerCase().trim());

      // 3. Price Filter (Maximum Limit)
      const matchesPrice = !appliedPrice || c.price <= appliedPrice;

      // 4. Rating Filter (Minimum limit)
      const matchesRating = !appliedRating || c.rating >= appliedRating;

      // 5. City Filter
      const matchesCity = !appliedCity || (c.city && c.city.toLowerCase() === appliedCity.toLowerCase());

      return matchesSearch && matchesSubService && matchesPrice && matchesRating && matchesCity;
    });
  };

  const savedCampaigns = campaigns.filter(c => c.isSaved);
  const featuredCampaigns = campaigns.filter(c => c.views > 0).sort((a, b) => b.views - a.views).slice(0, 5);


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀';
    if (hour < 18) return 'Good Afternoon 🌤';
    return 'Good Evening 🌙';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbOne} pointerEvents="none" />
      <View style={styles.bgOrbTwo} pointerEvents="none" />
      {/* HEADER */}
      <LinearGradient colors={['#EFF6FF', '#DBEAFE', '#FFFFFF']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.morningText}>{getGreeting()}</Text>
            <Text style={styles.greetingHeader}>
              Hello, <Text style={{ fontWeight: '900', color: '#2563EB' }}>{user?.name?.split(' ')[0] || 'Buyer'} 👋</Text>
            </Text>
            <Text style={styles.subtitleHeader}>Discover deals tailored for you</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable 
              style={[styles.headerIconBtn, { marginRight: 8 }]}
              onPress={() => navigation.navigate('BuyerInbox')}
            >
              <Ionicons name="chatbubbles-outline" size={22} color="#2563EB" />
            </Pressable>
            <Pressable style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={22} color="#2563EB" />
            </Pressable>
            <Pressable onPress={() => handleTabChange('Profile')}>
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{(user?.name || 'B').charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.mainBody, { opacity: contentFadeAnim }]}>
        {activeTab === 'Home' && (
          <View style={styles.homeContainer}>
            
            {/* 1. Main Home (Service Directory List or Active Search Results) */}
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Search Bar */}
              <BlurView intensity={40} tint="light" style={styles.glassSearchBar}>
                <Ionicons name="search" size={20} color="#2563EB" style={styles.searchIcon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search offers, services, businesses..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
                <Ionicons name="mic-outline" size={18} color="#94A3B8" style={{ marginLeft: 8 }} />
                <Ionicons name="location-outline" size={18} color="#2563EB" style={{ marginLeft: 8 }} />
                {searchQuery !== '' && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Text style={styles.searchClearText}>✕</Text>
                  </Pressable>
                )}
              </BlurView>

              {/* Offers Near You — GPS-based real-time distance filtering */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 }}>
                  <Text style={styles.sectionTitle}>
                    {buyerLocation
                      ? '📍 Offers Near You'
                      : locationPermissionDenied
                        ? `📍 Popular in ${appliedCity || user?.city || 'Your City'}`
                        : '📍 Offers Near You'}
                  </Text>
                  <Pressable onPress={requestBuyerLocationAndFetch}>
                    <Text style={{ color: '#2563EB' }}>{fetchingNearby ? 'Refreshing...' : 'Refresh'}</Text>
                  </Pressable>
                </View>

                {fetchingNearby ? (
                  <Text style={{ color: '#64748b', padding: 8 }}>Detecting your location...</Text>
                ) : locationPermissionDenied ? (
                  /* Location denied — show top city campaigns */
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {campaigns.slice(0, 8).map((camp) => (
                      <CampaignFeedCard
                        key={camp.id}
                        campaign={{
                          id: camp.id,
                          title: camp.title,
                          description: camp.description,
                          offerLine: camp.offerLine,
                          businessName: camp.businessName,
                          imageUrl: camp.image_url || camp.imageUrl,
                          imageUrls: camp.imageUrls,
                          price: camp.price,
                          endDate: camp.endDate,
                          distance_km: null,
                          locationAddress: camp.locationAddress,
                          latitude: camp.latitude,
                          longitude: camp.longitude,
                        }}
                        onPress={() => handleCampaignClick(camp)}
                        onToggleSave={() => {}}
                      />
                    ))}
                  </ScrollView>
                ) : buyerLocation && offersNearby.length === 0 ? (
                  <Text style={{ color: '#64748b', padding: 8 }}>No campaigns found within 10 km. Check back later!</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {(offersNearby.length > 0 ? offersNearby : campaigns.slice(0, 8)).map((camp) => (
                      <CampaignFeedCard
                        key={camp.id}
                        campaign={{
                          id: camp.id,
                          title: camp.title,
                          description: camp.description,
                          offerLine: camp.offerLine,
                          businessName: camp.businessName,
                          imageUrl: camp.image_url || camp.imageUrl,
                          imageUrls: camp.imageUrls,
                          price: camp.price,
                          endDate: camp.endDate,
                          distance_km: offersNearby.length > 0 ? camp.distance_km : null,
                          latitude: camp.latitude,
                          longitude: camp.longitude,
                          locationAddress: camp.locationAddress,
                        }}
                        onPress={() => handleCampaignClick(camp)}
                        onToggleSave={() => {}}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              {searchQuery.trim() !== '' ? (
                /* SEARCH RESULTS MODE */
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.sectionTitle}>Search Results for "{searchQuery}"</Text>
                  {getFilteredCampaigns().length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No Campaigns Available</Text>
                      <Text style={styles.emptySubtext}>Try another category or keyword</Text>
                    </View>
                  ) : (
                    getFilteredCampaigns().map((camp) => (
                      <CampaignFeedCard
                        key={camp.id}
                        campaign={camp}
                        onPress={() => handleCampaignClick(camp)}
                        onToggleSave={() => toggleSaveCampaign(camp.id)}
                      />
                    ))
                  )}
                </View>
              ) : (
                /* NORMAL SERVICES DIRECTORY MODE */
                <>
                  {/* Category Header — only on home, not when inside a category */}
                  {!selectedService && (
                    <>
                      <View style={styles.categoriesHeader}>
                        <View>
                          <Text style={styles.categoriesTitle}>Categories</Text>
                          <Text style={styles.categoriesSubtitle}>Explore businesses and offers near you</Text>
                        </View>
                        <Pressable 
                          onPress={() => navigation.navigate('AllCategories')}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={styles.seeAllText}>See All</Text>
                        </Pressable>
                      </View>

                      {/* Premium Frosted Glass Category Carousel */}
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.categoryCarousel}
                      >
                        {displayServicesData.map((service) => (
                          <CategoryItem
                            key={service.id}
                            service={service}
                            isSelected={selectedService?.id === service.id}
                            onPress={() => {
                              if (selectedService?.id === service.id) {
                                setSelectedService(null);
                                setSelectedSubService(null);
                              } else {
                                contentFadeAnim.setValue(0);
                                setSelectedService(service);
                                setSelectedSubService(service.subServices[0]);
                              }
                            }}
                          />
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {/* When a category IS selected — show its name + back link + subcategory chips */}
                  {selectedService && (
                    <View style={styles.explorerHeaderRow}>
                      <Pressable onPress={() => { setSelectedService(null); setSelectedSubService(null); }} style={styles.backChipBtn}>
                        <Text style={styles.backChipText}>← All Categories</Text>
                      </Pressable>
                      <Text style={styles.explorerCategoryLabel}>{selectedService.title}</Text>
                    </View>
                  )}

                  {!selectedService ? (
                    <>
                      {/* Featured Campaigns Near You */}
                      {featuredCampaigns.length > 0 && (
                        <>
                          <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>📍 Featured Near You</Text>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {featuredCampaigns.map((camp) => (
                              <CampaignFeedCard
                                key={camp.id}
                                campaign={camp}
                                onPress={() => handleCampaignClick(camp)}
                                onToggleSave={() => toggleSaveCampaign(camp.id)}
                              />
                            ))}
                          </ScrollView>
                        </>
                      )}

                      {/* Recently Viewed */}
                      {recentlyViewed.length > 0 && (
                        <>
                          <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>🕐 Recently Viewed</Text>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {recentlyViewed.map((camp) => (
                              <CampaignFeedCard
                                key={camp.id}
                                campaign={camp}
                                onPress={() => handleCampaignClick(camp)}
                                onToggleSave={() => toggleSaveCampaign(camp.id)}
                              />
                            ))}
                          </ScrollView>
                        </>
                      )}

                      <Text style={styles.comingSoon}>
                        Discover More. Connect Better. Grow Faster.
                      </Text>
                    </>
                  ) : (
                    <View style={styles.explorerContainer}>
                      <View style={styles.subServiceTitleHeader}>
                        <Text style={styles.subServiceHeading}>
                          {(selectedSubService || selectedService.subServices[0]) + ' Offers'}
                        </Text>
                        <Text style={styles.subServiceSubheading}>
                          {getFilteredCampaigns(selectedSubService || selectedService.subServices[0]).length + ' Offers Available'}
                        </Text>
                      </View>

                      <FlatList
                        data={selectedService.subServices}
                        keyExtractor={(item) => item}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalChipsRow}
                        renderItem={({ item: sub }) => {
                          const isActive = selectedSubService === sub;
                          return (
                            <Pressable
                              style={[styles.subChipPill, isActive && styles.subChipPillActive]}
                              onPress={() => setSelectedSubService(sub)}
                            >
                              <Text
                                style={[styles.subChipPillText, isActive && styles.subChipPillTextActive]}
                                numberOfLines={1}
                              >
                                {sub}
                              </Text>
                            </Pressable>
                          );
                        }}
                      />

                      <View style={styles.campaignListContainer}>
                        {getFilteredCampaigns(selectedSubService || selectedService.subServices[0]).length === 0 ? (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No Campaigns Available</Text>
                            <Text style={styles.emptySubtext}>Try another category</Text>
                          </View>
                        ) : (
                          <View style={{ gap: 16, alignItems: 'center' }}>
                            {getFilteredCampaigns(selectedSubService || selectedService.subServices[0]).map((camp) => (
                              <CampaignFeedCard
                                key={camp.id}
                                campaign={camp}
                                onPress={() => handleCampaignClick(camp)}
                                onToggleSave={() => toggleSaveCampaign(camp.id)}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>




          </View>
        )}

        {activeTab === 'Saved' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.tabSectionTitle}>SAVED OFFERS</Text>
            <Text style={styles.tabSectionSubtitle}>Your bookmarked discounts and local campaigns.</Text>

            {savedCampaigns.length === 0 ? (
              <View style={styles.emptySavedContainer}>
                <Text style={styles.emptySavedText}>No saved campaigns yet.</Text>
                <PrimaryButton
                  title="Explore Offers"
                  onPress={() => handleTabChange('Home')}
                  style={styles.exploreOffersBtn}
                />
              </View>
            ) : (
              savedCampaigns.map((camp) => (
                <CampaignFeedCard
                  key={camp.id}
                  campaign={camp}
                  onPress={() => handleCampaignClick(camp)}
                  onToggleSave={() => toggleSaveCampaign(camp.id)}
                />
              ))
            )}
          </ScrollView>
        )}

        {activeTab === 'Profile' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.buyerProfileScrollContent}>
            {isEditingProfile ? (
              /* EDIT PROFILE MODE */
              <View style={styles.editProfileContainer}>
                <Text style={styles.tabSectionTitle}>Edit Profile</Text>
                <Text style={styles.tabSectionSubtitle}>Update your personal preferences and contact details.</Text>
                
                <View style={styles.profileForm}>
                  <InputField
                    label="Name"
                    value={profName}
                    onChangeText={setProfName}
                    placeholder="Your Name"
                  />
                  <InputField
                    label="Email Address"
                    value={user?.email || ''}
                    editable={false}
                  />
                  <InputField
                    label="City"
                    value={profCity}
                    onChangeText={setProfCity}
                    placeholder="Your City"
                  />
                  <InputField
                    label="Phone Number"
                    value={profPhone}
                    onChangeText={setProfPhone}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                  />
                  <InputField
                    label="Preferences / Interests"
                    value={profPreferences}
                    onChangeText={setProfPreferences}
                    placeholder="e.g. food, tech, fashion"
                  />

                  {savingProfile ? (
                    <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 20 }} />
                  ) : (
                    <View style={styles.editProfileButtons}>
                      <Pressable 
                        onPress={handleSaveProfile} 
                        style={({ pressed }) => [styles.primarySaveButton, pressed && { opacity: 0.8 }]}
                      >
                        <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.buttonGradient}>
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </LinearGradient>
                      </Pressable>
                      <Pressable 
                        onPress={() => {
                          setProfName(user?.name || '');
                          setProfCity(user?.city || '');
                          setProfPhone(user?.phone || '');
                          setProfPreferences(user?.preferences || '');
                          setIsEditingProfile(false);
                        }} 
                        style={({ pressed }) => [styles.secondaryCancelButton, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* PREMIUM PROFILE DASHBOARD VIEW */
              <View style={styles.profileDashboardContainer}>
                {/* Premium Profile Header */}
                <View style={styles.buyerProfileHeaderMinimal}>
                  <Pressable onPress={handlePickProfileImage} style={styles.avatarContainer}>
                    {profileImage ? (
                      <Image source={{ uri: resolveMediaUrl(profileImage) }} style={styles.buyerAvatarImage} />
                    ) : (
                      <View style={styles.buyerAvatarFallback}>
                        <Text style={styles.buyerAvatarFallbackText}>
                          {(user?.name || 'B').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cameraIconBadge}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                    </View>
                  </Pressable>

                  <Text style={styles.buyerProfileNameTextMinimal}>{user?.name || 'Buyer Name'}</Text>
                  <View style={styles.buyerLocationRowMinimal}>
                    <Ionicons name="location" size={14} color="#2563EB" />
                    <Text style={styles.buyerLocationTextMinimal}>{user?.city || 'City not set'}</Text>
                  </View>
                </View>

                {/* Account Settings Card */}
                <View style={styles.settingsCard}>
                  <Text style={styles.cardHeaderTitle}>Account Settings</Text>
                  
                  {/* Edit Profile */}
                  <Pressable 
                    onPress={() => setIsEditingProfile(true)}
                    style={({ pressed }) => [styles.settingsOptionRow, pressed && styles.settingsOptionPressed]}
                  >
                    <View style={styles.optionLeft}>
                      <Ionicons name="person-outline" size={20} color="#2563EB" style={styles.optionIcon} />
                      <Text style={styles.optionLabelText}>Edit Profile</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>

                  {/* Change Password */}
                  <Pressable 
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={({ pressed }) => [styles.settingsOptionRow, pressed && styles.settingsOptionPressed]}
                  >
                    <View style={styles.optionLeft}>
                      <Ionicons name="lock-closed-outline" size={20} color="#2563EB" style={styles.optionIcon} />
                      <Text style={styles.optionLabelText}>Change Password</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>

                  {/* Help & Support */}
                  <Pressable 
                    onPress={() => Alert.alert('Help & Support', 'Reach us at support@reachlo.com for any queries.')}
                    style={({ pressed }) => [styles.settingsOptionRow, pressed && styles.settingsOptionPressed]}
                  >
                    <View style={styles.optionLeft}>
                      <Ionicons name="help-circle-outline" size={20} color="#2563EB" style={styles.optionIcon} />
                      <Text style={styles.optionLabelText}>Help & Support</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>

                  {/* About Reachlo */}
                  <Pressable 
                    onPress={() => Alert.alert('About Reachlo', 'Version 1.0.0 (Premium). Grow Your Business with local offers.')}
                    style={({ pressed }) => [styles.settingsOptionRow, pressed && styles.settingsOptionPressed]}
                  >
                    <View style={styles.optionLeft}>
                      <Ionicons name="information-circle-outline" size={20} color="#2563EB" style={styles.optionIcon} />
                      <Text style={styles.optionLabelText}>About Reachlo</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* Logout Section */}
                <View style={styles.buyerLogoutSection}>
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
                    style={({ pressed }) => [styles.buyerLogoutButton, pressed && { opacity: 0.8 }]}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.buyerLogoutButtonText}>Log Out</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* FILTER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFiltersModal}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SEARCH FILTERS</Text>
            <Text style={styles.modalSubtitle}>Refine local campaign exploration results</Text>

            <View style={styles.filterForm}>
              <InputField
                label="City Location"
                value={cityFilter}
                onChangeText={setCityFilter}
                placeholder="e.g. Chennai, Bangalore"
              />

              <InputField
                label="Maximum Price (₹)"
                value={priceFilter}
                onChangeText={setPriceFilter}
                placeholder="e.g. 20000"
                keyboardType="numeric"
              />

              <InputField
                label="Minimum Rating (1.0 - 5.0)"
                value={ratingFilter}
                onChangeText={setRatingFilter}
                placeholder="e.g. 4.5"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Pressable
                onPress={handleResetFilters}
                style={styles.modalResetBtn}
              >
                <Text style={styles.modalResetText}>Reset All</Text>
              </Pressable>

              <Pressable
                onPress={handleApplyFilters}
                style={styles.modalApplyBtn}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowFiltersModal(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CAMPAIGN DETAIL — PREMIUM FULL SCREEN */}
      <CampaignDetailScreen
        campaign={selectedCampaign}
        visible={selectedCampaign !== null}
        onClose={() => setSelectedCampaign(null)}
        onToggleSave={() => selectedCampaign && toggleSaveCampaign(selectedCampaign.id)}
        onCallPress={() => selectedCampaign && handleQuickCall(selectedCampaign)}
        onWhatsAppPress={() => selectedCampaign && handleQuickWhatsApp(selectedCampaign)}
        onEnquirePress={() => selectedCampaign && handleQuickEnquire(selectedCampaign)}
        relatedCampaigns={
          selectedCampaign
            ? campaigns
                .filter(c => c.serviceId === selectedCampaign.serviceId && c.id !== selectedCampaign.id)
                .slice(0, 6)
            : []
        }
        onRelatedPress={(camp) => {
          setSelectedCampaign(null);
          setTimeout(() => handleCampaignClick(camp), 350);
        }}
      />

      {/* FLOATING GLASS BOTTOM NAVIGATION */}
      <View style={styles.floatingNavWrapper}>
        <BlurView intensity={60} tint="light" style={styles.floatingNav}>
          <Pressable
            onPress={() => handleTabChange('Home')}
            style={styles.navItem}
          >
            {activeTab === 'Home' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.navActivePill}>
                <Ionicons name="home" size={18} color="#FFFFFF" />
                <Text style={styles.navLabelActive}>HOME</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="home-outline" size={22} color="#94A3B8" />
                <Text style={[styles.navLabel, { color: '#94A3B8' }]}>HOME</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('Saved')}
            style={styles.navItem}
          >
            {activeTab === 'Saved' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.navActivePill}>
                <Ionicons name="bookmark" size={18} color="#FFFFFF" />
                <Text style={styles.navLabelActive}>SAVED</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={22} color="#94A3B8" />
                <Text style={[styles.navLabel, { color: '#94A3B8' }]}>SAVED</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('Profile')}
            style={styles.navItem}
          >
            {activeTab === 'Profile' ? (
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.navActivePill}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
                <Text style={styles.navLabelActive}>PROFILE</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="person-outline" size={22} color="#94A3B8" />
                <Text style={[styles.navLabel, { color: '#94A3B8' }]}>PROFILE</Text>
              </>
            )}
          </Pressable>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  bgOrbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(86,204,242,0.18)',
    top: -40,
    right: -70,
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(47,128,237,0.12)',
    top: 260,
    left: -80,
  },
  mainBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110, // Extra space for floating nav bar
    paddingTop: 16,
  },
  headerGradient: {
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  greetingHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0C1445',
  },
  morningText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitleHeader: {
    fontSize: FONT_SIZES.XS,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  logoutText: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },

  // HOME SPECIFIC SHELL
  homeContainer: {
    flex: 1,
  },

  // SEARCH BAR
  glassSearchBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 56,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0C1445',
  },
  categoriesSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryCarousel: {
    paddingRight: 24,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 12,
    flexDirection: 'row',
    marginBottom: 16,
  },
  // FROSTED GLASS CATEGORY CARD
  categoryCard: {
    width: 104,
    minHeight: 132,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 52,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(226,232,240,0.6)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
    gap: 8,
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  categoryIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryLabelActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  offerCountPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offerCountPillActive: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderColor: 'rgba(37,99,235,0.25)',
  },
  offerCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  offerCountTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  servicesGrid: {
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  serviceLetterBadge: {
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: 14,
  },
  serviceTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  serviceItemTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  serviceItemSubtitle: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  serviceArrow: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginRight: 4,
  },

  // SPLIT EXPLORER / CATEGORY BROWSER
  explorerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  explorerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
  },
  backChipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  backChipText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  explorerCategoryLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0C1445',
  },
  horizontalChipsRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  subChipPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  subChipPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  subChipPillActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  subChipPillText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  subChipPillTextActive: {
    color: COLORS.WHITE,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  categoryChip: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  categoryChipCount: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  splitExplorerContainer: {
    flex: 1,
  },
  explorerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  explorerCategoryTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  splitMainRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // SIDEBAR (LEFT)
  leftSidebar: {
    width: 110,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    backgroundColor: '#F8FAFC',
  },
  sidebarScroll: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 8,
  },
  sidebarCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  sidebarCardActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  sidebarCardText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  sidebarCardTextActive: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // CONTENT AREA (RIGHT)
  rightContentArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  subServiceTitleHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: '#F8FAFC',
  },
  subServiceHeading: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  subServiceSubheading: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  campaignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  campaignGridItem: {
    width: '48%',
    marginBottom: 12,
  },


  campaignListContainer: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  campaignListCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  campaignCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  campaignCardTitle: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  campaignCardBusiness: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginBottom: 6,
  },
  campaignCardDesc: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: FONT_SIZES.XS * LINE_HEIGHTS.NORMAL,
    marginBottom: 10,
  },
  campaignCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 8,
  },
  campaignCardPrice: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  campaignCardDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  campaignCardDetailText: {
    fontSize: 9,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },

  // URGENCY BADGE
  urgencyRow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  urgencyText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  // QUICK CONTACT ROW
  quickContactRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  quickContactBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickContactBtnText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  quickWhatsappBtn: {
    backgroundColor: '#22C55E', // WhatsApp Green
  },
  quickEnquireBtn: {
    backgroundColor: '#F59E0B', // Enquiry Amber
  },

  // SECTION STYLES (GENERAL)
  sectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingRight: 24,
    marginBottom: 20,
    gap: 12,
  },

  // FEATURED CARD
  featuredCard: {
    width: 200,
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  featuredCardBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.ACCENT_CYAN,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  featuredCardBadgeText: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
  },
  featuredContent: {
    marginTop: 16,
    gap: 4,
  },
  featuredCardTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  featuredCardBusiness: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
  },
  featuredCardTag: {
    fontSize: 9,
    color: COLORS.PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  featuredPrice: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  featuredCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 8,
    marginTop: 10,
  },
  featuredCardCity: {
    fontSize: 9,
    color: COLORS.TEXT_SECONDARY,
  },
  saveHeartIcon: {
    fontSize: 16,
  },

  // MINI CARD
  miniCard: {
    width: 130,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  miniCardImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
  },
  miniCardTitle: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  miniCardSub: {
    fontSize: 9,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  miniCardViewText: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    marginTop: 8,
    fontWeight: FONT_WEIGHTS.BOLD,
  },

  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },

  // GENERAL TAB SECTION STYLES
  tabSectionTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  tabSectionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    marginBottom: 20,
  },
  emptySavedContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySavedIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptySavedText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 20,
  },
  exploreOffersBtn: {
    paddingHorizontal: 24,
  },

  // PROFILE FORM
  profileForm: {
    marginTop: 10,
  },
  profileSaveBtn: {
    marginTop: 16,
  },
  logoutWrapper: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 24,
    alignItems: 'center',
  },
  logoutActionBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  logoutActionBtnText: {
    color: '#EF4444',
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },

  // MODAL STYLING (FILTERS & DETAILS)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
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
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    marginBottom: 16,
  },
  filterForm: {
    gap: 12,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalResetBtn: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalResetText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyText: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    fontSize: FONT_SIZES.SM,
  },

  // DETAIL MODAL STYLING
  detailModalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  detailImageWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  detailActiveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailActiveBadgeText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: '#15803D',
  },
  detailOfferBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  detailOfferBadgeText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: '#B45309',
  },
  detailTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  detailBusiness: {
    fontSize: FONT_SIZES.SM,
    color: '#334155',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  detailBusinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  detailMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  detailMetricChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailMetricText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  detailDescTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: FONT_SIZES.SM * LINE_HEIGHTS.NORMAL,
    marginBottom: 20,
  },
  detailPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 14,
    marginBottom: 20,
  },
  detailPriceLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  detailPrice: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.PRIMARY,
  },
  detailButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailSaveBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: COLORS.BORDER,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  detailSaveBtnActive: {
    borderColor: '#EF4444',
  },
  detailSaveText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  detailContactBtn: {
    flex: 2,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContactText: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.BOLD,
    fontSize: FONT_SIZES.SM,
  },
  detailCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailCloseText: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    fontSize: FONT_SIZES.SM,
  },

  // FLOATING GLASS BOTTOM NAVIGATION
  floatingNavWrapper: {
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
  floatingNav: {
    flexDirection: 'row',
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  navActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 4,
  },
  comingSoon: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.BOLD,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 10,
  },
  
  // BUYER PROFILE REDESIGN STYLES
  buyerProfileScrollContent: {
    paddingBottom: 100,
  },
  profileDashboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  buyerProfileHeaderMinimal: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  buyerAvatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  buyerAvatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerAvatarFallbackText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2563EB',
  },
  cameraIconBadge: {
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
  buyerProfileNameTextMinimal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
  },
  buyerLocationRowMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buyerLocationTextMinimal: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    marginLeft: 4,
  },
  settingsCard: {
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
  cardHeaderTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: '#1E293B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsOptionPressed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  optionLabelText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: '#334155',
  },
  buyerLogoutSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  buyerLogoutButton: {
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
  buyerLogoutButtonText: {
    color: '#EF4444',
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  
  // EDIT PROFILE MODE STYLES
  editProfileContainer: {
    padding: 20,
  },
  editProfileButtons: {
    marginTop: 20,
    gap: 12,
  },
  primarySaveButton: {
    borderRadius: 18,
    height: 50,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.SM,
  },
  secondaryCancelButton: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: FONT_SIZES.SM,
  },
});
