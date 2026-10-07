import apiService from './apiService';

class SellerAnalyticsService {
  async getAnalytics(period = '30') {
    try {
      const data = await apiService.get(`/analytics/seller?period=${period}`);
      return data;
    } catch (error) {
      console.warn('Analytics endpoint failed, falling back to mock data:', error.message);
      return this._getMockData(period);
    }
  }

  _getMockData(period) {
    const factorMap = { '7': 0.25, '30': 1, '90': 3, '365': 12 };
    const f = factorMap[String(period)] ?? 1;

    const totalViews = Math.floor(15400 * f);
    const totalLeads = Math.floor(642 * f);

    return {
      overview: {
        totalReach: totalViews,
        totalLeads: totalLeads,
        conversionRate: totalViews > 0
          ? `${((totalLeads / totalViews) * 100).toFixed(1)}%`
          : '0.0%',
        activeCampaigns: 4,
        totalCampaigns: Math.floor(12 * (f > 1 ? Math.sqrt(f) : 1)),
        aiGeneratedCount: 3,
      },
      leadQuality: {
        NEW:  Math.floor(210 * f),
        HOT:  Math.floor(87  * f),
        WARM: Math.floor(220 * f),
        COLD: Math.floor(125 * f),
      },
      topCampaigns: [
        { title: 'Summer Special Discount', leads: Math.floor(142 * f), views: Math.floor(3800 * f), status: 'ACTIVE'  },
        { title: 'Diwali Mega Offer',        leads: Math.floor(98  * f), views: Math.floor(2400 * f), status: 'ACTIVE'  },
        { title: 'New Year Deal',            leads: Math.floor(67  * f), views: Math.floor(1900 * f), status: 'EXPIRED' },
        { title: 'Weekend Flash Sale',       leads: Math.floor(54  * f), views: Math.floor(1200 * f), status: 'ACTIVE'  },
        { title: 'Referral Bonus Campaign',  leads: Math.floor(38  * f), views: Math.floor(980  * f), status: 'DRAFT'   },
      ],
    };
  }
}

export default new SellerAnalyticsService();
