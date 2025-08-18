import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CardStatsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalLiters, setTotalLiters] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [selectedCardName, setSelectedCardName] = useState<string>('');

  const SELECTED_CARD_KEY = '@amic_selected_card';

  // Fetch stats on mount (total stats)
    useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [startDate, endDate]) // re-run if filter changes too
  );
  const fetchStats = async () => {
    try {
      setLoading(true);
      const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);
      let url = `${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/summary`;

      // Apply date filter only if both dates are selected
      if (startDate && endDate) {
        url += `?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
      }

      const response = await fetch(url , {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_SECRET_API as string, // ✅ works in Expo
        },
      });
      const data = await response.json();
      setSelectedCardName(data.cardInfo.card_name)
      setTotalSpent(parseFloat(data.totalSpent));
      setTotalLiters(parseFloat(data.totalLiters));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (mode: 'start' | 'end') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // Keep open on iOS
    if (date) {
      if (pickerMode === 'start') {
        setStartDate(date);
        // Automatically open end picker
        setTimeout(() => openPicker('end'), 100);
      } else {
        setEndDate(date);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content}>

        <TouchableOpacity style={styles.backSmallButton} onPress={() => router.push('/')}>
            <Text style={styles.backSmallButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.header}>📊 Card Statistics ({selectedCardName}) </Text>

        {/* Date Filter */}
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('start')}>
            <Text>{startDate ? startDate.toDateString() : 'Select Start Date'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('end')}>
            <Text>{endDate ? endDate.toDateString() : 'Select End Date'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={fetchStats}>
          <Text style={styles.filterButtonText}>Apply Filter</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={[styles.statCard, { backgroundColor: '#2980b9' }]}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{totalSpent.toFixed(2)} zł</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
              <Text style={styles.statLabel}>Total Fuel Liters</Text>
              <Text style={styles.statValue}>{totalLiters.toFixed(2)} L</Text>
            </View>
            
          </>
        )}

        {showPicker && (
          <DateTimePicker
            value={pickerMode === 'start' ? startDate || new Date() : endDate || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 20, gap: 20 },
  header: { fontSize: 26, fontWeight: '700', marginBottom: 10, color: '#111' },
  statCard: { borderRadius: 16, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  statLabel: { fontSize: 16, color: '#dce6f1', marginBottom: 10 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dateButton: { flex: 1, padding: 15, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', marginHorizontal: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  filterButton: { marginTop: 10, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  filterButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backSmallButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#3498db',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 20,
    marginBottom: 10,
  },
  backSmallButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
