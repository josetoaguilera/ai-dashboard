"use client";

import { useToast } from "@/contexts/ToastContext";
import { AIConfig, configService, Prompt } from "@/services/configService";
import {
  CheckCircleIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import React, { useCallback, useEffect, useState } from "react";

export default function SettingsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    isActive: false,
  });
  const { error, success } = useToast();

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const [promptsResponse, configResponse] = await Promise.all([
        configService.getPrompts(),
        configService.getAIConfig(),
      ]);
      setPrompts(promptsResponse.prompts);
      setAiConfig(configResponse.config);
    } catch (err) {
      error(
        "Error cargando configuración",
        "No se pudo cargar la configuración"
      );
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.createPrompt(formData);
      success("Prompt creado", "El prompt se ha creado exitosamente");
      setShowCreateForm(false);
      setFormData({ name: "", content: "", isActive: false });
      loadPrompts();
    } catch (err) {
      error("Error creando prompt", "No se pudo crear el prompt");
    }
  };

  const handleUpdatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;

    try {
      await configService.updatePrompt(editingPrompt.id, formData);
      success("Prompt actualizado", "El prompt se ha actualizado exitosamente");
      setEditingPrompt(null);
      setFormData({ name: "", content: "", isActive: false });
      loadPrompts();
    } catch (err) {
      error("Error actualizando prompt", "No se pudo actualizar el prompt");
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este prompt?")) return;

    try {
      await configService.deletePrompt(id);
      success("Prompt eliminado", "El prompt se ha eliminado exitosamente");
      loadPrompts();
    } catch (err) {
      error("Error eliminando prompt", "No se pudo eliminar el prompt");
    }
  };

  const handleEditClick = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      isActive: prompt.isActive,
    });
    setShowCreateForm(false);
  };

  const handleToggleActive = async (prompt: Prompt) => {
    try {
      await configService.updatePrompt(prompt.id, {
        isActive: !prompt.isActive,
      });
      success(
        "Prompt actualizado",
        `El prompt "${prompt.name}" ha sido ${
          !prompt.isActive ? "activado" : "desactivado"
        }`
      );
      loadPrompts();
    } catch (err) {
      error(
        "Error actualizando prompt",
        "No se pudo cambiar el estado del prompt"
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setShowCreateForm(false);
    setFormData({ name: "", content: "", isActive: false });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona los prompts y configuraciones del sistema
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingPrompt(null);
              setFormData({ name: "", content: "", isActive: false });
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Prompt
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingPrompt) && (
        <div className="mb-6 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {editingPrompt ? "Editar Prompt" : "Crear Nuevo Prompt"}
            </h3>
          </div>
          <div className="p-6">
            <form
              onSubmit={editingPrompt ? handleUpdatePrompt : handleCreatePrompt}
            >
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Contenido
                  </label>
                  <textarea
                    id="content"
                    rows={4}
                    required
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Escribe el contenido del prompt aquí..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Prompt activo
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingPrompt ? "Actualizar" : "Crear"} Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Configuration Section */}
      <div className="mb-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Configuración de IA
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Configuración actual del modelo y API de inteligencia artificial
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <GlobeAltIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 font-mono">
                  {aiConfig?.baseUrl || "Cargando..."}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo de IA
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {aiConfig?.model || "Cargando..."}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de API Key
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <div
                  className={`w-2 h-2 ${
                    aiConfig?.apiKeySet ? "bg-green-400" : "bg-red-400"
                  } rounded-full mr-2`}
                ></div>
                <span className="text-sm text-gray-900">
                  {aiConfig?.apiKeySet ? "Configurada" : "No configurada"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedor
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-900">
                  {aiConfig?.baseUrl?.includes("aimlapi.com")
                    ? "AIML API"
                    : aiConfig?.baseUrl?.includes("openai.com")
                    ? "OpenAI"
                    : "Personalizado"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="mb-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Perfil de Usuario
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Información de tu cuenta y preferencias
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Usuario
                  </label>
                  <p className="text-sm text-gray-900">
                    admin@ai-dashboard.com
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Administrador
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Último Acceso
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date().toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sesiones Activas
                  </label>
                  <p className="text-sm text-gray-900">1 dispositivo</p>
                </div>
              </div>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Editar Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Prompts Configurados
            </h3>
          </div>
        </div>

        {prompts.length === 0 ? (
          <div className="text-center py-12">
            <Cog6ToothIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay prompts configurados</p>
            <p className="text-sm text-gray-400">
              Crea tu primer prompt para empezar
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {prompt.name}
                      </p>
                      {prompt.isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {prompt.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Creado el{" "}
                      {new Date(prompt.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(prompt)}
                      className={`p-2 rounded-md ${
                        prompt.isActive
                          ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                      title={
                        prompt.isActive ? "Desactivar prompt" : "Activar prompt"
                      }
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditClick(prompt)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
