import api from "./api";
import { User } from "./authService";

export interface Prompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePromptData {
  name: string;
  content: string;
}

export interface UpdatePromptData {
  name?: string;
  content?: string;
  isActive?: boolean;
}

export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  apiKeySet: boolean;
}

export const configService = {
  async getPrompts(): Promise<{ prompts: Prompt[] }> {
    const response = await api.get("/config/prompts");
    return response.data;
  },

  async createPrompt(data: CreatePromptData): Promise<{ prompt: Prompt }> {
    const response = await api.post("/config/prompts", data);
    return response.data;
  },

  async updatePrompt(
    id: string,
    data: UpdatePromptData
  ): Promise<{ prompt: Prompt }> {
    const response = await api.patch(`/config/prompts/${id}`, data);
    return response.data;
  },

  async deletePrompt(id: string): Promise<void> {
    await api.delete(`/config/prompts/${id}`);
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get("/config/profile");
    return response.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<{ user: User }> {
    const response = await api.patch("/config/profile", data);
    return response.data;
  },

  async getAIConfig(): Promise<{ config: AIConfig }> {
    const response = await api.get("/config/ai-config");
    return response.data;
  },
};
