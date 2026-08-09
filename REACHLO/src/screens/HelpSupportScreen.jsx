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
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------
// DATA
// ---------------------------------------------

const SELLER_CATEGORIES = [
  { id: 's1', title: 'Getting Started', icon: 'rocket-outline' },
  { id: 's2', title: 'Campaigns & Leads', icon: 'megaphone-outline' },
  { id: 's3', title: 'Account & Profile', icon: 'person-outline'},
  { id: 's4', title: 'Technical', icon: 'construct-outline' },
];

const BUYER_CATEGORIES = [
  { id: 'b1', title: 'Getting Started', icon: 'rocket-outline' },
  { id: 'b2', title: 'Discovering Deals', icon: 'search-outline' },
  { id: 'b3', title: 'Claiming Deals & Contacting Sellers', icon: 'chatbubbles-outline' },
  { id: 'b4', title: 'Account & Profile', icon: 'person-outline' },
  { id: 'b5', title: 'Privacy & Safety', icon: 'shield-outline' },
];

const FAQ_DATA = {
  // SELLER FAQs
  s1: [
    { q: "What is REACHLO for sellers?", a: "REACHLO is a platform that lets you create AI-powered marketing campaigns and connect with buyers in your city. Think of it as a smart, digital flyer system that works 24/7." },
    { q: "Is REACHLO free to use?", a: "You can create an account and post campaigns for free. Premium features like campaign boosting and advanced analytics may require a subscription in the future. You'll always be notified before any charges apply." },
    { q: "How do I create my first campaign?", a: "After registering, go to your Seller Dashboard → Tap 'Create Campaign' → Let our AI generate the content based on your business description, or write your own → Set your offer, CTA (WhatsApp/Call/Link), and publish!" },
    { q: "What is the AI Campaign Generator?", a: "It's REACHLO's built-in AI tool that reads your business description and automatically writes a professional campaign title, description, and offer for you. It also picks the best category and target audience — saving you hours of work." }
  ],
  s2: [
    { q: "What happens after I publish a campaign?", a: "Your campaign becomes visible to buyers browsing the Discovery Feed in your target city. Interested buyers can claim the deal, and you'll receive a lead notification instantly." },
    { q: "What is a 'lead'?", a: "A lead is when a buyer expresses interest in your campaign. You'll get their name and phone number, and a chat thread opens so you can follow up immediately." },
    { q: "Can I edit a campaign after publishing?", a: "Currently, campaigns can be paused or deleted. Major edits require creating a new campaign. We're working on an 'edit live campaign' feature." },
    { q: "How long does a campaign stay active?", a: "You can set an expiry date when creating a campaign. If no date is set, it stays active until you manually delete or pause it." },
    { q: "What is 'Campaign Boost'?", a: "Boosted campaigns appear at the top of the Discovery Feed for buyers in your city, giving you significantly more visibility. Boost options will be available in a future update." },
    { q: "What types of CTA (Call to Action) can I set?", a: "You can set:\n• WhatsApp — buyers open a WhatsApp chat with your number\n• Call — buyers can call you directly\n• Link — buyers are sent to your website or booking page\n• In-app Chat — buyers message you within REACHLO", isList: true }
  ],
  s3: [
    { q: "Can I have multiple businesses on one account?", a: "Currently, each seller account is linked to one business. Multiple business support is on our roadmap." },
    { q: "How do I update my business details?", a: "Go to Profile → Edit Business Details. Changes to your business description will trigger an AI re-analysis in the background." },
    { q: "What if I forget my password?", a: "On the login screen, tap 'Forgot Password', enter your registered email, and create a new password. The change takes effect immediately." },
    { q: "How do I delete my account?", a: "Go to Profile → Account Settings → Delete Account. This action is permanent and removes all your campaigns, leads, and business data." }
  ],
  s4: [
    { q: "Why is my campaign image not uploading?", a: "Make sure your image is under 5 MB and in JPG or PNG format. Check your internet connection and try again. If the issue persists, contact support." },
    { q: "I'm not receiving lead notifications. What should I do?", a: "Ensure push notifications are enabled for REACHLO in your phone's settings. Go to your phone Settings → Apps → REACHLO → Notifications → Allow." },
    { q: "Which cities does REACHLO support?", a: "REACHLO currently focuses on major Indian cities. You can set your campaign to target 'All India' or specific cities where your buyers are located." }
  ],
  // BUYER FAQs
  b1: [
    { q: "What is REACHLO for buyers?", a: "REACHLO is your go-to app to discover the best deals, offers, and local businesses near you. Browse campaigns by category, save your favorites, and connect directly with sellers — no middlemen." },
    { q: "Is it free to use REACHLO as a buyer?", a: "Yes, completely free. Browsing, claiming deals, chatting with sellers, and saving campaigns cost nothing." },
    { q: "Do I need to create an account?", a: "You need an account to claim deals, chat with sellers, and save campaigns. Registration takes less than a minute." }
  ],
  b2: [
    { q: "How do I find deals near me?", a: "The Discovery Feed shows campaigns sorted by relevance to your city. Use the category filter to narrow down by type (Food, Fitness, Beauty, Tech, etc.)." },
    { q: "How do I save a campaign for later?", a: "Tap the bookmark icon on any campaign card to save it. Access your saved campaigns from the 'Saved' tab in your profile." },
    { q: "Can I search for a specific business?", a: "You can browse by category and filter by city. A full business search feature is coming soon." },
    { q: "What does 'Boosted' mean on a campaign?", a: "Boosted campaigns are highlighted by sellers for extra visibility. They are genuine offers — boosting simply means the seller paid for more reach." }
  ],
  b3: [
    { q: "How do I claim a deal?", a: "Tap on a campaign → Tap 'Claim Deal' or the CTA button (WhatsApp, Call, etc.) → Fill in your name and message (if required) → Submit. The seller will receive your details and contact you." },
    { q: "Will the seller see my phone number?", a: "Yes — when you claim a deal, the seller sees your name and phone number so they can follow up. Only share your details if you are genuinely interested." },
    { q: "Can I chat with a seller inside the app?", a: "Yes! For campaigns with an in-app chat CTA, a chat thread opens after you claim the deal. You can message the seller and receive replies directly in REACHLO." },
    { q: "I claimed a deal but haven't heard back. What should I do?", a: "Sellers are notified immediately. If you don't hear back within 24 hours, try contacting them via the alternate contact method (WhatsApp or Call) shown on the campaign. You can also report unresponsive sellers to our support team." }
  ],
  b4: [
    { q: "How do I edit my profile?", a: "Go to the Profile tab → Edit Profile → Update your name, city, or profile picture → Save." },
    { q: "How do I change my password?", a: "Go to Profile → Account Settings → Change Password. You'll be prompted to enter your current password and a new one." },
    { q: "I forgot my password. How do I reset it?", a: "On the login screen, tap 'Forgot Password' → Enter your registered email address → Create a new password. Log in immediately with your new password." },
    { q: "How do I delete my account?", a: "Go to Profile → Account Settings → Delete Account. This permanently removes your account and all associated data." }
  ],
  b5: [
    { q: "Is my personal information safe?", a: "Yes. Your password is encrypted and never visible to anyone — including our team. We do not sell your data to third parties. Read our full Privacy Policy for details." },
    { q: "Can sellers see my profile?", a: "Sellers only see your name and phone number after you claim their deal. They cannot browse your profile or history." },
    { q: "What if I receive spam or inappropriate content?", a: "Use the 'Report' option on any campaign or message. Our team reviews all reports within 24 hours. Repeat offenders are banned from the platform." }
  ],
};

