/**
 * AIDraftReviewScreen
 *
 * Seller reviews the AI-generated campaign before publishing.
 *
 * Features:
 *  - Campaign preview
 *  - Image regeneration
 *  - Hallucination warnings
 *  - Editable campaign details
 *  - CTA selection
 *  - Discard / Publish
 *  - Rating modal after publishing
 *  - FULL LIGHT + DARK MODE SUPPORT
 */

import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
  Keyboard,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';

import Toast from '../../components/Toast';
import RatingModal from '../../components/RatingModal';
import BusinessVerifiedBadge from '../../components/BusinessVerifiedBadge';

import apiService from '../../services/apiService';
import { resolveMediaUrl } from '../../config/apiConfig';

import { useAuth } from '../../context/AuthContext';

import AsyncStorage from '@react-native-async-storage/async-storage';


/* ============================================================
   HELPERS
============================================================ */

function getCTALabel(ctaType) {
  switch ((ctaType || '').toUpperCase()) {
    case 'WHATSAPP':
      return 'WhatsApp Us';

    case 'CALL':
      return 'Call Now';

    case 'LINK':
      return 'Visit Website';

    case 'FORM':
      return 'Get Quote';

    default:
      return 'Contact Us';
  }
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function AIDraftReviewScreen({ route }) {

  const { theme, isDarkMode } = useTheme();

  const navigation = useNavigation();

  const { user } = useAuth();

  const {
    draftId,
    initialPrice,
  } = route.params || {};


  /* ============================================================
     DYNAMIC COLORS
  ============================================================ */

  const palette = isDarkMode
    ? {
        background: '#090B14',
        surface: '#111522',
        surfaceElevated: '#171B2A',
        card: '#131827',
        input: '#0E1220',

        text: '#F8FAFC',
        textSecondary: '#AAB3C5',
        textTertiary: '#778197',

        border: '#252C3D',
        borderStrong: '#333C52',

        primary: '#8B5CF6',
        primaryLight: 'rgba(139,92,246,0.16)',
        primaryBorder: 'rgba(139,92,246,0.40)',

        success: '#22C55E',
        successBg: 'rgba(34,197,94,0.13)',
        successBorder: 'rgba(34,197,94,0.30)',

        danger: '#F87171',
        dangerBg: 'rgba(248,113,113,0.10)',
        dangerBorder: 'rgba(248,113,113,0.30)',

        warning: '#FBBF24',
        warningBg: 'rgba(251,191,36,0.10)',
        warningBorder: 'rgba(251,191,36,0.30)',

        priceBg: '#1D2435',

        shadow: '#000000',
      }
    : {
        background: '#F6F7FB',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        card: '#FFFFFF',
        input: '#F9FAFC',

        text: '#111827',
        textSecondary: '#64748B',
        textTertiary: '#94A3B8',

        border: '#E5E7EB',
        borderStrong: '#D6DAE3',

        primary: '#7C3AED',
        primaryLight: '#F0EAFE',
        primaryBorder: '#C4B5FD',

        success: '#16A34A',
        successBg: '#F0FDF4',
        successBorder: '#BBF7D0',

        danger: '#DC2626',
        dangerBg: '#FEF2F2',
        dangerBorder: '#FECACA',

        warning: '#B45309',
        warningBg: '#FFF7ED',
        warningBorder: '#FED7AA',

        priceBg: '#111827',

        shadow: '#0F172A',
      };


  /* ============================================================
     STATE
  ============================================================ */

  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState(null);

  const [warnings, setWarnings] = useState([]);

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');

  const [offer, setOffer] = useState('');

  const [ctaType, setCtaType] = useState('WHATSAPP');

  const [ctaValue, setCtaValue] = useState('');

  const [price, setPrice] = useState(
    initialPrice !== undefined &&
      initialPrice !== null
      ? String(initialPrice)
      : ''
  );

  const [imageUrl, setImageUrl] = useState(null);

  const [layoutPlan, setLayoutPlan] = useState({
    panel_side: 'left',
    hero_position: 'right',
  });

  const [brandIdentity, setBrandIdentity] = useState({
    panel_background_color: null,
    accent_color: null,
  });

  const [regeneratingImage, setRegeneratingImage] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [discarding, setDiscarding] =
    useState(false);

  const [errors, setErrors] = useState({});

  const [toastVisible, setToastVisible] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState('');

  const [toastType, setToastType] =
    useState('info');

  const [showRatingModal, setShowRatingModal] =
    useState(false);


  /* ============================================================
     TOAST
  ============================================================ */

  const showToast = (
    message,
    type = 'error'
  ) => {

    setToastMessage(message);

    setToastType(type);

    setToastVisible(true);
  };


  /* ============================================================
     FETCH DRAFT
  ============================================================ */

  useEffect(() => {

    fetchDraft();

  }, [draftId]);


  const fetchDraft = async () => {

    try {

      const response =
        await apiService.get(
          `/ai/drafts/${draftId}`
        );


      setDraft(response);


      setTitle(
        response.title || ''
      );


      setDescription(
        response.campaign_description || ''
      );


      setOffer(
        response.offer || ''
      );


      setCtaType(
        response.cta_type || 'WHATSAPP'
      );


      setImageUrl(
        response.image_url || null
      );


      /* ---------------------------------------------
         AI PIPELINE DATA
      --------------------------------------------- */

      if (response.ai_pipeline_stages) {

        try {

          const stages =
            typeof response.ai_pipeline_stages === 'string'
              ? JSON.parse(
                  response.ai_pipeline_stages
                )
              : response.ai_pipeline_stages;


          if (stages.layout_plan) {

            setLayoutPlan(
              stages.layout_plan
            );
          }


          if (stages.brand_identity) {

            setBrandIdentity(
              stages.brand_identity
            );
          }

        } catch (error) {

          console.log(
            'Unable to parse AI pipeline stages'
          );

        }

      }


      /* ---------------------------------------------
         WARNINGS
      --------------------------------------------- */

      if (response.hallucination_warnings) {

        try {

          const parsedWarnings =
            typeof response.hallucination_warnings === 'string'
              ? JSON.parse(
                  response.hallucination_warnings
                )
              : response.hallucination_warnings;


          setWarnings(
            Array.isArray(parsedWarnings)
              ? parsedWarnings
              : []
          );

        } catch (error) {

          setWarnings([]);

        }

      }


      /* ---------------------------------------------
         CTA DEFAULT VALUE
      --------------------------------------------- */

      if (
        response.cta_type === 'WHATSAPP' ||
        response.cta_type === 'CALL'
      ) {

        setCtaValue(
          user?.phone || ''
        );

      }


      setLoading(false);

    } catch (error) {

      console.log(
        'Fetch draft error:',
        error
      );

      showToast(
        'Failed to load draft. It might have expired.'
      );

      setLoading(false);
    }
  };


  /* ============================================================
     REGENERATE IMAGE
  ============================================================ */

  const handleRegenerateImage =
    async () => {

      if (regeneratingImage) {
        return;
      }


      setRegeneratingImage(true);


      try {

        const response =
          await apiService.post(
            `/ai/regenerate-image/${draftId}`
          );


        setImageUrl(
          response.image_url
        );


        showToast(
          'Image regenerated successfully',
          'success'
        );

      } catch (error) {

        showToast(
          'Failed to regenerate image.'
        );

      } finally {

        setRegeneratingImage(false);

      }
    };


  /* ============================================================
     DISCARD
  ============================================================ */

  const handleDiscard = () => {

    Alert.alert(

      'Discard Draft?',

      'Are you sure you want to discard this campaign? This cannot be undone.',

      [

        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Discard',
          style: 'destructive',

          onPress: async () => {

            setDiscarding(true);

            try {

              await apiService.post(
                `/ai/discard/${draftId}`
              );


              navigation.navigate(
                'SellerDashboard'
              );

            } catch (error) {

              setDiscarding(false);

              showToast(
                'Failed to discard campaign.'
              );

            }

          },
        },

      ]
    );
  };


  /* ============================================================
     VALIDATION
  ============================================================ */

  const validate = () => {

    const newErrors = {};


    if (!title.trim()) {

      newErrors.title =
        'Campaign title is required';

    }


    if (!description.trim()) {

      newErrors.description =
        'Description is required';

    }


    if (!offer.trim()) {

      newErrors.offer =
        'Offer line is required';

    }


    if (
      ['WHATSAPP', 'CALL', 'LINK']
        .includes(ctaType)
      &&
      !ctaValue.trim()
    ) {

      newErrors.ctaValue =
        `Please provide a ${
          ctaType === 'LINK'
            ? 'website URL'
            : 'phone number'
        }`;

    }


    setErrors(newErrors);


    return (
      Object.keys(newErrors).length === 0
    );
  };


  /* ============================================================
     PUBLISH
  ============================================================ */

  const handlePublish = async () => {

    Keyboard.dismiss();


    if (!validate()) {
      return;
    }


    setPublishing(true);


    try {

      await apiService.post(
        `/ai/publish/${draftId}`,
        {
          title: title.trim(),

          campaign_description:
            description.trim(),

          offer:
            offer.trim(),

          cta_type:
            ctaType,

          cta_value:
            ctaValue.trim(),

          image_url:
            imageUrl,

          price:
            price.trim()
              ? parseFloat(price.trim())
              : null,
        }
      );


      showToast(
        'Campaign published successfully!',
        'success'
      );


      const hasRated =
        await AsyncStorage.getItem(
          'has_rated_reachlo_seller'
        );


      if (!hasRated) {

        await AsyncStorage.setItem(
          'has_rated_reachlo_seller',
          'true'
        );


        setShowRatingModal(true);

      } else {

        setTimeout(() => {

          navigation.navigate(
            'SellerDashboard'
          );

        }, 1000);

      }

    } catch (error) {

      setPublishing(false);

      showToast(
        error?.message ||
        'Failed to publish campaign.'
      );

    }

  };


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {

    return (

      <SafeAreaView
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              palette.background,
          },
        ]}
      >

        <View
          style={[
            styles.loadingIcon,
            {
              backgroundColor:
                palette.primaryLight,
            },
          ]}
        >

          <Ionicons
            name="sparkles"
            size={28}
            color={palette.primary}
          />

        </View>


        <ActivityIndicator
          size="small"
          color={palette.primary}
          style={{
            marginTop: 18,
          }}
        />


        <Text
          style={[
            styles.loadingTitle,
            {
              color: palette.text,
            },
          ]}
        >
          Preparing your campaign
        </Text>


        <Text
          style={[
            styles.loadingSubtitle,
            {
              color:
                palette.textSecondary,
            },
          ]}
        >
          Loading AI-generated content...
        </Text>

      </SafeAreaView>
    );
  }


  /* ============================================================
     UI
  ============================================================ */

  return (

    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            palette.background,
        },
      ]}
      edges={['top', 'bottom']}
    >

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() =>
          setToastVisible(false)
        }
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

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

        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor:
                palette.input,

              borderColor:
                palette.border,
            },

            pressed &&
              styles.pressed,
          ]}
          hitSlop={10}
        >

          <Ionicons
            name="arrow-back"
            size={21}
            color={palette.text}
          />

        </Pressable>


        <View
          style={styles.headerTextContainer}
        >

          <Text
            style={[
              styles.headerTitle,
              {
                color:
                  palette.text,
              },
            ]}
          >
            Review & Publish
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
            Finalize your AI campaign
          </Text>

        </View>


        <View
          style={[
            styles.aiIcon,
            {
              backgroundColor:
                palette.primaryLight,
            },
          ]}
        >

          <Ionicons
            name="sparkles"
            size={19}
            color={palette.primary}
          />

        </View>

      </View>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >


          {/* ==================================================
              INTRO
          ================================================== */}

          <View
            style={styles.introSection}
          >

            <View
              style={[
                styles.introIcon,
                {
                  backgroundColor:
                    palette.primaryLight,
                },
              ]}
            >

              <Ionicons
                name="document-text-outline"
                size={20}
                color={palette.primary}
              />

            </View>


            <View
              style={styles.introText}
            >

              <Text
                style={[
                  styles.introTitle,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Your campaign is ready
              </Text>


              

            </View>

          </View>


          {/* ==================================================
              WARNINGS
          ================================================== */}

          {warnings.length > 0 && (

            <View
              style={[
                styles.warningCard,
                {
                  backgroundColor:
                    palette.warningBg,

                  borderColor:
                    palette.warningBorder,
                },
              ]}
            >

              <View
                style={styles.warningHeader}
              >

                <View
                  style={[
                    styles.warningIcon,
                    {
                      backgroundColor:
                        isDarkMode
                          ? 'rgba(251,191,36,0.16)'
                          : '#FEF3C7',
                    },
                  ]}
                >

                  <Ionicons
                    name="warning-outline"
                    size={18}
                    color={
                      palette.warning
                    }
                  />

                </View>


                <View
                  style={
                    styles.warningHeaderText
                  }
                >

                  <Text
                    style={[
                      styles.warningTitle,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    Please verify these details
                  </Text>

                  <Text
                    style={[
                      styles.warningSubtitle,
                      {
                        color:
                          palette.textSecondary,
                      },
                    ]}
                  >
                    AI-generated information may need
                    your confirmation.
                  </Text>

                </View>

              </View>


              <View
                style={[
                  styles.warningDivider,
                  {
                    backgroundColor:
                      palette.warningBorder,
                  },
                ]}
              />


              {warnings.map(
                (warning, index) => (

                  <View
                    key={index}
                    style={
                      styles.warningRow
                    }
                  >

                    <View
                      style={[
                        styles.warningBullet,
                        {
                          backgroundColor:
                            palette.warning,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.warningText,
                        {
                          color:
                            palette.textSecondary,
                        },
                      ]}
                    >
                      {warning}
                    </Text>

                  </View>

                )
              )}

            </View>

          )}


          {/* ==================================================
              CAMPAIGN PREVIEW
          ================================================== */}

          <View
            style={styles.sectionHeaderRow}
          >

            <View>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Campaign Preview
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      palette.textSecondary,
                  },
                ]}
              >
                This is how your campaign will appear.
              </Text>

            </View>


            <View
              style={[
                styles.previewTag,
                {
                  backgroundColor:
                    palette.primaryLight,
                },
              ]}
            >

              <Ionicons
                name="eye-outline"
                size={13}
                color={palette.primary}
              />

              <Text
                style={[
                  styles.previewTagText,
                  {
                    color:
                      palette.primary,
                  },
                ]}
              >
                PREVIEW
              </Text>

            </View>

          </View>


          <View
            style={[
              styles.previewCard,
              {
                backgroundColor:
                  palette.card,

                borderColor:
                  palette.border,

                shadowColor:
                  palette.shadow,
              },
            ]}
          >

            {/* -----------------------------------------------
                IMAGE
            ----------------------------------------------- */}

            <View
              style={styles.imageContainer}
            >

              {imageUrl ? (

                <Image
                  source={{
                    uri:
                      resolveMediaUrl(
                        imageUrl
                      ),
                  }}
                  style={
                    styles.previewImage
                  }
                  resizeMode="cover"
                />

              ) : (

                <View
                  style={[
                    styles.imagePlaceholder,
                    {
                      backgroundColor:
                        palette.input,
                    },
                  ]}
                >

                  <View
                    style={[
                      styles.placeholderIcon,
                      {
                        backgroundColor:
                          palette.primaryLight,
                      },
                    ]}
                  >

                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={
                        palette.primary
                      }
                    />

                  </View>


                  <Text
                    style={[
                      styles.placeholderTitle,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    Generating image...
                  </Text>

                </View>

              )}


              {/* IMAGE OVERLAY */}

              <View
                style={styles.imageOverlay}
              />


              {/* ACTIVE */}

              <View
                style={[
                  styles.activeBadge,
                  {
                    backgroundColor:
                      palette.successBg,

                    borderColor:
                      palette.successBorder,
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
                    styles.activeText,
                    {
                      color:
                        palette.success,
                    },
                  ]}
                >
                  ACTIVE
                </Text>

              </View>


              {/* REGENERATE */}

              <Pressable
                onPress={
                  handleRegenerateImage
                }
                disabled={
                  regeneratingImage
                }
                style={({ pressed }) => [
                  styles.regenerateButton,
                  pressed &&
                    styles.pressed,
                ]}
              >

                {regeneratingImage ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <>

                    <Ionicons
                      name="refresh"
                      size={14}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.regenerateText
                      }
                    >
                      Regenerate
                    </Text>

                  </>

                )}

              </Pressable>

            </View>


            {/* -----------------------------------------------
                PREVIEW CONTENT
            ----------------------------------------------- */}

            <View
              style={styles.previewContent}
            >

              <Text
                style={[
                  styles.previewTitle,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                {title ||
                  'Your campaign title'}
              </Text>


              {description ? (

                <Text
                  numberOfLines={3}
                  style={[
                    styles.previewDescription,
                    {
                      color:
                        palette.textSecondary,
                    },
                  ]}
                >
                  {description}
                </Text>

              ) : null}


              <View
                style={[
                  styles.previewDivider,
                  {
                    backgroundColor:
                      palette.border,
                  },
                ]}
              />


              <View
                style={
                  styles.previewBottomRow
                }
              >

                <View
                  style={
                    styles.offerPreview
                  }
                >

                  <View
                    style={[
                      styles.offerIcon,
                      {
                        backgroundColor:
                          palette.successBg,
                      },
                    ]}
                  >

                    <Ionicons
                      name="pricetag-outline"
                      size={14}
                      color={
                        palette.success
                      }
                    />

                  </View>


                  <View>

                    <Text
                      style={[
                        styles.offerLabel,
                        {
                          color:
                            palette.textTertiary,
                        },
                      ]}
                    >
                      OFFER
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.offerValue,
                        {
                          color:
                            palette.text,
                        },
                      ]}
                    >
                      {offer ||
                        'Your special offer'}
                    </Text>

                  </View>

                </View>


                {price ? (

                  <View
                    style={[
                      styles.priceBadge,
                      {
                        backgroundColor:
                          palette.priceBg,
                      },
                    ]}
                  >

                    <Text
                      style={
                        styles.priceCurrency
                      }
                    >
                      ₹
                    </Text>

                    <Text
                      style={
                        styles.priceValue
                      }
                    >
                      {price}
                    </Text>

                  </View>

                ) : null}

              </View>

            </View>

          </View>


          {/* ==================================================
              EDIT DETAILS
          ================================================== */}

          <View
            style={[
              styles.formCard,
              {
                backgroundColor:
                  palette.card,

                borderColor:
                  palette.border,

                shadowColor:
                  palette.shadow,
              },
            ]}
          >

            <View
              style={
                styles.formCardHeader
              }
            >

              <View
                style={[
                  styles.formHeaderIcon,
                  {
                    backgroundColor:
                      palette.primaryLight,
                  },
                ]}
              >

                <Ionicons
                  name="create-outline"
                  size={19}
                  color={
                    palette.primary
                  }
                />

              </View>


              <View>

                <Text
                  style={[
                    styles.formCardTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Edit Campaign
                </Text>

                <Text
                  style={[
                    styles.formCardSubtitle,
                    {
                      color:
                        palette.textSecondary,
                    },
                  ]}
                >
                  Fine-tune your campaign details
                </Text>

              </View>

            </View>


            <View
              style={[
                styles.formDivider,
                {
                  backgroundColor:
                    palette.border,
                },
              ]}
            />


            {/* TITLE */}

            <FormField
              label="Campaign Title"
              required
              value={title}
              onChangeText={(value) => {

                setTitle(value);

                if (errors.title) {

                  setErrors(prev => ({
                    ...prev,
                    title: null,
                  }));

                }

              }}
              placeholder="e.g. 50% Off Summer Collection"
              error={errors.title}
              palette={palette}
            />


            {/* PRICE */}

            <FormField
              label="Campaign Price"
              suffix="Optional"
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 999"
              keyboardType="numeric"
              palette={palette}
              prefix="₹"
            />


            {/* DESCRIPTION */}

            <FormField
              label="Description"
              required
              value={description}
              onChangeText={(value) => {

                setDescription(value);

                if (errors.description) {

                  setErrors(prev => ({
                    ...prev,
                    description: null,
                  }));

                }

              }}
              placeholder="Describe your offer in detail..."
              multiline
              textArea
              error={errors.description}
              palette={palette}
            />


            {/* OFFER */}

            <FormField
              label="Offer / Deal Line"
              required
              value={offer}
              onChangeText={(value) => {

                setOffer(value);

                if (errors.offer) {

                  setErrors(prev => ({
                    ...prev,
                    offer: null,
                  }));

                }

              }}
              placeholder="e.g. First Week Free"
              error={errors.offer}
              palette={palette}
            />


            {/* CTA */}

            <View
              style={styles.fieldGroup}
            >

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Call to Action
              </Text>


              <Text
                style={[
                  styles.fieldHint,
                  {
                    color:
                      palette.textTertiary,
                  },
                ]}
              >
                Choose how customers should contact you.
              </Text>


              <View
                style={
                  styles.ctaGrid
                }
              >

                {[
                  {
                    type: 'WHATSAPP',
                    icon: 'logo-whatsapp',
                    label: 'WhatsApp',
                  },
                  {
                    type: 'CALL',
                    icon: 'call-outline',
                    label: 'Call',
                  },
                  {
                    type: 'LINK',
                    icon: 'globe-outline',
                    label: 'Website',
                  },
                  {
                    type: 'FORM',
                    icon: 'document-text-outline',
                    label: 'Get Quote',
                  },
                ].map(item => {

                  const active =
                    ctaType === item.type;


                  return (

                    <Pressable
                      key={item.type}
                      onPress={() => {

                        setCtaType(
                          item.type
                        );

                        setCtaValue(
                          item.type ===
                            'WHATSAPP' ||
                          item.type === 'CALL'
                            ? user?.phone || ''
                            : ''
                        );

                        setErrors(prev => ({
                          ...prev,
                          ctaValue: null,
                        }));

                      }}
                      style={({ pressed }) => [
                        styles.ctaButton,

                        {
                          backgroundColor:
                            active
                              ? palette.primaryLight
                              : palette.input,

                          borderColor:
                            active
                              ? palette.primary
                              : palette.border,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >

                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={
                          active
                            ? palette.primary
                            : palette.textSecondary
                        }
                      />

                      <Text
                        style={[
                          styles.ctaButtonText,
                          {
                            color:
                              active
                                ? palette.primary
                                : palette.textSecondary,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>


                      {active && (

                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={
                            palette.primary
                          }
                        />

                      )}

                    </Pressable>

                  );

                })}

              </View>

            </View>


            {/* CTA VALUE */}

            {[
              'WHATSAPP',
              'CALL',
              'LINK',
            ].includes(ctaType) && (

              <FormField
                label={
                  ctaType === 'LINK'
                    ? 'Website URL'
                    : 'Phone Number'
                }
                required
                value={ctaValue}
                onChangeText={(value) => {

                  setCtaValue(value);

                  if (errors.ctaValue) {

                    setErrors(prev => ({
                      ...prev,
                      ctaValue: null,
                    }));

                  }

                }}
                placeholder={
                  ctaType === 'LINK'
                    ? 'https://example.com'
                    : '10-digit mobile number'
                }
                keyboardType={
                  ctaType === 'LINK'
                    ? 'url'
                    : 'phone-pad'
                }
                error={
                  errors.ctaValue
                }
                palette={palette}
                icon={
                  ctaType === 'LINK'
                    ? 'globe-outline'
                    : 'call-outline'
                }
              />

            )}

          </View>


          {/* ==================================================
              PUBLISH INFO
          ================================================== */}

          <View
            style={[
              styles.publishInfo,
              {
                backgroundColor:
                  palette.primaryLight,

                borderColor:
                  palette.primaryBorder,
              },
            ]}
          >

            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={
                palette.primary
              }
            />


            <Text
              style={[
                styles.publishInfoText,
                {
                  color:
                    palette.textSecondary,
                },
              ]}
            >
              Review your campaign carefully before
              publishing. You can update your campaign
              later from the dashboard.
            </Text>

          </View>


        </ScrollView>

      </KeyboardAvoidingView>


      {/* ======================================================
          BOTTOM ACTION BAR
      ====================================================== */}

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor:
              palette.surface,

            borderTopColor:
              palette.border,
          },
        ]}
      >

        <Pressable
          onPress={handleDiscard}
          disabled={
            discarding ||
            publishing
          }
          style={({ pressed }) => [
            styles.discardButton,

            {
              backgroundColor:
                palette.input,

              borderColor:
                palette.borderStrong,
            },

            pressed &&
              styles.pressed,
          ]}
        >

          {discarding ? (

            <ActivityIndicator
              size="small"
              color={
                palette.textSecondary
              }
            />

          ) : (

            <>

              <Ionicons
                name="trash-outline"
                size={17}
                color={
                  palette.textSecondary
                }
              />

              <Text
                style={[
                  styles.discardText,
                  {
                    color:
                      palette.textSecondary,
                  },
                ]}
              >
                Discard
              </Text>

            </>

          )}

        </Pressable>


        <Pressable
          onPress={handlePublish}
          disabled={
            publishing ||
            discarding
          }
          style={({ pressed }) => [
            styles.publishButton,
            {
              backgroundColor:
                palette.primary,
            },

            pressed &&
              styles.publishButtonPressed,
          ]}
        >

          {publishing ? (

            <>

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.publishText
                }
              >
                Publishing...
              </Text>

            </>

          ) : (

            <>

              <Ionicons
                name="rocket-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.publishText
                }
              >
                Publish Campaign
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />

            </>

          )}

        </Pressable>

      </View>


      {/* ======================================================
          RATING MODAL
      ====================================================== */}

      <RatingModal
        visible={
          showRatingModal
        }

        onClose={() => {

          setShowRatingModal(false);

          navigation.navigate(
            'SellerDashboard'
          );

        }}

        userRole="seller"
      />

    </SafeAreaView>
  );
}


/* ============================================================
   REUSABLE FORM FIELD
============================================================ */

function FormField({
  label,
  suffix,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  textArea,
  error,
  palette,
  prefix,
  icon,
}) {

  return (

    <View
      style={
        styles.fieldGroup
      }
    >

      {/* LABEL */}

      <View
        style={
          styles.fieldLabelRow
        }
      >

        <Text
          style={[
            styles.fieldLabel,
            {
              color:
                palette.text,
            },
          ]}
        >
          {label}

          {required && (

            <Text
              style={{
                color:
                  palette.danger,
              }}
            >
              {' '}*
            </Text>

          )}

        </Text>


        {suffix && (

          <Text
            style={[
              styles.optionalText,
              {
                color:
                  palette.textTertiary,
              },
            ]}
          >
            {suffix}
          </Text>

        )}

      </View>


      {/* INPUT */}

      <View
        style={[
          styles.inputWrapper,

          {
            backgroundColor:
              palette.input,

            borderColor:
              error
                ? palette.danger
                : palette.border,
          },

          textArea &&
            styles.textAreaWrapper,
        ]}
      >

        {prefix && (

          <Text
            style={[
              styles.inputPrefix,
              {
                color:
                  palette.textSecondary,
              },
            ]}
          >
            {prefix}
          </Text>

        )}


        {icon && (

          <Ionicons
            name={icon}
            size={18}
            color={
              palette.textSecondary
            }
            style={
              styles.inputIcon
            }
          />

        )}


        <TextInput
          value={value}
          onChangeText={
            onChangeText
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            palette.textTertiary
          }
          keyboardType={
            keyboardType
          }
          multiline={
            multiline
          }
          textAlignVertical={
            textArea
              ? 'top'
              : 'center'
          }
          style={[
            styles.textInput,

            {
              color:
                palette.text,
            },

            textArea &&
              styles.textAreaInput,

            (prefix || icon) &&
              styles.inputWithPrefix,
          ]}
        />

      </View>


      {/* ERROR */}

      {error && (

        <View
          style={
            styles.errorRow
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={
              palette.danger
            }
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  palette.danger,
              },
            ]}
          >
            {error}
          </Text>

        </View>

      )}

    </View>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({

  /* ----------------------------------------------------------
     ROOT
  ---------------------------------------------------------- */

  container: {
    flex: 1,
  },


  keyboardContainer: {
    flex: 1,
  },


  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 150,
  },


  /* ----------------------------------------------------------
     LOADING
  ---------------------------------------------------------- */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },


  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },


  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
  },


  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },


  /* ----------------------------------------------------------
     HEADER
  ---------------------------------------------------------- */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },


  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },


  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },


  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },


  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
  },


  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ----------------------------------------------------------
     INTRO
  ---------------------------------------------------------- */

  introSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },


  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },


  introText: {
    flex: 1,
    marginLeft: 12,
  },


  introTitle: {
    fontSize: 20,
    fontWeight: '800',
  },


  introDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },


  /* ----------------------------------------------------------
     WARNINGS
  ---------------------------------------------------------- */

  warningCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 22,
  },


  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  warningIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },


  warningHeaderText: {
    flex: 1,
    marginLeft: 10,
  },


  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
  },


  warningSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },


  warningDivider: {
    height: 1,
    marginVertical: 13,
    opacity: 0.5,
  },


  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },


  warningBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 9,
  },


  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },


  /* ----------------------------------------------------------
     SECTION HEADER
  ---------------------------------------------------------- */

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },


  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },


  sectionSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },


  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },


  previewTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },


  /* ----------------------------------------------------------
     PREVIEW CARD
  ---------------------------------------------------------- */

  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.08,
    shadowRadius: 14,

    elevation: 4,
  },


  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
    overflow: 'hidden',
  },


  previewImage: {
    width: '100%',
    height: '100%',
  },


  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  placeholderIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },


  placeholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },


  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor:
      'rgba(0,0,0,0.15)',
  },


  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 12,
    borderWidth: 1,

    gap: 5,
  },


  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },


  activeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },


  regenerateButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 12,

    backgroundColor:
      'rgba(15,23,42,0.78)',

    gap: 5,
  },


  regenerateText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },


  previewContent: {
    padding: 16,
  },


  previewTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },


  previewDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },


  previewDivider: {
    height: 1,
    marginVertical: 14,
  },


  previewBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  offerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },


  offerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },


  offerLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },


  offerValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },


  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
  },


  priceCurrency: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },


  priceValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },


  /* ----------------------------------------------------------
     FORM CARD
  ---------------------------------------------------------- */

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.05,
    shadowRadius: 12,

    elevation: 2,
  },


  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  formHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },


  formCardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },


  formCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },


  formDivider: {
    height: 1,
    marginVertical: 17,
  },


  /* ----------------------------------------------------------
     FORM FIELDS
  ---------------------------------------------------------- */

  fieldGroup: {
    marginBottom: 18,
  },


  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },


  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
  },


  optionalText: {
    fontSize: 11,
    marginLeft: 6,
  },


  fieldHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: -3,
    marginBottom: 9,
  },


  inputWrapper: {
    minHeight: 48,

    borderWidth: 1,
    borderRadius: 14,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,
  },


  textInput: {
    flex: 1,
    minHeight: 46,

    fontSize: 14,
    fontWeight: '500',

    paddingVertical: 11,
    paddingHorizontal: 0,
  },


  textAreaWrapper: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingTop: 2,
  },


  textAreaInput: {
    minHeight: 112,
    lineHeight: 20,
  },


  inputPrefix: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 5,
  },


  inputIcon: {
    marginRight: 8,
  },


  inputWithPrefix: {
    paddingLeft: 0,
  },


  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },


  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },


  /* ----------------------------------------------------------
     CTA BUTTONS
  ---------------------------------------------------------- */

  ctaGrid: {
    gap: 9,
  },


  ctaButton: {
    minHeight: 48,

    borderRadius: 13,
    borderWidth: 1,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,

    gap: 8,
  },


  ctaButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },


  /* ----------------------------------------------------------
     PUBLISH INFO
  ---------------------------------------------------------- */

  publishInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    borderWidth: 1,
    borderRadius: 15,

    padding: 13,

    marginTop: 18,
  },


  publishInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 9,
  },


  /* ----------------------------------------------------------
     BOTTOM BAR
  ---------------------------------------------------------- */

  bottomBar: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingTop: 12,

    paddingBottom:
      Platform.OS === 'ios'
        ? 27
        : 14,

    borderTopWidth: 1,

    gap: 10,
  },


  discardButton: {
    height: 52,

    flex: 0.9,

    borderRadius: 15,
    borderWidth: 1,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,
  },


  discardText: {
    fontSize: 13,
    fontWeight: '800',
  },


  publishButton: {
    height: 52,

    flex: 1.8,

    borderRadius: 15,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,

    elevation: 5,
  },


  publishButtonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },


  publishText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },


  /* ----------------------------------------------------------
     PRESS STATE
  ---------------------------------------------------------- */

  pressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

});