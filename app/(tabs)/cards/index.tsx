import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface HistoryItem {
  id: string;
  amount: number; // pozitif: eklenen, negatif: harcanan
  newBalance: number;
  date: string;
  type: 'added' | 'purchased' | 'setted'; // işlem tipi
}

const STORAGE_BALANCE_KEY_CARD1 = '@amic_balance_card1';
const STORAGE_BALANCE_KEY_CARD2 = '@amic_balance_card2';
const STORAGE_HISTORY_KEY_CARD1 = '@amic_history_card1';
const STORAGE_HISTORY_KEY_CARD2 = '@amic_history_card2';
const SELECTED_CARD_KEY = '@amic_selected_card';

export default function IndexScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedCardName, setSelectedCardName] = useState('E100');
  const [selectedCardNumber, setSelectedCardNumber] = useState<1 | 2>(1);

  // Tarih formatı
  const getFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // İşlem geçmişi ekle
  const addHistoryItem = (
    amount: number,
    newBal: number,
    type: 'added' | 'purchased' | 'setted'
  ) => {
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      amount,
      newBalance: newBal,
      date: getFormattedDate(),
      type,
    };
    setHistory(prev => [newHistoryItem, ...prev]);
  };

  // AsyncStorage key'lerini kart seçimine göre döner
  const getKeysForCard = (cardNumber: 1 | 2) => {
    return {
      balanceKey: cardNumber === 1 ? STORAGE_BALANCE_KEY_CARD1 : STORAGE_BALANCE_KEY_CARD2,
      historyKey: cardNumber === 1 ? STORAGE_HISTORY_KEY_CARD1 : STORAGE_HISTORY_KEY_CARD2,
    };
  };

  // Veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
        const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);
        const cardNum = selectedCard === '2' ? 2 : 1;
        setSelectedCardNumber(cardNum);
        setSelectedCardName(cardNum === 1 ? 'E100' : 'Amic');

        const { balanceKey, historyKey } = getKeysForCard(cardNum);

        const savedBalance = await AsyncStorage.getItem(balanceKey);
        const savedHistory = await AsyncStorage.getItem(historyKey);

        setBalance(savedBalance ? parseFloat(savedBalance) : 0);
        setHistory(savedHistory ? JSON.parse(savedHistory) : []);
      } catch (error) {
        console.error('Veri yüklenirken hata oluştu', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Veri kaydetme
  useEffect(() => {
    if (!loading) {
      const saveData = async () => {
        const { balanceKey, historyKey } = getKeysForCard(selectedCardNumber);
        await AsyncStorage.setItem(balanceKey, balance.toString());
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      };
      saveData();
    }
  }, [balance, history, loading, selectedCardNumber]);

  // Bakiye azalt (harcama)
  const handleSubtract = () => {
    const value = parseFloat(inputValue);

    if (isNaN(value) || value <= 0) {
      Alert.alert('Geçersiz miktar', 'Lütfen pozitif bir miktar giriniz.');
      return;
    }

    if (value > balance) {
      Alert.alert('Yetersiz bakiye', 'Girdiğiniz miktar bakiyenizden büyük olamaz.');
      return;
    }

    Alert.alert(
      'Onay',
      `${value.toFixed(2)} zł yakıt alınacaktır. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => {
            const newBal = balance - value;
            setBalance(newBal);
            addHistoryItem(-value, newBal, 'purchased');
            setInputValue('');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Bakiye ekle
  const handleAddBalance = () => {
    const value = parseFloat(inputValue);

    if (isNaN(value) || value <= 0) {
      Alert.alert('Geçersiz miktar', 'Lütfen pozitif bir miktar giriniz.');
      return;
    }

    Alert.alert(
      'Onay',
      `${value.toFixed(2)} zł bakiye eklenecektir. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => {
            const newBal = balance + value;
            setBalance(newBal);
            addHistoryItem(value, newBal, 'added');
            setInputValue('');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Manuel bakiye ata
  const handleSetBalanceDirectly = () => {
    const value = parseFloat(inputValue);

    if (isNaN(value) || value < 0) {
      Alert.alert('Geçersiz miktar', 'Lütfen sıfır veya pozitif bir miktar giriniz.');
      return;
    }

    Alert.alert(
      'Onay',
      'Bakiye manuel olarak değişecektir. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => {
            setBalance(value);
            addHistoryItem(value - balance, value, 'setted');
            setInputValue('');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleGoBackToCardSelection = async () => {
    await AsyncStorage.removeItem(SELECTED_CARD_KEY);
    router.push('/');
  };


  return (
    <SafeAreaView style={styles.container}>

      <TouchableOpacity
        style={styles.goBackButton}
        onPress={handleGoBackToCardSelection}
      >
        <Text style={styles.goBackButtonText}>← Kartlarım</Text>
      </TouchableOpacity>

      <Text style={styles.title}>💳 {selectedCardName} Kart</Text>

      <TouchableOpacity style={styles.setDirectButton} onPress={handleSetBalanceDirectly}>
        <Text style={styles.setDirectButtonText}>Manuel Bakiye Ata</Text>
      </TouchableOpacity>

      <Text style={styles.balance}>Bakiye: {balance.toFixed(2)} zł</Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Miktar giriniz"
        value={inputValue}
        onChangeText={setInputValue}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.buttonSubtract} onPress={handleSubtract}>
          <Text style={styles.buttonText}>Yakıt Al</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonAdd} onPress={handleAddBalance}>
          <Text style={styles.buttonText}>Bakiye Ekle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Son 10 İşlem</Text>
      </View>

      <FlatList
        data={history.slice(0, 10)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.historyItem,
              { borderLeftColor: item.amount < 0 ? '#e74c3c' : '#27ae60' },
              styles.historyItemRow,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.historyText}>
                {item.type === 'added' && (
                  <>+{item.amount.toFixed(2)} zł eklendi → Bakiye: {item.newBalance.toFixed(2)} zł</>
                )}
                {item.type === 'purchased' && (
                  <>{item.amount.toFixed(2)} zł harcandı → Bakiye : {item.newBalance.toFixed(2)} zł</>
                )}
                {item.type === 'setted' && (
                  <>{item.newBalance.toFixed(2)} zł manuel ayarlandı</>
                )}
              </Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyHistory}>Henüz işlem yok</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  setDirectButton: {
    backgroundColor: '#f39c12',
    paddingVertical: 8,
    borderRadius: 5,
    marginBottom: 12,
    alignItems: 'center',
  },
  setDirectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  buttonSubtract: {
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  buttonAdd: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#555',
  },
  historyItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeftWidth: 5,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 16,
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  goBackButton: {
  backgroundColor: '#3498db',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 5,
  alignSelf: 'flex-start',
  marginBottom: 12,
},
goBackButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
},

});
