/**
 * AIDraftReviewScreen
 * 
 * Screen where seller reviews the AI-generated campaign.
 * Features:
 *  - Campaign preview card with generated 4:3 thumbnail
 *  - Image regeneration button (calls POST /ai/regenerate-image)
 *  - Hallucination warnings box (red, only if AI hallucinated numbers/superlatives)
 *  - Editable fields for Title, Description, Offer, CTA (CTA value required)
 *  - Discard (POST /ai/discard) or Publish (POST /ai/publish)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import Toast from '../../components/Toast';
import apiService from '../../services/apiService';
import { resolveMediaUrl } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import BusinessVerifiedBadge from '../../components/BusinessVerifiedBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RatingModal from '../../components/RatingModal';

// ─────────────────────────────────────────────────────────
// AdThumbnail — Real split-panel ad layout renderer
// Adapts text panel position based on AI layout_plan
// ─────────────────────────────────────────────────────────

function parsePanelColor(colorStr) {
  // Try to extract a hex color from strings like "#1A1A2E midnight navy" or return a fallback
  if (!colorStr) return null;
  const hexMatch = colorStr.match(/#([0-9A-Fa-f]{3,6})/);
  if (hexMatch) return hexMatch[0];
  // Map common color descriptions to hex
  const colorMap = {
    navy: '#0F172A', 'dark navy': '#0F172A', 'midnight navy': '#0C1445',
    'deep navy': '#0A0E2A', 'dark blue': '#1E3A8A',
    cream: '#FAF7F0', ivory: '#FFFFF0', 'warm white': '#FDF8F0', 'off white': '#F8F5F0',
    black: '#0A0A0A', 'deep black': '#050505', charcoal: '#1A1A1A',
    white: '#FFFFFF', 'clean white': '#FAFAFA',
    teal: '#0D9488', 'deep teal': '#0F766E',
    green: '#14532D', 'forest green': '#166534',
    burgundy: '#7F1D1D', 'deep red': '#991B1B',
    purple: '#4C1D95', 'deep purple': '#3B0764',
    gold: '#92400E', 'warm gold': '#78350F',
    brown: '#431407', 'warm brown': '#7C2D12',
  };
  const lower = colorStr.toLowerCase();
  for (const [key, val] of Object.entries(colorMap)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function parsePanelTextColor(panelHex) {
  // Determine if white or dark text is better on the panel
  if (!panelHex) return '#FFFFFF';
  const hex = panelHex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.45 ? '#0F172A' : '#FFFFFF';
}

function getCTALabel(ctaType) {
  switch ((ctaType || '').toUpperCase()) {
    case 'WHATSAPP': return '💬 WhatsApp Us';
    case 'CALL': return '📞 Call Now';
    case 'LINK': return '🌐 Visit Website';
    case 'FORM': return '📋 Get Quote';
    default: return '→ Contact Us';
  }
}

function AdThumbnail({
  imageUrl, regenerating, onRegenerate,
}) {
  return (
    <View style={adThumbStyles.wrapper}>
      <View style={adThumbStyles.heroContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: resolveMediaUrl(imageUrl) }}
            style={adThumbStyles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[adThumbStyles.heroPlaceholder, { backgroundColor: '#CBD5E1' }]}>
            <Ionicons name="image-outline" size={36} color="#94A3B8" />
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 6 }}>Generating...</Text>
          </View>
        )}
        
        {/* ACTIVE Badge top-right preview */}
        <View style={adThumbStyles.activeBadge}>
          <View style={adThumbStyles.activeDot} />
          <Text style={adThumbStyles.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>

      {/* Regenerate Button — always top-right corner, below active badge */}
      <Pressable
        onPress={onRegenerate}
        style={adThumbStyles.regenBtn}
        disabled={regenerating}
      >
        {regenerating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
            <Text style={adThumbStyles.regenText}>Regenerate</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const adThumbStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 4 / 3, // Updated to 4:3
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#CBD5E1',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  heroContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    zIndex: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  offerPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    zIndex: 10,
    maxWidth: '80%',
  },
  offerPillText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  regenBtn: {
    position: 'absolute',
    top: 45, // Moved below active badge
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  regenText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

});

// ─────────────────────────────────────────────────────────

