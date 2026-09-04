import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import chatService from '../../services/chatService';
import { LinearGradient } from 'expo-linear-gradient';

export default function SellerMessagesScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [threads, setThreads] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Unread', 'New Leads', 'Active Chats'];

  useFocusEffect(
    React.useCallback(() => {
      fetchThreads();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = chatService.subscribeLocal((data) => {
      if (data.event === 'THREAD_READ') {
        setThreads(prev => prev.map(t =>
          t.id === data.threadId
            ? { ...t, seller_unread_count: 0 }
            : t
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

        return new Date(b.last_message_at || 0) -
          new Date(a.last_message_at || 0);
      });

      setThreads(sorted);
    } catch (error) {
      console.log('Error fetching seller threads', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchThreads();
  };

  const getThreadStatus = (item) => {
    const unread = item.seller_unread_count > 0;

    // Check recent activity (24 hours)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const lastBuyerTime = item.last_buyer_message_at
      ? new Date(item.last_buyer_message_at).getTime()
      : 0;

    const lastSellerTime = item.last_seller_reply_at
      ? new Date(item.last_seller_reply_at).getTime()
      : 0;

    const isActive =
      (now - lastBuyerTime <= ONE_DAY) ||
      (now - lastSellerTime <= ONE_DAY);

    if (
      unread &&
      (
        item.total_messages <= 2 ||
        item.last_message_body?.includes('Enquired')
      )
    ) {
      return {
        label: 'New Lead',
        color: '#10B981',
        bgColor: '#D1FAE5'
      };
    } else if (unread) {
      return {
        label: 'Awaiting Reply',
        color: '#F59E0B',
        bgColor: '#FEF3C7'
      };
    } else if (isActive) {
      return {
        label: 'Active Chat',
        color: '#8B5CF6',
        bgColor: '#DDD6FE'
      };
    } else {
      return null;
    }
  };

  const filteredAndSortedThreads = useMemo(() => {
    let result = threads;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      result = result.filter(t =>
        t.buyer_name?.toLowerCase().includes(q) ||
        t.campaign_title?.toLowerCase().includes(q)
      );
    }

    // Filter
    if (activeFilter === 'Unread') {
      result = result.filter(
        t => t.seller_unread_count > 0
      );
    } else if (activeFilter === 'New Leads') {
      result = result.filter(
        t =>
          t.seller_unread_count > 0 &&
          (
            t.total_messages <= 2 ||
            t.last_message_body?.includes('Enquired')
          )
      );
    } else if (activeFilter === 'Active Chats') {
      result = result.filter(
        t => t.seller_unread_count === 0
      );
    }

    // Sort: Pinned first, then Unread, then by date
    result.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (
        a.seller_unread_count > 0 &&
        b.seller_unread_count === 0
      ) {
        return -1;
      }

      if (
        a.seller_unread_count === 0 &&
        b.seller_unread_count > 0
      ) {
        return 1;
      }

      return new Date(b.last_message_at) -
        new Date(a.last_message_at);
    });

    return result;
  }, [
    threads,
    searchQuery,
    activeFilter,
    pinnedIds
  ]);

  const renderThread = ({ item }) => {
    const unreadCount = item.seller_unread_count || 0;
    const hasUnread = unreadCount > 0;
    const status = getThreadStatus(item);

    const getInitials = (name) => {
      if (!name) return '?';

      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };

    return (
      <Pressable
        style={[
          styles.threadCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: hasUnread
              ? theme.sellerPrimary + '40'
              : theme.cardBorder
          }
        ]}
        onPress={() =>
          navigation.navigate('ChatScreen', {
            threadId: item.id,
            buyer: {
              name: item.buyer_name,
              phone: item.buyer_phone
            },
            campaign: {
              title: item.campaign_title
            }
          })
        }
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#1D4ED8']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {getInitials(item.buyer_name)}
            </Text>
          </LinearGradient>

          {hasUnread && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        <View style={styles.threadInfo}>
          <View style={styles.threadHeader}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.buyerName,
                  {
                    color: hasUnread
                      ? theme.text
                      : theme.textSecondary,
                    fontWeight: hasUnread
                      ? '700'
                      : '600'
                  }
                ]}
                numberOfLines={1}
              >
                {item.buyer_name || 'Buyer'}
              </Text>

              {pinnedIds.includes(item.id) && (
                <Ionicons
                  name="pin"
                  size={14}
                  color="#64748B"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>

            <View style={styles.timeBadgeRow}>
              <Text style={styles.timeText}>
                {new Date(
                  item.last_message_at
                ).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </View>

          <Text
            style={styles.campaignTitle}
            numberOfLines={1}
          >
            Interested in: {item.campaign_title}
          </Text>

          <Text
            style={[
              styles.lastMessage,
              {
                color: hasUnread
                  ? theme.text
                  : theme.textSecondary,
                fontWeight: hasUnread
                  ? '700'
                  : '400'
              }
            ]}
            numberOfLines={1}
          >
            {item.last_message_body ||
              'Sent an enquiry'}
          </Text>

          <View style={styles.footerRow}>
            {status ? (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      status.bgColor
                  }
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: status.color
                    }
                  ]}
                >
                  {status.label}
                </Text>
              </View>
            ) : (
              <View />
            )}

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text
                  style={styles.unreadBadgeText}
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.background
        }
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border
          }
        ]}
      >
        <View style={styles.headerTop}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.text
              }
            ]}
          >
            Lead Inbox
          </Text>

          <View
            style={[
              styles.headerBadge,
              {
                backgroundColor:
                  theme.sellerSurface
              }
            ]}
          >
            <Text
              style={[
                styles.headerBadgeText,
                {
                  color:
                    theme.sellerPrimary
                }
              ]}
            >
              {
                threads.filter(
                  t =>
                    t.seller_unread_count > 0
                ).length
              } Unread
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor:
                theme.surfaceSecondary
            }
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={theme.textTertiary}
            style={styles.searchIcon}
          />

          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.text
              }
            ]}
            placeholder="Search leads, campaigns..."
            placeholderTextColor={
              theme.textTertiary
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          {filters.map(filter => (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    theme.surfaceSecondary
                },
                activeFilter === filter && {
                  backgroundColor:
                    theme.sellerPrimary
                }
              ]}
              onPress={() =>
                setActiveFilter(filter)
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      activeFilter === filter
                        ? '#FFF'
                        : theme.textSecondary
                  }
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAndSortedThreads}
        keyExtractor={item => item.id}
        renderItem={renderThread}
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View
              style={styles.emptyContainer}
            >
              <View
                style={styles.emptyIconCircle}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color="#8B5CF6"
                />
              </View>

              <Text
                style={styles.emptyText}
              >
                No leads found
              </Text>

              <Text
                style={styles.emptySubtext}
              >
                When buyers interact with your
                campaigns, their messages will
                appear here.
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },

  headerBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  headerBadgeText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '600',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
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

  filtersScroll: {
    marginBottom: 8,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },

  filterChipActive: {
    backgroundColor: '#7C3AED',
  },

  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#FFF',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  threadCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },

  threadCardUnread: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FAFAF9',
  },

  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  threadInfo: {
    flex: 1,
  },

  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  buyerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },

  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  campaignTitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },

  lastMessage: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
  },

  unreadText: {
    fontWeight: '700',
    color: '#0F172A',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  unreadBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },

  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  }
});