import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager,
  Modal,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import COLORS from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import Toast from '../../components/Toast';
import BusinessLocationPicker from '../../components/BusinessLocationPicker';
import RatingModal from '../../components/RatingModal';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SellerProfileScreen({ navigation }) {
  const { user, updateUserProfile, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Editable field state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [usp, setUsp] = useState('');
  const [category, setCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  // Chat settings modal
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
  const [chatRetention, setChatRetention] = useState('forever');
  const [savingChatSettings, setSavingChatSettings] = useState(false);

  // FAQ Modal
  const [showFaqModal, setShowFaqModal] = useState(false);

  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);

  
  useEffect(() => {
    const loadChatSettings = async () => {
      try {
        const val = await AsyncStorage.getItem('chat_retention_policy');
        if (val) setChatRetention(val);
      } catch (e) {}
    };
    loadChatSettings();
  }, []);
  
  const saveChatSettings = async (policy) => {
    setSavingChatSettings(true);
    try {
      await AsyncStorage.setItem('chat_retention_policy', policy);
      setChatRetention(policy);
      showToast('Chat settings updated successfully', 'success');
      setTimeout(() => setShowChatSettingsModal(false), 500);
    } catch (e) {
      showToast('Failed to update chat settings', 'error');
    } finally {
      setSavingChatSettings(false);
    }
  };

  const [locationData, setLocationData] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Track original values to detect changes
  const original = useRef({});

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Animated Save button
  const saveAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const hasChanges = () =>
    name !== original.current.name ||
    phone !== original.current.phone ||
    businessName !== original.current.businessName ||
    businessDescription !== original.current.businessDescription ||
    usp !== original.current.usp ||
    website !== original.current.website ||
    gstNumber !== original.current.gstNumber ||
    profileImage !== original.current.profileImage ||
    locationData !== null;

  useEffect(() => {
    Animated.spring(saveAnim, {
      toValue: (isEditingPersonal || isEditingBusiness) && hasChanges() ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isEditingPersonal, isEditingBusiness, name, phone, businessName, businessDescription, usp, website, gstNumber, locationData, profileImage]);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await apiService.get('/businesses/me/full');
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setCity(data.city || '');
      setBusinessName(data.business_name || '');
      setBusinessDescription(data.business_description || '');
      setUsp(data.usp || '');
      setCategory(data.category || '');
      setWebsite(data.website_url || '');
      setGstNumber(data.gst_number || '');
      setLocationAddress(data.location_address || '');
      setProfileImage(data.profile_image_url || null);
      
      original.current = {
        name: data.name || '',
        phone: data.phone || '',
        businessName: data.business_name || '',
        businessDescription: data.business_description || '',
        usp: data.usp || '',
        website: data.website_url || '',
        gstNumber: data.gst_number || '',
        profileImage: data.profile_image_url || null,
      };
      
      const stats = await apiService.get('/businesses/me/analytics');
      setAnalytics(stats);
    } catch (e) {
      showToast('Failed to load profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    if (!isEditingPersonal && !isEditingBusiness) return;
    
    Alert.alert(
      "Upload Profile Picture",
      "Choose an option",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              showToast('Sorry, we need camera permissions to make this work!', 'error');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              showToast('Sorry, we need gallery permissions to make this work!', 'error');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleUseCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied', 'error');
        return;
      }

      setLoading(true);
      let location = await Location.getCurrentPositionAsync({});
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const formattedAddress = `${place.name ? place.name + ', ' : ''}${place.street || ''}, ${place.city || place.subregion || ''}, ${place.region || ''} ${place.postalCode || ''}`.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ',');
        
        setLocationData({
          address: formattedAddress,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: place.city || place.subregion || city
        });
        showToast('Location updated', 'success');
      }
    } catch (error) {
      showToast('Could not fetch current location', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];

      const personalChanges = {};
      if (name !== original.current.name) personalChanges.name = name.trim();
      if (phone !== original.current.phone) personalChanges.phone = phone.replace(/[^0-9]/g, '');
      // Note: we are not uploading the image to the server in this placeholder, but we would add it here usually.
      
      if (Object.keys(personalChanges).length > 0) {
        promises.push(apiService.request('/auth/me', { method: 'PATCH', body: personalChanges }));
      }

      const businessChanges = {};
      if (businessName !== original.current.businessName) businessChanges.name = businessName.trim();
      if (businessDescription !== original.current.businessDescription) {
        businessChanges.business_description = businessDescription.trim();
      }
      if (usp !== original.current.usp) businessChanges.usp = usp.trim();
      if (website !== original.current.website) businessChanges.website_url = website.trim();
      if (gstNumber !== original.current.gstNumber) businessChanges.gst_number = gstNumber.trim();
      
      if (locationData) {
        businessChanges.location_address = locationData.address;
        businessChanges.latitude = locationData.latitude;
        businessChanges.longitude = locationData.longitude;
        businessChanges.city = locationData.city || locationData.address.split(',')[0]?.trim() || city;
      }
      
      if (Object.keys(businessChanges).length > 0) {
        promises.push(apiService.request('/businesses/me', { method: 'PATCH', body: businessChanges }));
      }

      await Promise.all(promises);

      if (Object.keys(personalChanges).length > 0) updateUserProfile(personalChanges);

      original.current = {
        name: name.trim(),
        phone: phone.replace(/[^0-9]/g, ''),
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        usp: usp.trim(),
        website: website.trim(),
        gstNumber: gstNumber.trim(),
        profileImage: profileImage,
      };
      
      if (locationData) {
        setProfile(prev => ({...prev, location_address: locationData.address}));
        setLocationAddress(locationData.address);
        setCity(locationData.city || city);
      }
      
      setLocationData(null);
      setIsEditingPersonal(false);
      setIsEditingBusiness(false);
      showToast('Profile updated successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setName(original.current.name);
    setPhone(original.current.phone);
    setBusinessName(original.current.businessName);
    setBusinessDescription(original.current.businessDescription);
    setUsp(original.current.usp);
    setWebsite(original.current.website);
    setGstNumber(original.current.gstNumber || '');
    setProfileImage(original.current.profileImage);
    setLocationData(null);
    setIsEditingPersonal(false);
    setIsEditingBusiness(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await apiService.request('/auth/change-password', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword }
      });
      showToast('Password updated successfully', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      showToast(e.message || 'Failed to update password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };
  
  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => showToast("Account deletion requested", "success") }
      ]
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const initials = name ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Profile Dashboard</Text>
              <Pressable onPress={() => { setIsEditingPersonal(true); setIsEditingBusiness(true); }} hitSlop={12} style={styles.editBtn}>
                 <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
            </View>

            <View style={styles.profileMeta}>
              <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarCircle} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                {(isEditingPersonal || isEditingBusiness) && (
                  <View style={styles.avatarEditIcon}>
                    <Ionicons name="camera" size={14} color="#FFF" />
                  </View>
                )}
              </Pressable>
              
              <Text style={styles.profileName}>{name || '—'}</Text>
              <Text style={styles.profileBusiness}>{businessName || 'Business not set'}</Text>
              
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                <Text style={styles.verifiedText}>Verified Seller</Text>
              </View>
              
              <View style={styles.contactInfoWrapper}>
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.contactText}>{city || 'Location not set'}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.contactText}>{email || '—'}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.contactText}>{phone || '—'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            {/* Analytics Dashboard */}
            <Text style={styles.sectionTitle}>Business Analytics</Text>
            <View style={styles.analyticsGrid}>
              <AnalyticsCard icon="megaphone-outline" color="#1A73E8" value={analytics?.campaigns_created || 0} label="Campaigns Created" />
              <AnalyticsCard icon="flash-outline" color="#16A34A" value={analytics?.active_campaigns || 0} label="Active Campaigns" />
              <AnalyticsCard icon="people-outline" color="#F59E0B" value={analytics?.total_leads || 0} label="Total Leads" />
            </View>

            {/* Personal Information */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              {!isEditingPersonal && (
                <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsEditingPersonal(true); }}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.card}>
              <EditableField label="Full Name" value={name} onChangeText={setName} editable={isEditingPersonal} />
              <EditableField label="Email Address" value={email} editable={false} note="Contact support to change email" />
              <EditableField label="Phone Number" value={phone} onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))} editable={isEditingPersonal} keyboardType="phone-pad" />
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperDisabled, { justifyContent: 'space-between' }]}>
                  <Text style={styles.passwordMask}>••••••••</Text>
                  <Pressable onPress={() => setShowPasswordModal(true)}>
                    <Text style={styles.changePasswordText}>Change Password</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Business Information */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              {!isEditingBusiness && (
                <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsEditingBusiness(true); }}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.card}>
              <EditableField label="Business Name" value={businessName} onChangeText={setBusinessName} editable={isEditingBusiness} />
              <EditableField label="Business Category" value={category} editable={false} note="Cannot be changed after registration." />
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Description</Text>
                <View style={[styles.multilineCard, !isEditingBusiness && styles.multilineCardDisabled]}>
                  <TextInput
                    style={[styles.multilineInput, !isEditingBusiness && styles.multilineInputDisabled]}
                    value={businessDescription}
                    onChangeText={setBusinessDescription}
                    editable={isEditingBusiness}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="E.g., We provide digital marketing..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>What makes your business different?</Text>
                <View style={[styles.multilineCard, !isEditingBusiness && styles.multilineCardDisabled]}>
                  <TextInput
                    style={[styles.multilineInput, !isEditingBusiness && styles.multilineInputDisabled]}
                    value={usp}
                    onChangeText={setUsp}
                    editable={isEditingBusiness}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholder="Describe your unique selling proposition..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
              
              <EditableField label="Website (optional)" value={website} onChangeText={setWebsite} editable={isEditingBusiness} />
              <EditableField label="GST Number (optional)" value={gstNumber} onChangeText={setGstNumber} editable={isEditingBusiness} />
            </View>

            {/* Dedicated Location Card */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Location Information</Text>
              {!isEditingBusiness && (
                <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsEditingBusiness(true); }}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.card}>
              <View style={styles.currentLocationDisplay}>
                <Ionicons name="location" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.currentLocationText}>
                  {locationData ? locationData.address : (locationAddress || 'No location set')}
                </Text>
              </View>

              {isEditingBusiness && (
                <View style={styles.locationActions}>
                  <Text style={styles.fieldLabel}>Current Location</Text>
                  
                  {showLocationPicker ? (
                     <BusinessLocationPicker
                      onLocationConfirmed={(data) => {
                        setLocationData(data);
                        setShowLocationPicker(false);
                      }}
                      initialAddress={locationAddress || ''}
                    />
                  ) : (
                    <View style={styles.locationBtnRow}>
                      <Pressable style={styles.outlineBtn} onPress={() => setShowLocationPicker(true)}>
                        <Ionicons name="search-outline" size={16} color={COLORS.PRIMARY} style={{ marginRight: 6 }} />
                        <Text style={styles.outlineBtnText}>Change Location</Text>
                      </Pressable>
                      <Pressable style={styles.outlineBtn} onPress={handleUseCurrentLocation}>
                        {loading ? <ActivityIndicator size="small" color={COLORS.PRIMARY} /> : (
                          <>
                            <Ionicons name="navigate-outline" size={16} color={COLORS.PRIMARY} style={{ marginRight: 6 }} />
                            <Text style={styles.outlineBtnText}>Use Current Location</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Account Settings */}
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.card}>
              <SettingsRow icon="chatbubble-ellipses-outline" title="Chat Settings" onPress={() => setShowChatSettingsModal(true)} />
              <SettingsRow icon="notifications-outline" title="Notifications" onPress={() => showToast('Settings coming soon', 'info')} />
              <SettingsRow icon="moon-outline" title="Dark Mode" onPress={() => showToast('Settings coming soon', 'info')} />
              <SettingsRow icon="language-outline" title="Language" onPress={() => showToast('Settings coming soon', 'info')} />
              <SettingsRow icon="shield-half-outline" title="Privacy Settings" onPress={() => showToast('Settings coming soon', 'info')} />
              
              <View style={styles.settingsDivider} />
              
              <SettingsRow icon="trash-outline" title="Delete Account" color="#EF4444" onPress={confirmDeleteAccount} hideArrow />
              <SettingsRow icon="log-out-outline" title="Logout" color="#EF4444" onPress={logout} hideArrow />
            </View>
            
            {/* Help & Support */}
            <Text style={styles.sectionTitle}>Help & Support</Text>
            <View style={styles.card}>
              <SettingsRow icon="help-buoy-outline" title="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
              <SettingsRow icon="information-circle-outline" title="About REACHLO" onPress={() => navigation.navigate('AboutReachlo')} />
              <SettingsRow icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
              <SettingsRow icon="star-outline" title="Rate REACHLO" onPress={() => setShowRatingModal(true)} />
            </View>
            
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Action Buttons (Save/Cancel) */}
      {(isEditingPersonal || isEditingBusiness) && (
        <Animated.View style={[styles.bottomBar, {
          transform: [{ translateY: saveAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }],
          opacity: saveAnim,
        }]}>
          <Pressable style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtnContainer, !hasChanges() && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving || !hasChanges()}
          >
            <LinearGradient
              colors={['#1A73E8', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            <EditableField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <EditableField label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <EditableField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            
            <Pressable style={styles.modalSaveBtn} onPress={handleChangePassword} disabled={savingPassword}>
              <LinearGradient
                colors={['#1A73E8', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {savingPassword ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Chat Settings Modal */}
      <Modal visible={showChatSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat Settings</Text>
              <Pressable onPress={() => setShowChatSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
              Choose how long your chat history is retained on this device.
            </Text>
            
            {['24h', '1w', '1m', 'forever'].map(policy => (
              <Pressable 
                key={policy} 
                style={[
                  styles.inputWrapper, 
                  { marginBottom: 12, paddingHorizontal: 16 },
                  chatRetention === policy ? { borderColor: '#1A73E8', backgroundColor: '#EFF6FF' } : {}
                ]}
                onPress={() => saveChatSettings(policy)}
              >
                <Text style={{ flex: 1, fontSize: 15, fontWeight: chatRetention === policy ? '600' : '400', color: '#0F172A' }}>
                  {policy === '24h' ? '24 Hours' : policy === '1w' ? '1 Week' : policy === '1m' ? '1 Month' : 'Until I clear it (Forever)'}
                </Text>
                {chatRetention === policy && (
                  <Ionicons name="checkmark-circle" size={20} color="#1A73E8" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal visible={showFaqModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
              <Pressable onPress={() => setShowFaqModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {FAQ_DATA.map((item, idx) => (
                <FaqAccordionItem key={idx} question={item.question} answer={item.answer} />
              ))}
            </ScrollView>
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

// ── Components ────────────────────────────────────────────────────────────────

const FAQ_DATA = [
  {
    question: "How do I create a new campaign?",
    answer: "Go to your Home Dashboard and click the 'Generate with AI' or 'Manual Creation' tile to start creating a new campaign instantly."
  },
  {
    question: "Can I edit an active campaign?",
    answer: "Yes, you can edit your active campaigns from the Campaigns tab by tapping the pencil icon on the campaign card."
  },
  {
    question: "How do buyers contact me?",
    answer: "Buyers can contact you via call or in-app chat. You will receive a push notification for new messages and leads."
  },
  {
    question: "How is billing handled?",
    answer: "We offer transparent billing with our Pro and Elite plans. You can upgrade or manage your billing settings in the app."
  }
];

function FaqAccordionItem({ question, answer }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <View style={styles.faqItem}>
      <Pressable style={styles.faqHeader} onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
      }}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={expanded ? "#2563EB" : "#64748B"} />
      </Pressable>
      {expanded && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </View>
  );
}

function AnalyticsCard({ icon, color, value, label }) {
  return (
    <View style={styles.analyticsCard}>
      <View style={[styles.analyticsIconWrapper, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </View>
  );
}

function EditableField({ label, value, onChangeText, editable = true, note, ...rest }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrapper, !editable && styles.inputWrapperDisabled]}>
        <TextInput
          style={[styles.textInput, !editable && { color: COLORS.TEXT_SECONDARY }]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          {...rest}
        />
      </View>
      {note ? <Text style={styles.fieldNote}>{note}</Text> : null}
    </View>
  );
}

function SettingsRow({ icon, title, onPress, color = "#334155", hideArrow = false }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.settingsRowTitle, { color }]}>{title}</Text>
      </View>
      {!hideArrow && <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />}
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.TEXT_SECONDARY, fontSize: FONT_SIZES.SM },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A' },
  editBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: COLORS.PRIMARY, fontSize: 13, fontWeight: FONT_WEIGHTS.SEMIBOLD },
  
  profileMeta: { alignItems: 'center', gap: 6 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#DBEAFE' },
  avatarText: { color: '#1A73E8', fontSize: 36, fontWeight: FONT_WEIGHTS.BOLD },
  avatarEditIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.PRIMARY, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  
  profileName: { fontSize: 24, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A' },
  profileBusiness: { fontSize: 16, color: COLORS.TEXT_SECONDARY, marginBottom: 8, fontWeight: '500' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#DCFCE7' },
  verifiedText: { color: '#16A34A', fontSize: 13, fontWeight: FONT_WEIGHTS.SEMIBOLD, marginLeft: 6 },
  
  contactInfoWrapper: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactText: { fontSize: 14, color: '#334155', flex: 1 },

  // Content
  content: { paddingHorizontal: 20, gap: 24 },
  sectionTitle: { fontSize: 18, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A', marginBottom: 12, paddingLeft: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, paddingLeft: 4, paddingRight: 4 },
  editText: { fontSize: FONT_SIZES.SM, fontWeight: FONT_WEIGHTS.SEMIBOLD, color: COLORS.PRIMARY, marginBottom: 0 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // Analytics
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  analyticsIconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  analyticsValue: { fontSize: 20, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A', marginBottom: 4 },
  analyticsLabel: { fontSize: 12, color: COLORS.TEXT_SECONDARY, textAlign: 'center', fontWeight: '500' },

  // Fields
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: FONT_WEIGHTS.SEMIBOLD, color: '#475569' },
  fieldNote: { fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: -4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  textInput: { flex: 1, fontSize: 15, color: '#0F172A', height: '100%' },
  passwordMask: { fontSize: 24, color: '#0F172A', letterSpacing: 3, marginTop: 6 },
  changePasswordText: { fontSize: 13, fontWeight: FONT_WEIGHTS.BOLD, color: COLORS.PRIMARY },
  
  multilineCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    minHeight: 120,
  },
  multilineCardDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  multilineInput: { flex: 1, fontSize: 15, color: '#0F172A', lineHeight: 22 },
  multilineInputDisabled: { color: COLORS.TEXT_SECONDARY },

  // Location
  currentLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  currentLocationText: { color: '#0369A1', fontSize: 15, fontWeight: '500', flex: 1, marginLeft: 12, lineHeight: 22 },
  locationActions: { gap: 12, marginTop: 8 },
  locationBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.PRIMARY, borderRadius: 12, height: 48 },
  outlineBtnText: { color: COLORS.PRIMARY, fontSize: 13, fontWeight: FONT_WEIGHTS.BOLD },

  // Settings
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowTitle: { fontSize: 15, fontWeight: '500' },
  settingsDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  // Bottom Action Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 20,
    gap: 12,
  },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontSize: 15, fontWeight: FONT_WEIGHTS.BOLD },
  saveBtnContainer: { flex: 2, height: 52, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: FONT_WEIGHTS.BOLD },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, gap: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A' },
  modalSaveBtn: { height: 52, borderRadius: 14, overflow: 'hidden', marginTop: 12 },
  
  // FAQ
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    paddingRight: 16,
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
});
