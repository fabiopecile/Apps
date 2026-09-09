import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.red} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
