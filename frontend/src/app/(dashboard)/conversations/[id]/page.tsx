"use client";

import { useToast } from "@/contexts/ToastContext";
import {
  Conversation,
  conversationService,
} from "@/services/conversationService";
import { Message, messageService } from "@/services/messageService";
import {
  ArrowLeftIcon,
  ComputerDesktopIcon,
  PaperAirplaneIcon,
  StarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { error, success } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const conversationId = params.id as string;

  useEffect(() => {
    if (conversationId) {
      loadConversationData();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationData = async () => {
    try {
      setLoading(true);
      const [convData, messagesData] = await Promise.all([
        conversationService.getConversation(conversationId),
        messageService.getMessages(conversationId),
      ]);

      setConversation(convData.conversation);
      setMessages(messagesData.messages);
      setRating(convData.conversation.rating || null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar la conversación";
      error("Error", errorMessage);
      router.push("/conversations");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // Send message and get AI response
      const response = await messageService.sendMessage(
        conversationId,
        messageContent
      );

      // Reload messages to get the latest conversation
      const messagesData = await messageService.getMessages(conversationId);
      setMessages(messagesData.messages);

      // Clear any previous errors on successful send
      setLastError(null);
      success(
        "Mensaje enviado",
        "El mensaje se ha enviado y la IA ha respondido"
      );
    } catch (err: unknown) {
      let errorTitle = "Error";
      let errorMessage = "Error al enviar mensaje";

      if (err instanceof Error) {
        if (err.message.includes("Rate limit")) {
          errorTitle = "Límite de solicitudes alcanzado";
          errorMessage = err.message;
          setLastError("rate-limit");
        } else if (err.message.includes("Network")) {
          errorTitle = "Error de conexión";
          errorMessage =
            "Problemas de conectividad. Verifica tu conexión a internet.";
          setLastError("network");
        } else if (err.message.includes("timeout")) {
          errorTitle = "Tiempo de espera agotado";
          errorMessage =
            "El servidor tardó demasiado en responder. Intenta nuevamente.";
          setLastError("timeout");
        } else {
          errorMessage = err.message;
          setLastError("general");
        }
      }

      error(errorTitle, errorMessage);
      // Re-add the message to input on error
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleRating = async (newRating: number) => {
    try {
      await conversationService.rateConversation(conversationId, newRating);
      setRating(newRating);
      setConversation((prev) => (prev ? { ...prev, rating: newRating } : null));
      success(
        "Calificación guardada",
        `Has calificado esta conversación con ${newRating} estrellas`
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al calificar";
      error("Error", errorMessage);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Conversación no encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/conversations")}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {conversation.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Canal: {conversation.channel}</span>
                <span>Estado: {conversation.status}</span>
                <span>ID: {conversation.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Calificar:</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  {rating && star <= rating ? (
                    <StarIconSolid className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-5 w-5 text-gray-300 hover:text-yellow-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay mensajes aún. ¡Envía el primer mensaje!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "USER" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "USER"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.role === "USER" ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <ComputerDesktopIcon className="h-4 w-4" />
                  )}
                  <span className="text-xs opacity-75">
                    {message.role === "USER" ? "Tú" : "IA"}
                  </span>
                  <span className="text-xs opacity-75">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200">
        {/* Error Banner */}
        {lastError && (
          <div
            className={`px-4 py-3 border-b ${
              lastError === "rate-limit"
                ? "bg-yellow-50 border-yellow-200"
                : lastError === "network"
                ? "bg-red-50 border-red-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 ${
                    lastError === "rate-limit"
                      ? "text-yellow-400"
                      : lastError === "network"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {lastError === "rate-limit" && (
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {lastError === "network" && (
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {(lastError === "general" || lastError === "timeout") && (
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      lastError === "rate-limit"
                        ? "text-yellow-800"
                        : lastError === "network"
                        ? "text-red-800"
                        : "text-gray-800"
                    }`}
                  >
                    {lastError === "rate-limit" &&
                      "Límite de solicitudes alcanzado"}
                    {lastError === "network" && "Problema de conexión"}
                    {lastError === "timeout" && "Tiempo de espera agotado"}
                    {lastError === "general" && "Error del sistema"}
                  </p>
                  <p
                    className={`text-xs ${
                      lastError === "rate-limit"
                        ? "text-yellow-700"
                        : lastError === "network"
                        ? "text-red-700"
                        : "text-gray-700"
                    }`}
                  >
                    {lastError === "rate-limit" &&
                      "Espera unos minutos antes de enviar otro mensaje. Estamos en un plan gratuito con límites estrictos."}
                    {lastError === "network" &&
                      "Verifica tu conexión a internet e intenta nuevamente."}
                    {lastError === "timeout" &&
                      "El servidor tardó demasiado. Intenta enviar el mensaje nuevamente."}
                    {lastError === "general" &&
                      "Ocurrió un error inesperado. Intenta nuevamente en unos momentos."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLastError(null)}
                className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
              <span>{sending ? "Enviando..." : "Enviar"}</span>
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}
