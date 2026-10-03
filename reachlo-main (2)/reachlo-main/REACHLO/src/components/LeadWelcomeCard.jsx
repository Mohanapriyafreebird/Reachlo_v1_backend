import React, { useRef } from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ActionCard = ({ action, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  };

  return (
    <Pressable
      onPressIn={() => animateScale(0.98)}
      onPressOut={() => animateScale(1)}
      onPress={() => onPress(action)}
    >
      <Animated.View style={[styles.actionCard, { transform: [{ scale }] }]}>
        <View style={styles.actionIconContainer}>
          <Ionicons name={action.icon} size={18} color="#2563EB" />
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionTitle}>{action.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </Animated.View>
    </Pressable>
  );
};

export default function LeadWelcomeCard({ campaign, business, onQuickAction }) {
  const getQuickActions = (category) => {
    const fallbackActions = [
      { id: '1', title: 'Pricing', subtitle: 'View available pricing', icon: 'pricetag-outline' },
      { id: '2', title: 'Current Offers', subtitle: 'See today\'s promotions', icon: 'gift-outline' },
      { id: '3', title: 'Business Location', subtitle: 'Get directions and landmarks', icon: 'location-outline' },
      { id: '4', title: 'Request Callback', subtitle: 'Ask the business to contact you', icon: 'call-outline' },
      { id: '5', title: 'Ask a Question', subtitle: 'Start chatting with your own message', icon: 'chatbubble-ellipses-outline' },
    ];
    
    if (!category) return fallbackActions;
    const cat = category.toLowerCase();
    
    if (cat.includes('restaurant') || cat.includes('food')) {
      return [
        { id: '1', title: 'Menu', subtitle: 'View all dishes and prices', icon: 'restaurant-outline' },
        { id: '2', title: "Today's Specials", subtitle: 'See our daily chef specials', icon: 'star-outline' },
        { id: '3', title: 'Reserve Table', subtitle: 'Book your table in advance', icon: 'calendar-outline' },
        { id: '4', title: 'Directions', subtitle: 'Get directions to our location', icon: 'location-outline' },
      ];
    }
    if (cat.includes('gym') || cat.includes('fitness')) {
      return [
        { id: '1', title: 'Membership Plans', subtitle: 'View all our packages', icon: 'barbell-outline' },
        { id: '2', title: 'Batch Timings', subtitle: 'Check available slot timings', icon: 'time-outline' },
        { id: '3', title: 'Free Trial', subtitle: 'Request a free trial session', icon: 'fitness-outline' },
        { id: '4', title: 'Personal Trainer', subtitle: 'Learn about personal training', icon: 'body-outline' },
      ];
    }
    if (cat.includes('education') || cat.includes('school')) {
      return [
        { id: '1', title: 'Course Details', subtitle: 'Syllabus and duration', icon: 'book-outline' },
        { id: '2', title: 'Fees & Scholarships', subtitle: 'Pricing and offers', icon: 'cash-outline' },
        { id: '3', title: 'Demo Class', subtitle: 'Request a free demo class', icon: 'school-outline' },
        { id: '4', title: 'Admissions', subtitle: 'Start the admission process', icon: 'document-text-outline' },
      ];
    }
    if (cat.includes('health') || cat.includes('doctor') || cat.includes('clinic')) {
      return [
        { id: '1', title: 'Consultation Fee', subtitle: 'Check doctor fees', icon: 'cash-outline' },
        { id: '2', title: 'Doctor Availability', subtitle: 'Check timings and days', icon: 'time-outline' },
        { id: '3', title: 'Book Appointment', subtitle: 'Reserve your slot', icon: 'calendar-outline' },
        { id: '4', title: 'Directions', subtitle: 'Find our clinic', icon: 'location-outline' },
      ];
    }
    if (cat.includes('salon') || cat.includes('beauty')) {
      return [
        { id: '1', title: 'Services', subtitle: 'View full list of services', icon: 'cut-outline' },
        { id: '2', title: 'Packages', subtitle: 'Bridal and grooming packages', icon: 'gift-outline' },
        { id: '3', title: 'Available Slots', subtitle: 'Check appointment availability', icon: 'time-outline' },
      ];
    }
    if (cat.includes('it') || cat.includes('tech') || cat.includes('software')) {
      return [
        { id: '1', title: 'Pricing', subtitle: 'Get cost estimates', icon: 'pricetag-outline' },
        { id: '2', title: 'Portfolio', subtitle: 'See our past work', icon: 'briefcase-outline' },
        { id: '3', title: 'Request Proposal', subtitle: 'Get a formal quote', icon: 'document-text-outline' },
        { id: '4', title: 'Schedule Consultation', subtitle: 'Book a discovery call', icon: 'call-outline' },
      ];
    }
    if (cat.includes('travel') || cat.includes('tour')) {
      return [
        { id: '1', title: 'Packages', subtitle: 'View trip packages', icon: 'airplane-outline' },
        { id: '2', title: 'Availability', subtitle: 'Check travel dates', icon: 'calendar-outline' },
        { id: '3', title: 'Get Quote', subtitle: 'Request custom pricing', icon: 'cash-outline' },
      ];
    }
    
    return fallbackActions;
  };

  const actions = getQuickActions(campaign?.category);
  const busName = business?.name || 'the business';
  const campTitle = campaign?.title || 'this campaign';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View 
      style={[
        styles.cardContainer,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient colors={['#F0F9FF', '#FFFFFF']} style={styles.gradientBg} borderRadius={20} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.emoji}>✨</Text>
        </View>
        <Text style={styles.headerTitle}>You're Connected!</Text>
      </View>

      <Text style={styles.messageText}>
        You're connected with <Text style={styles.boldText}>{busName}</Text> about "{campTitle}". They typically reply quickly. Choose a quick action below to get started:
      </Text>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        {actions.map(action => (
          <ActionCard key={action.id} action={action} onPress={onQuickAction} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '95%',
    alignSelf: 'center',
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0369A1',
  },
  messageText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsContainer: {
    width: '100%',
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  }
});
