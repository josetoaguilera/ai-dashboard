import api from "./api";

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: "USER" | "ASSISTANT";
  responseTimeMs?: number;
  createdAt: string;
  prompt?: {
    id: string;
    name: string;
  };
}

export interface SendMessageData {
  conversationId: string;
  content: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  aiMessage: Message;
}

export const messageService = {
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<SendMessageResponse> {
    try {
      const response = await api.post("/messages", { conversationId, content });
      return response.data;
    } catch (error: any) {
      // Handle specific error responses
      if (error.response) {
        const { status, data } = error.response;

        // Rate limiting errors
        if (status === 429 || data?.error?.includes("Rate limit")) {
          const rateLimitMessage =
            data?.error ||
            "Límite de solicitudes alcanzado. Espera un momento antes de enviar otro mensaje.";
          throw new Error(rateLimitMessage);
        }

        // Server errors
        if (status >= 500) {
          throw new Error(
            "Error del servidor. Nuestro equipo técnico está trabajando en solucionarlo."
          );
        }

        // Client errors
        if (status === 400) {
          throw new Error(
            "La solicitud no es válida. Verifica el contenido del mensaje."
          );
        }

        if (status === 401) {
          throw new Error(
            "Sesión expirada. Por favor, inicia sesión nuevamente."
          );
        }

        if (status === 403) {
          throw new Error("No tienes permisos para realizar esta acción.");
        }

        // Generic API error
        throw new Error(data?.error || `Error del servidor (${status})`);
      }

      // Network/connection errors
      if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Error de conexión. Verifica tu conexión a internet.");
      }

      // Timeout errors
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw new Error(
          "Tiempo de espera agotado. El servidor tardó demasiado en responder."
        );
      }

      // Generic error fallback
      throw new Error(
        error.message || "Error desconocido al enviar el mensaje"
      );
    }
  },

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    const response = await api.get(`/messages/conversation/${conversationId}`);
    return response.data;
  },
};
