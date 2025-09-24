'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService, RatingDistribution, ChannelDistribution, WorstPrompts } from '@/services/analyticsService';
import { useToast } from '@/contexts/ToastContext';
import { ChartBarIcon, StarIcon, GlobeAltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsPage() {
  const [ratingData, setRatingData] = useState<RatingDistribution | null>(null);
  const [channelData, setChannelData] = useState<ChannelDistribution | null>(null);
  const [worstPrompts, setWorstPrompts] = useState<WorstPrompts | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [ratings, channels, prompts] = await Promise.all([
        analyticsService.getRatingDistribution(),
        analyticsService.getChannelDistribution(),
        analyticsService.getWorstPrompts(5)
      ]);
      
      setRatingData(ratings);
      setChannelData(channels);
      setWorstPrompts(prompts);
    } catch (err) {
      error('Error cargando analytics', 'No se pudieron cargar los datos de análisis');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const ratingChartData = {
    labels: ratingData?.distribution.map(item => `${item.rating} estrellas`) || [],
    datasets: [
      {
        data: ratingData?.distribution.map(item => item.count) || [],
        backgroundColor: [
          '#EF4444', // 1 star - red
          '#F97316', // 2 stars - orange
          '#EAB308', // 3 stars - yellow
          '#22C55E', // 4 stars - green
          '#10B981', // 5 stars - emerald
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const channelChartData = {
    labels: channelData?.distribution.map(item => item.channel) || [],
    datasets: [
      {
        label: 'Conversaciones por Canal',
        data: channelData?.distribution.map(item => item.count) || [],
        backgroundColor: [
          '#3B82F6', // Blue
          '#10B981', // Green
          '#8B5CF6', // Purple
          '#F59E0B', // Amber
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
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
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Análisis detallado de tus conversaciones de IA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <StarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Distribución de Calificaciones
              </h3>
            </div>
          </div>
          <div className="p-6">
            <div className="h-80 flex items-center justify-center">
              {ratingData && ratingData.distribution.length > 0 ? (
                <Doughnut data={ratingChartData} options={chartOptions} />
              ) : (
                <div className="text-center text-gray-500">
                  <StarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay datos de calificaciones disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Conversaciones por Canal
              </h3>
            </div>
          </div>
          <div className="p-6">
            <div className="h-80 flex items-center justify-center">
              {channelData && channelData.distribution.length > 0 ? (
                <Bar data={channelChartData} options={chartOptions} />
              ) : (
                <div className="text-center text-gray-500">
                  <GlobeAltIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay datos de canales disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Statistics Table */}
      {ratingData && ratingData.distribution.length > 0 && (
        <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Estadísticas Detalladas de Calificaciones
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ratingData.distribution.map((item) => (
                  <tr key={item.rating}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {item.rating} {item.rating === 1 ? 'estrella' : 'estrellas'}
                        </span>
                        <div className="ml-2">
                          {'⭐'.repeat(item.rating)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Channel Statistics Table */}
      {channelData && channelData.distribution.length > 0 && (
        <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Estadísticas Detalladas de Canales
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {channelData.distribution.map((item) => (
                  <tr key={item.channel}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 5 Worst Performing Prompts */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Top 5 Prompts con Peor Rating
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Prompts que requieren atención y mejora
          </p>
        </div>
        
        {worstPrompts && worstPrompts.prompts.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Prompt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rating Promedio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Usos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Contenido
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {worstPrompts.prompts.map((prompt, index) => (
                  <tr key={prompt.id} className={index === 0 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                          index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prompt.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {prompt.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-red-400 mr-1" />
                        <span className={`text-sm font-medium ${
                          prompt.avgRating < 2 ? 'text-red-600' : 
                          prompt.avgRating < 3 ? 'text-orange-600' : 
                          'text-yellow-600'
                        }`}>
                          {prompt.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prompt.usageCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {prompt.content}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos de prompts con ratings bajos</p>
            <p className="text-sm">Los prompts aparecerán aquí cuando tengan calificaciones</p>
          </div>
        )}
      </div>
    </div>
  );
}