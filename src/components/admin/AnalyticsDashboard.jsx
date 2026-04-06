'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import adminService from '@/services/admin.service';
import logger from '@/lib/logger';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const RANGE_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

// Use CSS variable-aware colors that work in both light and dark mode
const GAME_COLORS = {
  mini: { border: 'rgb(255, 206, 0)', bg: 'rgba(255, 206, 0, 0.15)' },
  alchemy: { border: 'rgb(126, 217, 87)', bg: 'rgba(126, 217, 87, 0.15)' },
  tandem: { border: 'rgb(56, 182, 255)', bg: 'rgba(56, 182, 255, 0.15)' },
  reel: { border: 'rgb(255, 87, 87)', bg: 'rgba(255, 87, 87, 0.15)' },
};

function formatPeriodLabel(period, type) {
  if (type === 'monthly') {
    const d = new Date(period + '-01');
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  // weekly — show "Mon DD"
  const d = new Date(period);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(seconds) {
  if (!seconds) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function MetricCard({ label, value, sub, color = 'text-text-primary' }) {
  return (
    <div className="bg-bg-card rounded-lg p-4">
      <div className={`text-xl font-bold ${color}`}>
        {value !== null && value !== undefined ? value.toLocaleString() : '--'}
      </div>
      <div className="text-xs font-bold text-text-secondary mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-bg-card rounded-lg p-4">
      <h4 className="text-sm font-bold text-text-primary mb-4">{title}</h4>
      {children}
    </div>
  );
}

const baseLineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
    },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(128,128,128,0.1)' },
      ticks: { font: { size: 10 } },
    },
  },
  interaction: { mode: 'nearest', axis: 'x', intersect: false },
};

function GameCompletionsChart({ data, period }) {
  const labels = data.map((d) => formatPeriodLabel(d.period, period));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Mini',
        data: data.map((d) => d.mini),
        borderColor: GAME_COLORS.mini.border,
        backgroundColor: GAME_COLORS.mini.bg,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Daily Alchemy',
        data: data.map((d) => d.alchemy),
        borderColor: GAME_COLORS.alchemy.border,
        backgroundColor: GAME_COLORS.alchemy.bg,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Daily Tandem',
        data: data.map((d) => d.tandem),
        borderColor: GAME_COLORS.tandem.border,
        backgroundColor: GAME_COLORS.tandem.bg,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Reel Connections',
        data: data.map((d) => d.reel),
        borderColor: GAME_COLORS.reel.border,
        backgroundColor: GAME_COLORS.reel.bg,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height: '300px' }}>
      <Line options={baseLineOptions} data={chartData} />
    </div>
  );
}

function PlayersChart({ data, period }) {
  const labels = data.map((d) => formatPeriodLabel(d.period, period));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Active Players',
        data: data.map((d) => d.activePlayers),
        borderColor: 'rgb(56, 189, 248)',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'New Signups',
        data: data.map((d) => d.newUsers),
        borderColor: 'rgb(126, 217, 87)',
        backgroundColor: 'rgba(126, 217, 87, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height: '280px' }}>
      <Line options={baseLineOptions} data={chartData} />
    </div>
  );
}

function FirstDiscoveriesChart({ data, period }) {
  const labels = data.map((d) => formatPeriodLabel(d.period, period));

  // Compute cumulative total
  let cumulative = 0;
  const cumulativeData = data.map((d) => {
    cumulative += d.firstDiscoveries;
    return cumulative;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'First Discoveries',
        data: data.map((d) => d.firstDiscoveries),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Cumulative Total',
        data: cumulativeData,
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.05)',
        tension: 0.3,
        borderDash: [4, 4],
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    ...baseLineOptions,
    scales: {
      ...baseLineOptions.scales,
      y: {
        ...baseLineOptions.scales.y,
        position: 'left',
        title: { display: true, text: 'Per Period', font: { size: 10 } },
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 10 } },
        title: { display: true, text: 'Cumulative', font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height: '280px' }}>
      <Line options={options} data={chartData} />
    </div>
  );
}

function TimeSpentChart({ data, period }) {
  const labels = data.map((d) => formatPeriodLabel(d.period, period));

  const options = {
    ...baseLineOptions,
    plugins: {
      ...baseLineOptions.plugins,
      tooltip: {
        ...baseLineOptions.plugins.tooltip,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatTime(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      ...baseLineOptions.scales,
      y: {
        ...baseLineOptions.scales.y,
        ticks: {
          font: { size: 10 },
          callback: (v) => formatTime(v),
        },
      },
    },
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Mini',
        data: data.map((d) => d.miniTime),
        borderColor: GAME_COLORS.mini.border,
        backgroundColor: GAME_COLORS.mini.bg,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Daily Alchemy',
        data: data.map((d) => d.alchemyTime),
        borderColor: GAME_COLORS.alchemy.border,
        backgroundColor: GAME_COLORS.alchemy.bg,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height: '280px' }}>
      <Line options={options} data={chartData} />
    </div>
  );
}

