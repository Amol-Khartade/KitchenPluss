// ============================================================
// KitchenPulse Mobile — Tactile Neumorphic Button
// Spring physics press response, raised/sunken/gradient styles
// ============================================================

import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../store/useThemeStore';

interface TactileButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'raised' | 'sunken' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  onPress,
  title,
  children,
  variant = 'raised',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 12, stiffness: 220 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  // Base dimensions by size
  const paddingVertical = size === 'sm' ? 6 : size === 'lg' ? 14 : 10;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  // Determine variant styling
  let buttonBg = colors.card;
  let textColor = colors.textPrimary;
  let borderColor = colors.border;
  let shadowStyle = colors.shadowRaisedSm;

  if (variant === 'primary') {
    buttonBg = colors.accentSky;
    textColor = '#FFFFFF';
    borderColor = 'rgba(255, 255, 255, 0.25)';
    shadowStyle = colors.shadowRaised;
  } else if (variant === 'danger') {
    buttonBg = colors.accentRose;
    textColor = '#FFFFFF';
    borderColor = 'rgba(255, 255, 255, 0.25)';
  } else if (variant === 'success') {
    buttonBg = colors.accentEmerald;
    textColor = '#FFFFFF';
    borderColor = 'rgba(255, 255, 255, 0.25)';
  } else if (variant === 'sunken') {
    buttonBg = colors.sunken;
    textColor = colors.textSecondary;
    borderColor = colors.border;
    shadowStyle = {};
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          styles.button,
          {
            paddingVertical,
            paddingHorizontal,
            backgroundColor: buttonBg,
            borderColor,
          },
          shadowStyle,
          animatedStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : children ? (
          children
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize, color: textColor },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
