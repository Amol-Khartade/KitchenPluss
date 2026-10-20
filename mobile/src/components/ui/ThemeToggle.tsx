// ============================================================
// KitchenPulse Mobile — Tactile Neumorphic Theme Toggle
// Smooth spring-animated switch between Light and Dark mode
// ============================================================

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../store/useThemeStore';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { isDark, toggleTheme, colors } = useTheme();

  // 0 = Light (Sun on left), 1 = Dark (Moon on right)
  const offset = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    offset.value = withSpring(isDark ? 1 : 0, {
      damping: 15,
      stiffness: 180,
    });
  }, [isDark]);

  const thumbTranslateX = useAnimatedStyle(() => {
    const travelDistance = compact ? 22 : 28;
    return {
      transform: [{ translateX: offset.value * travelDistance }],
    };
  });

  const width = compact ? 52 : 64;
  const height = compact ? 28 : 34;
  const thumbSize = compact ? 22 : 26;

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      style={[
        styles.track,
        {
          width,
          height,
          backgroundColor: colors.sunken,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Background Icons */}
      <View style={[styles.iconRow, { paddingHorizontal: compact ? 4 : 6 }]}>
        <Text style={[styles.iconText, { fontSize: compact ? 11 : 13 }]}>☀️</Text>
        <Text style={[styles.iconText, { fontSize: compact ? 11 : 13 }]}>🌙</Text>
      </View>

      {/* Sliding Tactile Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(217, 119, 6, 0.4)',
          },
          colors.shadowRaisedSm,
          thumbTranslateX,
        ]}
      >
        <Text style={{ fontSize: compact ? 10 : 12 }}>
          {isDark ? '🌙' : '☀️'}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    padding: 2,
    position: 'relative',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  iconText: {
    opacity: 0.65,
  },
  thumb: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
