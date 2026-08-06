// Analytics dashboard — /admin/analytics
'use client';

import { useEffect, useState } from 'react';
import {
  fetchAnalyticsSummary,
  fetchAnalyticsConfig,
  updateAnalyticsConfig,
} from '@/lib/admin-api-client';
import { Icon } from '@/components/ui/Icon';

interface SummaryData {
  total_views: number;
  unique_visitors: number;
  top_articles: Array<{ slug: string; views: number }>;
  daily_trend: Array<{ day: string; views: number }>;
  by_lang: { es: number; en: number };
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [days, setDays] = useState<number>(30);
  const [langFilter, setLangFilter] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [days, langFilter, deviceFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, configRes] = await Promise.all([
        fetchAnalyticsSummary({
          days,
          lang: langFilter || undefined,
          device_type: deviceFilter || undefined,
        }),
        fetchAnalyticsConfig(),
      ]);
      setSummary(summaryRes.data);
      setRetentionDays(configRes.data.retention_days);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRetention() {
    setSaving(true);
    try {
      await updateAnalyticsConfig(retentionDays);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const maxTrend = summary ? Math.max(...summary.daily_trend.map((d) => d.views), 1) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button onClick={loadData} className="mt-2 text-red-600 underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="bar_chart" size="lg" />
        Analytics
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dispositivo</label>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total vistas</p>
            <p className="text-3xl font-bold text-gray-900">{summary.total_views.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Visitantes únicos</p>
            <p className="text-3xl font-bold text-gray-900">{summary.unique_visitors.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">ES / EN</p>
            <p className="text-3xl font-bold text-gray-900">
              {summary.by_lang.es} <span className="text-lg text-gray-400">/</span> {summary.by_lang.en}
            </p>
          </div>
        </div>
      )}

      {/* Daily trend chart */}
      {summary && summary.daily_trend.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia diaria</h2>
          <div className="flex items-end gap-1 h-40">
            {summary.daily_trend.map((d) => (
              <div
                key={d.day}
                className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors relative group"
                style={{ height: `${(d.views / maxTrend) * 100}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {d.day}: {d.views}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top articles */}
      {summary && summary.top_articles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 artículos</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">#</th>
                <th className="text-left py-2 text-gray-500 font-medium">Slug</th>
                <th className="text-right py-2 text-gray-500 font-medium">Vistas</th>
              </tr>
            </thead>
            <tbody>
              {summary.top_articles.map((article, idx) => (
                <tr key={article.slug} className="border-b border-gray-100">
                  <td className="py-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2 text-gray-900 font-mono text-xs">{article.slug}</td>
                  <td className="py-2 text-right text-gray-900 font-semibold">{article.views.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && summary.top_articles.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          No hay datos de analytics para el período seleccionado.
        </div>
      )}

      {/* Retention config */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">Retención de eventos (días):</label>
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24"
          />
          <button
            onClick={handleSaveRetention}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
