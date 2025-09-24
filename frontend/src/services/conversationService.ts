import api from './api';

export interface Conversation {
  id: string;
  title: string;
  channel: 'WEB' | 'WHATSAPP' | 'INSTAGRAM';
  status: 'OPEN' | 'CLOSED';
  rating?: number;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: 'USER' | 'ASSISTANT';
  responseTimeMs?: number;
  createdAt: string;
  prompt?: {
    id: string;
    name: string;
  };
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface CreateConversationData {
  title: string;
  channel?: 'WEB' | 'WHATSAPP' | 'INSTAGRAM';
}

export interface UpdateConversationData {
  rating?: number;
  status?: 'OPEN' | 'CLOSED';
  title?: string;
}

export interface GetConversationsParams {
  page?: number;
  limit?: number;
  status?: 'OPEN' | 'CLOSED';
  channel?: 'WEB' | 'WHATSAPP' | 'INSTAGRAM';
  minRating?: number;
  startDate?: string;
  endDate?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const conversationService = {
  async getConversations(params: GetConversationsParams = {}): Promise<ConversationsResponse> {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  async getConversation(id: string): Promise<{ conversation: ConversationWithMessages }> {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  async createConversation(data: CreateConversationData): Promise<{ conversation: Conversation }> {
    const response = await api.post('/conversations', data);
    return response.data;
  },

  async updateConversation(id: string, data: UpdateConversationData): Promise<{ conversation: Conversation }> {
    const response = await api.patch(`/conversations/${id}`, data);
    return response.data;
  },

  async rateConversation(id: string, rating: number): Promise<{ conversation: Conversation }> {
    const response = await api.patch(`/conversations/${id}`, { rating });
    return response.data;
  },

  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/conversations/${id}`);
  }
};