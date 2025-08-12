import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BALANCE_KEY_CARD1 = '@amic_balance_card1';
const BALANCE_KEY_CARD2 = '@amic_balance_card2';
const SELECTED_CARD_KEY = '@amic_selected_card';

export default function HomeScreen() {
  const router = useRouter();
  const [balances, setBalances] = useState({ card1: 0, card2: 0 });

  const loadBalances = useCallback(async () => {
    try {
      const saved1 = await AsyncStorage.getItem(BALANCE_KEY_CARD1);
      const saved2 = await AsyncStorage.getItem(BALANCE_KEY_CARD2);
      setBalances({
        card1: saved1 ? parseFloat(saved1) : 0,
        card2: saved2 ? parseFloat(saved2) : 0,
      });
    } catch (err) {
      console.error('Bakiye yüklenemedi', err);
    }
  }, []);

  // Ekran her odaklandığında bakiyeleri yeniden yükle
  useFocusEffect(
    useCallback(() => {
      loadBalances();
    }, [loadBalances])
  );

  const handleSelectCard = async (cardNumber: 1 | 2) => {
    await AsyncStorage.setItem(SELECTED_CARD_KEY, cardNumber.toString());
    router.push('/cards'); // Bakiye ekranına yönlendir (navigate yerine push tercih edilir)
  };

  const Card = ({ number, balance }: { number: 1 | 2; balance: number }) => {
    const cardNames = { 1: 'E100', 2: 'Amic' };
    const cardColors = { 1: '#d31a1aff', 2: '#27ae60' }; // Farklı renkler

    return (
      <>
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColors[number] }]}
        onPress={() => handleSelectCard(number)}
      >
        <Text style={styles.cardTitle}>{cardNames[number]}</Text>
        <Text style={styles.balanceLabel}>Bakiye</Text>
        <Text style={styles.balance}>{balance.toFixed(2)} zł</Text>
      </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>💳 Kart Seçimi</Text>
      <Text style={styles.subHeader}>Lütfen işlem yapmak istediğiniz kartı seçin.</Text>

      <View style={styles.cardContainer}>
        <Card number={1} balance={balances.card1} />
        <Card number={2} balance={balances.card2} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  header: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subHeader: { fontSize: 16, color: '#777', marginBottom: 20 },
  cardContainer: { gap: 16 },
  card: {
    backgroundColor: '#2980b9',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: { fontSize: 18, color: '#fff', fontWeight: '600' },
  balanceLabel: { fontSize: 14, color: '#dce6f1', marginTop: 10 },
  balance: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 5 },
});