function GameBreakdownChart({ totals }) {
  const games = [
    { label: 'Daily Mini', value: totals.totalMini, color: GAME_COLORS.mini.border },
    { label: 'Daily Alchemy', value: totals.totalAlchemy, color: GAME_COLORS.alchemy.border },
    { label: 'Daily Tandem', value: totals.totalTandem, color: GAME_COLORS.tandem.border },
    { label: 'Reel Connections', value: totals.totalReel, color: GAME_COLORS.reel.border },
  ];

  const chartData = {
    labels: games.map((g) => g.label),
    datasets: [
      {
        data: games.map((g) => g.value),
        backgroundColor: games.map((g) => g.color),
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.x.toLocaleString()} completions`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(128,128,128,0.1)' },
        ticks: { font: { size: 10 } },
      },
      y: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } },
    },
  };

  return (
    <div style={{ height: '160px' }}>
      <Bar options={options} data={chartData} />
    </div>
  );
}

function PlatformBreakdownChart({ platform }) {
  const known = platform.web + platform.ios;
  const hasData = known > 0;

  const chartData = {
    labels: ['Web', 'iOS', 'Unknown'],
    datasets: [
      {
        data: [platform.web, platform.ios, platform.unknown],
        backgroundColor: ['rgb(56, 182, 255)', 'rgb(255, 87, 87)', 'rgb(156, 163, 175)'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            const pct = platform.total > 0 ? ((value / platform.total) * 100).toFixed(1) : 0;
            return `${ctx.label}: ${value.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div>
      {hasData ? (
        <div className="flex flex-col items-center gap-3">
          <div style={{ height: '180px', width: '180px' }}>
            <Doughnut options={options} data={chartData} />
          </div>
          <div className="flex gap-4 text-xs font-bold text-text-secondary">
            <span>
              Web: {platform.web.toLocaleString()} ({platform.total > 0 ? ((platform.web / platform.total) * 100).toFixed(1) : 0}%)
            </span>
            <span>
              iOS: {platform.ios.toLocaleString()} ({platform.total > 0 ? ((platform.ios / platform.total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          {platform.unknown > 0 && (
            <p className="text-[10px] text-text-muted">
              {platform.unknown.toLocaleString()} users haven&apos;t signed in since tracking began
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-8">
          No platform data yet. Data populates as users sign in.
        </p>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [range, setRange] = useState(90);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await adminService.getAuthHeaders();
      const res = await fetch(`/api/admin/analytics?days=${range}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
      setData(json.data);
    } catch (err) {
      logger.error('Failed to load analytics', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const periodData = data?.[period] || [];
  const totals = data?.totals || {};
  const platform = data?.platform || { web: 0, ios: 0, unknown: 0, total: 0 };

  if (loading) {
    return (
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 py-4 border-b border-border-light">
          <h2 className="text-lg font-bold text-text-primary">Analytics</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 h-16 skeleton-shimmer"
              />
            ))}
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-lg">
      <div className="px-4 py-4 border-b border-border-light">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-text-primary">Analytics</h2>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border border-border-main rounded-lg bg-bg-card text-text-primary font-bold text-xs cursor-pointer focus:outline-none"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              className="px-3 py-1.5 border border-border-main rounded-lg bg-bg-card text-text-primary font-bold text-xs cursor-pointer focus:outline-none"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-accent-red/20 rounded-lg p-3">
          <p className="text-accent-red font-bold text-sm">{error}</p>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Total Completions"
            value={totals.totalCompletions}
            sub={`Last ${range} days`}
          />
          <MetricCard
            label="New Users"
            value={totals.totalNewUsers}
            color="text-accent-green"
            sub={`Last ${range} days`}
          />
          <MetricCard
            label="First Discoveries"
            value={totals.totalFirstDiscoveries}
            color="text-accent-purple"
            sub="Creative mode"
          />
          <MetricCard
            label="Time Played"
            value={formatTime(totals.totalMiniTime + totals.totalAlchemyTime)}
            color="text-accent-blue"
            sub="Mini + Alchemy"
          />
        </div>

        {/* Game Completions Over Time */}
        <ChartCard title="Game Completions">
          <GameCompletionsChart data={periodData} period={period} />
        </ChartCard>

        {/* Two-column layout for smaller charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Players */}
          <ChartCard title="Players">
            <PlayersChart data={periodData} period={period} />
          </ChartCard>

          {/* Game Breakdown */}
          <ChartCard title="Completion Breakdown">
            <GameBreakdownChart totals={totals} />
          </ChartCard>
        </div>

        {/* Platform Breakdown */}
        <ChartCard title="Platform Breakdown">
          <PlatformBreakdownChart platform={platform} />
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* First Discoveries */}
          <ChartCard title="Alchemy First Discoveries">
            <FirstDiscoveriesChart data={periodData} period={period} />
          </ChartCard>

          {/* Time Spent */}
          <ChartCard title="Time Spent Playing">
            <TimeSpentChart data={periodData} period={period} />
          </ChartCard>
        </div>

        {/* Data note */}
        <p className="text-[10px] text-text-muted">
          Tandem and Reel data based on leaderboard submissions (users with accounts). Mini and
          Alchemy data from full completion records.
        </p>
      </div>
    </div>
  );
}