// ---------------------------------------------
// FAQ ITEM COMPONENT
// ---------------------------------------------

const FAQItem = ({ item, isExpanded, onPress }) => {
  const animatedRotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedRotation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onPress();
      }}
      style={[styles.faqCard, styles.glassBorder, isExpanded && styles.faqCardExpanded]}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Feather name="chevron-down" size={20} color={COLORS.PRIMARY} />
        </Animated.View>
      </View>
      
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          {item.isList ? (
            <View style={styles.chipList}>
              {item.a.split('\n').map((line, idx) => {
                if(idx === 0) return <Text key={idx} style={styles.faqAnswer}>{line}</Text>;
                return (
                  <View key={idx} style={styles.listChip}>
                    <Text style={styles.listChipText}>{line.replace('• ', '')}</Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={styles.faqAnswer}>{item.a}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
};

// ---------------------------------------------
// MAIN SCREEN
// ---------------------------------------------

export default function HelpSupportScreen({ navigation }) {
  const { role } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const categories = role === 'SELLER' ? SELLER_CATEGORIES : BUYER_CATEGORIES;

  const handleCategoryPress = (cat) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(cat);
    setExpandedIndex(null);
  };

  const handleBack = () => {
    if (selectedCategory) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedCategory(null);
      setExpandedIndex(null);
    } else {
      navigation.goBack();
    }
  };

  const currentFAQs = selectedCategory ? FAQ_DATA[selectedCategory.id] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* BACKGROUND GRADIENT BLOBS */}
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobBottomLeft} />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} 
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#0B1B4A" />
        </Pressable>
        <Text style={styles.headerTitle}>REACHLO</Text>
        <View style={styles.headerRight}>
          <View style={styles.headerIconContainer}>
            <Feather name="shield" size={16} color="#2563EB" />
          </View>
        </View>
      </View>

      {!selectedCategory && (
        <View style={styles.headerTextContainer}>
          <Text style={styles.mainHeading}>Help & Support</Text>
          <Text style={styles.subtitle}>Find answers to common questions for {role.toLowerCase()}s.</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {!selectedCategory ? (
          // CATEGORY LIST
          <View style={styles.categoriesContainer}>
            {categories.map((cat, index) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryRow, 
                  pressed && styles.pressed,
                  index === categories.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => handleCategoryPress(cat)}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={cat.icon} size={20} color="#2563EB" />
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>
        ) : (
          // FAQ LIST
          <View style={styles.faqsContainer}>
            <Text style={styles.categoryHeading}>{selectedCategory.title}</Text>
            {currentFAQs.map((faq, index) => (
              <FAQItem 
                key={index}
                item={faq}
                isExpanded={expandedIndex === index}
                onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              />
            ))}
            
            {/* BOTTOM SUPPORT CARD */}
            <View style={styles.supportSection}>
              <View style={styles.supportCard}>
                <Text style={styles.supportTitle}>Still need help?</Text>
                <Text style={styles.supportDesc}>Our support team is just an email away.</Text>
                <Pressable 
                  style={({ pressed }) => [styles.supportButton, pressed && styles.pressed]}
                  onPress={() => Linking.openURL('mailto:support@reachlo.com')}
                >
                  <Text style={styles.supportButtonText}>Contact Support</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  bgBlobTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  bgBlobBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    backgroundColor: '#F8FAFF',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1B4A',
    letterSpacing: 1.2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTextContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#526174',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  categoryHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  
  // CATEGORY CARDS
  categoriesContainer: {
    paddingHorizontal: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  
  // FAQs
  faqsContainer: {
    gap: 14,
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  faqCardExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#EAF2FF',
    shadowOpacity: 0.05,
    shadowRadius: 16,
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
    color: '#0B1B4A',
    paddingRight: 16,
    lineHeight: 22,
  },
  faqAnswerContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
  },
  chipList: {
    gap: 10,
  },
  listChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listChipText: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
  },

  // SUPPORT CARD
  supportSection: {
    marginTop: 40,
  },
  supportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 8,
  },
  supportDesc: {
    fontSize: 14,
    color: '#526174',
    marginBottom: 24,
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
