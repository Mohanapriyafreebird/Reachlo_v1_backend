import React, {
  useState,
  useEffect,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TextInput,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/typography';

import apiService from '../../services/apiService';


/* ============================================================
   RESPONSIVE DIMENSIONS
============================================================ */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 10;

const CARD_WIDTH =
  (SCREEN_WIDTH -
    HORIZONTAL_PADDING * 2 -
    COLUMN_GAP * 2) /
  3;


/* ============================================================
   CATEGORY DATA
============================================================ */

const SERVICES_DATA = [
  {
    id: 'it',
    title: 'IT & Technology',
    icon: require('../../../assets/ICONS/CATEGORY/it_and_technology.png'),
    offersCount: 0,
  },

  {
    id: 'edu',
    title: 'Education',
    icon: require('../../../assets/ICONS/CATEGORY/education.png'),
    offersCount: 0,
  },

  {
    id: 'health',
    title: 'Health',
    icon: require('../../../assets/ICONS/CATEGORY/health.png'),
    offersCount: 0,
  },

  {
    id: 'beauty',
    title: 'Beauty',
    icon: require('../../../assets/ICONS/CATEGORY/beauty.png'),
    offersCount: 0,
  },

  {
    id: 'food',
    title: 'Food',
    icon: require('../../../assets/ICONS/CATEGORY/food.png'),
    offersCount: 0,
  },

  {
    id: 'events',
    title: 'Events',
    icon: require('../../../assets/ICONS/CATEGORY/events.png'),
    offersCount: 0,
  },

  {
    id: 'realestate',
    title: 'Real Estate',
    icon: require('../../../assets/ICONS/CATEGORY/real_estate.jpg'),
    offersCount: 0,
  },

  {
    id: 'transport',
    title: 'Transport & Delivery',
    icon: require('../../../assets/ICONS/CATEGORY/transport.jpg'),
    offersCount: 0,
  },

  {
    id: 'auto',
    title: 'Automotive',
    icon: require('../../../assets/ICONS/CATEGORY/automotive.jpg'),
    offersCount: 0,
  },

  {
    id: 'finance',
    title: 'Finance',
    icon: require('../../../assets/ICONS/CATEGORY/finance.jpg'),
    offersCount: 0,
  },

  {
    id: 'legal',
    title: 'Legal Services',
    icon: require('../../../assets/ICONS/CATEGORY/legal.jpg'),
    offersCount: 0,
  },

  {
    id: 'home',
    title: 'Home Services',
    icon: require('../../../assets/ICONS/CATEGORY/home_services.jpg'),
    offersCount: 0,
  },

  {
    id: 'travel',
    title: 'Travel & Tourism',
    icon: require('../../../assets/ICONS/CATEGORY/travel.jpg'),
    offersCount: 0,
  },

  {
    id: 'shopping',
    title: 'Shopping & Retail',
    icon: require('../../../assets/ICONS/CATEGORY/shopping.jpg'),
    offersCount: 0,
  },
];


/* ============================================================
   CATEGORY MAPPING
============================================================ */

const getCategoryServiceId = (categoryName) => {
  let catName = categoryName || '';

  if (catName.includes('::')) {
    catName = catName.split('::')[0];
  }

  if (catName === 'IT & Technology Services') {
    return 'it';
  }

  if (catName === 'Education & Training') {
    return 'edu';
  }

  if (catName === 'Health & Wellness') {
    return 'health';
  }

  if (catName === 'Beauty & Personal Care') {
    return 'beauty';
  }

  if (catName === 'Food & Restaurants') {
    return 'food';
  }

  if (catName === 'Events & Entertainment') {
    return 'events';
  }

  if (catName === 'Real Estate & Property') {
    return 'realestate';
  }

  if (catName === 'Transport & Delivery') {
    return 'transport';
  }

  if (catName === 'Automotive Services') {
    return 'auto';
  }

  if (catName === 'Finance & Insurance') {
    return 'finance';
  }

  if (catName === 'Legal & Compliance') {
    return 'legal';
  }

  if (catName === 'Home & Repair Services') {
    return 'home';
  }

  if (catName === 'Travel & Tourism') {
    return 'travel';
  }

  if (catName === 'Shopping & Retail') {
    return 'shopping';
  }

  return 'other';
};


/* ============================================================
   CATEGORY CARD
============================================================ */

const CategoryCard = ({
  item,
  colors,
  isDarkMode,
  onPress,
}) => {

  const scaleValue = useRef(
    new Animated.Value(1)
  ).current;


  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 35,
      bounciness: 3,
    }).start();
  };


  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };


  return (
    <Animated.View
      style={[
        styles.cardContainer,

        {
          width: CARD_WIDTH,

          backgroundColor:
            colors.surface,

          borderColor:
            colors.border,

          shadowOpacity:
            isDarkMode ? 0 : 0.07,

          elevation:
            isDarkMode ? 0 : 3,

          transform: [
            {
              scale: scaleValue,
            },
          ],
        },
      ]}
    >

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}

        android_ripple={{
          color: colors.primarySoft,
        }}
      >

        {/* ==================================================
            ICON
        ================================================== */}

        <View
          style={[
            styles.iconContainer,

            {
              backgroundColor:
                colors.iconBackground,

              borderColor:
                colors.primaryBorder,
            },
          ]}
        >

          <Image
            source={item.icon}
            style={styles.iconImage}
          />

        </View>


        {/* ==================================================
            CATEGORY TITLE
        ================================================== */}

        <Text
          style={[
            styles.cardTitle,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>


        {/* ==================================================
            ACTIVE BADGE
        ================================================== */}

        <View
          style={[
            styles.badge,

            {
              backgroundColor:
                colors.badgeBackground,
            },
          ]}
        >

          <View
            style={[
              styles.badgeDot,

              {
                backgroundColor:
                  colors.badgeText,
              },
            ]}
          />

          <Text
            style={[
              styles.badgeText,

              {
                color:
                  colors.badgeText,
              },
            ]}
            numberOfLines={1}
          >
            {item.offersCount} active
          </Text>

        </View>

      </Pressable>

    </Animated.View>
  );
};


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function AllCategoriesScreen({
  navigation,
}) {

  const {
    theme,
    isDarkMode,
  } = useTheme();


  const [
    categories,
    setCategories,
  ] = useState(SERVICES_DATA);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');


  const fadeAnim =
    useRef(
      new Animated.Value(0)
    ).current;


  /* ==========================================================
     DYNAMIC COLOR SYSTEM
  ========================================================== */

  const colors = isDarkMode

    ? {

        background: '#080B18',

        headerStart: '#17112E',
        headerMiddle: '#15122A',
        headerEnd: '#0D1020',

        surface: '#111827',
        surfaceElevated: '#151C2E',

        searchBackground: '#111827',

        primary: '#A78BFA',
        primaryStrong: '#8B5CF6',

        primarySoft: '#21183B',
        primaryBorder: '#3D2A63',

        text: '#F8FAFC',
        textSecondary: '#AAB3C5',
        textMuted: '#737D91',

        border: '#293248',
        borderSoft: '#20283A',

        iconBackground: '#241A40',

        badgeBackground: '#12372C',
        badgeText: '#5EE0A3',

        orbOne: '#17213A',
        orbTwo: '#21183A',

        emptyIcon: '#59647A',

      }

    : {

        background: '#F8F7FC',

        headerStart: '#F3EEFF',
        headerMiddle: '#F8F5FF',
        headerEnd: '#FFFFFF',

        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',

        searchBackground: '#FFFFFF',

        primary: '#7C3AED',
        primaryStrong: '#6D28D9',

        primarySoft: '#F0EAFE',
        primaryBorder: '#E4D9FF',

        text: '#17122D',
        textSecondary: '#667085',
        textMuted: '#98A2B3',

        border: '#E5E7EB',
        borderSoft: '#EEF0F4',

        iconBackground: '#F0EAFF',

        badgeBackground: '#ECFDF5',
        badgeText: '#059669',

        orbOne: '#E0F2FE',
        orbTwo: '#EDE9FE',

        emptyIcon: '#CBD5E1',

      };


  /* ==========================================================
     LOAD DATA
  ========================================================== */

  useEffect(() => {

    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }
    ).start();


    const fetchCampaigns =
      async () => {

        try {

          const fetched =
            await apiService.get(
              '/campaigns'
            );


          const counts = {};


          fetched.forEach(
            (campaign) => {

              const serviceId =
                getCategoryServiceId(
                  campaign.category
                );


              counts[serviceId] =
                (counts[serviceId] || 0) + 1;

            }
          );


          setCategories(

            SERVICES_DATA.map(
              (service) => ({

                ...service,

                offersCount:
                  counts[service.id] || 0,

              })
            )

          );

        } catch (error) {

          console.warn(
            'Failed to fetch offer counts:',
            error
          );

        } finally {

          setLoading(false);

        }

      };


    fetchCampaigns();

  }, []);


  /* ==========================================================
     SEARCH
  ========================================================== */

  const filteredCategories =
    categories.filter(
      (category) =>
        category.title
          .toLowerCase()
          .includes(
            searchQuery
              .toLowerCase()
              .trim()
          )
    );


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const handleCategoryPress =
    (category) => {

      navigation.navigate(
        'DiscoveryFeed',
        {
          selectedCategoryId:
            category.id,
        }
      );

    };


  /* ==========================================================
     LOADING STATE
  ========================================================== */

  const renderLoading = () => (

    <View
      style={styles.loadingContainer}
    >

      <View
        style={[
          styles.loadingIconContainer,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >

        <ActivityIndicator
          size="small"
          color={colors.primary}
        />

      </View>


      <Text
        style={[
          styles.loadingText,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        Loading categories...
      </Text>

    </View>

  );


  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  const renderEmpty = () => (

    <View
      style={styles.emptyContainer}
    >

      <View
        style={[
          styles.emptyIconContainer,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >

        <Ionicons
          name="search-outline"
          size={32}
          color={colors.emptyIcon}
        />

      </View>


      <Text
        style={[
          styles.emptyText,
          {
            color:
              colors.text,
          },
        ]}
      >
        No categories found
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
        Try adjusting your search query
      </Text>

    </View>

  );


  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (

    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >

      {/* ======================================================
          DECORATIVE BACKGROUND
      ====================================================== */}

      <View
        pointerEvents="none"
        style={[
          styles.bgOrbOne,
          {
            backgroundColor:
              colors.orbOne,
          },
        ]}
      />


      <View
        pointerEvents="none"
        style={[
          styles.bgOrbTwo,
          {
            backgroundColor:
              colors.orbTwo,
          },
        ]}
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <LinearGradient
        colors={[
          colors.headerStart,
          colors.headerMiddle,
          colors.headerEnd,
        ]}
        style={styles.headerGradient}
      >

        <View
          style={styles.headerRow}
        >

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={[
              styles.backButton,
              {
                backgroundColor:
                  colors.surface,

                borderColor:
                  colors.border,
              },
            ]}
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color={
                colors.primaryStrong
              }
            />

          </Pressable>


          <View
            style={
              styles.headerTextContainer
            }
          >

            <Text
              style={[
                styles.title,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              All Categories
            </Text>


            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
              numberOfLines={2}
            >
              Explore businesses and offers
              across every category.
            </Text>

          </View>

        </View>

      </LinearGradient>


      {/* ======================================================
          SEARCH BAR
      ====================================================== */}

      <View
        style={
          styles.searchBarContainer
        }
      >

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor:
                colors.searchBackground,

              borderColor:
                colors.border,

              shadowOpacity:
                isDarkMode ? 0 : 0.05,

              elevation:
                isDarkMode ? 0 : 2,
            },
          ]}
        >

          <Ionicons
            name="search"
            size={22}
            color={colors.primary}
          />


          <TextInput
            value={searchQuery}
            onChangeText={
              setSearchQuery
            }
            placeholder="Search categories..."
            placeholderTextColor={
              colors.textMuted
            }
            style={[
              styles.searchInput,
              {
                color:
                  colors.text,
              },
            ]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />


          {searchQuery.length > 0 && (

            <Pressable
              onPress={() =>
                setSearchQuery('')
              }
              style={
                styles.clearButton
              }
              hitSlop={8}
            >

              <Ionicons
                name="close-circle"
                size={19}
                color={
                  colors.textMuted
                }
              />

            </Pressable>

          )}

        </View>

      </View>


      {/* ======================================================
          CATEGORY GRID
      ====================================================== */}

      <Animated.View
        style={[
          styles.gridContainer,
          {
            opacity:
              fadeAnim,
          },
        ]}
      >

        {loading

          ? (

            renderLoading()

          )

          : filteredCategories.length === 0

          ? (

            renderEmpty()

          )

          : (

            <FlatList

              data={
                filteredCategories
              }

              keyExtractor={
                (item) => item.id
              }

              numColumns={3}

              renderItem={({
                item,
              }) => (

                <CategoryCard
                  item={item}
                  colors={colors}
                  isDarkMode={
                    isDarkMode
                  }
                  onPress={() =>
                    handleCategoryPress(
                      item
                    )
                  }
                />

              )}

              columnWrapperStyle={
                styles.columnWrapper
              }

              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom:
                    28,
                },
              ]}

              showsVerticalScrollIndicator={
                false
              }

              keyboardShouldPersistTaps="handled"

              removeClippedSubviews={
                true
              }

            />

          )}

      </Animated.View>

    </SafeAreaView>

  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
     CONTAINER
  ========================================================== */

  container: {
    flex: 1,
  },


  /* ==========================================================
     BACKGROUND
  ========================================================== */

  bgOrbOne: {
    position: 'absolute',

    width: 240,
    height: 240,

    borderRadius: 120,

    top: -100,
    left: -120,

    opacity: 0.38,
  },


  bgOrbTwo: {
    position: 'absolute',

    width: 280,
    height: 280,

    borderRadius: 140,

    right: -150,
    bottom: -100,

    opacity: 0.32,
  },


  /* ==========================================================
     HEADER
  ========================================================== */

  headerGradient: {
    paddingTop: 8,
    paddingBottom: 16,
  },


  headerRow: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal:
      HORIZONTAL_PADDING,
  },


  backButton: {
    width: 46,
    height: 46,

    borderRadius: 23,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,

    marginRight: 12,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowRadius: 6,

    shadowOpacity: 0.05,
  },


  headerTextContainer: {
    flex: 1,

    justifyContent: 'center',

    paddingRight: 5,
  },


  title: {
    fontSize: 25,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    letterSpacing: -0.5,
  },


  subtitle: {
    fontSize: 13,

    lineHeight: 18,

    marginTop: 3,

    paddingRight: 4,
  },


  /* ==========================================================
     SEARCH
  ========================================================== */

  searchBarContainer: {
    paddingHorizontal:
      HORIZONTAL_PADDING,

    marginTop: 6,

    marginBottom: 10,
  },


  searchBar: {
    height: 54,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 17,

    borderWidth: 1,

    paddingHorizontal: 15,
  },


  searchInput: {
    flex: 1,

    height: '100%',

    fontSize: 15,

    fontWeight: '500',

    paddingHorizontal: 11,

    paddingVertical: 0,
  },


  clearButton: {
    width: 30,
    height: 30,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     GRID
  ========================================================== */

  gridContainer: {
    flex: 1,
  },


  listContent: {
    paddingHorizontal:
      HORIZONTAL_PADDING,

    paddingTop: 4,
  },


  columnWrapper: {
    justifyContent:
      'space-between',

    marginBottom:
      COLUMN_GAP,
  },


  /* ==========================================================
     CATEGORY CARD
  ========================================================== */

  cardContainer: {
    height: 174,

    borderRadius: 19,

    borderWidth: 1,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowRadius: 8,
  },


  cardPressable: {
    flex: 1,

    alignItems: 'center',

    justifyContent:
      'flex-start',

    paddingHorizontal: 7,

    paddingTop: 13,

    paddingBottom: 11,
  },


  /* ==========================================================
     ICON
  ========================================================== */

  iconContainer: {
    width: 58,
    height: 58,

    borderRadius: 17,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,

    marginBottom: 9,
  },


  iconImage: {
    width: 41,
    height: 41,

    resizeMode: 'contain',
  },


  /* ==========================================================
     TITLE
  ========================================================== */

  cardTitle: {
    width: '100%',

    minHeight: 34,

    fontSize: 12,

    lineHeight: 16,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    textAlign: 'center',

    textAlignVertical:
      'center',

    marginBottom: 8,
  },


  /* ==========================================================
     ACTIVE BADGE
  ========================================================== */

  badge: {
    height: 25,

    minWidth: 67,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 8,

    borderRadius: 12,
  },


  badgeDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    marginRight: 5,
  },


  badgeText: {
    fontSize: 9.5,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    lineHeight: 12,
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingBottom: 70,
  },


  loadingIconContainer: {
    width: 52,
    height: 52,

    borderRadius: 17,

    alignItems: 'center',
    justifyContent: 'center',
  },


  loadingText: {
    marginTop: 10,

    fontSize:
      FONT_SIZES.SM,

    fontWeight: '500',
  },


  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,

    paddingBottom: 70,
  },


  emptyIconContainer: {
    width: 70,
    height: 70,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 15,
  },


  emptyText: {
    fontSize: 18,

    fontWeight:
      FONT_WEIGHTS.BOLD,

    textAlign: 'center',
  },


  emptySubtext: {
    fontSize: 13,

    marginTop: 6,

    textAlign: 'center',
  },

});