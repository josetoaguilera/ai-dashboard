import api from './api';

export interface KPIData {
  totalConversations: number;
  satisfactionRate: number;
  avgResponseTimeSeconds: number;
}

export interface TrendData {
  trend: Array<{
    date: string;
    count: number;
  }>;
}

export interface RatingDistribution {
  distribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
}

export interface ChannelDistribution {
  distribution: Array<{
    channel: string;
    count: number;
    percentage: number;
  }>;
}

export interface WorstPrompts {
  prompts: Array<{
    id: string;
    name: string;
    content: string;
    avgRating: number;
    usageCount: number;
  }>;
}

export const analyticsService = {
  async getKPIs(period: 'today' | 'week' | 'month' = 'week'): Promise<KPIData> {
    const response = await api.get('/analytics/kpis', { params: { period } });
    return response.data;
  },

  async getTrend(days: number = 30): Promise<TrendData> {
    const response = await api.get('/analytics/trend', { params: { days } });
    return response.data;
  },

  async getRatingDistribution(): Promise<RatingDistribution> {
    const response = await api.get('/analytics/ratings');
    return response.data;
  },

  async getChannelDistribution(): Promise<ChannelDistribution> {
    const response = await api.get('/analytics/channels');
    return response.data;
  },

  async getWorstPrompts(limit: number = 5): Promise<WorstPrompts> {
    const response = await api.get('/analytics/worst-prompts', { params: { limit } });
    return response.data;
  }
};