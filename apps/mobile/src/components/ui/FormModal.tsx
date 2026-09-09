import type { PropsWithChildren } from 'react';
import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

export function FormModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}>) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-slate-900/40"
      >
        <View className="max-h-[90%] rounded-t-3xl bg-white p-6">
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-4">
            <View>
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              {subtitle ? <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} className="rounded-lg p-1">
              <X size={20} color="#94a3b8" />
            </Pressable>
          </View>
          <ScrollView className="mt-4" contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
