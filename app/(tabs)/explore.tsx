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
  amount: number;
  newBalance: number;
  date: string;
  type: 'added' | 'purchased' | 'setted';
}

const STORAGE_HISTORY_KEY = '@amic_history';
const PAGE_SIZE = 20;

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed: HistoryItem[] = JSON.parse(saved);
        setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
          {item.type === 'added' && <>+{item.amount.toFixed(2)} zł eklendi → Bakiye: {item.newBalance.toFixed(2)} zł</>}
          {item.type === 'purchased' && <>{Math.abs(item.amount).toFixed(2)} zł harcandı → Bakiye: {item.newBalance.toFixed(2)} zł</>}
          {item.type === 'setted' && <>{item.newBalance.toFixed(2)} zł manuel ayarlandı</>}
        </Text>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  const jumpTo = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Geçmiş ({history.length} işlem)
      </Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : (
        <>
          <FlatList
            data={pageData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>Henüz işlem yok</Text>}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          <View style={styles.pager}>
            <TouchableOpacity onPress={goPrev} disabled={currentPage === 1} style={[styles.pageBtn, currentPage === 1 && styles.disabledBtn]}>
              <Text style={styles.pageBtnText}>Önceki</Text>
            </TouchableOpacity>

            <View style={styles.pageNumbers}>
              <TouchableOpacity onPress={() => jumpTo(1)}><Text style={styles.pageNumber}>1</Text></TouchableOpacity>
              <Text style={styles.pageNumberSeparator}>…</Text>
              <TouchableOpacity onPress={() => jumpTo(totalPages)}><Text style={styles.pageNumber}>{totalPages}</Text></TouchableOpacity>
            </View>

            <TouchableOpacity onPress={goNext} disabled={currentPage === totalPages} style={[styles.pageBtn, currentPage === totalPages && styles.disabledBtn]}>
              <Text style={styles.pageBtnText}>Sonraki</Text>
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
});
