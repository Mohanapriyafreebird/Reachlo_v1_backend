import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { useRoleTheme } from '../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* =========================================================
   ROLE COLORS
========================================================= */

const ROLE_COLORS = {
  SELLER: {
    primary: '#8B5CF6',
    darkPrimary: '#7C3AED',
    deep: '#6D28D9',
    light: '#F5F3FF',
    lightStrong: '#EDE9FE',
    darkTint: 'rgba(139, 92, 246, 0.14)',
    darkTintStrong: 'rgba(139, 92, 246, 0.22)',
  },

  BUYER: {
    primary: '#3B82F6',
    darkPrimary: '#2563EB',
    deep: '#1D4ED8',
    light: '#EFF6FF',
    lightStrong: '#DBEAFE',
    darkTint: 'rgba(59, 130, 246, 0.14)',
    darkTintStrong: 'rgba(59, 130, 246, 0.22)',
  },
};

/* =========================================================
   DATA
========================================================= */

const SELLER_CATEGORIES = [
  {
    id: 's1',
    title: 'Getting Started',
    icon: 'rocket-outline',
  },
  {
    id: 's2',
    title: 'Campaigns & Leads',
    icon: 'megaphone-outline',
  },
  {
    id: 's3',
    title: 'Account & Profile',
    icon: 'person-outline',
  },
  {
    id: 's4',
    title: 'Technical',
    icon: 'construct-outline',
  },
];

const BUYER_CATEGORIES = [
  {
    id: 'b1',
    title: 'Getting Started',
    icon: 'rocket-outline',
  },
  {
    id: 'b2',
    title: 'Discovering Deals',
    icon: 'search-outline',
  },
  {
    id: 'b3',
    title: 'Claiming Deals & Contacting Sellers',
    icon: 'chatbubbles-outline',
  },
  {
    id: 'b4',
    title: 'Account & Profile',
    icon: 'person-outline',
  },
  {
    id: 'b5',
    title: 'Privacy & Safety',
    icon: 'shield-outline',
  },
];

