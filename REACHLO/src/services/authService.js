import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';

const TOKEN_KEY = 'reachlo_token';
const ROLE_KEY = 'reachlo_role';
const USER_KEY = 'reachlo_user_details';

export const authService = {
  register: async ({
    name, email, phone, city, area, password, role, company_name,
    // Seller-specific fields (Step 2 of seller registration)
    business_description, usp, location_address, latitude, longitude,
  }) => {
    // One combined API call with both Step 1 + Step 2 data.
    // Never sent as two separate calls — avoids orphaned half-created accounts.
    const response = await apiService.post('/auth/register', {
      name,
      email,
      phone,
      password,
      role,
      city,
      area,
      ...(company_name ? { company_name } : {}),
      // business_description: what the business provides — stored in businesses.business_description
      // NOT the same as campaign description which is per-campaign marketing copy
      ...(business_description ? { business_description } : {}),
      ...(usp ? { usp } : {}),
      ...(location_address ? { location_address } : {}),
      ...(latitude !== undefined && latitude !== null ? { latitude } : {}),
      ...(longitude !== undefined && longitude !== null ? { longitude } : {}),
    });

    // Save access token, role, and user details in AsyncStorage
    const { access_token, user } = response;
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(ROLE_KEY, response.role);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      token: access_token,
      role: response.role,
      user,
    };
  },

  login: async ({ email, password, requested_role }) => {
    // Send login request to the backend
    const payload = { email, password };
    if (requested_role) {
      payload.requested_role = requested_role;
    }
    const response = await apiService.post('/auth/login', payload);

    // Save access token, role, and user details in AsyncStorage
    const { access_token, user } = response;
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(ROLE_KEY, response.role);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      token: access_token,
      role: response.role,
      user,
    };
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },

  getToken: async () => {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  getRole: async () => {
    return await AsyncStorage.getItem(ROLE_KEY);
  },

  getUserDetails: async () => {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  /* =========================================================
     PASSWORD RESET — OTP FLOW
     Three-step: request OTP → verify OTP → reset password
     NOTE: OTP and reset tokens are NEVER persisted to storage.
     ========================================================= */

  // Step 1: Send OTP to the provided email.
  // Backend: POST /auth/request-password-reset
  // Body: { email }
  // Response: { message } — backend sends OTP via email
  requestPasswordReset: async (email) => {
    return await apiService.post('/auth/request-password-reset', {
      email: email.trim().toLowerCase(),
    });
  },

  // Step 2: Verify the OTP entered by the user.
  // Backend: POST /auth/verify-reset-otp
  // Body: { email, otp }
  // Response: { reset_token } — short-lived token needed to reset the password
  verifyResetOtp: async (email, otp) => {
    return await apiService.post('/auth/verify-reset-otp', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
  },

  // Step 3: Reset the password using the verified reset token.
  // Backend: POST /auth/reset-password
  // Body: { email, reset_token, new_password }
  // Response: { message }
  resetPassword: async (email, resetToken, newPassword) => {
    return await apiService.post('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      reset_token: resetToken,
      new_password: newPassword,
    });
  },
};

export default authService;
