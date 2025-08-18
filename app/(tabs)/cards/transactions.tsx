import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface HistoryItem {
  id: string;
  amount: number; // pozitif: eklenen, negatif: harcanan
  newBalance: number;
  date: string;
  type: string; // işlem tipi
  liters: number
}

const SELECTED_CARD_KEY = '@amic_selected_card';

const PAGE_SIZE = 10;

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [selectedCardName, setSelectedCardName] = useState<string>('E100');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const getFormattedDateofData = (dateString: string) => {
    const date = new Date(dateString); // use the passed date
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {

      const selectedCard = await AsyncStorage.getItem(SELECTED_CARD_KEY);
      const historyItemsRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/transactions`);
      const data = await historyItemsRes.json();

      const mappedHistory: HistoryItem[] = data.transactions.map((item: any) => ({
        id: item.transaction_id.toString(),
        amount: item.transaction_type === 'spend' ? -parseFloat(item.amount) : parseFloat(item.amount),
        newBalance: parseFloat(item.new_balance), // replace with actual field if you calculate balance on backend
        date: getFormattedDateofData(item.transaction_date),
        type: item.transaction_type === 'spend' ? 'purchased' : item.transaction_type === 'topup' ? 'added' : 'setted',
        liters: parseFloat(item.liters)
      }));

      const cardInfoRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/cards/${selectedCard}/info`);
      const cardInfo = await cardInfoRes.json();

      setSelectedCardName(cardInfo.card_name)
      setBalance(parseFloat(cardInfo.balance));
      setHistory(mappedHistory);
 

    } catch (e) {
      console.error('Failed to load history or balance', e);
      setHistory([]);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [history, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageData = history.slice(startIndex, startIndex + PAGE_SIZE);

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={[styles.item, { borderLeftColor: item.amount < 0 ? '#e74c3c' : '#27ae60' }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>
          {item.type === 'added' && <>+{item.amount.toFixed(2)} zł added → Balance: {item.newBalance.toFixed(2)} zł</>}
          {item.type === 'purchased' && <>{Math.abs(item.amount).toFixed(2)} zł spent → Balance: {item.newBalance.toFixed(2)} zł</>}
        </Text>

         {item.type === 'purchased' && item.liters != null && (
          <Text style={styles.historyLiters}>
            Yakıt: {item.liters.toFixed(2)} L
          </Text>
        )}

        <Text style={styles.dateText}>{item.date}</Text>
      </View>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  const jumpTo = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {selectedCardName} Card Balance: {balance.toFixed(2)} zł
      </Text>
      <Text style={styles.title}>
        History ({history.length} transactions)
      </Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : (
        <>
          <FlatList
            data={pageData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>No transaction yet</Text>}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          <View style={styles.pager}>
            <TouchableOpacity onPress={goPrev} disabled={currentPage === 1} style={[styles.pageBtn, currentPage === 1 && styles.disabledBtn]}>
              <Text style={styles.pageBtnText}>Previous</Text>
            </TouchableOpacity>

            <View style={styles.pageNumbers}>
              <TouchableOpacity onPress={() => jumpTo(1)}><Text style={styles.pageNumber}>1</Text></TouchableOpacity>
              <Text style={styles.pageNumberSeparator}>…</Text>
              <TouchableOpacity onPress={() => jumpTo(totalPages)}><Text style={styles.pageNumber}>{totalPages}</Text></TouchableOpacity>
            </View>

            <TouchableOpacity onPress={goNext} disabled={currentPage === totalPages} style={[styles.pageBtn, currentPage === totalPages && styles.disabledBtn]}>
              <Text style={styles.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  item: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: { fontSize: 16, color: '#333' },
  dateText: { fontSize: 12, color: '#666', marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 20 },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#2980b9', borderRadius: 8 },
  pageBtnText: { color: '#fff', fontWeight: '700' },
  disabledBtn: { backgroundColor: '#9bb8d3' },
  pageNumbers: { flexDirection: 'row', alignItems: 'center' },
  pageNumber: { marginHorizontal: 6, fontWeight: '700' },
  pageNumberSeparator: { marginHorizontal: 6, color: '#666' },
  historyLiters: {
  fontSize: 14,
  color: '#555',
  marginTop: 2,
}

});
