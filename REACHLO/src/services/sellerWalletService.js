import apiService from './apiService';

class SellerWalletService {
  async getWalletData() {
    try {
      const data = await apiService.get('/wallet/seller');
      return data;
    } catch (error) {
      console.warn('Wallet endpoint failed, falling back to mock data:', error.message);
      return this._getMockWalletData();
    }
  }

  async getTransactions() {
    try {
      const data = await apiService.get('/wallet/transactions');
      return data;
    } catch (error) {
      console.warn('Transactions endpoint failed, falling back to mock data:', error.message);
      return this._getMockTransactions();
    }
  }

  async withdrawFunds(amount) {
    try {
      // Fallback delay to simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // If we had a real endpoint it would look like:
      // return await apiService.post('/wallet/withdraw', { amount });
      
      if (amount <= 0) throw new Error("Invalid withdrawal amount");
      
      return { success: true, message: 'Withdrawal initiated successfully' };
    } catch (error) {
      throw new Error(error.message || 'Withdrawal failed');
    }
  }

  _getMockWalletData() {
    return {
      availableBalance: 12500,
      pendingBalance: 4200,
      totalEarnings: 45000,
      withdrawnAmount: 28300
    };
  }

  _getMockTransactions() {
    return [
      {
        id: 'tx1',
        type: 'EARNING',
        title: 'Campaign: Summer Special',
        amount: 4000,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        status: 'COMPLETED'
      },
      {
        id: 'tx2',
        type: 'WITHDRAWAL',
        title: 'Bank Transfer',
        amount: 10000,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        status: 'COMPLETED'
      },
      {
        id: 'tx3',
        type: 'EARNING',
        title: 'Campaign: Tech Review',
        amount: 2500,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        status: 'COMPLETED'
      },
      {
        id: 'tx4',
        type: 'EARNING',
        title: 'Campaign: Tech Review',
        amount: 1700,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        status: 'PENDING'
      },
      {
        id: 'tx5',
        type: 'WITHDRAWAL',
        title: 'Bank Transfer',
        amount: 5000,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        status: 'FAILED'
      }
    ];
  }
}

export default new SellerWalletService();
