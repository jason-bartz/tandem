'use client';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ActivityChart({ data }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y;
            if (context.datasetIndex === 2) {
              label += '%';
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  const chartData = {
    labels: data.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Total Plays',
        data: data.map((d) => d.plays),
        borderColor: 'rgb(56, 189, 248)',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Completions',
        data: data.map((d) => d.completions),
        borderColor: 'rgb(52, 211, 153)',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Unique Players',
        data: data.map((d) => d.uniquePlayers),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height: '300px' }}>
      <Line options={options} data={chartData} />
    </div>
  );
}

export function CompletionRateChart({ data }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.parsed.x}% completion (${context.raw.completed}/${context.raw.played} games)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function (value) {
            return value + '%';
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  };

  const chartData = {
    labels: data.map((d) => d.theme.substring(0, 30) + (d.theme.length > 30 ? '...' : '')),
    datasets: [
      {
        label: 'Completion Rate',
        data: data.map((d) => ({
          x: d.completionRate,
          y: d.theme,
          played: d.played,
          completed: d.completed,
        })),
        backgroundColor: data.map((d) => {
          if (d.completionRate >= 80) {
            return 'rgba(52, 211, 153, 0.8)';
          }
          if (d.completionRate >= 60) {
            return 'rgba(56, 189, 248, 0.8)';
          }
          return 'rgba(251, 191, 36, 0.8)';
        }),
        borderColor: data.map((d) => {
          if (d.completionRate >= 80) {
            return 'rgb(52, 211, 153)';
          }
          if (d.completionRate >= 60) {
            return 'rgb(56, 189, 248)';
          }
          return 'rgb(251, 191, 36)';
        }),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div style={{ height: `${Math.max(200, data.length * 50)}px` }}>
      <Bar options={options} data={chartData} />
    </div>
  );
}

export function MetricsOverview({ stats }) {
  const metrics = [
    {
      label: 'Engagement Rate',
      value: stats.played > 0 ? Math.round((stats.uniquePlayers / stats.views) * 100) : 0,
      suffix: '%',
      color: 'blue',
      description: 'Unique players / Total views',
    },
    {
      label: 'Return Rate',
      value:
        stats.uniquePlayers > 0
          ? Math.round(((stats.played - stats.uniquePlayers) / stats.uniquePlayers) * 100)
          : 0,
      suffix: '%',
      color: 'purple',
      description: 'Returning players',
    },
    {
      label: 'Perfect Game Rate',
      value: stats.completed > 0 ? Math.round((stats.perfectGames / stats.completed) * 100) : 0,
      suffix: '%',
      color: 'green',
      description: '0 mistakes completions',
    },
    {
      label: 'Share Rate',
      value: stats.completed > 0 ? Math.round((stats.gamesShared / stats.completed) * 100) : 0,
      suffix: '%',
      color: 'pink',
      description: 'Completed games shared',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {metric.label}
            </span>
            <span
              className={`text-2xl font-bold text-${metric.color}-600 dark:text-${metric.color}-400`}
            >
              {metric.value}
              {metric.suffix}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{metric.description}</div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-${metric.color}-400 to-${metric.color}-600 transition-all duration-500`}
              style={{ width: `${Math.min(100, metric.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
