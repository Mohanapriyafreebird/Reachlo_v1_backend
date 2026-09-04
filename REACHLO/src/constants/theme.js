// Centralized theme tokens for REACHLO
// Seller = Purple palette | Buyer = Blue palette
// Each role has independent Light and Dark themes

// ─── SELLER LIGHT THEME (Purple) ──────────────────────────────────────────────
export const SELLER_LIGHT_THEME = {
  isDark: false,
  role: 'seller',

  // Backgrounds
  background: '#FAF9FF',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceSecondary: '#F3F0FF',

  // Text — high contrast on light purple surfaces
  text: '#1E0B44',
  textSecondary: '#5B4E79',
  textTertiary: '#9E8FBE',
  textInverted: '#FFFFFF',

  // Borders & Dividers
  border: '#DDD6FE',
  borderFocus: '#7C3AED',
  divider: '#EDE9FE',

  // Input Fields
  inputBackground: '#FFFFFF',
  inputBorder: '#DDD6FE',
  inputText: '#1E0B44',
  inputPlaceholder: '#9E8FBE',

  // Navigation
  navBackground: 'rgba(255,255,255,0.92)',
  navBorder: 'rgba(221,214,254,0.8)',
  navTabActive: '#7C3AED',
  navTabInactive: '#9E8FBE',

  // Cards
  cardBackground: '#FFFFFF',
  cardBorder: '#EDE9FE',
  cardShadow: 'rgba(124,58,237,0.08)',

  // Status
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',

  // Seller Brand
  sellerPrimary: '#7C3AED',
  sellerPrimaryDark: '#5B21B6',
  sellerPrimaryLight: '#8B5CF6',
  sellerSurface: '#EDE9FE',
  sellerGradient: ['#8B5CF6', '#7C3AED'],
  sellerGradientLight: ['#A78BFA', '#8B5CF6'],

  // Buyer Brand (used when seller screens reference buyer colors)
  buyerPrimary: '#2563EB',
  buyerPrimaryLight: '#3B82F6',

  // Overlay/Modal
  overlay: 'rgba(30,11,68,0.5)',
  modalBackground: '#FFFFFF',

  // Misc
  iconColor: '#5B4E79',
  placeholder: '#9E8FBE',
  switchThumb: '#FFFFFF',
  switchTrackActive: '#7C3AED',
  switchTrackInactive: '#C4B5FD',
};

// ─── SELLER DARK THEME (Deep Navy) ───────────────────────────────────────────
export const SELLER_DARK_THEME = {
  isDark: true,
  role: 'seller',

  // Backgrounds — deep navy (as specified by user)
  background: '#070B16',
  surface: '#111A2D',
  surfaceCard: '#182542',
  surfaceSecondary: '#1E2D4A',

  // Text — high contrast on dark navy surfaces
  text: '#F8FAFF',
  textSecondary: '#AAB6CC',
  textTertiary: '#6A7A94',
  textInverted: '#070B16',

  // Borders & Dividers
  border: 'rgba(255,255,255,0.12)',
  borderFocus: '#5B8CFF',
  divider: 'rgba(255,255,255,0.08)',

  // Input Fields
  inputBackground: '#182542',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputText: '#F8FAFF',
  inputPlaceholder: '#6A7A94',

  // Navigation
  navBackground: 'rgba(7,11,22,0.97)',
  navBorder: 'rgba(255,255,255,0.08)',
  navTabActive: '#5B8CFF',
  navTabInactive: '#6A7A94',

  // Cards
  cardBackground: '#111A2D',
  cardBorder: 'rgba(255,255,255,0.10)',
  cardShadow: 'rgba(0,0,0,0.5)',

  // Status
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',

  // Seller Brand — keep violet accent for brand identity
  sellerPrimary: '#7C3AED',
  sellerPrimaryDark: '#5B21B6',
  sellerPrimaryLight: '#A78BFA',
  sellerSurface: 'rgba(124,58,237,0.14)',
  sellerGradient: ['#A78BFA', '#7C3AED'],
  sellerGradientLight: ['#C4B5FD', '#A78BFA'],

  // Buyer Brand
  buyerPrimary: '#5B8CFF',
  buyerPrimaryLight: '#93C5FD',

  // Overlay/Modal
  overlay: 'rgba(0,0,0,0.8)',
  modalBackground: '#111A2D',

  // Misc
  iconColor: '#AAB6CC',
  placeholder: '#6A7A94',
  switchThumb: '#FFFFFF',
  switchTrackActive: '#5B8CFF',
  switchTrackInactive: 'rgba(255,255,255,0.12)',
};

