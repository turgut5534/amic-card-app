import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
        headers: { 'Content-Type': 'application/json' },
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

      <TouchableOpacity style={styles.backSmallButton} onPress={() => router.push('/')}>
                  <Text style={styles.backSmallButtonText}>← Back</Text>
                </TouchableOpacity>
      <StatusBar backgroundColor="#f4f6f9" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.header}>💳 Add a New Card</Text>

        <View style={styles.form}>
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

        <TouchableOpacity onPress={handleSubmit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>＋ Add Card</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 30, color: '#111' },
  form: { flex: 1, justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 20,
  },
  primaryButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
   backSmallButton: {
  paddingVertical: 10,
  paddingHorizontal: 10,
  backgroundColor: '#3498db',
  borderRadius: 4,
  alignSelf: 'flex-start',
  marginTop: 20,    // Üstten boşluk ekledik
  marginBottom: 10, // Alttan boşluk ekledik
},
backSmallButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 14,
},
});