const FAQ_DATA = {
  /* ---------------- SELLER ---------------- */

  s1: [
    {
      q: 'What is REACHLO for sellers?',
      a: 'REACHLO is a platform that lets you create AI-powered marketing campaigns and connect with buyers in your city. Think of it as a smart, digital flyer system that works 24/7.',
    },
    {
      q: 'Is REACHLO free to use?',
      a: "You can create an account and post campaigns for free. Premium features like campaign boosting and advanced analytics may require a subscription in the future. You'll always be notified before any charges apply.",
    },
    {
      q: 'How do I create my first campaign?',
      a: "After registering, go to your Seller Dashboard → Tap 'Create Campaign' → Let our AI generate the content based on your business description, or write your own → Set your offer, CTA (WhatsApp/Call/Link), and publish!",
    },
    {
      q: 'What is the AI Campaign Generator?',
      a: "It's REACHLO's built-in AI tool that reads your business description and automatically writes a professional campaign title, description, and offer for you. It also picks the best category and target audience — saving you hours of work.",
    },
  ],

  s2: [
    {
      q: 'What happens after I publish a campaign?',
      a: 'Your campaign becomes visible to buyers browsing the Discovery Feed in your target city. Interested buyers can claim the deal, and you\'ll receive a lead notification instantly.',
    },
    {
      q: 'What is a lead?',
      a: "A lead is when a buyer expresses interest in your campaign. You'll get their name and phone number, and a chat thread opens so you can follow up immediately.",
    },
    {
      q: 'Can I edit a campaign after publishing?',
      a: "Currently, campaigns can be paused or deleted. Major edits require creating a new campaign. We're working on an 'edit live campaign' feature.",
    },
    {
      q: 'How long does a campaign stay active?',
      a: 'You can set an expiry date when creating a campaign. If no date is set, it stays active until you manually delete or pause it.',
    },
    {
      q: 'What is Campaign Boost?',
      a: 'Boosted campaigns appear at the top of the Discovery Feed for buyers in your city, giving you significantly more visibility. Boost options will be available in a future update.',
    },
    {
      q: 'What types of CTA can I set?',
      a: 'You can set:\n• WhatsApp — buyers open a WhatsApp chat with your number\n• Call — buyers can call you directly\n• Link — buyers are sent to your website or booking page\n• In-app Chat — buyers message you within REACHLO',
      isList: true,
    },
  ],

  s3: [
    {
      q: 'Can I have multiple businesses on one account?',
      a: 'Currently, each seller account is linked to one business. Multiple business support is on our roadmap.',
    },
    {
      q: 'How do I update my business details?',
      a: 'Go to Profile → Edit Business Details. Changes to your business description will trigger an AI re-analysis in the background.',
    },
    {
      q: 'What if I forget my password?',
      a: "On the login screen, tap 'Forgot Password', enter your registered email, and create a new password. The change takes effect immediately.",
    },
    {
      q: 'How do I delete my account?',
      a: 'Go to Profile → Account Settings → Delete Account. This action is permanent and removes all your campaigns, leads, and business data.',
    },
  ],

  s4: [
    {
      q: 'Why is my campaign image not uploading?',
      a: 'Make sure your image is under 5 MB and in JPG or PNG format. Check your internet connection and try again. If the issue persists, contact support.',
    },
    {
      q: "I'm not receiving lead notifications. What should I do?",
      a: 'Ensure push notifications are enabled for REACHLO in your phone\'s settings. Go to your phone Settings → Apps → REACHLO → Notifications → Allow.',
    },
    {
      q: 'Which cities does REACHLO support?',
      a: "REACHLO currently focuses on major Indian cities. You can set your campaign to target 'All India' or specific cities where your buyers are located.",
    },
  ],

  /* ---------------- BUYER ---------------- */

  b1: [
    {
      q: 'What is REACHLO for buyers?',
      a: 'REACHLO is your go-to app to discover the best deals, offers, and local businesses near you. Browse campaigns by category, save your favorites, and connect directly with sellers — no middlemen.',
    },
    {
      q: 'Is it free to use REACHLO as a buyer?',
      a: 'Yes, completely free. Browsing, claiming deals, chatting with sellers, and saving campaigns cost nothing.',
    },
    {
      q: 'Do I need to create an account?',
      a: 'You need an account to claim deals, chat with sellers, and save campaigns. Registration takes less than a minute.',
    },
  ],

  b2: [
    {
      q: 'How do I find deals near me?',
      a: 'The Discovery Feed shows campaigns sorted by relevance to your city. Use the category filter to narrow down by type (Food, Fitness, Beauty, Tech, etc.).',
    },
    {
      q: 'How do I save a campaign for later?',
      a: "Tap the bookmark icon on any campaign card to save it. Access your saved campaigns from the 'Saved' tab in your profile.",
    },
    {
      q: 'Can I search for a specific business?',
      a: 'You can browse by category and filter by city. A full business search feature is coming soon.',
    },
    {
      q: 'What does Boosted mean on a campaign?',
      a: 'Boosted campaigns are highlighted by sellers for extra visibility. They are genuine offers — boosting simply means the seller paid for more reach.',
    },
  ],

  b3: [
    {
      q: 'How do I claim a deal?',
      a: "Tap on a campaign → Tap 'Claim Deal' or the CTA button (WhatsApp, Call, etc.) → Fill in your name and message (if required) → Submit. The seller will receive your details and contact you.",
    },
    {
      q: 'Will the seller see my phone number?',
      a: 'Yes — when you claim a deal, the seller sees your name and phone number so they can follow up. Only share your details if you are genuinely interested.',
    },
    {
      q: 'Can I chat with a seller inside the app?',
      a: 'Yes! For campaigns with an in-app chat CTA, a chat thread opens after you claim the deal. You can message the seller and receive replies directly in REACHLO.',
    },
    {
      q: "I claimed a deal but haven't heard back. What should I do?",
      a: "Sellers are notified immediately. If you don't hear back within 24 hours, try contacting them via the alternate contact method (WhatsApp or Call) shown on the campaign. You can also report unresponsive sellers to our support team.",
    },
  ],

  b4: [
    {
      q: 'How do I edit my profile?',
      a: "Go to the Profile tab → Edit Profile → Update your name, city, or profile picture → Save.",
    },
    {
      q: 'How do I change my password?',
      a: 'Go to Profile → Account Settings → Change Password. You\'ll be prompted to enter your current password and a new one.',
    },
    {
      q: 'I forgot my password. How do I reset it?',
      a: "On the login screen, tap 'Forgot Password' → Enter your registered email address → Create a new password. Log in immediately with your new password.",
    },
    {
      q: 'How do I delete my account?',
      a: 'Go to Profile → Account Settings → Delete Account. This permanently removes your account and all associated data.',
    },
  ],

  b5: [
    {
      q: 'Is my personal information safe?',
      a: 'Yes. Your password is encrypted and never visible to anyone — including our team. We do not sell your data to third parties. Read our full Privacy Policy for details.',
    },
    {
      q: 'Can sellers see my profile?',
      a: 'Sellers only see your name and phone number after you claim their deal. They cannot browse your profile or history.',
    },
    {
      q: 'What if I receive spam or inappropriate content?',
      a: "Use the 'Report' option on any campaign or message. Our team reviews all reports within 24 hours. Repeat offenders are banned from the platform.",
    },
  ],
};

