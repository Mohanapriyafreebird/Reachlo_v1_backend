import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import chatService from '../../services/chatService';


export default function BuyerInboxScreen() {

  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();

  const [threads, setThreads] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');


  /* =========================================================
     COLOR SYSTEM
  ========================================================= */

  const colors = useMemo(() => {

    const primary =
      theme?.primary ||
      theme?.buyerPrimary ||
      '#3B82F6';


    /* ================= DARK MODE ================= */

    if (isDarkMode) {

      return {

        background: '#08111F',

        header: '#101B2D',

        surface: '#162238',
        surfaceElevated: '#1B2A42',
        surfaceSoft: '#202F48',

        border: '#293A55',
        borderStrong: '#3A4D6B',

        text: '#F8FAFC',
        textSecondary: '#D4DEEB',
        textTertiary: '#93A4BB',

        placeholder: '#7F91A8',

        primary,
        primarySoft: '#1A3154',
        primaryBorder: '#2F5C92',

        searchBackground: '#1A273B',

        unreadBackground: '#1A2A44',
        unreadBorder: '#356AA6',

        activeChip: primary,
        inactiveChip: '#1A273B',

        campaignBackground: '#22324A',
        campaignBorder: '#31445F',

        categoryBackground: '#22324A',

        green: '#4ADE80',
        greenBackground: '#163827',

        orange: '#FBBF24',
        orangeBackground: '#3A2D10',

        blue: '#60A5FA',
        blueBackground: '#193657',

        gray: '#AAB8C8',
        grayBackground: '#263449',

        avatarStart: '#4F8DF7',
        avatarEnd: '#2563EB',

        emptyIconBackground: '#1C3150',

        divider: '#2C3D57',

        shadow: '#000000',

        verified: '#60A5FA',
      };
    }


    /* ================= LIGHT MODE ================= */

    return {

      background: '#F4F7FB',

      header: '#FFFFFF',

      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceSoft: '#F8FAFC',

      border: '#E2E8F0',
      borderStrong: '#CBD5E1',

      text: '#142033',
      textSecondary: '#475569',
      textTertiary: '#94A3B8',

      placeholder: '#94A3B8',

      primary,
      primarySoft: '#EAF2FF',
      primaryBorder: '#BFDBFE',

      searchBackground: '#F1F5F9',

      unreadBackground: '#F8FBFF',
      unreadBorder: '#93C5FD',

      activeChip: primary,
      inactiveChip: '#F1F5F9',

      campaignBackground: '#F8FAFC',
      campaignBorder: '#E2E8F0',

      categoryBackground: '#F1F5F9',

      green: '#059669',
      greenBackground: '#DCFCE7',

      orange: '#D97706',
      orangeBackground: '#FEF3C7',

      blue: '#2563EB',
      blueBackground: '#DBEAFE',

      gray: '#64748B',
      grayBackground: '#F1F5F9',

      avatarStart: '#4F8DF7',
      avatarEnd: '#2563EB',

      emptyIconBackground: '#EAF2FF',

      divider: '#E2E8F0',

      shadow: '#64748B',

      verified: '#3B82F6',
    };

  }, [isDarkMode, theme]);


  /* =========================================================
     FILTERS
  ========================================================= */

  const filters = [
    'All',
    'Unread',
    'Active',
    'Waiting',
    'Closed',
  ];


  /* =========================================================
     FETCH THREADS
  ========================================================= */

  const fetchThreads = useCallback(async () => {

    try {

      const data =
        await chatService.getThreads();

      const pinned =
        await chatService.getPinnedThreads();


      const safePinned =
        pinned || [];


      setPinnedIds(safePinned);


      const sorted =
        [...(data || [])].sort(
          (a, b) => {

            const aPinned =
              safePinned.includes(a.id);

            const bPinned =
              safePinned.includes(b.id);


            if (aPinned && !bPinned) {
              return -1;
            }

            if (!aPinned && bPinned) {
              return 1;
            }


            return (
              new Date(
                b.last_message_at ||
                b.updated_at ||
                0
              ) -

              new Date(
                a.last_message_at ||
                a.updated_at ||
                0
              )
            );
          }
        );


      setThreads(sorted);

    } catch (error) {

      console.log(
        'Error fetching buyer threads:',
        error
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, []);


  /* =========================================================
     LOAD WHEN SCREEN GETS FOCUS
  ========================================================= */

  useFocusEffect(
    useCallback(() => {

      fetchThreads();

    }, [fetchThreads])
  );


  /* =========================================================
     LOCAL CHAT EVENTS
  ========================================================= */

  useEffect(() => {

    const unsubscribe =
      chatService.subscribeLocal(
        (data) => {

          if (
            data.event ===
            'THREAD_READ'
          ) {

            setThreads(
              (previousThreads) =>

                previousThreads.map(
                  (thread) =>

                    thread.id ===
                    data.threadId

                      ? {
                          ...thread,

                          buyer_unread_count:
                            0,
                        }

                      : thread
                )
            );

          }

        }
      );


    return () => {

      if (unsubscribe) {
        unsubscribe();
      }

    };

  }, []);


  /* =========================================================
     REFRESH
  ========================================================= */

  const onRefresh =
    useCallback(() => {

      setRefreshing(true);

      fetchThreads();

    }, [fetchThreads]);


  /* =========================================================
     RELATIVE TIME
  ========================================================= */

  const getRelativeTime =
    useCallback((timestamp) => {

      if (!timestamp) {
        return '';
      }


      const now =
        new Date();

      const date =
        new Date(timestamp);


      const difference =
        Math.floor(
          (now - date) / 1000
        );


      if (difference < 60) {
        return 'Now';
      }


      if (difference < 3600) {

        return `${Math.floor(
          difference / 60
        )} min`;

      }


      if (difference < 86400) {

        return `${Math.floor(
          difference / 3600
        )}h`;

      }


      const days =
        Math.floor(
          difference / 86400
        );


      if (days === 1) {
        return 'Yesterday';
      }


      return date.toLocaleDateString(
        undefined,
        {
          day: 'numeric',
          month: 'short',
        }
      );

    }, []);


  /* =========================================================
     DETERMINE STATUS
  ========================================================= */

  const determineStatus =
    useCallback((item) => {

      if (
        item.status === 'CLOSED' ||
        item.is_closed
      ) {

        return 'Closed';

      }


      const unreadCount =
        Number(
          item.buyer_unread_count || 0
        );


      if (unreadCount > 0) {

        return 'New Reply';

      }


      if (

        item.last_message_sender_role ===
          'BUYER' ||

        item.last_sender_role ===
          'BUYER'

      ) {

        return 'Waiting';

      }


      const THIRTY_SIX_HOURS =
        36 *
        60 *
        60 *
        1000;


      const now =
        Date.now();


      const lastSellerTime =
        item.last_seller_reply_at

          ? new Date(
              item.last_seller_reply_at
            ).getTime()

          : 0;


      if (

        lastSellerTime &&

        now - lastSellerTime <=
          THIRTY_SIX_HOURS

      ) {

        return 'Active';

      }


      return 'Conversation';

    }, []);


  /* =========================================================
     STATUS CONFIGURATION
  ========================================================= */

  const getStatusConfig =
    useCallback((status) => {

      switch (status) {

        case 'New Reply':

          return {

            label: 'New Reply',

            color: colors.blue,

            background:
              colors.blueBackground,

            icon:
              'mail-unread-outline',

          };


        case 'Waiting':

          return {

            label: 'Waiting',

            color: colors.orange,

            background:
              colors.orangeBackground,

            icon:
              'time-outline',

          };


        case 'Active':

          return {

            label: 'Active',

            color: colors.green,

            background:
              colors.greenBackground,

            icon:
              'chatbubble-ellipses-outline',

          };


        case 'Closed':

          return {

            label: 'Closed',

            color: colors.gray,

            background:
              colors.grayBackground,

            icon:
              'checkmark-circle-outline',

          };


        default:

          return {

            label: 'Conversation',

            color:
              colors.textTertiary,

            background:
              colors.surfaceSoft,

            icon:
              'chatbubble-outline',

          };

      }

    }, [colors]);


  /* =========================================================
     SEARCH + FILTER
  ========================================================= */

  const filteredAndSortedThreads =
    useMemo(() => {

      let result =
        [...threads];


      /* SEARCH */

      if (
        searchQuery.trim()
      ) {

        const query =
          searchQuery
            .trim()
            .toLowerCase();


        result =
          result.filter(
            (thread) => {

              const sellerName =
                thread.seller_name
                  ?.toLowerCase() ||
                '';


              const campaignTitle =
                thread.campaign_title
                  ?.toLowerCase() ||
                '';


              const category =
                thread.category
                  ?.toLowerCase() ||
                '';


              return (

                sellerName.includes(
                  query
                ) ||

                campaignTitle.includes(
                  query
                ) ||

                category.includes(
                  query
                )

              );

            }
          );

      }


      /* FILTER */

      if (
        activeFilter !==
        'All'
      ) {

        result =
          result.filter(
            (thread) => {

              const status =
                determineStatus(
                  thread
                );


              if (
                activeFilter ===
                'Unread'
              ) {

                return (
                  Number(
                    thread.buyer_unread_count ||
                    0
                  ) > 0
                );

              }


              if (
                activeFilter ===
                'Active'
              ) {

                return (
                  status === 'Active' ||

                  status === 'New Reply'
                );

              }


              if (
                activeFilter ===
                'Waiting'
              ) {

                return (
                  status ===
                  'Waiting'
                );

              }


              if (
                activeFilter ===
                'Closed'
              ) {

                return (
                  status ===
                  'Closed'
                );

              }


              return true;

            }
          );

      }


      /* SORT */

      result.sort(
        (a, b) => {

          const aPinned =
            pinnedIds.includes(
              a.id
            );

          const bPinned =
            pinnedIds.includes(
              b.id
            );


          if (
            aPinned &&
            !bPinned
          ) {

            return -1;

          }


          if (
            !aPinned &&
            bPinned
          ) {

            return 1;

          }


          const aUnread =
            Number(
              a.buyer_unread_count ||
              0
            ) > 0;


          const bUnread =
            Number(
              b.buyer_unread_count ||
              0
            ) > 0;


          if (
            aUnread &&
            !bUnread
          ) {

            return -1;

          }


          if (
            !aUnread &&
            bUnread
          ) {

            return 1;

          }


          return (

            new Date(
              b.last_message_at ||
              b.updated_at ||
              0
            ) -

            new Date(
              a.last_message_at ||
              a.updated_at ||
              0
            )

          );

        }
      );


      return result;

    }, [

      threads,

      searchQuery,

      activeFilter,

      pinnedIds,

      determineStatus,

    ]);


  /* =========================================================
     INITIALS
  ========================================================= */

  const getInitials =
    useCallback((name) => {

      if (!name) {
        return 'B';
      }


      return name

        .trim()

        .split(/\s+/)

        .map(
          (word) =>
            word[0]
        )

        .join('')

        .substring(0, 2)

        .toUpperCase();

    }, []);


  /* =========================================================
     UNREAD THREAD COUNT
  ========================================================= */

  const unreadThreadsCount =
    threads.filter(
      (thread) =>

        Number(
          thread.buyer_unread_count ||
          0
        ) > 0

    ).length;


  /* =========================================================
     THREAD CARD
  ========================================================= */

  const renderThread =
    ({ item }) => {


      const unreadCount =
        Number(
          item.buyer_unread_count ||
          0
        );


      const hasUnread =
        unreadCount > 0;


      const status =
        determineStatus(
          item
        );


      const statusConfig =
        getStatusConfig(
          status
        );


      const isPinned =
        pinnedIds.includes(
          item.id
        );


      const sellerInitials =
        getInitials(
          item.seller_name
        );


      return (

        <Pressable

          onPress={() =>

            navigation.navigate(
              'ChatScreen',
              {

                threadId:
                  item.id,

                business: {

                  name:
                    item.seller_name,

                  phone:
                    item.seller_phone,

                },

                campaign: {

                  title:
                    item.campaign_title,

                  offer:
                    item.campaign_offer ||
                    'Enquiry',

                  category:
                    item.category,

                  image_url:
                    item.business_logo_url,

                },

              }
            )

          }


          style={({ pressed }) => [

            styles.threadCard,

            {

              backgroundColor:

                hasUnread

                  ? colors.unreadBackground

                  : colors.surface,


              borderColor:

                hasUnread

                  ? colors.unreadBorder

                  : colors.border,


              shadowColor:
                colors.shadow,


              opacity:
                pressed
                  ? 0.93
                  : 1,

            },

          ]}
        >


          {/* UNREAD SIDE INDICATOR */}

          {hasUnread && (

            <View
              style={[

                styles.unreadSideBar,

                {

                  backgroundColor:
                    colors.primary,

                },

              ]}
            />

          )}


          {/* HEADER */}

          <View
            style={
              styles.cardHeader
            }>


            {/* BUSINESS INFORMATION */}

            <View
              style={
                styles.businessInfo
              }>


              {/* AVATAR */}

              <View
                style={
                  styles.avatarWrapper
                }>

                {item.business_logo_url ? (

                  <Image

                    source={{
                      uri:
                        item.business_logo_url,
                    }}

                    style={[
                      styles.avatar,
                      {
                        borderColor:
                          colors.border,
                      },
                    ]}

                  />

                ) : (

                  <LinearGradient

                    colors={[

                      colors.avatarStart,

                      colors.avatarEnd,

                    ]}

                    start={{
                      x: 0,
                      y: 0,
                    }}

                    end={{
                      x: 1,
                      y: 1,
                    }}

                    style={
                      styles.avatarPlaceholder
                    }

                  >

                    <Text
                      style={
                        styles.avatarText
                      }
                    >

                      {sellerInitials}

                    </Text>

                  </LinearGradient>

                )}


                {hasUnread && (

                  <View
                    style={[

                      styles.unreadDot,

                      {

                        backgroundColor:
                          colors.primary,

                        borderColor:

                          hasUnread

                            ? colors.unreadBackground

                            : colors.surface,

                      },

                    ]}
                  />

                )}

              </View>


              {/* NAME */}

              <View
                style={
                  styles.nameContainer
                }>

                <View
                  style={
                    styles.nameRow
                  }>

                  <Text

                    numberOfLines={1}

                    style={[

                      styles.sellerName,

                      {

                        color:
                          colors.text,

                        fontWeight:

                          hasUnread

                            ? '800'

                            : '700',

                      },

                    ]}
                  >

                    {item.seller_name ||
                      'Business'}

                  </Text>


                  {item.is_verified && (

                    <Ionicons

                      name=
                        "checkmark-circle"

                      size={16}

                      color={
                        colors.verified
                      }

                      style={
                        styles.verifiedIcon
                      }

                    />

                  )}


                  {isPinned && (

                    <View
                      style={[

                        styles.pinContainer,

                        {

                          backgroundColor:
                            colors.primarySoft,

                        },

                      ]}
                    >

                      <Ionicons

                        name="pin"

                        size={11}

                        color={
                          colors.primary
                        }

                      />

                    </View>

                  )}

                </View>


                {/* CATEGORY */}

                {item.category && (

                  <View
                    style={[

                      styles.categoryBadge,

                      {

                        backgroundColor:
                          colors.categoryBackground,

                        borderColor:
                          colors.border,

                      },

                    ]}
                  >

                    <Text
                      numberOfLines={1}

                      style={[

                        styles.categoryText,

                        {

                          color:
                            colors.textSecondary,

                        },

                      ]}
                    >

                      {item.category}

                    </Text>

                  </View>

                )}

              </View>

            </View>


            {/* TIME */}

            <Text
              style={[

                styles.timestamp,

                {

                  color:

                    hasUnread

                      ? colors.textSecondary

                      : colors.textTertiary,

                },

              ]}
            >

              {getRelativeTime(

                item.last_message_at ||

                item.updated_at

              )}

            </Text>

          </View>


          {/* =================================================
              CAMPAIGN SECTION

              IMPORTANT:
              NO CHAT MESSAGE PREVIEW IS DISPLAYED.

              Therefore:
              "Hi"
              "Hello"
              or any other message

              WILL NOT APPEAR HERE.
          ================================================= */}

          <View
            style={[

              styles.campaignContainer,

              {

                backgroundColor:
                  colors.campaignBackground,

                borderColor:
                  colors.campaignBorder,

              },

            ]}
          >


            <View
              style={[

                styles.campaignAccent,

                {

                  backgroundColor:
                    colors.primary,

                },

              ]}
            />


            <View
              style={
                styles.campaignContent
              }>


              <View
                style={[

                  styles.campaignIconBox,

                  {

                    backgroundColor:
                      colors.primarySoft,

                  },

                ]}
              >

                <Ionicons

                  name="megaphone"

                  size={14}

                  color={
                    colors.primary
                  }

                />

              </View>


              <View
                style={
                  styles.campaignTextContainer
                }>

                <Text
                  style={[

                    styles.interestedLabel,

                    {

                      color:
                        colors.textTertiary,

                    },

                  ]}
                >

                  Interested in

                </Text>


                <Text

                  numberOfLines={1}

                  style={[

                    styles.campaignTitle,

                    {

                      color:
                        colors.textSecondary,

                    },

                  ]}
                >

                  {item.campaign_title ||
                    'Campaign enquiry'}

                </Text>

              </View>

            </View>

          </View>


          {/* FOOTER */}

          <View
            style={[
              styles.footerRow,
              {
                borderTopColor:
                  colors.divider,
              },
            ]}
          >


            <View
              style={[

                styles.statusChip,

                {

                  backgroundColor:
                    statusConfig.background,

                },

              ]}
            >

              <Ionicons

                name={
                  statusConfig.icon
                }

                size={13}

                color={
                  statusConfig.color
                }

                style={
                  styles.statusIcon
                }

              />


              <Text
                style={[

                  styles.statusText,

                  {

                    color:
                      statusConfig.color,

                  },

                ]}
              >

                {statusConfig.label}

              </Text>

            </View>


            <View
              style={
                styles.rightFooter
              }>


              {/* RATING */}

              {item.rating && (

                <View
                  style={
                    styles.ratingRow
                  }
                >

                  <Ionicons

                    name="star"

                    size={13}

                    color="#F59E0B"

                  />

                  <Text
                    style={[

                      styles.optionalText,

                      {

                        color:
                          colors.textSecondary,

                      },

                    ]}
                  >

                    {item.rating}

                  </Text>

                </View>

              )}


              {/* DISTANCE */}

              {item.distance && (

                <Text
                  style={[

                    styles.optionalText,

                    {

                      color:
                        colors.textTertiary,

                    },

                  ]}
                >

                  {item.rating
                    ? ` • ${item.distance}`
                    : item.distance}

                </Text>

              )}


              {/* UNREAD COUNT */}

              {hasUnread && (

                <View
                  style={[

                    styles.unreadBadge,

                    {

                      backgroundColor:
                        colors.primary,

                    },

                  ]}
                >

                  <Text
                    style={
                      styles.unreadBadgeText
                    }
                  >

                    {unreadCount > 99

                      ? '99+'

                      : unreadCount}

                  </Text>

                </View>

              )}

            </View>

          </View>

        </Pressable>

      );

    };


  /* =========================================================
     EMPTY STATE
  ========================================================= */

  const renderEmptyState =
    () => {

      if (loading) {
        return null;
      }


      return (

        <View
          style={
            styles.emptyContainer
          }
        >

          <View
            style={[

              styles.emptyIconContainer,

              {

                backgroundColor:
                  colors.emptyIconBackground,

              },

            ]}
          >

            <Ionicons

              name=
                "chatbubbles-outline"

              size={38}

              color={
                colors.primary
              }

            />

          </View>


          <Text
            style={[

              styles.emptyTitle,

              {

                color:
                  colors.text,

              },

            ]}
          >

            No conversations yet

          </Text>


          <Text
            style={[

              styles.emptySubtext,

              {

                color:
                  colors.textSecondary,

              },

            ]}
          >

            When you express interest in
            campaigns or message businesses,
            your conversations will appear
            here.

          </Text>


          <Pressable

            onPress={() =>

              navigation.navigate(
                'DiscoveryFeed'
              )

            }

            style={({ pressed }) => [

              styles.emptyCta,

              {

                backgroundColor:
                  colors.primary,

                opacity:
                  pressed
                    ? 0.9
                    : 1,

              },

            ]}
          >

            <Ionicons

              name="compass-outline"

              size={17}

              color="#FFFFFF"

              style={
                styles.emptyCtaIcon
              }

            />


            <Text
              style={
                styles.emptyCtaText
              }
            >

              Explore Offers

            </Text>

          </Pressable>

        </View>

      );

    };


  /* =========================================================
     SCREEN
  ========================================================= */

  return (

    <SafeAreaView

      edges={[
        'top',
        'left',
        'right',
      ]}

      style={[

        styles.safeArea,

        {

          backgroundColor:
            colors.background,

        },

      ]}
    >


      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={[

          styles.header,

          {

            backgroundColor:
              colors.header,

            borderBottomColor:
              colors.border,

          },

        ]}
      >


        {/* HEADER TOP */}

        <View
          style={
            styles.headerTop
          }>


          <Pressable

            onPress={() =>
              navigation.goBack()
            }

            style={
              styles.backBtn
            }

          >

            <Ionicons

              name="arrow-back"

              size={23}

              color={
                colors.text
              }

            />

          </Pressable>


          <View
            style={
              styles.headerTitleContainer
            }>

            <Text
              style={[

                styles.headerTitle,

                {

                  color:
                    colors.text,

                },

              ]}
            >

              Inbox

            </Text>


            <Text
              style={[

                styles.headerSubtitle,

                {

                  color:
                    colors.textSecondary,

                },

              ]}
            >

              Your conversations

            </Text>

          </View>


          <View
            style={
              styles.headerRight
            }
          >

            {unreadThreadsCount > 0 && (

              <View
                style={[

                  styles.headerBadge,

                  {

                    backgroundColor:
                      colors.primarySoft,

                    borderColor:
                      colors.primaryBorder,

                  },

                ]}
              >

                <Text
                  style={[

                    styles.headerBadgeText,

                    {

                      color:
                        colors.primary,

                    },

                  ]}
                >

                  {unreadThreadsCount}

                </Text>

              </View>

            )}

          </View>

        </View>


        {/* SEARCH */}

        <View
          style={[

            styles.searchContainer,

            {

              backgroundColor:
                colors.searchBackground,

              borderColor:
                colors.border,

            },

          ]}
        >

          <Ionicons

            name="search-outline"

            size={21}

            color={
              colors.textTertiary
            }

            style={
              styles.searchIcon
            }

          />


          <TextInput

            value={
              searchQuery
            }

            onChangeText={
              setSearchQuery
            }

            placeholder={
              'Search businesses, campaigns...'
            }

            placeholderTextColor={
              colors.placeholder
            }

            autoCorrect={false}

            returnKeyType="search"

            style={[

              styles.searchInput,

              {

                color:
                  colors.text,

              },

            ]}

          />


          {searchQuery.length > 0 && (

            <Pressable

              onPress={() =>
                setSearchQuery('')
              }

              style={
                styles.clearButton
              }

            >

              <Ionicons

                name="close-circle"

                size={20}

                color={
                  colors.textTertiary
                }

              />

            </Pressable>

          )}

        </View>


        {/* FILTERS */}

        <ScrollView

          horizontal

          showsHorizontalScrollIndicator={
            false
          }

          contentContainerStyle={
            styles.filtersContainer
          }

        >

          {filters.map(
            (filter) => {

              const isActive =
                activeFilter ===
                filter;


              return (

                <Pressable

                  key={filter}

                  onPress={() =>
                    setActiveFilter(
                      filter
                    )
                  }

                  style={({ pressed }) => [

                    styles.filterChip,

                    {

                      backgroundColor:

                        isActive

                          ? colors.activeChip

                          : colors.inactiveChip,


                      borderColor:

                        isActive

                          ? colors.activeChip

                          : colors.border,


                      opacity:

                        pressed
                          ? 0.85
                          : 1,

                    },

                  ]}
                >


                  {filter ===
                    'Unread' && (

                    <Ionicons

                      name=
                        "mail-unread-outline"

                      size={14}

                      color={

                        isActive

                          ? '#FFFFFF'

                          : colors.textSecondary

                      }

                      style={
                        styles.filterIcon
                      }

                    />

                  )}


                  {filter ===
                    'Active' && (

                    <Ionicons

                      name=
                        "chatbubble-outline"

                      size={14}

                      color={

                        isActive

                          ? '#FFFFFF'

                          : colors.textSecondary

                      }

                      style={
                        styles.filterIcon
                      }

                    />

                  )}


                  {filter ===
                    'Waiting' && (

                    <Ionicons

                      name=
                        "time-outline"

                      size={14}

                      color={

                        isActive

                          ? '#FFFFFF'

                          : colors.textSecondary

                      }

                      style={
                        styles.filterIcon
                      }

                    />

                  )}


                  {filter ===
                    'Closed' && (

                    <Ionicons

                      name=
                        "checkmark-circle-outline"

                      size={14}

                      color={

                        isActive

                          ? '#FFFFFF'

                          : colors.textSecondary

                      }

                      style={
                        styles.filterIcon
                      }

                    />

                  )}


                  <Text
                    style={[

                      styles.filterText,

                      {

                        color:

                          isActive

                            ? '#FFFFFF'

                            : colors.textSecondary,

                      },

                    ]}
                  >

                    {filter}

                  </Text>

                </Pressable>

              );

            }
          )}

        </ScrollView>

      </View>


      {/* =====================================================
          THREAD LIST
      ===================================================== */}

      <FlatList

        data={
          filteredAndSortedThreads
        }

        keyExtractor={
          (item) =>
            String(item.id)
        }

        renderItem={
          renderThread
        }

        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={[

          styles.listContent,

          filteredAndSortedThreads.length ===
            0 &&

            styles.emptyListContent,

        ]}


        refreshControl={

          <RefreshControl

            refreshing={
              refreshing
            }

            onRefresh={
              onRefresh
            }

            tintColor={
              colors.primary
            }

            colors={[
              colors.primary,
            ]}

            progressBackgroundColor={
              colors.surface
            }

          />

        }


        ListEmptyComponent={
          renderEmptyState()
        }

      />

    </SafeAreaView>

  );

}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({


    /* SCREEN */

    safeArea: {
      flex: 1,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {

      paddingBottom: 12,

      borderBottomWidth: 1,

      zIndex: 10,

      ...Platform.select({

        ios: {

          shadowOffset: {
            width: 0,
            height: 2,
          },

          shadowOpacity: 0.08,

          shadowRadius: 7,

        },

        android: {
          elevation: 3,
        },

      }),

    },


    headerTop: {

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 16,

      paddingTop: 10,

      paddingBottom: 13,

    },


    backBtn: {

      width: 42,
      height: 42,

      justifyContent: 'center',
      alignItems: 'center',

      borderRadius: 14,

    },


    headerTitleContainer: {

      flex: 1,

      alignItems: 'center',

    },


    headerTitle: {

      fontSize: 22,

      fontWeight: '800',

      letterSpacing: -0.4,

    },


    headerSubtitle: {

      fontSize: 12,

      fontWeight: '500',

      marginTop: 2,

    },


    headerRight: {

      width: 42,

      alignItems: 'flex-end',

      justifyContent: 'center',

    },


    headerBadge: {

      minWidth: 26,

      height: 26,

      borderRadius: 13,

      borderWidth: 1,

      justifyContent: 'center',

      alignItems: 'center',

      paddingHorizontal: 7,

    },


    headerBadgeText: {

      fontSize: 11,

      fontWeight: '800',

    },


    /* =====================================================
       SEARCH
    ===================================================== */

    searchContainer: {

      height: 52,

      flexDirection: 'row',

      alignItems: 'center',

      marginHorizontal: 16,

      borderRadius: 16,

      borderWidth: 1,

      paddingHorizontal: 14,

      marginBottom: 13,

    },


    searchIcon: {

      marginRight: 10,

    },


    searchInput: {

      flex: 1,

      height: '100%',

      fontSize: 15,

      fontWeight: '500',

      paddingVertical: 0,

    },


    clearButton: {

      padding: 4,

    },


    /* =====================================================
       FILTERS
    ===================================================== */

    filtersContainer: {

      paddingLeft: 16,

      paddingRight: 16,

      paddingVertical: 3,

    },


    filterChip: {

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 16,

      paddingVertical: 10,

      borderRadius: 22,

      borderWidth: 1,

      marginRight: 9,

    },


    filterIcon: {

      marginRight: 5,

    },


    filterText: {

      fontSize: 13,

      fontWeight: '700',

    },


    /* =====================================================
       LIST
    ===================================================== */

    listContent: {

      paddingHorizontal: 16,

      paddingTop: 17,

      paddingBottom: 45,

    },


    emptyListContent: {

      flexGrow: 1,

    },


    /* =====================================================
       THREAD CARD
    ===================================================== */

    threadCard: {

      position: 'relative',

      padding: 16,

      borderRadius: 22,

      marginBottom: 14,

      borderWidth: 1,

      overflow: 'hidden',

      ...Platform.select({

        ios: {

          shadowOffset: {
            width: 0,
            height: 4,
          },

          shadowOpacity: 0.12,

          shadowRadius: 10,

        },

        android: {

          elevation: 3,

        },

      }),

    },


    unreadSideBar: {

      position: 'absolute',

      left: 0,

      top: 18,

      bottom: 18,

      width: 4,

      borderTopRightRadius: 5,

      borderBottomRightRadius: 5,

    },


    /* =====================================================
       CARD HEADER
    ===================================================== */

    cardHeader: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent: 'space-between',

      marginBottom: 14,

    },


    businessInfo: {

      flexDirection: 'row',

      alignItems: 'center',

      flex: 1,

      minWidth: 0,

      paddingRight: 8,

    },


    avatarWrapper: {

      position: 'relative',

      marginRight: 13,

    },


    avatar: {

      width: 56,

      height: 56,

      borderRadius: 18,

      borderWidth: 1,

    },


    avatarPlaceholder: {

      width: 56,

      height: 56,

      borderRadius: 18,

      justifyContent: 'center',

      alignItems: 'center',

    },


    avatarText: {

      color: '#FFFFFF',

      fontSize: 18,

      fontWeight: '800',

      letterSpacing: 0.3,

    },


    unreadDot: {

      position: 'absolute',

      right: -2,

      bottom: -2,

      width: 15,

      height: 15,

      borderRadius: 20,

      borderWidth: 3,

    },


    nameContainer: {

      flex: 1,

      minWidth: 0,

    },


    nameRow: {

      flexDirection: 'row',

      alignItems: 'center',

      minWidth: 0,

    },


    sellerName: {

      flexShrink: 1,

      fontSize: 17,

      letterSpacing: -0.2,

    },


    verifiedIcon: {

      marginLeft: 5,

    },


    pinContainer: {

      width: 23,

      height: 23,

      borderRadius: 12,

      justifyContent: 'center',

      alignItems: 'center',

      marginLeft: 7,

    },


    categoryBadge: {

      alignSelf: 'flex-start',

      borderWidth: 1,

      paddingHorizontal: 8,

      paddingVertical: 3,

      borderRadius: 8,

      marginTop: 6,

      maxWidth: '100%',

    },


    categoryText: {

      fontSize: 10,

      fontWeight: '700',

      textTransform: 'uppercase',

    },


    timestamp: {

      fontSize: 12,

      fontWeight: '600',

      marginLeft: 8,

      paddingTop: 3,

    },


    /* =====================================================
       CAMPAIGN
    ===================================================== */

    campaignContainer: {

      flexDirection: 'row',

      minHeight: 64,

      borderRadius: 15,

      borderWidth: 1,

      overflow: 'hidden',

      marginBottom: 14,

    },


    campaignAccent: {

      width: 4,

    },


    campaignContent: {

      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 12,

      paddingVertical: 10,

    },


    campaignIconBox: {

      width: 34,

      height: 34,

      borderRadius: 11,

      justifyContent: 'center',

      alignItems: 'center',

      marginRight: 10,

    },


    campaignTextContainer: {

      flex: 1,

      minWidth: 0,

    },


    interestedLabel: {

      fontSize: 11,

      fontWeight: '600',

      marginBottom: 3,

    },


    campaignTitle: {

      fontSize: 13,

      fontWeight: '700',

      lineHeight: 18,

    },


    /* =====================================================
       FOOTER
    ===================================================== */

    footerRow: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      paddingTop: 12,

      borderTopWidth: 1,

    },


    statusChip: {

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderRadius: 10,

    },


    statusIcon: {

      marginRight: 5,

    },


    statusText: {

      fontSize: 11,

      fontWeight: '800',

    },


    rightFooter: {

      flexDirection: 'row',

      alignItems: 'center',

      marginLeft: 8,

    },


    ratingRow: {

      flexDirection: 'row',

      alignItems: 'center',

    },


    optionalText: {

      fontSize: 12,

      fontWeight: '600',

      marginLeft: 3,

    },


    unreadBadge: {

      minWidth: 27,

      height: 27,

      paddingHorizontal: 8,

      borderRadius: 14,

      justifyContent: 'center',

      alignItems: 'center',

      marginLeft: 10,

    },


    unreadBadgeText: {

      color: '#FFFFFF',

      fontSize: 11,

      fontWeight: '800',

    },


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    emptyContainer: {

      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      paddingHorizontal: 35,

      paddingBottom: 90,

    },


    emptyIconContainer: {

      width: 78,

      height: 78,

      borderRadius: 39,

      justifyContent: 'center',

      alignItems: 'center',

      marginBottom: 19,

    },


    emptyTitle: {

      fontSize: 20,

      fontWeight: '800',

      marginBottom: 9,

    },


    emptySubtext: {

      fontSize: 14,

      lineHeight: 21,

      textAlign: 'center',

      fontWeight: '500',

      marginBottom: 23,

    },


    emptyCta: {

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 19,

      paddingVertical: 12,

      borderRadius: 14,

    },


    emptyCtaIcon: {

      marginRight: 7,

    },


    emptyCtaText: {

      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '800',

    },

  });