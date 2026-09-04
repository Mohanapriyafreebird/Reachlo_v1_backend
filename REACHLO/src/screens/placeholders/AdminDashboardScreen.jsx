import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const { theme, isDarkMode } = useTheme();
  const { role, logout } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Admin Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Role: {role}</Text>
        <PrimaryButton
          title="Logout"
          onPress={logout}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    maxWidth: 200,
  },
});
