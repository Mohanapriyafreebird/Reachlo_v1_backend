import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import sellerWalletService from '../services/sellerWalletService';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { safeFormatNumber } from '../utils/formatters';

export default function SellerWalletScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Withdrawal modal state
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    try {
      const [walletRes, txRes] = await Promise.all([
        sellerWalletService.getWalletData(),
        sellerWalletService.getTransactions()
      ]);
      setWalletData(walletRes);
      setTransactions(txRes);
    } catch (error) {
      console.warn('Failed to load wallet data', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError('');
    const amountNum = parseFloat(withdrawAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    
    const availableBalance = walletData?.availableBalance ?? 0;
    if (amountNum > availableBalance) {
      setWithdrawError('Amount exceeds available balance.');
      return;
    }

    setWithdrawing(true);
    try {
      await sellerWalletService.withdrawFunds(amountNum);
      setWithdrawSuccess(true);
      setWalletData(prev => ({
        ...prev,
        availableBalance: (prev?.availableBalance ?? 0) - amountNum,
        withdrawnAmount: (prev?.withdrawnAmount ?? 0) + amountNum
      }));
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const closeWithdrawModal = () => {
    setWithdrawModalVisible(false);
    setWithdrawAmount('');
    setWithdrawError('');
    setWithdrawSuccess(false);
  };

  const renderTransaction = (tx) => {
    const isEarning = tx.type === 'EARNING';
    const color = isEarning ? theme.success : theme.text;
    const sign = isEarning ? '+' : '-';
    
    return (
      <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.divider }]}>
        <View style={styles.txLeft}>
          <View style={[styles.txIcon, { backgroundColor: isEarning ? `${theme.success}15` : `${theme.sellerPrimary}15` }]}>
            <Ionicons name={isEarning ? 'arrow-down-outline' : 'arrow-up-outline'} size={18} color={isEarning ? theme.success : theme.sellerPrimary} />
          </View>
          <View>
            <Text style={[styles.txTitle, { color: theme.text }]}>{tx.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={[styles.txDate, { color: theme.textTertiary }]}>{new Date(tx.date).toLocaleDateString()}</Text>
              {tx.status !== 'COMPLETED' && (
                <View style={[styles.txStatusBadge, tx.status === 'FAILED' && styles.txStatusBadgeFailed]}>
                  <Text style={[styles.txStatusText, tx.status === 'FAILED' && styles.txStatusTextFailed]}>{tx.status}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Text style={[styles.txAmount, { color }]}>{sign}₹{safeFormatNumber(tx.amount)}</Text>
      </View>
    );
  };

  if (loading && !walletData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.sellerPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          {canGoBack && (
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          )}
          <Text style={[styles.headerTitle, { color: theme.text }]}>Wallet</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Manage your earnings and payouts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {walletData ? (
            <>
              {/* Wallet Overview */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Ionicons name="wallet-outline" size={24} color={COLORS.WHITE} />
                </View>
                <Text style={styles.balanceAmount}>₹{safeFormatNumber(walletData?.availableBalance)}</Text>
                
                <View style={styles.balanceDivider} />
                
                <View style={styles.balanceFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Pending</Text>
                    <Text style={styles.footerValue}>₹{safeFormatNumber(walletData?.pendingBalance)}</Text>
                  </View>
                  <View>
                    <Text style={styles.footerLabel}>Total Withdrawn</Text>
                    <Text style={styles.footerValue}>₹{safeFormatNumber(walletData?.withdrawnAmount)}</Text>
                  </View>
                </View>

                <Pressable 
                  style={styles.withdrawBtn} 
                  onPress={() => setWithdrawModalVisible(true)}
                  disabled={(walletData?.availableBalance ?? 0) <= 0}
                >
                  <Text style={[styles.withdrawBtnText, { color: theme.sellerPrimary }]}>Withdraw Funds</Text>
                </Pressable>
              </View>

              {/* Transactions */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction History</Text>
              <View style={[styles.txContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.cardShadow }]}>
                {transactions.length > 0 ? (
                  transactions.map(renderTransaction)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>No transactions yet.</Text>
                  </View>
                )}
              </View>

              <View style={{height: 100}} />
            </>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent={true} onRequestClose={closeWithdrawModal}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Withdraw Funds</Text>
              <Pressable onPress={closeWithdrawModal} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            {withdrawSuccess ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIconBg, { backgroundColor: theme.success }]}>
                  <Ionicons name="checkmark" size={32} color={COLORS.WHITE} />
                </View>
                <Text style={[styles.successTitle, { color: theme.text }]}>Withdrawal Initiated!</Text>
                <Text style={[styles.successText, { color: theme.textSecondary }]}>Your funds will be transferred to your registered bank account within 2-3 business days.</Text>
                <PrimaryButton title="Done" onPress={closeWithdrawModal} theme="seller" style={{ marginTop: 24 }} />
              </View>
            ) : (
              <View style={styles.withdrawForm}>
                <Text style={[styles.availableText, { color: theme.textSecondary }]}>Available to withdraw: <Text style={{ fontWeight: 'bold', color: theme.text }}>₹{safeFormatNumber(walletData?.availableBalance)}</Text></Text>
                
                <InputField
                  label="Amount (₹)"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  error={withdrawError}
                />
                
                <PrimaryButton 
                  title="Confirm Withdrawal" 
                  onPress={handleWithdraw} 
                  loading={withdrawing} 
                  disabled={withdrawing || !withdrawAmount} 
                  theme="seller" 
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: FONT_SIZES.XXL, fontWeight: FONT_WEIGHTS.BOLD },
  headerSubtitle: { fontSize: FONT_SIZES.SM, marginTop: 4 },
  scrollContent: { padding: 20 },
  balanceCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: COLORS.WHITE, fontSize: 36, fontWeight: '800' },
  balanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  footerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  footerValue: { color: COLORS.WHITE, fontSize: 16, fontWeight: '600' },
  withdrawBtn: { backgroundColor: COLORS.WHITE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  withdrawBtnText: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.BOLD, marginBottom: 16 },
  txContainer: { borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txTitle: { fontSize: 15, fontWeight: '600' },
  txDate: { fontSize: 12 },
  txStatusBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txStatusBadgeFailed: { backgroundColor: '#FEF2F2' },
  txStatusText: { fontSize: 10, fontWeight: '600', color: '#D97706' },
  txStatusTextFailed: { color: '#DC2626' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 350 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.BOLD },
  withdrawForm: { marginTop: 8 },
  availableText: { fontSize: 14, marginBottom: 20 },
  successContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  successIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: FONT_SIZES.XL, fontWeight: FONT_WEIGHTS.BOLD, marginBottom: 8 },
  successText: { fontSize: 14, textAlign: 'center', lineHeight: 20 }
});
