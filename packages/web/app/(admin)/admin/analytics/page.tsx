// Analytics dashboard — /admin/analytics
'use client';

import { useEffect, useState } from 'react';
import {
  fetchAnalyticsSummary,
  fetchAnalyticsConfig,
  updateAnalyticsConfig,
  triggerAnalyticsAggregation,
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
  const [aggregating, setAggregating] = useState(false);
  const [aggregateMsg, setAggregateMsg] = useState<string | null>(null);

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

  async function handleAggregate() {
    setAggregating(true);
    setAggregateMsg(null);
    try {
      const res = await triggerAnalyticsAggregation();
      setAggregateMsg(`Actualizado en ${res.data.duration_ms} ms`);
      await loadData();
    } catch (err) {
      setAggregateMsg(`Error: ${(err as Error).message}`);
    } finally {
      setAggregating(false);
    }
  }

  const maxTrend = summary ? Math.max(...summary.daily_trend.map((d) => d.views), 1) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orys-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-orys-fail-soft border border-orys-fail rounded-orys-lg p-4">
          <p className="text-orys-fail">Error: {error}</p>
          <button onClick={loadData} className="mt-2 text-orys-fail underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orys-fg flex items-center gap-2">
        <Icon name="bar_chart" size="lg" />
        Analytics
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-orys-fg mb-1">Período</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-orys-line-strong rounded-orys-md px-3 py-2 text-sm"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-orys-fg mb-1">Idioma</label>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="border border-orys-line-strong rounded-orys-md px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-orys-fg mb-1">Dispositivo</label>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="border border-orys-line-strong rounded-orys-md px-3 py-2 text-sm"
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
          <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
            <p className="text-sm text-orys-fg-mute">Total vistas</p>
            <p className="text-3xl font-bold text-orys-fg">{summary.total_views.toLocaleString()}</p>
          </div>
          <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
            <p className="text-sm text-orys-fg-mute">Visitantes únicos</p>
            <p className="text-3xl font-bold text-orys-fg">{summary.unique_visitors.toLocaleString()}</p>
          </div>
          <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
            <p className="text-sm text-orys-fg-mute">ES / EN</p>
            <p className="text-3xl font-bold text-orys-fg">
              {summary.by_lang.es} <span className="text-lg text-orys-fg-mute">/</span> {summary.by_lang.en}
            </p>
          </div>
        </div>
      )}

      {/* Daily trend chart */}
      {summary && summary.daily_trend.length > 0 && (
        <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
          <h2 className="text-lg font-semibold text-orys-fg mb-4">Tendencia diaria</h2>
          <div className="flex items-end gap-1 h-40">
            {summary.daily_trend.map((d) => (
              <div
                key={d.day}
                className="flex-1 bg-orys-accent rounded-t-orys-md hover:bg-orys-accent-bright transition-colors relative group"
                style={{ height: `${(d.views / maxTrend) * 100}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-orys-fg text-orys-fg-on-accent text-xs rounded-orys-md px-2 py-1 whitespace-nowrap">
                  {d.day}: {d.views}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top articles */}
      {summary && summary.top_articles.length > 0 && (
        <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
          <h2 className="text-lg font-semibold text-orys-fg mb-4">Top 10 artículos</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orys-line">
                <th className="text-left py-2 text-orys-fg-mute font-medium">#</th>
                <th className="text-left py-2 text-orys-fg-mute font-medium">Slug</th>
                <th className="text-right py-2 text-orys-fg-mute font-medium">Vistas</th>
              </tr>
            </thead>
            <tbody>
              {summary.top_articles.map((article, idx) => (
                <tr key={article.slug} className="border-b border-orys-line">
                  <td className="py-2 text-orys-fg-mute">{idx + 1}</td>
                  <td className="py-2 text-orys-fg font-orys-mono text-xs">{article.slug}</td>
                  <td className="py-2 text-right text-orys-fg font-semibold">{article.views.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && summary.top_articles.length === 0 && (
        <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-8 text-center text-orys-fg-mute">
          No hay datos de analytics para el período seleccionado.
        </div>
      )}

      {/* Retention config */}
      <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
        <h2 className="text-lg font-semibold text-orys-fg mb-4">Configuración</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-orys-fg">Retención de eventos (días):</label>
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="border border-orys-line-strong rounded-orys-md px-3 py-2 text-sm w-24"
          />
          <button
            onClick={handleSaveRetention}
            disabled={saving}
            className="bg-orys-accent text-orys-fg-on-accent px-4 py-2 rounded-orys-md text-sm hover:bg-orys-accent-bright disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* On-demand aggregation — refreshes rollups without waiting for the cron at :05 */}
      <div className="bg-orys-bg-panel border border-orys-line rounded-orys-lg p-4">
        <h2 className="text-lg font-semibold text-orys-fg mb-2">Agregación manual</h2>
        <p className="text-sm text-orys-fg-mute mb-3">
          El rollup automático corre cada hora a los :05. Si querés ver datos
          en tiempo real (incluyendo la hora actual), apretá el botón.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAggregate}
            disabled={aggregating}
            className="bg-orys-ok text-orys-fg-on-accent px-4 py-2 rounded-orys-md text-sm hover:bg-orys-ok disabled:opacity-50"
          >
            {aggregating ? 'Agregando...' : 'Actualizar ahora'}
          </button>
          {aggregateMsg && (
            <span className="text-sm text-orys-fg-dim">{aggregateMsg}</span>
          )}
        </div>
      </div>
    </div>
  );
}
