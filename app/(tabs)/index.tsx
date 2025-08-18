import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const SELECTED_CARD_KEY = '@amic_selected_card';

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<{ id: number; name: string; balance: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}`, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string, // ✅ works in Expo
        },
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const mapped = data.map((c: any) => ({
        id: c.card_id,
        name: c.card_name,
        balance: parseFloat(c.balance),
      }));
      setCards(mapped);
    } catch (err) {
      console.error('Kartlar yüklenemedi', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards])
  );

  const handleSelectCard = async (cardId: number) => {
    await AsyncStorage.setItem(SELECTED_CARD_KEY, cardId.toString());
    router.push('/cards');
  };

  const handleDeleteCard = (cardId: number) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optional: call API to delete
              await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${cardId}/delete`, { method: 'DELETE' });
              setCards(prev => prev.filter(c => c.id !== cardId));
            } catch (err) {
              console.error('Error deleting card', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const Card = ({ card }: { card: { id: number; name: string; balance: number } }) => {
    const colors = ['#d31a1aff', '#27ae60', '#2980b9', '#f39c12'];
    const color = colors[card.id % colors.length];

    const handleLongPress = () => {
      Alert.alert(
        'Card Options',
        'What do you want to do?',
        [
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteCard(card.id) },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    };

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: color }]}
        onPress={() => handleSelectCard(card.id)}
        onLongPress={handleLongPress} // <-- long press triggers edit/delete
      >
        <Text style={styles.cardTitle}>{card.name}</Text>
        <Text style={styles.balanceLabel}>Balance:</Text>
        <Text style={styles.balance}>{card.balance.toFixed(2)} zł</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="black" barStyle="light-content" />
      <Text style={styles.header}>💳 Choose a Card</Text>
      <Text style={styles.subHeader}>Please choose a card that you want to make transaction.</Text>

      <ScrollView contentContainerStyle={styles.cardContainer}>
        {loading ? <Text>Loading...</Text> : cards.map(card => <Card key={card.id} card={card} />)}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-card')}
        >
          <Text style={{ color: '#4CAF50', fontSize: 24, fontWeight: 'bold', marginRight: 12 }}>＋</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Add a New Card</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  header: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subHeader: { fontSize: 16, color: '#777', marginBottom: 20 },
  cardContainer: { gap: 16 },
  card: {
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
  addButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 25,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
