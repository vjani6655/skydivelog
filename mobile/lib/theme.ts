/**
 * useColors — returns the correct color palette for the current theme.
 *
 * Usage in any component:
 *   const colors = useColors();
 *
 * Colors react to changes from UserPrefsProvider (dark / light / system).
 * StyleSheet.create blocks that reference `colors` must be wrapped in
 * useMemo(() => StyleSheet.create({...}), [colors]) inside the component.
 */
import { useColorScheme } from 'react-native';
import { usePrefs } from '@/lib/prefsContext';
import { darkColors, lightColors, type ColorSet } from '@/constants/tokens';

export function useColors(): ColorSet {
  const { prefs } = usePrefs();
  const systemScheme = useColorScheme();

  const scheme =
    prefs.theme === 'system'
      ? (systemScheme ?? 'dark')
      : prefs.theme;

  return scheme === 'light' ? lightColors : darkColors;
}
