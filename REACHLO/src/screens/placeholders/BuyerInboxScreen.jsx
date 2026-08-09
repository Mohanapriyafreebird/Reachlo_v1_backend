import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import chatService from '../../services/chatService';

export default function BuyerInboxScreen() {
  const navigation = useNavigation();
  const [threads, setThreads] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Unread', 'Active', 'Waiting', 'Closed'];

  useEffect(() => {
    fetchThreads();
    const unsubscribe = chatService.subscribeLocal((data) => {
      if (data.event === 'THREAD_READ') {
        setThreads(prev => prev.map(t => 
          t.id === data.threadId ? { ...t, buyer_unread_count: 0 } : t
        ));
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchThreads = async () => {
    try {
      const data = await chatService.getThreads();
      const pinned = await chatService.getPinnedThreads();
      setPinnedIds(pinned);
      
      const sorted = (data || []).sort((a, b) => {
        const aPinned = pinned.includes(a.id);
        const bPinned = pinned.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
      });
      setThreads(sorted);
    } catch (e) {
      console.log('Error fetching buyer threads', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchThreads();
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    
    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays === 1) return 'Yesterday';
    
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString(undefined, options);
  };

  const determineStatus = (item) => {
    if (item.status === 'CLOSED' || item.is_closed) return 'Closed';
    const unreadCount = item.buyer_unread_count || 0;
    if (unreadCount > 0) return 'New Reply';
    
    if (item.last_message_sender_role === 'BUYER' || item.last_sender_role === 'BUYER') return 'Waiting';
    
    const THIRTY_SIX_HOURS = 36 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSellerTime = item.last_seller_reply_at ? new Date(item.last_seller_reply_at).getTime() : 0;
    if (now - lastSellerTime <= THIRTY_SIX_HOURS) {
        return 'Active';
    }
    
    return null;
  };

  const filteredAndSortedThreads = useMemo(() => {
    let result = [...threads];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.seller_name && t.seller_name.toLowerCase().includes(q)) ||
        (t.campaign_title && t.campaign_title.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.last_message_body && t.last_message_body.toLowerCase().includes(q))
      );
    }

    if (activeFilter !== 'All') {
      result = result.filter(t => {
        const status = determineStatus(t);
        if (activeFilter === 'Unread') return (t.buyer_unread_count || 0) > 0;
        if (activeFilter === 'Active') return status === 'Active' || status === 'New Reply';
        if (activeFilter === 'Waiting') return status === 'Waiting';
        if (activeFilter === 'Closed') return status === 'Closed';
        return true;
      });
    }

    result.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aUnread = (a.buyer_unread_count || 0) > 0;
      const bUnread = (b.buyer_unread_count || 0) > 0;
      
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      
      const statusPriority = { 'New Reply': 3, 'Active': 2, 'Waiting': 1, 'Closed': 0 };
      const aStatus = statusPriority[determineStatus(a)] || 0;
      const bStatus = statusPriority[determineStatus(b)] || 0;
      
      if (aStatus !== bStatus) return bStatus - aStatus;
      
      const aTime = new Date(a.last_message_at || a.updated_at || 0).getTime();
      const bTime = new Date(b.last_message_at || b.updated_at || 0).getTime();
      
      return bTime - aTime;
    });

    return result;
  }, [threads, searchQuery, activeFilter, pinnedIds]);

  const renderThread = ({ item }) => {
    const unreadCount = item.buyer_unread_count || 0;
    const hasUnread = unreadCount > 0;
    const status = determineStatus(item);
    
    const statusColors = {
      'New Reply': { bg: '#DBEAFE', text: '#1D4ED8' },
      'Waiting': { bg: '#FEF9C3', text: '#A16207' },
      'Active': { bg: '#DCFCE7', text: '#15803D' },
      'Closed': { bg: '#F1F5F9', text: '#64748B' }
    };
    
    const currentStatusColors = statusColors[status] || statusColors['Active'];
    const sellerInitials = (item.seller_name || 'B').substring(0, 2).toUpperCase();

    return (
      <Pressable 
        style={styles.card}
        onPress={() => navigation.navigate('ChatScreen', { 
          threadId: item.id,
          business: { name: item.seller_name, phone: item.seller_phone },
          campaign: { title: item.campaign_title, offer: item.campaign_offer || 'Enquiry', category: item.category, image_url: item.business_logo_url }
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.businessInfo}>
            {item.business_logo_url ? (
              <Image source={{ uri: item.business_logo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{sellerInitials}</Text>
              </View>
            )}
            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={[styles.sellerName, hasUnread && styles.boldText]} numberOfLines={1}>
                  {item.seller_name}
                </Text>
                {item.is_verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                )}
                {pinnedIds.includes(item.id) && (
                  <Ionicons name="pin" size={14} color="#64748B" style={{ marginLeft: 6 }} />
                )}
              </View>
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.timestamp}>{getRelativeTime(item.last_message_at || item.updated_at)}</Text>
          </View>
        </View>

        <View style={styles.campaignContainer}>
          <Text style={styles.campaignText} numberOfLines={1}>
            <Text style={styles.campaignPrefix}>Interested in: </Text>
            {item.campaign_title}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={[styles.lastMessage, hasUnread && styles.unreadMessageText]} numberOfLines={2}>
            {hasUnread ? item.last_message_body : (item.last_sender_role === 'BUYER' ? `You: ${item.last_message_body}` : item.last_message_body) || 'Tap to view conversation'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.footerRow}>
          {status ? (
            <View style={[styles.statusChip, { backgroundColor: currentStatusColors.bg }]}>
              <Text style={[styles.statusText, { color: currentStatusColors.text }]}>{status}</Text>
            </View>
          ) : <View />}
          
          {(item.rating || item.distance) && (
            <View style={styles.optionalInfo}>
              {item.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.optionalText}>{item.rating}</Text>
                </View>
              )}
              {item.distance && (
                <Text style={styles.optionalText}> • {item.distance}</Text>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </Pressable>
          <Text style={styles.headerTitle}>Inbox</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses, campaigns, messages..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {filters.map(filter => (
              <Pressable 
                key={filter} 
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredAndSortedThreads}
        keyExtractor={item => item.id.toString()}
        renderItem={renderThread}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                When you express interest in campaigns or message businesses, your conversations will appear here.
              </Text>
              <Pressable style={styles.emptyCta} onPress={() => navigation.navigate('DiscoveryFeed')}>
                <Text style={styles.emptyCtaText}>Explore Offers</Text>
              </Pressable>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#0F172A',
  },
  filtersWrapper: {
    paddingLeft: 16,
  },
  filtersContainer: {
    paddingRight: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  metaInfo: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  campaignContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  campaignText: {
    fontSize: 13,
    color: '#334155',
  },
  campaignPrefix: {
    fontWeight: '600',
    color: '#475569',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    paddingRight: 16,
  },
  unreadMessageText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionalText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyCta: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