// ─── BUYER LIGHT THEME (Blue) ──────────────────────────────────────────────────
export const BUYER_LIGHT_THEME = {
  isDark: false,
  role: 'buyer',

  // Backgrounds
  background: '#F0F7FF',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceSecondary: '#E0F2FE',

  // Text — high contrast on light blue surfaces
  text: '#0C1E45',
  textSecondary: '#334E88',
  textTertiary: '#6B85B5',
  textInverted: '#FFFFFF',

  // Borders & Dividers
  border: '#BAE6FD',
  borderFocus: '#2563EB',
  divider: '#DBEAFE',

  // Input Fields
  inputBackground: '#FFFFFF',
  inputBorder: '#BAE6FD',
  inputText: '#0C1E45',
  inputPlaceholder: '#6B85B5',

  // Navigation
  navBackground: 'rgba(255,255,255,0.92)',
  navBorder: 'rgba(186,230,253,0.8)',
  navTabActive: '#2563EB',
  navTabInactive: '#6B85B5',

  // Cards
  cardBackground: '#FFFFFF',
  cardBorder: '#DBEAFE',
  cardShadow: 'rgba(37,99,235,0.08)',

  // Status
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',

  // Buyer Brand
  buyerPrimary: '#2563EB',
  buyerPrimaryDark: '#1D4ED8',
  buyerPrimaryLight: '#3B82F6',
  buyerSurface: '#DBEAFE',
  buyerGradient: ['#3B82F6', '#2563EB'],
  buyerGradientLight: ['#60A5FA', '#3B82F6'],

  // Seller Brand (used when buyer screens reference seller colors)
  sellerPrimary: '#7C3AED',
  sellerPrimaryLight: '#8B5CF6',
  sellerSurface: '#EDE9FE',

  // Overlay/Modal
  overlay: 'rgba(12,30,69,0.5)',
  modalBackground: '#FFFFFF',

  // Misc
  iconColor: '#334E88',
  placeholder: '#6B85B5',
  switchThumb: '#FFFFFF',
  switchTrackActive: '#2563EB',
  switchTrackInactive: '#BFDBFE',
};

// ─── BUYER DARK THEME (Deep Blue) ─────────────────────────────────────────────
export const BUYER_DARK_THEME = {
  isDark: true,
  role: 'buyer',

  // Backgrounds — deep dark with blue tint
  background: '#070D1A',
  surface: '#0F1E35',
  surfaceCard: '#142340',
  surfaceSecondary: '#152A4A',

  // Text — high contrast on dark blue surfaces
  text: '#EFF6FF',
  textSecondary: '#93C5FD',
  textTertiary: '#4B7AB5',
  textInverted: '#070D1A',

  // Borders & Dividers
  border: '#1E3A5F',
  borderFocus: '#60A5FA',
  divider: '#152A4A',

  // Input Fields
  inputBackground: '#0F1E35',
  inputBorder: '#1E3A5F',
  inputText: '#EFF6FF',
  inputPlaceholder: '#4B7AB5',

  // Navigation
  navBackground: 'rgba(7,13,26,0.97)',
  navBorder: 'rgba(30,58,95,0.8)',
  navTabActive: '#60A5FA',
  navTabInactive: '#4B7AB5',

  // Cards
  cardBackground: '#142340',
  cardBorder: '#1E3A5F',
  cardShadow: 'rgba(0,0,0,0.5)',

  // Status
  success: '#22C55E',
  error: '#F87171',
  warning: '#FBBF24',

  // Buyer Brand — bright blue for dark mode
  buyerPrimary: '#60A5FA',
  buyerPrimaryDark: '#3B82F6',
  buyerPrimaryLight: '#93C5FD',
  buyerSurface: 'rgba(96,165,250,0.14)',
  buyerGradient: ['#93C5FD', '#60A5FA'],
  buyerGradientLight: ['#BFDBFE', '#93C5FD'],

  // Seller Brand
  sellerPrimary: '#A78BFA',
  sellerPrimaryLight: '#C4B5FD',
  sellerSurface: 'rgba(167,139,250,0.14)',

  // Overlay/Modal
  overlay: 'rgba(0,0,0,0.8)',
  modalBackground: '#0F1E35',

  // Misc
  iconColor: '#93C5FD',
  placeholder: '#4B7AB5',
  switchThumb: '#FFFFFF',
  switchTrackActive: '#3B82F6',
  switchTrackInactive: '#1E3A5F',
};

// ─── Backward-compat aliases ───────────────────────────────────────────────────
// These map to seller themes so legacy code that imports LIGHT_THEME/DARK_THEME still works
export const LIGHT_THEME = SELLER_LIGHT_THEME;
export const DARK_THEME = SELLER_DARK_THEME;
