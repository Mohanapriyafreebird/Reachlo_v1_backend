import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SELLER_LIGHT_THEME,
  SELLER_DARK_THEME,
  BUYER_LIGHT_THEME,
  BUYER_DARK_THEME,
} from '../constants/theme';
import { AuthContext } from './AuthContext';

// ─── AsyncStorage keys (separate per role) ─────────────────────────────────────
const SELLER_DARK_KEY = 'reachlo_seller_dark_mode';
const BUYER_DARK_KEY = 'reachlo_buyer_dark_mode';

// ─── Context ───────────────────────────────────────────────────────────────────
export const ThemeContext = createContext({
  // Seller
  isSellerDarkMode: false,
  sellerTheme: SELLER_LIGHT_THEME,
  toggleSellerDark: () => {},

  // Buyer
  isBuyerDarkMode: false,
  buyerTheme: BUYER_LIGHT_THEME,
  toggleBuyerDark: () => {},
  getRoleTheme: () => ({
    theme: BUYER_LIGHT_THEME,
    isDarkMode: false,
    toggleDarkMode: () => {},
  }),

  // ── Backward-compat aliases (map to seller) ──────────────────────────────
  isDarkMode: false,
  theme: SELLER_LIGHT_THEME,
  toggleDarkMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isSellerDark, setIsSellerDark] = useState(false);
  const [isBuyerDark, setIsBuyerDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const auth = useContext(AuthContext);
  const userRole = auth?.role || auth?.user?.role;
  
  // Load both persisted preferences on app start
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const [sellerSaved, buyerSaved] = await Promise.all([
          AsyncStorage.getItem(SELLER_DARK_KEY),
          AsyncStorage.getItem(BUYER_DARK_KEY),
        ]);
        if (sellerSaved === 'true') setIsSellerDark(true);
        if (buyerSaved === 'true') setIsBuyerDark(true);
      } catch (e) {
        console.warn('Failed to load theme preferences', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemes();
  }, []);

  // Seller dark mode toggle
  const toggleSellerDark = async () => {
    const next = !isSellerDark;
    setIsSellerDark(next);
    try {
      await AsyncStorage.setItem(SELLER_DARK_KEY, next ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save seller theme', e);
    }
  };

  const toggleBuyerDark = async () => {
    const next = !isBuyerDark;
    setIsBuyerDark(next);
    try {
      await AsyncStorage.setItem(BUYER_DARK_KEY, next ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save buyer theme', e);
    }
  };

  const sellerTheme = isSellerDark ? SELLER_DARK_THEME : SELLER_LIGHT_THEME;
  const buyerTheme = isBuyerDark ? BUYER_DARK_THEME : BUYER_LIGHT_THEME;

  const getRoleTheme = (roleOverride) => {
    const normalizedRole = String(roleOverride || userRole || '').toUpperCase();

    if (normalizedRole === 'SELLER') {
      return {
        theme: sellerTheme,
        isDarkMode: isSellerDark,
        toggleDarkMode: toggleSellerDark,
      };
    }

    return {
      theme: buyerTheme,
      isDarkMode: isBuyerDark,
      toggleDarkMode: toggleBuyerDark,
    };
  };

  // Don't render children until preferences are loaded (avoids flash)
  if (!isLoaded) return null;
  
  // Resolve active theme based on user role
  const activeRoleTheme = getRoleTheme(userRole === 'SELLER' ? 'SELLER' : 'BUYER');

  const value = {
    // Seller
    isSellerDarkMode: isSellerDark,
    sellerTheme,
    toggleSellerDark,

    // Buyer
    isBuyerDarkMode: isBuyerDark,
    buyerTheme,
    toggleBuyerDark,
    getRoleTheme,

    // ── Backward-compat aliases → resolved dynamically based on role!
    isDarkMode: activeRoleTheme.isDarkMode,
    theme: activeRoleTheme.theme,
    toggleDarkMode: activeRoleTheme.toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const useRoleTheme = (roleOverride) => {
  const themeContext = useTheme();
  return themeContext.getRoleTheme(roleOverride);
};
