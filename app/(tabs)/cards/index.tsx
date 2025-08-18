import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface HistoryItem {
  id: string;
  amount: number; // pozitif: eklenen, negatif: harcanan
  newBalance: number;
  date: string;
  type: string; // işlem tipi
  liters: number
}

const SELECTED_CARD_KEY = '@amic_selected_card';

export default function IndexScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedCardName, setSelectedCardName] = useState('Loading...');
  const [fuelPrice, setFuelPrice] = useState<number>(2.40); // default value
  const [loadingText, setLoadingText] = useState(true);

  const router = useRouter(); 

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

  const getFormattedDateofData = (dateString: string) => {
  const date = new Date(dateString); // use the passed date
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};


  // İşlem geçmişi ekle
  const addHistoryItem = (
    amount: number,
    newBal: number,
    type: 'added' | 'purchased' | 'setted',
    liters: number
  ) => {
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      amount,
      newBalance: newBal,
      date: getFormattedDate(),
      type,
      liters
    };
    setHistory(prev => [newHistoryItem, ...prev]);
  };

  // Veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
        const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);
        const cardInfoRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/info`, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string, // ✅ works in Expo
        },
      });
        const cardInfo = await cardInfoRes.json();

        setSelectedCardName(cardInfo.card_name)

        const latestFuelPriceRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/latest-fuel-price`, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string, // ✅ works in Expo
          },
        });
        const latestFuelPriceData = await latestFuelPriceRes.json()

        setFuelPrice(latestFuelPriceData.latest_fuel_price ?? fuelPrice)
        setBalance(parseInt(cardInfo.balance));
    
        const historyItemsRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/transactions`, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string, // ✅ works in Expo
          },
        });
        const data = await historyItemsRes.json();

        const mappedHistory: HistoryItem[] = data.transactions.map((item: any) => ({
          id: item.transaction_id.toString(),
          amount: item.transaction_type === 'spend' ? -parseFloat(item.amount) : parseFloat(item.amount),
          newBalance: parseFloat(item.new_balance), // replace with actual field if you calculate balance on backend
          date: getFormattedDateofData(item.transaction_date),
          type: item.transaction_type === 'spend' ? 'purchased' : item.transaction_type === 'topup' ? 'added' : 'setted',
          liters: parseFloat(item.liters)
        }));

        setHistory(mappedHistory);
        setLoadingText(false)

      } catch (error) {
        console.error('An error occurred', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Bakiye azalt (harcama)
  const handleSubtract = async () => {
    const value = parseFloat(inputValue);
    const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);

    const currentFuelPrice = parseFloat(fuelPrice.toFixed(2));

    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount.');
      return;
    }

    if (value > balance) {
      Alert.alert('Insufficient balance', 'You can not spend more than you have.');
      return;
    }

    Alert.alert(
      'Confirm',
      `${value.toFixed(2)} zł will be spent. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Send POST request to backend
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/spend`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string,
                  },
                  body: JSON.stringify({ amount: value, fuel_price: currentFuelPrice }),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                Alert.alert('Error', data.error || 'An error occurred.');
                return;
              }

              // Update balance and history from server response
              const newBalance = parseFloat(data.remaining_balance);
              setBalance(newBalance);
              addHistoryItem(-value, newBalance, 'purchased', data.liters );
              setInputValue('');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Can not connect to the server.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };


  // Bakiye ekle
  const handleAddBalance = async () => {
    const value = parseFloat(inputValue);

    const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);

    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount.');
      return;
    }

    Alert.alert(
      'Confirm',
      `${value.toFixed(2)} zł will be added. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Send POST request to backend
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/topup`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string,
                  },
                  body: JSON.stringify({ amount: value }),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                Alert.alert('Error', data.error || 'Error while topping up.');
                return;
              }

              // Update local state after successful request
              setBalance(parseFloat(data.balance));
              addHistoryItem(value, parseFloat(data.balance), 'added', 0);
              setInputValue('');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'An error occurred connecting to the server.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
      <>
       <StatusBar backgroundColor="black" barStyle="light-content" />
        <SafeAreaView edges={['bottom']}  style={styles.container}>

          <TouchableOpacity style={styles.backSmallButton} onPress={() => router.push('/')}>
              <Text style={styles.backSmallButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>💳 {selectedCardName}</Text>

          <Text style={styles.balance}>Balance: {balance.toFixed(2)} zł</Text>

          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter an amount"
            value={inputValue}
            onChangeText={setInputValue}
          />

          {/* Yakıt fiyatı input */}
          <View style={styles.stepperContainer}>
            <Text style={styles.stepperLabel}>Fuel Price (zł/L)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setFuelPrice(prev => Math.max(prev - 0.01, 0))}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{fuelPrice.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setFuelPrice(prev => prev + 0.01)}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>


          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSubtract} onPress={handleSubtract}>
              <Text style={styles.buttonText}>Buy Fuel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonAdd} onPress={handleAddBalance}>
              <Text style={styles.buttonText}>Top Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent Transactions</Text>
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
                      <>+{item.amount.toFixed(2)} zł added → Balance: {item.newBalance.toFixed(2)} zł</>
                    )}
                    {item.type === 'purchased' && (
                      <>{item.amount.toFixed(2)} zł spent → Balance : {item.newBalance.toFixed(2)} zł</>
                    )}
                  </Text>

                    {item.type === 'purchased' && item.liters != null && (
                      <Text style={styles.historyLiters}>
                        Yakıt: {item.liters.toFixed(2)} L
                      </Text>
                    )}

                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyHistory}>
                {loadingText ? "Loading..." : "No transaction yet"}
              </Text>
            }
            
          />

        </SafeAreaView>
    </>
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
  emptyHistory: {
    textAlign: 'center',
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 20,
  },
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
stepperContainer: {
  marginBottom: 20,
},
stepperLabel: {
  fontSize: 14,
  color: '#555',
  marginBottom: 5,
  fontWeight: '500',
},
stepperRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ccc',
  paddingHorizontal: 10,
  paddingVertical: 5,
},
stepperButton: {
  backgroundColor: '#3498db',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
},
stepperButtonText: {
  color: 'white',
  fontSize: 20,
  fontWeight: 'bold',
},
stepperValue: {
  flex: 1,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: '600',
},
historyLiters: {
  fontSize: 14,
  color: '#555',
  marginTop: 2,
}


});
