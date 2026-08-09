import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function AboutScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* BACKGROUND GRADIENT BLOBS */}
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobBottomLeft} />

      {/* 1. TOP NAVIGATION */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerLogo}>REACHLO</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. HERO SECTION */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>ABOUT REACHLO</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Connecting{' '}
            <Text style={styles.heroHighlight}>Local Businesses</Text>
            {' '}With Local Buyers.
          </Text>
          
          <Text style={styles.heroSubtitle}>
            REACHLO is an AI-powered hyperlocal marketing platform built to help small and local businesses reach the right buyers in their city.
          </Text>
        </Animated.View>

        {/* 3. WHO WE ARE */}
        <View style={styles.section}>
          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>Who We Are</Text>
            <Text style={styles.bodyText}>
              Every local business deserves the same marketing power that big brands have. REACHLO makes that possible by helping businesses get discovered by the right buyers without needing a large marketing budget or digital agency.
            </Text>
            
            <View style={styles.threePillars}>
              <View style={styles.pillarCard}>
                <View style={styles.iconContainerBlue}>
                  <Ionicons name="storefront" size={20} color="#2563EB" />
                </View>
                <Text style={styles.pillarTitle}>Local Businesses</Text>
                <Text style={styles.pillarDesc}>Get discovered</Text>
              </View>
              <View style={styles.pillarCard}>
                <View style={styles.iconContainerBlue}>
                  <Ionicons name="location" size={20} color="#2563EB" />
                </View>
                <Text style={styles.pillarTitle}>Nearby Buyers</Text>
                <Text style={styles.pillarDesc}>Find what matters</Text>
              </View>
              <View style={styles.pillarCard}>
                <View style={styles.iconContainerBlue}>
                  <Ionicons name="hardware-chip" size={20} color="#2563EB" />
                </View>
                <Text style={styles.pillarTitle}>AI Marketing</Text>
                <Text style={styles.pillarDesc}>Grow smarter</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. WHAT WE DO */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>What We Do</Text>
          <View style={styles.roleCardsContainer}>
            {/* Seller Card */}
            <View style={styles.roleCard}>
              <Text style={styles.roleTitle}>For Sellers</Text>
              <Text style={styles.bodyTextSmall}>
                Create AI-generated campaigns in minutes, reach buyers in your city, track leads and grow your business — all from your phone.
              </Text>
              <View style={styles.chipsContainer}>
                <View style={styles.chip}><Text style={styles.chipText}>AI Campaigns</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Lead Tracking</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Local Reach</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Analytics</Text></View>
              </View>
            </View>

            {/* Buyer Card */}
            <View style={styles.roleCard}>
              <Text style={styles.roleTitle}>For Buyers</Text>
              <Text style={styles.bodyTextSmall}>
                Discover the best local deals and businesses around you, claim exclusive offers and connect directly with sellers.
              </Text>
              <View style={styles.chipsContainer}>
                <View style={styles.chip}><Text style={styles.chipText}>Local Deals</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Nearby Businesses</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Exclusive Offers</Text></View>
                <View style={styles.chip}><Text style={styles.chipText}>Direct Chat</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. MISSION SECTION */}
        <View style={styles.missionSection}>
          <LinearGradient
            colors={['#1e3a8a', '#2563eb', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.missionGradient}
          >
            <View style={styles.missionBadgeContainer}>
              <Text style={styles.missionBadge}>OUR MISSION</Text>
            </View>
            <Text style={styles.missionQuote}>
              "To democratize local marketing — so that every Indian business, no matter how small, can reach the right customer at the right time."
            </Text>
            <Ionicons name="globe-outline" size={120} color="rgba(255,255,255,0.1)" style={styles.missionBgIcon} />
          </LinearGradient>
        </View>

        {/* 6. WHY REACHLO */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Why REACHLO?</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="hardware-chip" size={22} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>AI-Powered Campaigns</Text>
              <Text style={styles.gridCardDesc}>Our AI reads your business description and creates compelling campaign content in seconds.</Text>
            </View>
            
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="location" size={22} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Hyperlocal Discovery</Text>
              <Text style={styles.gridCardDesc}>Buyers discover businesses based on location, category and relevance.</Text>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="chatbubbles" size={22} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Direct Connection</Text>
              <Text style={styles.gridCardDesc}>Connect instantly through in-app chat or WhatsApp.</Text>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="bar-chart" size={22} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Real-Time Analytics</Text>
              <Text style={styles.gridCardDesc}>Track views, leads and campaign performance from your dashboard.</Text>
            </View>
          </View>
        </View>

        {/* 7. OUR STORY */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Our Story</Text>
          <View style={styles.glassCard}>
            <Text style={styles.storyStartText}>REACHLO was born from a simple observation.</Text>

            <Text style={styles.bodyText}>
              Local businesses in India spend thousands on pamphlets, banners and word-of-mouth — but still struggle to reach buyers beyond their immediate circle.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 8 }]}>
              Meanwhile, buyers have no easy way to discover the best local deals around them.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 8, fontWeight: '600' }]}>
              We set out to fix that.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 8, color: '#2563EB', fontWeight: 'bold' }]}>
              REACHLO is built with love in India, for India's vibrant small business community.
            </Text>
          </View>
        </View>

        {/* 8. OUR VALUES */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Our Values</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="color-wand-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Simplicity First</Text>
              <Text style={styles.gridCardDesc}>Technology should work for you, not the other way around.</Text>
            </View>
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="home-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Local-First</Text>
              <Text style={styles.gridCardDesc}>We celebrate local businesses and the communities they serve.</Text>
            </View>
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="eye-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Transparency</Text>
              <Text style={styles.gridCardDesc}>No hidden fees. No complicated contracts.</Text>
            </View>
            <View style={styles.gridCard}>
              <View style={styles.iconContainerBlue}>
                <Ionicons name="flash-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.gridCardTitle}>Empowerment</Text>
              <Text style={styles.gridCardDesc}>Give small businesses the tools that only big brands used to have.</Text>
            </View>
          </View>
        </View>

        {/* 10. CONTACT SECTION */}
        <View style={styles.section}>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Let's Grow Local Businesses Together.</Text>
            <Text style={styles.contactDesc}>
              Have a question, suggestion or want to know more about REACHLO? We'd love to hear from you.
            </Text>
            
            <View style={styles.contactDetails}>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={16} color="#2563EB" />
                <Text style={styles.contactText}>support@reachlo.com</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="globe" size={16} color="#2563EB" />
                <Text style={styles.contactText}>www.reachlo.com</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="location" size={16} color="#2563EB" />
                <Text style={styles.contactText}>India</Text>
              </View>
            </View>

            <Pressable 
              style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
              onPress={() => Linking.openURL('mailto:support@reachlo.com')}
            >
              <Text style={styles.contactButtonText}>Contact REACHLO</Text>
            </Pressable>
          </View>
        </View>
        
        <View style={{height: 40}} />
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
  headerLogo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1B4A',
    letterSpacing: 1.2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  // HERO
  heroSection: {
    marginTop: 10,
    marginBottom: 48,
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0B1B4A',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 44,
  },
  heroHighlight: {
    color: '#2563EB',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#526174',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  heroGraphic: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  // SECTIONS
  section: {
    marginBottom: 48,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 15,
    color: '#526174',
    lineHeight: 24,
    marginBottom: 24,
  },
  bodyTextSmall: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
    marginBottom: 24,
  },
  
  // PILLARS
  threePillars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pillarCard: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainerBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0B1B4A',
    textAlign: 'center',
    marginBottom: 4,
  },
  pillarDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  
  // ROLES
  roleCardsContainer: {
    gap: 20,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // MISSION
  missionSection: {
    marginHorizontal: -20,
    paddingHorizontal: 30,
    paddingVertical: 50,
    marginBottom: 40,
  },
  missionGradient: {
    borderRadius: 28,
    padding: 32,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  missionBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  missionBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  missionQuote: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 32,
    zIndex: 2,
  },
  missionBgIcon: {
    position: 'absolute',
    bottom: -30,
    right: -20,
    transform: [{ rotate: '-15deg' }],
  },
  
  // GRID
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 6,
  },
  gridCardDesc: {
    fontSize: 13,
    color: '#526174',
    lineHeight: 18,
  },
  
  // STORY TIMELINE
  storyStartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 24,
    textAlign: 'center',
  },
  timeline: {
    paddingLeft: 24,
    marginBottom: 24,
  },
  timelineNode: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  timelineNodeFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(37,99,235,0.3)',
    marginRight: 16,
  },
  timelineDotFinal: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 13,
    marginLeft: -3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  timelineTextFinal: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.PRIMARY,
    letterSpacing: 1,
  },
  
  // VALUES
  valueIcon: {
    marginBottom: 12,
  },
  
  // CONTACT
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactDesc: {
    fontSize: 15,
    color: '#526174',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  contactDetails: {
    alignSelf: 'stretch',
    padding: 8,
    marginBottom: 24,
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#0B1B4A',
    fontWeight: '500',
  },
  contactButton: {
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
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
