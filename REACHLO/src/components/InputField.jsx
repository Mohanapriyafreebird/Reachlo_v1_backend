import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';

const InputField = React.forwardRef(({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true,
  theme: themeVariant = 'buyer',
  leftElement,
  secureTextEntry,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  ...props
}, ref) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = error
    ? theme.error
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          theme.inputBorder,
          theme.borderFocus
        ],
      });

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <Animated.View style={[
        styles.inputContainer,
        { borderColor, backgroundColor: theme.inputBackground },
        !editable && styles.disabledContainer
      ]}>
        {leftElement && (
          <View style={styles.leftContainer}>
            {leftElement}
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          </View>
        )}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          secureTextEntry={secureTextEntry}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            { color: theme.inputText },
            !editable && { color: theme.textSecondary },
            props.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 14, paddingBottom: 14 }
          ]}
          {...props}
        />
      </Animated.View>
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
});

InputField.displayName = 'InputField';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  disabledContainer: {
    opacity: 0.8,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  separator: {
    width: 1,
    height: 20,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.REGULAR,
    padding: 0,
  },
  errorText: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.REGULAR,
    marginTop: 4,
  },
});

export default InputField;
