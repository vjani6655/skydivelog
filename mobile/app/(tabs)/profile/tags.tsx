import { View, Text, StyleSheet } from 'react-native';

export default function TagsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Tag management coming soon.{'\n'}You&apos;ll be able to tag jumps with custom labels (e.g. AFF, freefly, tracking, wingsuit).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
