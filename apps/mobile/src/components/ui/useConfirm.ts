import { Alert } from 'react-native';

// Promise-based wrapper around Alert.alert, mirroring the web app's
// `confirm('...')` usage for delete confirmations.
export function useConfirm() {
  return function confirm(message: string, confirmLabel = 'Delete'): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert('Are you sure?', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };
}
