import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import BuyerLoginScreen from '../screens/BuyerLoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SellerRegisterStep1Screen from '../screens/SellerRegisterStep1Screen';
import SellerRegisterStep2Screen from '../screens/SellerRegisterStep2Screen';
import SellerDashboardScreen from '../screens/placeholders/SellerDashboardScreen';
import DiscoveryFeedScreen from '../screens/placeholders/DiscoveryFeedScreen';
import AdminDashboardScreen from '../screens/placeholders/AdminDashboardScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import SellerProfileScreen from '../screens/placeholders/SellerProfileScreen';
import SellerEditProfileScreen from '../screens/placeholders/SellerEditProfileScreen';
import SellerEditBusinessScreen from '../screens/placeholders/SellerEditBusinessScreen';
import SellerChangePasswordScreen from '../screens/placeholders/SellerChangePasswordScreen';
import AICampaignGenerateScreen from '../screens/placeholders/AICampaignGenerateScreen';
import AIDraftReviewScreen from '../screens/placeholders/AIDraftReviewScreen';
import ChatScreen from '../screens/placeholders/ChatScreen';
import SellerMessagesScreen from '../screens/placeholders/SellerMessagesScreen';
import BuyerInboxScreen from '../screens/placeholders/BuyerInboxScreen';
import AllCategoriesScreen from '../screens/placeholders/AllCategoriesScreen';
import AboutScreen from '../screens/AboutScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import SellerAnalyticsScreen from '../screens/SellerAnalyticsScreen';
import SellerWalletScreen from '../screens/SellerWalletScreen';
import SellerSettingsScreen from '../screens/SellerSettingsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      {/* Entry Screen */}
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }}
      />

      {/* Landing */}
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }}
      />

      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="BuyerLogin"
        component={BuyerLoginScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      {/* Buyer registration (unchanged) */}
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      {/* Seller two-step registration — Step 1 & Step 2 */}
      <Stack.Screen
        name="SellerRegisterStep1"
        component={SellerRegisterStep1Screen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerRegisterStep2"
        component={SellerRegisterStep2Screen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />

      {/* Main Dashboards */}
      <Stack.Screen
        name="SellerDashboard"
        component={SellerDashboardScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }}
      />
      <Stack.Screen
        name="DiscoveryFeed"
        component={DiscoveryFeedScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }}
      />
      {/* Admin */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }}
      />

      {/* Other App Screens */}
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="OtpVerification"
        component={OtpVerificationScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerProfile"
        component={SellerProfileScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerEditProfile"
        component={SellerEditProfileScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerEditBusiness"
        component={SellerEditBusinessScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerChangePasswordScreen"
        component={SellerChangePasswordScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerSettings"
        component={SellerSettingsScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerAnalytics"
        component={SellerAnalyticsScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerWallet"
        component={SellerWalletScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />

      {/* New AI Generation Flow */}
      <Stack.Screen
        name="AICampaignGenerate"
        component={AICampaignGenerateScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }}
      />
      <Stack.Screen
        name="AIDraftReview"
        component={AIDraftReviewScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />

      {/* Chat Screens */}
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="SellerMessages"
        component={SellerMessagesScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="BuyerInbox"
        component={BuyerInboxScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="AllCategories"
        component={AllCategoriesScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />

      {/* New Static & Support Screens */}
      <Stack.Screen
        name="AboutReachlo"
        component={AboutScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }}
      />
    </Stack.Navigator>
  );
}
