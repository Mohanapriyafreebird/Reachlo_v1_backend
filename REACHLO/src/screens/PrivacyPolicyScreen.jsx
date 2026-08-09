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
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function PrivacyPolicyScreen({ navigation }) {
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

      {/* 1. GLASSMORPHISM HEADER */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerLogo}>REACHLO</Text>
        <View style={styles.headerRight}>
          <Feather name="shield" size={20} color={COLORS.PRIMARY} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. PRIVACY HERO */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>PRIVACY & SECURITY</Text>
          </View>
          
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSubtitleHighlight}>Your privacy. Our priority.</Text>
          <Text style={styles.heroDesc}>
            Learn how REACHLO collects, uses and protects your information.
          </Text>
          <Text style={styles.lastUpdated}>Last Updated • August 2026</Text>
        </Animated.View>

        {/* 3. PRIVACY PROMISE CARD */}
        <View style={styles.section}>
          <View style={[styles.glassCard, styles.glassBorder]}>
            <View style={{ marginBottom: 16 }}>
              <Feather name="lock" size={24} color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.sectionTitle}>Your data is protected.</Text>
            <Text style={styles.bodyText}>
              We are committed to protecting your personal information and your right to privacy.
            </Text>
            
            <View style={styles.indicatorsContainer}>
              <View style={styles.indicatorRow}>
                <Feather name="check-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.indicatorText}>Secure Storage</Text>
              </View>
              <View style={styles.indicatorRow}>
                <Feather name="check-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.indicatorText}>HTTPS/TLS</Text>
              </View>
              <View style={styles.indicatorRow}>
                <Feather name="check-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.indicatorText}>Password Hashing</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. QUICK PRIVACY OVERVIEW */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Privacy at a Glance</Text>
          <View style={styles.gridContainer2x2}>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Feather name="lock" size={20} color={COLORS.PRIMARY} style={styles.gridIcon} />
              <Text style={styles.gridCardTitle}>Secure</Text>
              <Text style={styles.gridCardDesc}>Encrypted data</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Feather name="eye-off" size={20} color={COLORS.PRIMARY} style={styles.gridIcon} />
              <Text style={styles.gridCardTitle}>Private</Text>
              <Text style={styles.gridCardDesc}>No data selling</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Feather name="shield" size={20} color={COLORS.PRIMARY} style={styles.gridIcon} />
              <Text style={styles.gridCardTitle}>Protected</Text>
              <Text style={styles.gridCardDesc}>Controlled access</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Feather name="user-check" size={20} color={COLORS.PRIMARY} style={styles.gridIcon} />
              <Text style={styles.gridCardTitle}>Your Rights</Text>
              <Text style={styles.gridCardDesc}>Access & deletion</Text>
            </View>
          </View>
        </View>

        {/* 5. INFORMATION WE COLLECT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Information We Collect</Text>
          <Text style={styles.sectionSubHeader}>We collect only the information needed to provide and improve REACHLO.</Text>
          
          <View style={styles.listContainer}>
            <View style={[styles.listItemCard, styles.glassBorder]}>
              <View style={styles.listItemHeader}>
                <Feather name="user" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.listItemTitle}>Account Details</Text>
                <View style={styles.tagRequired}><Text style={styles.tagTextRequired}>Required</Text></View>
              </View>
              <Text style={styles.listItemText}>Name, email address, mobile number, city and password.</Text>
            </View>

            <View style={[styles.listItemCard, styles.glassBorder]}>
              <View style={styles.listItemHeader}>
                <Feather name="briefcase" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.listItemTitle}>Business Details</Text>
                <View style={styles.tagSeller}><Text style={styles.tagTextSeller}>Sellers</Text></View>
              </View>
              <Text style={styles.listItemText}>Business name, description, USP, location and category.</Text>
            </View>

            <View style={[styles.listItemCard, styles.glassBorder]}>
              <View style={styles.listItemHeader}>
                <Ionicons name="megaphone-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.listItemTitle}>Campaign Content</Text>
                <View style={styles.tagSeller}><Text style={styles.tagTextSeller}>Sellers</Text></View>
              </View>
              <Text style={styles.listItemText}>Text, images, offers and settings you create for campaigns.</Text>
            </View>

            <View style={[styles.listItemCard, styles.glassBorder]}>
              <View style={styles.listItemHeader}>
                <Feather name="camera" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.listItemTitle}>Profile Picture</Text>
                <View style={styles.tagOptional}><Text style={styles.tagTextOptional}>Optional</Text></View>
              </View>
              <Text style={styles.listItemText}>An optional photo you upload to personalize your account.</Text>
            </View>
          </View>
        </View>

        {/* 5.5 AUTOMATIC DATA COLLECTION */}
        <View style={styles.section}>
          <LinearGradient
            colors={['rgba(240,249,255,0.9)', 'rgba(224,242,254,0.9)']}
            style={[styles.glassCard, styles.glassBorder, { borderColor: 'rgba(56,189,248,0.3)' }]}
          >
            <Text style={[styles.sectionTitle, { fontSize: FONT_SIZES.LG }]}>Collected Automatically</Text>
            <View style={styles.chipRow}>
              <View style={styles.autoChip}><Feather name="smartphone" size={14} color={COLORS.PRIMARY} /><Text style={styles.autoChipText}>Device info</Text></View>
              <View style={styles.autoChip}><Feather name="activity" size={14} color={COLORS.PRIMARY} /><Text style={styles.autoChipText}>Usage data</Text></View>
              <View style={styles.autoChip}><Feather name="map-pin" size={14} color={COLORS.PRIMARY} /><Text style={styles.autoChipText}>City location</Text></View>
              <View style={styles.autoChip}><Feather name="bell" size={14} color={COLORS.PRIMARY} /><Text style={styles.autoChipText}>Push tokens</Text></View>
            </View>
          </LinearGradient>
        </View>

        {/* 6. HOW WE USE YOUR INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>How We Use Your Information</Text>
          <View style={[styles.glassCard, styles.glassBorder]}>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>01</Text></View>
                <Text style={styles.timelineLabel}>Create & manage your account</Text>
              </View>
              <View style={styles.timelineConnector} />
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>02</Text></View>
                <Text style={styles.timelineLabel}>Generate AI-powered campaign content</Text>
              </View>
              <View style={styles.timelineConnector} />
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>03</Text></View>
                <Text style={styles.timelineLabel}>Connect buyers with relevant sellers</Text>
              </View>
              <View style={styles.timelineConnector} />
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>04</Text></View>
                <Text style={styles.timelineLabel}>Send relevant notifications</Text>
              </View>
              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>05</Text></View>
                <Text style={styles.timelineLabel}>Improve REACHLO</Text>
              </View>
              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>06</Text></View>
                <Text style={styles.timelineLabel}>Protect platform security</Text>
              </View>
              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={styles.timelineCircle}><Text style={styles.timelineNumber}>07</Text></View>
                <Text style={styles.timelineLabel}>Comply with applicable laws</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. INFORMATION SHARING */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Information Sharing</Text>
          <View style={[styles.glassCard, styles.glassBorder, { padding: 20 }]}>
            <View style={styles.noSellBadge}>
              <Text style={styles.noSellEmoji}>🚫</Text>
              <Text style={styles.noSellText}>We do not sell, trade or rent your personal information.</Text>
            </View>

            <View style={styles.sharingCard}>
              <Text style={styles.sharingTitle}>SERVICE PROVIDERS</Text>
              <Text style={styles.sharingDesc}>Cloud infrastructure, database hosting and file storage required to operate REACHLO.</Text>
            </View>

            <View style={styles.sharingCard}>
              <Text style={styles.sharingTitle}>AI PROVIDERS</Text>
              <Text style={styles.sharingDesc}>Business descriptions may be sent to Google Gemini solely to generate campaign content. No personally identifiable information is included.</Text>
            </View>

            <View style={styles.sharingCard}>
              <Text style={styles.sharingTitle}>LAW ENFORCEMENT</Text>
              <Text style={styles.sharingDesc}>Information may be disclosed when required by applicable law or to protect user rights and safety.</Text>
            </View>

            <LinearGradient
              colors={['rgba(37,99,235,0.05)', 'rgba(37,99,235,0.1)']}
              style={styles.sharingHighlight}
            >
              <View style={styles.buyerSellerRow}>
                <Text style={styles.buyerSellerText}>Buyer</Text>
                <Feather name="arrow-right" size={16} color={COLORS.PRIMARY} style={{marginHorizontal: 8}} />
                <Text style={styles.buyerSellerText}>Seller</Text>
              </View>
              <Text style={styles.sharingHighlightDesc}>
                When a buyer connects with a seller through a lead or campaign, the buyer's name and phone number are shared with the seller when necessary for the transaction.
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* 8. DATA STORAGE & SECURITY */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Data Storage & Security</Text>
          <View style={styles.gridContainer2x2}>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Text style={{fontSize: 24, marginBottom: 8}}>🔑</Text>
              <Text style={styles.gridCardTitle}>bcrypt</Text>
              <Text style={styles.gridCardDesc}>Passwords are securely hashed.</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Text style={{fontSize: 24, marginBottom: 8}}>☁️</Text>
              <Text style={styles.gridCardTitle}>Encrypted Cloud</Text>
              <Text style={styles.gridCardDesc}>Data is stored on secure cloud servers.</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Text style={{fontSize: 24, marginBottom: 8}}>🌐</Text>
              <Text style={styles.gridCardTitle}>HTTPS / TLS</Text>
              <Text style={styles.gridCardDesc}>Data is protected while in transit.</Text>
            </View>
            <View style={[styles.gridCardSmall, styles.glassBorder]}>
              <Text style={{fontSize: 24, marginBottom: 8}}>🛡️</Text>
              <Text style={styles.gridCardTitle}>Restricted Access</Text>
              <Text style={styles.gridCardDesc}>Production data is limited to authorized team members.</Text>
            </View>
          </View>
          
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              No security system is completely impenetrable. We encourage users to maintain strong and unique passwords.
            </Text>
          </View>
        </View>

        {/* 9. YOUR RIGHTS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Your Privacy Rights</Text>
          <View style={styles.rightsContainer}>
            <View style={[styles.rightCard, styles.glassBorder]}>
              <View style={styles.rightIconContainer}><Feather name="eye" size={20} color={COLORS.PRIMARY} /></View>
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>ACCESS</Text>
                <Text style={styles.rightDesc}>Request a copy of your personal data.</Text>
              </View>
            </View>
            <View style={[styles.rightCard, styles.glassBorder]}>
              <View style={styles.rightIconContainer}><Feather name="edit-2" size={20} color={COLORS.PRIMARY} /></View>
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>CORRECTION</Text>
                <Text style={styles.rightDesc}>Request correction of inaccurate information.</Text>
              </View>
            </View>
            <View style={[styles.rightCard, styles.glassBorder]}>
              <View style={styles.rightIconContainer}><Feather name="trash-2" size={20} color={COLORS.PRIMARY} /></View>
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>DELETION</Text>
                <Text style={styles.rightDesc}>Request deletion of your account and associated data.</Text>
              </View>
            </View>
            <View style={[styles.rightCard, styles.glassBorder]}>
              <View style={styles.rightIconContainer}><Feather name="bell-off" size={20} color={COLORS.PRIMARY} /></View>
              <View style={styles.rightContent}>
                <Text style={styles.rightTitle}>OPT-OUT</Text>
                <Text style={styles.rightDesc}>Unsubscribe from marketing notifications through app settings.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 11. CHILDREN'S PRIVACY & 12. POLICY CHANGES */}
        <View style={styles.bottomSmallCards}>
          <View style={[styles.compactCard, styles.glassBorder]}>
            <View style={styles.compactHeader}>
              <Feather name="shield" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.compactTitle}>Children's Privacy</Text>
              <View style={styles.badgeSmall}><Text style={styles.badgeSmallText}>18+</Text></View>
            </View>
            <Text style={styles.compactDesc}>
              REACHLO is not intended for individuals under the age of 18. We do not knowingly collect personal information from minors.
            </Text>
          </View>

          <View style={[styles.compactCard, styles.glassBorder]}>
            <View style={styles.compactHeader}>
              <Feather name="refresh-cw" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.compactTitle}>Changes to This Policy</Text>
            </View>
            <Text style={styles.compactDesc}>
              We may update this Privacy Policy from time to time. Significant changes may be communicated through in-app notification or email.
            </Text>
            <Text style={styles.updatedSmall}>Last Updated: August 2026</Text>
          </View>
        </View>

        {/* 10. & 13. CONTACT / FINAL CTA */}
        <View style={styles.section}>
          <View style={styles.contactPrivacyCard}>
            <Text style={styles.finalCtaTitle}>Your Privacy Matters.</Text>
            <Text style={styles.finalCtaDesc}>
              REACHLO is committed to building a secure and transparent platform for local businesses and buyers.
            </Text>
            <Text style={styles.finalCtaDesc2}>
              To exercise your privacy rights or ask questions about how we handle your data, contact our privacy team.
            </Text>
            <View style={styles.emailRowWhite}>
              <Feather name="mail" size={16} color="#2563EB" />
              <Text style={styles.emailTextWhite}>privacy@reachlo.com</Text>
            </View>
            
            <Pressable 
              style={({ pressed }) => [styles.whiteButton, pressed && styles.pressed]}
              onPress={() => Linking.openURL('mailto:privacy@reachlo.com')}
            >
              <Text style={styles.whiteButtonText}>Contact Privacy Team</Text>
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
  glassBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 24,
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
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitleHighlight: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 15,
    color: '#526174',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 32,
  },
  heroGraphic: {
    height: 120,
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shieldGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  heroShieldIcon: {
    zIndex: 2,
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
  sectionSubHeader: {
    fontSize: 15,
    color: '#526174',
    marginBottom: 24,
    marginTop: -12,
    lineHeight: 22,
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
  iconContainerBlueLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  // INDICATORS
  indicatorsContainer: {
    gap: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indicatorText: {
    fontSize: 15,
    color: '#0B1B4A',
    fontWeight: '600',
  },

  // GRID 2x2
  gridContainer2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridCardSmall: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  gridIcon: {
    marginBottom: 16,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 6,
  },
  gridCardDesc: {
    fontSize: 13,
    color: '#526174',
    lineHeight: 18,
  },

  // LIST CARDS
  listContainer: {
    gap: 12,
  },
  listItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 20,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginLeft: 12,
    flex: 1,
  },
  listItemText: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
    paddingLeft: 32,
  },
  tagRequired: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagTextRequired: { color: '#EF4444', fontSize: 11, fontWeight: 'bold' },
  tagSeller: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagTextSeller: { color: '#2563EB', fontSize: 11, fontWeight: 'bold' },
  tagOptional: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagTextOptional: { color: '#64748B', fontSize: 11, fontWeight: 'bold' },
  
  // AUTO CHIPS
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  autoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    gap: 8,
  },
  autoChipText: {
    fontSize: 13,
    color: '#0B1B4A',
    fontWeight: '600',
  },

  // TIMELINE
  timeline: {
    paddingVertical: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#0B1B4A',
    fontWeight: '600',
    marginLeft: 20,
    flex: 1,
  },
  timelineConnector: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(37,99,235,0.15)',
    marginLeft: 15,
    marginVertical: 4,
    zIndex: 1,
  },

  // SHARING
  noSellBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  noSellEmoji: {
    fontSize: 22,
    marginRight: 16,
  },
  noSellText: {
    flex: 1,
    fontSize: 14,
    color: '#0B1B4A',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  sharingCard: {
    marginBottom: 28,
  },
  sharingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0B1B4A',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sharingDesc: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
  },
  sharingHighlight: {
    padding: 20,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.15)',
  },
  buyerSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  buyerSellerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  sharingHighlightDesc: {
    fontSize: 13,
    color: '#526174',
    lineHeight: 20,
  },

  // DISCLAIMER
  disclaimerCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(37,99,235,0.03)',
    borderRadius: 20,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#526174',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },

  // RIGHTS
  rightsContainer: {
    gap: 12,
  },
  rightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: 16,
    borderRadius: 20,
  },
  rightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  rightContent: {
    flex: 1,
  },
  rightTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0B1B4A',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  rightDesc: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 20,
  },

  // BOTTOM COMPACT CARDS
  bottomSmallCards: {
    gap: 16,
    marginBottom: 48,
  },
  compactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 20,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginLeft: 10,
    flex: 1,
  },
  badgeSmall: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSmallText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  compactDesc: {
    fontSize: 14,
    color: '#526174',
    lineHeight: 22,
  },
  updatedSmall: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
    fontStyle: 'italic',
  },

  // CONTACT CARD (BLUE)
  contactPrivacyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B1B4A',
    marginBottom: 12,
    textAlign: 'center',
  },
  finalCtaDesc: {
    fontSize: 15,
    color: '#526174',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  finalCtaDesc2: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emailRowWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
    marginBottom: 24,
  },
  emailTextWhite: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  whiteButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  whiteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
