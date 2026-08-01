import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { reset } from '../navigation/navigationRef';
import { registerForPushNotificationsAsync } from '../services/pushRegistration';

export const AuthContext = createContext({
  user: null,
  role: null,
  token: null,
  isLoading: true,
  login: async (email, password) => {},
  register: async (userData) => {},
  logout: async () => {},
  updateUserProfile: (newDetails) => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await authService.getToken();
        const storedRole = await authService.getRole();
        const storedUser = await authService.getUserDetails();
        if (storedToken && storedRole && storedUser) {
          setToken(storedToken);
          setRole(storedRole);
          setUser(storedUser);
          // Register for push notifications since we have a logged-in user
          registerForPushNotificationsAsync();
        }
      } catch (e) {
        console.error('Failed to load auth data', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email, password, requested_role) => {
    const response = await authService.login({ email, password, requested_role });
    setToken(response.token);
    setRole(response.role);
    setUser(response.user);
    // Register push token after explicit login
    registerForPushNotificationsAsync();
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    setToken(response.token);
    setRole(response.role);
    setUser(response.user);
    // Register push token after explicit register
    registerForPushNotificationsAsync();
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setRole(null);
    setUser(null);
    reset('Splash');
  };


  const clearAuth = async () => {
    await authService.logout();
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const updateUserProfile = (newDetails) => {
    setUser(prev => prev ? { ...prev, ...newDetails } : prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        login,
        register,
        logout,
        clearAuth,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
