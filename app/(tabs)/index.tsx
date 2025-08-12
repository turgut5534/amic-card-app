import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface HistoryItem {
  id: string;
  amount: number; // pozitif: eklenen, negatif: harcanan
  newBalance: number;
  date: string;
  type: 'added' | 'purchased' | 'setted'; // işlem tipi
}

const STORAGE_BALANCE_KEY = '@amic_balance';
const STORAGE_HISTORY_KEY = '@amic_history';

export default function IndexScreen() {
  const [balance, setBalance] = useState<number>(100);
  const [inputValue, setInputValue] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      const savedBalance = await AsyncStorage.getItem(STORAGE_BALANCE_KEY);
      const savedHistory = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);

      if (savedBalance !== null) setBalance(parseFloat(savedBalance));
      if (savedHistory !== null) setHistory(JSON.parse(savedHistory));
    } catch (error) {
      console.error('Veri yüklenirken hata oluştu', error);
    } finally {
      setLoading(false); // ✅ data is loaded
    }
  };
  loadData();
}, []);

useEffect(() => {
  if (!loading) { // ✅ only save after initial load
    AsyncStorage.setItem(STORAGE_BALANCE_KEY, balance.toString());
    AsyncStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
  }
}, [balance, history, loading]);


  const getFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const clearHistory = () => {
    Alert.alert(
      'Onay',
      'Geçmiş tamamen silinecektir. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => setHistory([]),
        },
      ],
      { cancelable: true }
    );
};

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


  return (
    <View style={styles.container}>
      <Text style={styles.title}>💳 Amic Kart</Text>

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
        <TouchableOpacity style={styles.clearHistoryButton} onPress={clearHistory}>
          <Text style={styles.clearHistoryButtonText}>Geçmişi Temizle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={history.slice(0,10)}
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
    </View>
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
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'center',
    paddingHorizontal: 15,
  },
  setDirectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  balance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  buttonSubtract: {
    flex: 1,
    backgroundColor: '#2980b9',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 5,
  },
  buttonAdd: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
    color: '#666',
    marginTop: 4,
  },
  emptyHistory: {
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
   clearHistoryButton: {
    backgroundColor: '#c0392b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
   clearHistoryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
   historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  }
});
