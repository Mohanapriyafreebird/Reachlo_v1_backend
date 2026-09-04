import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'filled',
  theme: themeVariant = 'buyer',
  style,
  textStyle,
  ...props
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isPressing = useRef(false);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePress = (e) => {
    if (isPressing.current || isButtonDisabled) return;
    isPressing.current = true;
    if (onPress) {
      onPress(e);
    }
    setTimeout(() => {
      isPressing.current = false;
    }, 500);
  };

  const isButtonDisabled = disabled || loading;

  const getButtonStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.outlined;
      case 'text':
        return styles.textVariant;
      case 'filled':
      default:
        return styles.filled;
    }
  };

  const getPrimaryColor = () => themeVariant === 'seller' ? theme.sellerPrimary : theme.buyerPrimary;
  const getGradientColors = () => themeVariant === 'seller' ? [theme.sellerPrimaryLight, theme.sellerPrimary] : [theme.buyerPrimaryLight, theme.buyerPrimary];
  const getShadowColor = () => themeVariant === 'seller' ? theme.sellerPrimary : theme.buyerPrimary;

  const getTextColor = () => {
    if (variant === 'filled') return theme.textInverted || '#FFFFFF';
    return getPrimaryColor();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isButtonDisabled}
      style={({ pressed }) => [
        styles.base,
        getButtonStyle(),
        variant === 'filled' && { shadowColor: getShadowColor() },
        variant === 'outlined' && { borderColor: getPrimaryColor() },
        isButtonDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
    >
      {variant === 'filled' ? (
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.contentContainer, { borderRadius: 12 }]}
        >
          <Animated.View style={[styles.innerContent, { transform: [{ scale: scaleAnim }] }]}>
            {loading ? (
              <ActivityIndicator color={theme.textInverted || '#FFFFFF'} size="small" />
            ) : (
              <Text style={[styles.btnText, { color: theme.textInverted || '#FFFFFF' }, textStyle]}>
                {title}
              </Text>
            )}
          </Animated.View>
        </LinearGradient>
      ) : (
        <Animated.View style={[styles.contentContainer, { transform: [{ scale: scaleAnim }] }]}>
          {loading ? (
            <ActivityIndicator
              color={getPrimaryColor()}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.btnText,
                { color: getTextColor() },
                variant === 'text' && styles.textVariantText,
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  filled: {
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  textVariant: {
    backgroundColor: 'transparent',
    height: 'auto',
    width: 'auto',
    padding: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  contentContainer: {
    width: '100%',
    height: '100%',
  },
  innerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  btnText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    textAlign: 'center',
  },
  textVariantText: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
});