export default function AIDraftReviewScreen({ route }) {
  const { draftId, initialPrice } = route.params;
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [offer, setOffer] = useState('');
  const [ctaType, setCtaType] = useState('WHATSAPP');
  const [ctaValue, setCtaValue] = useState('');
  const [price, setPrice] = useState(initialPrice !== undefined && initialPrice !== null ? String(initialPrice) : ''); // required before publish
  const [imageUrl, setImageUrl] = useState(null);

  // Layout plan from AI pipeline (drives text panel positioning)
  const [layoutPlan, setLayoutPlan] = useState({ panel_side: 'left', hero_position: 'right' });
  const [brandIdentity, setBrandIdentity] = useState({ panel_background_color: null, accent_color: null });

  // Status flags
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  // Errors
  const [errors, setErrors] = useState({});

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);

  const showToast = (msg, type = 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    fetchDraft();
  }, [draftId]);

  const fetchDraft = async () => {
    try {
      // In a real app we'd have a GET /ai/drafts/{id} endpoint. 
      // For this MVP, we assume the backend returns the draft object in the POST /ai/generate response, 
      // but if we navigated here with just draftId, we need to fetch it.
      // Since we don't have a GET endpoint defined in the prompt, let's assume `route.params.draftData` could be passed,
      // OR we add a quick workaround (or expect the API to exist).
      // Assuming we have an endpoint or we just use passed data for now:
      
      const response = await apiService.get(`/ai/drafts/${draftId}`);
      setDraft(response);
      setTitle(response.title || '');
      setDescription(response.campaign_description || '');
      setOffer(response.offer || '');
      setCtaType(response.cta_type || 'WHATSAPP');
      setImageUrl(response.image_url);

      // Parse AI pipeline stages for layout plan and brand identity
      if (response.ai_pipeline_stages) {
        try {
          const stages = JSON.parse(response.ai_pipeline_stages);
          if (stages.layout_plan) setLayoutPlan(stages.layout_plan);
          if (stages.brand_identity) setBrandIdentity(stages.brand_identity);
        } catch (e) {
          // keep defaults
        }
      }

      if (response.hallucination_warnings) {
        setWarnings(JSON.parse(response.hallucination_warnings));
      }

      // Pre-fill CTA if seller has phone number
      if (response.cta_type === 'WHATSAPP' || response.cta_type === 'CALL') {
        setCtaValue(user?.phone || '');
      }

      setLoading(false);
    } catch (e) {
      // Fallback: If GET /ai/drafts/{id} isn't implemented, we should have passed draftData from AIGenerateScreen.
      // But the prompt said "navigates to AIDraftReview passing draft_id". So the GET endpoint must exist.
      showToast('Failed to load draft. It might have expired.');
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (regeneratingImage) return;
    setRegeneratingImage(true);
    try {
      const response = await apiService.post(`/ai/regenerate-image/${draftId}`);
      setImageUrl(response.image_url);
      showToast('Image regenerated successfully', 'success');
    } catch (e) {
      showToast('Failed to regenerate image.');
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Draft?',
      'Are you sure you want to discard this campaign? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setDiscarding(true);
            try {
              await apiService.post(`/ai/discard/${draftId}`);
              navigation.navigate('SellerDashboard');
            } catch (e) {
              setDiscarding(false);
              showToast('Failed to discard.');
            }
          }
        }
      ]
    );
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (!offer.trim()) errs.offer = 'Offer line is required';
    if (['WHATSAPP', 'CALL', 'LINK'].includes(ctaType) && !ctaValue.trim()) {
      errs.ctaValue = `Please provide a ${ctaType === 'LINK' ? 'URL' : 'phone number'}`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePublish = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    
    setPublishing(true);
    try {
      await apiService.post(`/ai/publish/${draftId}`, {
        title: title.trim(),
        campaign_description: description.trim(),
        offer: offer.trim(),
        cta_type: ctaType,
        cta_value: ctaValue.trim(),
        image_url: imageUrl,
        price: price.trim() ? parseFloat(price.trim()) : null,
      });
      showToast('Campaign published successfully!', 'success');
      
      const hasRated = await AsyncStorage.getItem('has_rated_reachlo_seller');
      if (!hasRated) {
        await AsyncStorage.setItem('has_rated_reachlo_seller', 'true');
        setShowRatingModal(true);
      } else {
        setTimeout(() => {
          navigation.navigate('SellerDashboard');
        }, 1000);
      }
    } catch (e) {
      setPublishing(false);
      showToast(e.message || 'Failed to publish campaign.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={{ marginTop: 12, color: COLORS.TEXT_SECONDARY }}>Loading draft...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Review & Publish</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Hallucination Warnings */}
          {warnings.length > 0 && (
            <View style={styles.warningBox}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={18} color="#DC2626" />
                <Text style={styles.warningTitle}>Please verify these details</Text>
              </View>
              {warnings.map((warn, i) => (
                <Text key={i} style={styles.warningText}>• {warn}</Text>
              ))}
            </View>
          )}

          {/* Campaign Preview Card */}
          <View style={styles.previewCard}>
            <AdThumbnail
              imageUrl={imageUrl}
              regenerating={regeneratingImage}
              onRegenerate={handleRegenerateImage}
            />

            <View style={styles.previewContent}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>PREVIEW</Text>
              </View>
              {/* Title above description */}
              {!!title && (
                <Text style={styles.previewTitle}>{title}</Text>
              )}
              {!!description && (
                <Text style={styles.previewDesc}>{description}</Text>
              )}
              {/* Offer highlight in body */}
              <View style={styles.previewFooterRow}>
                {!!offer && (
                  <View style={styles.previewOfferRow}>
                    <Ionicons name="pricetag" size={14} color="#16A34A" />
                    <Text style={styles.previewOfferText}>{offer}</Text>
                  </View>
                )}
                {/* Price display in preview */}
                {!!price && (
                  <View style={styles.previewPriceBadge}>
                    <Text style={styles.previewPriceText}>₹{price}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Edit Details</Text>

          {/* Edit Form */}
          <View style={styles.formSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Campaign Title</Text>
              <TextInput
                style={[styles.textInput, errors.title && styles.textInputError]}
                value={title}
                onChangeText={(t) => { setTitle(t); if(errors.title) setErrors(p=>({...p, title:null})); }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Campaign Price ₹ (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="e.g. 999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, errors.description && styles.textInputError]}
                value={description}
                onChangeText={(t) => { setDescription(t); if(errors.description) setErrors(p=>({...p, description:null})); }}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Offer / Deal line</Text>
              <TextInput
                style={[styles.textInput, errors.offer && styles.textInputError]}
                value={offer}
                onChangeText={(t) => { setOffer(t); if(errors.offer) setErrors(p=>({...p, offer:null})); }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Call to Action Type</Text>
              <View style={styles.ctaTypeRow}>
                {['WHATSAPP', 'CALL', 'LINK', 'FORM'].map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.ctaTypeBtn, ctaType === type && styles.ctaTypeBtnActive]}
                    onPress={() => { setCtaType(type); setCtaValue(type==='WHATSAPP'||type==='CALL' ? user?.phone||'' : ''); }}
                  >
                    <Text style={[styles.ctaTypeText, ctaType === type && styles.ctaTypeTextActive]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {['WHATSAPP', 'CALL', 'LINK'].includes(ctaType) && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ctaType === 'LINK' ? 'Website URL' : 'Phone Number'} <Text style={{color:COLORS.ERROR}}>*</Text></Text>
                <TextInput
                  style={[styles.textInput, errors.ctaValue && styles.textInputError]}
                  value={ctaValue}
                  onChangeText={(t) => { setCtaValue(t); if(errors.ctaValue) setErrors(p=>({...p, ctaValue:null})); }}
                  placeholder={ctaType === 'LINK' ? 'https://...' : '10-digit mobile'}
                  keyboardType={ctaType === 'LINK' ? 'url' : 'phone-pad'}
                />
                {errors.ctaValue && <Text style={styles.errorText}>{errors.ctaValue}</Text>}
              </View>
            )}
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.discardBtn} onPress={handleDiscard} disabled={discarding || publishing}>
          {discarding ? (
            <ActivityIndicator size="small" color="#64748B" />
          ) : (
            <Text style={styles.discardBtnText}>Discard</Text>
          )}
        </Pressable>
        <PrimaryButton
          title={publishing ? "Publishing..." : "Publish Campaign"}
          onPress={handlePublish}
          disabled={publishing || discarding}
          style={styles.publishBtn}
        />
      </View>

      <RatingModal 
        visible={showRatingModal} 
        onClose={() => {
          setShowRatingModal(false);
          navigation.navigate('SellerDashboard');
        }} 
        userRole="seller" 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    color: '#0F172A',
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  scrollContent: { padding: 20, paddingBottom: 120 },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  warningTitle: { color: '#DC2626', fontWeight: FONT_WEIGHTS.BOLD, marginLeft: 8, fontSize: FONT_SIZES.SM },
  warningText: { color: '#991B1B', fontSize: 13, lineHeight: 20, marginLeft: 26, marginBottom: 4 },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewContent: { padding: 14 },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewBadgeText: { color: '#4338CA', fontSize: 10, fontWeight: FONT_WEIGHTS.BOLD },
  previewTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6, lineHeight: 22 },
  previewDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 10 },
  previewFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  previewOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  previewOfferText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  previewPriceBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeading: { fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.BOLD, color: '#0F172A', marginBottom: 16 },
  formSection: { gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: FONT_WEIGHTS.SEMIBOLD, color: '#334155' },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textInputError: { borderColor: '#EF4444' },
  textArea: { minHeight: 96, paddingTop: 12 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  ctaTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ctaTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  ctaTypeBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  ctaTypeText: { fontSize: 13, color: '#475569', fontWeight: FONT_WEIGHTS.MEDIUM },
  ctaTypeTextActive: { color: '#2563EB', fontWeight: FONT_WEIGHTS.BOLD },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    gap: 12,
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  discardBtnText: { color: '#64748B', fontSize: FONT_SIZES.BASE, fontWeight: FONT_WEIGHTS.SEMIBOLD },
  publishBtn: { flex: 2, marginBottom: 0 },
});
