import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddCardScreen() {
  const router = useRouter();
  const [cardName, setCardName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  const handleSubmit = async () => {
    const balance = parseFloat(initialBalance);

    if (!cardName.trim() || isNaN(balance)) {
      Alert.alert('Hata', 'Lütfen geçerli bir isim ve bakiye giriniz.');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string,
         },
        body: JSON.stringify({ name: cardName, balance }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Hata', data.error || 'Kart eklenirken hata oluştu.');
        return;
      }

      Alert.alert('Başarılı', 'Kart eklendi!');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Sunucuya bağlanırken hata oluştu.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f4f6f9" barStyle="dark-content" />

      {/* Back button */}
      <TouchableOpacity style={styles.backSmallButton} onPress={() => router.push('/')}>
        <Text style={styles.backSmallButtonText}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.header}>💳 Add a New Card</Text>

        {/* Form inside a nice card box */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Card Name</Text>
          <TextInput
            value={cardName}
            onChangeText={setCardName}
            style={styles.input}
            placeholder="Enter card name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Initial Balance</Text>
          <TextInput
            value={initialBalance}
            onChangeText={setInitialBalance}
            keyboardType="numeric"
            style={styles.input}
            placeholder="Enter initial balance"
            placeholderTextColor="#999"
          />
        </View>

        {/* Sticky button at bottom */}
        <View style={styles.bottomButtonWrapper}>
          <TouchableOpacity onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>＋ Add Card</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  header: { fontSize: 24, fontWeight: '700', marginVertical: 10, color: '#111' },

  // Card-like container for form
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  label: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafafa',
  },

  // Button pinned at bottom
  bottomButtonWrapper: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Back button
  backSmallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3498db',
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backSmallButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
