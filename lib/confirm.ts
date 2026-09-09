import { Alert, Platform } from 'react-native';

// Alert.alert() with a button array is a no-op on react-native-web, so any
// confirm-before-delete flow silently did nothing in the web preview. This
// falls back to the browser's native confirm() there instead.
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
