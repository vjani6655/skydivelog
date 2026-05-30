import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/lib/theme';
import { spacing, radii } from '@/constants/tokens';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
}

interface Props {
  announcement: AnnouncementItem;
  onDismiss: (id: string) => void;
}

export default function AnnouncementBanner({ announcement, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [announcement.id]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(announcement.id));
  };

  const handlePress = () => {
    if (announcement.deep_link) {
      dismiss();
      setTimeout(() => router.push(announcement.deep_link as any), 250);
    } else {
      dismiss();
    }
  };

  const styles = StyleSheet.create({
    wrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      paddingHorizontal: spacing[4],
      paddingTop: insets.top + spacing[2],
    },
    card: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.sky + '50',
      borderRadius: radii.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: spacing[3],
      gap: spacing[3],
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: radii.full,
      backgroundColor: colors.sky + '18',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    content: {
      flex: 1,
    },
    title: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 13,
      color: colors.fg,
      marginBottom: 2,
    },
    body: {
      fontFamily: 'InterTight-Regular',
      fontSize: 12,
      color: colors.fg2,
      lineHeight: 17,
    },
    closeBtn: {
      padding: 2,
      flexShrink: 0,
    },
  });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }], opacity }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={announcement.deep_link ? 0.75 : 1}
      >
        <View style={styles.icon}>
          <Ionicons name="megaphone-outline" size={16} color={colors.sky} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{announcement.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{announcement.body}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.fg3} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}