/* =========================================================
   FAQ ITEM
========================================================= */

const FAQItem = ({
  item,
  isExpanded,
  onPress,
  theme,
  colors,
  isDarkMode,
}) => {
  const animatedRotation = useRef(
    new Animated.Value(isExpanded ? 1 : 0)
  ).current;

  React.useEffect(() => {
    Animated.timing(animatedRotation, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const arrowRotation = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.Presets.easeInEaseOut
        );
        onPress();
      }}
      style={({ pressed }) => [
        styles.faqCard,
        {
          backgroundColor: isDarkMode
            ? theme.surface
            : theme.surface,
          borderColor: isExpanded
            ? colors.primary
            : theme.border,
        },
        isExpanded && {
          backgroundColor: isDarkMode
            ? colors.darkTint
            : colors.light,
        },
        pressed && styles.pressedCard,
      ]}
    >
      <View style={styles.faqHeader}>
        <View
          style={[
            styles.faqNumber,
            {
              backgroundColor: isExpanded
                ? colors.primary
                : isDarkMode
                ? colors.darkTintStrong
                : colors.lightStrong,
            },
          ]}
        >
          <Ionicons
            name={
              isExpanded
                ? 'remove-outline'
                : 'help-outline'
            }
            size={17}
            color={
              isExpanded
                ? '#FFFFFF'
                : colors.primary
            }
          />
        </View>

        <Text
          style={[
            styles.faqQuestion,
            {
              color: theme.text,
            },
          ]}
        >
          {item.q}
        </Text>

        <Animated.View
          style={{
            transform: [{ rotate: arrowRotation }],
          }}
        >
          <View
            style={[
              styles.chevronContainer,
              {
                backgroundColor: isExpanded
                  ? colors.primary
                  : isDarkMode
                  ? colors.darkTint
                  : colors.light,
              },
            ]}
          >
            <Feather
              name="chevron-down"
              size={17}
              color={
                isExpanded
                  ? '#FFFFFF'
                  : colors.primary
              }
            />
          </View>
        </Animated.View>
      </View>

      {isExpanded && (
        <View
          style={[
            styles.faqAnswerContainer,
            {
              borderTopColor: isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : theme.border,
            },
          ]}
        >
          {item.isList ? (
            <View style={styles.listContainer}>
              {item.a.split('\n').map((line, index) => {
                if (index === 0) {
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.faqAnswer,
                        {
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      {line}
                    </Text>
                  );
                }

                return (
                  <View
                    key={index}
                    style={styles.listRow}
                  >
                    <View
                      style={[
                        styles.bullet,
                        {
                          backgroundColor:
                            colors.primary,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.listText,
                        {
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      {line.replace('• ', '')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text
              style={[
                styles.faqAnswer,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              {item.a}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
};

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function HelpSupportScreen({
  navigation,
  route,
}) {
  const requestedRole = route?.params?.themeRole;
  const { theme, isDarkMode } = useRoleTheme(requestedRole);
  const { role } = useAuth();

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [expandedIndex, setExpandedIndex] =
    useState(null);

  const isSeller = String(requestedRole || role || '').toUpperCase() === 'SELLER';

  const colors = isSeller
    ? ROLE_COLORS.SELLER
    : ROLE_COLORS.BUYER;

  const categories = isSeller
    ? SELLER_CATEGORIES
    : BUYER_CATEGORIES;

  const currentFAQs = selectedCategory
    ? FAQ_DATA[selectedCategory.id]
    : [];

  /* ---------------------------------------------------------
     CATEGORY PRESS
  --------------------------------------------------------- */

  const handleCategoryPress = (category) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );

    setSelectedCategory(category);
    setExpandedIndex(null);
  };

  /* ---------------------------------------------------------
     BACK
  --------------------------------------------------------- */

  const handleBack = () => {
    if (selectedCategory) {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut
      );

      setSelectedCategory(null);
      setExpandedIndex(null);
    } else {
      navigation.goBack();
    }
  };

  /* ---------------------------------------------------------
     SUPPORT
  --------------------------------------------------------- */

  const handleSupport = async () => {
    try {
      await Linking.openURL(
        'mailto:support@reachlo.com'
      );
    } catch (error) {
      console.warn(
        'Unable to open email client:',
        error
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      edges={['top', 'bottom']}
    >
      {/* =====================================================
          SUBTLE BACKGROUND ACCENTS
      ===================================================== */}

      <View
        pointerEvents="none"
        style={[
          styles.backgroundOrbTop,
          {
            backgroundColor: isDarkMode
              ? colors.darkTint
              : colors.light,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.backgroundOrbBottom,
          {
            backgroundColor: isDarkMode
              ? colors.darkTint
              : colors.light,
          },
        ]}
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={[
          styles.header,
          {
            backgroundColor: isDarkMode
              ? theme.surface
              : theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: isDarkMode
                ? theme.surfaceSecondary
                : colors.light,
              borderColor: theme.border,
            },
            pressed && styles.pressedButton,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.text}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.text,
              },
            ]}
          >
            REACHLO
          </Text>

          <View
            style={[
              styles.headerRolePill,
              {
                backgroundColor: isDarkMode
                  ? colors.darkTint
                  : colors.light,
              },
            ]}
          >
            <View
              style={[
                styles.roleDot,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
            />

            <Text
              style={[
                styles.roleText,
                {
                  color: colors.primary,
                },
              ]}
            >
              {isSeller ? 'SELLER' : 'BUYER'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor: isDarkMode
                ? colors.darkTintStrong
                : colors.lightStrong,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={colors.primary}
          />
        </View>
      </View>

      {/* =====================================================
          PAGE INTRO
      ===================================================== */}

      {!selectedCategory && (
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: isDarkMode
                  ? colors.darkTintStrong
                  : colors.lightStrong,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={27}
              color={colors.primary}
            />
          </View>

          <View style={styles.heroText}>
            <Text
              style={[
                styles.mainHeading,
                {
                  color: theme.text,
                },
              ]}
            >
              Help & Support
            </Text>

            
          </View>
        </View>
      )}

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {!selectedCategory ? (
          <>
            {/* =================================================
                CATEGORY SECTION
            ================================================= */}

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                How can we help?
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Choose a topic to find the
                information you need.
              </Text>
            </View>

            <View style={styles.categoriesContainer}>
              {categories.map((category, index) => (
                <Pressable
                  key={category.id}
                  onPress={() =>
                    handleCategoryPress(category)
                  }
                  style={({ pressed }) => [
                    styles.categoryCard,
                    {
                      backgroundColor:
                        theme.surface,
                      borderColor: theme.border,
                    },
                    pressed &&
                      styles.pressedCard,
                  ]}
                >
                  {/* Accent strip */}

                  <View
                    style={[
                      styles.categoryAccent,
                      {
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor:
                          isDarkMode
                            ? colors.darkTintStrong
                            : colors.lightStrong,
                      },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={23}
                      color={colors.primary}
                    />
                  </View>

                  <View
                    style={styles.categoryContent}
                  >
                    <Text
                      style={[
                        styles.categoryTitle,
                        {
                          color: theme.text,
                        },
                      ]}
                    >
                      {category.title}
                    </Text>

                    <Text
                      style={[
                        styles.categoryDescription,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {category.id.startsWith('s')
                        ? 'Learn more about your seller account'
                        : 'Find answers about using REACHLO'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.categoryArrow,
                      {
                        backgroundColor:
                          isDarkMode
                            ? colors.darkTint
                            : colors.light,
                      },
                    ]}
                  >
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* =================================================
                QUICK SUPPORT
            ================================================= */}

            <View
              style={[
                styles.quickSupportCard,
                {
                  backgroundColor: isDarkMode
                    ? colors.darkTint
                    : colors.light,
                  borderColor: isDarkMode
                    ? 'rgba(255,255,255,0.08)'
                    : colors.lightStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.quickSupportIcon,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={styles.quickSupportContent}
              >
                <Text
                  style={[
                    styles.quickSupportTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Can't find what you need?
                </Text>

                <Text
                  style={[
                    styles.quickSupportText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Our support team is here to
                  help you.
                </Text>
              </View>

              <Pressable
                onPress={handleSupport}
                style={({ pressed }) => [
                  styles.smallSupportButton,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                  pressed &&
                    styles.pressedButton,
                ]}
              >
                <Feather
                  name="arrow-up-right"
                  size={17}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* =================================================
                FAQ HEADER
            ================================================= */}

            <View style={styles.faqPageHeader}>
              <Pressable
                onPress={handleBack}
                style={[
                  styles.backToTopics,
                  {
                    backgroundColor:
                      isDarkMode
                        ? theme.surfaceSecondary
                        : colors.light,
                  },
                ]}
              >
                <Feather
                  name="arrow-left"
                  size={16}
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.backToTopicsText,
                    {
                      color: colors.primary,
                    },
                  ]}
                >
                  All topics
                </Text>
              </Pressable>

              <View
                style={[
                  styles.faqTitleIcon,
                  {
                    backgroundColor:
                      isDarkMode
                        ? colors.darkTintStrong
                        : colors.lightStrong,
                  },
                ]}
              >
                <Ionicons
                  name={selectedCategory.icon}
                  size={24}
                  color={colors.primary}
                />
              </View>

              <Text
                style={[
                  styles.categoryHeading,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {selectedCategory.title}
              </Text>

              <Text
                style={[
                  styles.faqSubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Tap a question to view the answer.
              </Text>
            </View>

            {/* =================================================
                FAQ LIST
            ================================================= */}

            <View style={styles.faqsContainer}>
              {currentFAQs.map((faq, index) => (
                <FAQItem
                  key={index}
                  item={faq}
                  isExpanded={
                    expandedIndex === index
                  }
                  onPress={() =>
                    setExpandedIndex(
                      expandedIndex === index
                        ? null
                        : index
                    )
                  }
                  theme={theme}
                  colors={colors}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>

            {/* =================================================
                SUPPORT CARD
            ================================================= */}

            <View
              style={[
                styles.supportCard,
                {
                  backgroundColor:
                    theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <LinearGradient
                colors={[
                  colors.primary,
                  colors.deep,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.supportGradient}
              >
                
                  
                
                <Text
                  style={styles.supportTitle}
                >
                  Still need help?
                </Text>

                <Text
                  style={styles.supportDesc}
                >
                  Our support team is just an
                  email away.
                </Text>

                <Pressable
                  onPress={handleSupport}
                  style={({ pressed }) => [
                    styles.supportButton,
                    {
                      backgroundColor:
                        '#FFFFFF',
                    },
                    pressed &&
                      styles.pressedButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.supportButtonText,
                      {
                        color:
                          colors.deep,
                      },
                    ]}
                  >
                    Contact Support
                  </Text>

                  <Feather
                    name="arrow-up-right"
                    size={18}
                    color={colors.deep}
                  />
                </Pressable>
              </LinearGradient>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* -------------------------------------------------------
     BACKGROUND
  ------------------------------------------------------- */

  backgroundOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -150,
    right: -100,
    opacity: 0.65,
  },

  backgroundOrbBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -120,
    left: -100,
    opacity: 0.5,
  },

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    zIndex: 10,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 1.5,
  },

  headerRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 3,
  },

  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },

  roleText: {
    fontSize: 8,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: 1,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* -------------------------------------------------------
     HERO
  ------------------------------------------------------- */

  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  heroText: {
    flex: 1,
  },

  mainHeading: {
    fontSize: 29,
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.5,
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* -------------------------------------------------------
     SCROLL
  ------------------------------------------------------- */

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 45,
  },

  /* -------------------------------------------------------
     SECTION HEADER
  ------------------------------------------------------- */

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* -------------------------------------------------------
     CATEGORY CARDS
  ------------------------------------------------------- */

  categoriesContainer: {
    gap: 11,
  },

  categoryCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  categoryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 13,
  },

  categoryContent: {
    flex: 1,
    paddingRight: 8,
  },

  categoryTitle: {
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 4,
  },

  categoryDescription: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  categoryArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* -------------------------------------------------------
     QUICK SUPPORT
  ------------------------------------------------------- */

  quickSupportCard: {
    marginTop: 22,
    borderRadius: 19,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  quickSupportIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  quickSupportContent: {
    flex: 1,
  },

  quickSupportTitle: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 3,
  },

  quickSupportText: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  smallSupportButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* -------------------------------------------------------
     FAQ PAGE HEADER
  ------------------------------------------------------- */

  faqPageHeader: {
    paddingTop: 20,
    paddingBottom: 18,
  },

  backToTopics: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 17,
  },

  backToTopicsText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginLeft: 6,
  },

  faqTitleIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  categoryHeading: {
    fontSize: 25,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 5,
  },

  faqSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* -------------------------------------------------------
     FAQ CARDS
  ------------------------------------------------------- */

  faqsContainer: {
    gap: 10,
  },

  faqCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },

  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  faqNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
    lineHeight: 20,
    paddingRight: 8,
  },

  chevronContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  faqAnswerContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },

  faqAnswer: {
    fontSize: 13,
    lineHeight: 21,
  },

  /* -------------------------------------------------------
     LIST ANSWERS
  ------------------------------------------------------- */

  listContainer: {
    gap: 9,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 9,
  },

  listText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  /* -------------------------------------------------------
     SUPPORT CARD
  ------------------------------------------------------- */

  supportCard: {
    marginTop: 25,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  supportGradient: {
    padding: 23,
    alignItems: 'center',
  },

  supportIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  supportTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginBottom: 6,
  },

  supportDesc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },

  supportButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  supportButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
    marginRight: 7,
  },

  /* -------------------------------------------------------
     PRESS STATES
  ------------------------------------------------------- */

  pressedCard: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  pressedButton: {
    opacity: 0.7,
  },
});
