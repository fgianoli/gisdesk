import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Project } from '../types';

interface OverviewData {
  totTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionHours: number;
  slaCompliance: number;
}

interface AgentData {
  id: string;
  name: string;
  email: string;
  totalAssigned: number;
  resolved: number;
  avgResolutionHours: number;
  openTickets: number;
  slaBreaches: number;
}

interface StatusData { status: string; count: number }
interface PriorityData { priority: string; count: number }
interface ProjectData { name: string; count: number }
interface TrendData { date: string; count: number }

const statusLabels: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Corso',
  WAITING: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
};

const statusColors: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#6366f1',
  WAITING: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
  FEATURE_REQUEST: 'Feature',
};

const priorityColors: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
  FEATURE_REQUEST: '#8b5cf6',
};

// Simple Donut Chart using SVG stroke-dasharray
function DonutChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-gray-400 text-sm text-center py-8">Nessun dato</p>;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data.map((d) => {
    const pct = d.count / total;
    const dash = pct * circumference;
    const seg = { ...d, dash, offset: offset * circumference };
    offset += pct;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="24" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={statusColors[seg.status] || '#6b7280'}
            strokeWidth="24"
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset + circumference / 4}
            transform="rotate(-90 90 90)"
          />
        ))}
        <text x="90" y="86" textAnchor="middle" className="text-lg font-bold" style={{ fontSize: 24, fontWeight: 700, fill: '#1f2937' }}>{total}</text>
        <text x="90" y="106" textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280' }}>totale</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[seg.status] || '#6b7280' }} />
            <span className="text-gray-700">{statusLabels[seg.status] || seg.status}</span>
            <span className="font-semibold text-gray-900 ml-auto">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Vertical Bar Chart
function BarChart({ data, colors, labels }: { data: { key: string; count: number }[], colors: Record<string, string>, labels: Record<string, string> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartH = 120;

  return (
    <div className="flex items-end gap-3 pt-2">
      {data.map((d) => {
        const barH = Math.max(4, (d.count / max) * chartH);
        return (
          <div key={d.key} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs font-semibold text-gray-700">{d.count}</span>
            <div
              className="w-full rounded-t"
              style={{ height: barH, backgroundColor: colors[d.key] || '#6b7280' }}
            />
            <span className="text-xs text-gray-500 text-center leading-tight">{labels[d.key] || d.key}</span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal Bar Chart for projects
function HorizontalBarChart({ data }: { data: ProjectData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32 truncate flex-shrink-0" title={d.name}>{d.name}</span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded transition-all"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 w-8 text-right">{d.count}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-gray-400 text-sm">Nessun dato</p>}
    </div>
  );
}

// Line chart for trend
function LineChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) return <p className="text-gray-400 text-sm text-center py-8">Nessun dato</p>;

  const W = 500;
  const H = 120;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => {
    const x = padL + (i / (data.length - 1)) * chartW;
    const y = padT + chartH - (d.count / maxVal) * chartH;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},${padT + chartH} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${padT + chartH} Z`;

  // Show every 7th label
  const labelIndices = new Set([0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1]);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Area */}
      <path d={areaPath} fill="#3b82f620" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3b82f6" />
      ))}
      {/* X-axis labels */}
      {points.map((p, i) => labelIndices.has(i) && (
        <text key={i} x={p.x} y={H - 2} textAnchor="middle" style={{ fontSize: 10, fill: '#9ca3af' }}>
          {p.date.slice(5)}
        </text>
      ))}
      {/* Y-axis */}
      <text x={padL - 4} y={padT + 4} textAnchor="end" style={{ fontSize: 10, fill: '#9ca3af' }}>{maxVal}</text>
      <text x={padL - 4} y={padT + chartH} textAnchor="end" style={{ fontSize: 10, fill: '#9ca3af' }}>0</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [byStatus, setByStatus] = useState<StatusData[]>([]);
  const [byPriority, setByPriority] = useState<PriorityData[]>([]);
  const [byProject, setByProject] = useState<ProjectData[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Time export state
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeExport, setTimeExport] = useState({ projectId: '', from: '', to: '' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    const load = async () => {
      try {
        const [ov, bs, bp, bproj, tr, ag, proj] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/by-status'),
          api.get('/analytics/by-priority'),
          api.get('/analytics/by-project'),
          api.get('/analytics/trend'),
          api.get('/analytics/agents'),
          api.get('/projects'),
        ]);
        setOverview(ov.data);
        setByStatus(bs.data);
        setByPriority(bp.data);
        setByProject(bproj.data);
        setTrend(tr.data);
        setAgents(ag.data);
        setProjects(proj.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, navigate]);

  const handleTimeExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (timeExport.projectId) params.set('projectId', timeExport.projectId);
      if (timeExport.from) params.set('from', timeExport.from);
      if (timeExport.to) params.set('to', timeExport.to);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/time-entries/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Errore durante l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Caricamento analytics...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Totale Ticket</p>
            <p className="text-3xl font-bold text-gray-900">{overview.totTickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Aperti</p>
            <p className="text-3xl font-bold text-blue-600">{overview.openTickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Risolti</p>
            <p className="text-3xl font-bold text-green-600">{overview.resolvedTickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">SLA Compliance</p>
            <p className={`text-3xl font-bold ${overview.slaCompliance >= 80 ? 'text-green-600' : overview.slaCompliance >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overview.slaCompliance}%
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Donut chart - ticket per status */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Ticket per Stato</h2>
          <DonutChart data={byStatus} />
        </div>

        {/* Bar chart - ticket per priority */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Ticket per Priorità</h2>
          <BarChart
            data={byPriority.map((d) => ({ key: d.priority, count: d.count }))}
            colors={priorityColors}
            labels={priorityLabels}
          />
        </div>
      </div>

      {/* Trend - line chart */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Nuovi Ticket (ultimi 30 giorni)</h2>
        <LineChart data={trend} />
      </div>

      {/* Horizontal bars - ticket per project */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Ticket per Progetto</h2>
        <HorizontalBarChart data={byProject} />
      </div>

      {/* Agent Performance */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Performance Agenti</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun dato disponibile.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Agente</th>
                  <th className="px-3 py-2 text-right">Assegnati</th>
                  <th className="px-3 py-2 text-right">Risolti</th>
                  <th className="px-3 py-2 text-right">Aperti</th>
                  <th className="px-3 py-2 text-right">Avg Risoluzione (h)</th>
                  <th className="px-3 py-2 text-right">Violazioni SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{agent.name}</div>
                      <div className="text-xs text-gray-400">{agent.email}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{agent.totalAssigned}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-semibold">{agent.resolved}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{agent.openTickets}</td>
                    <td className="px-3 py-2 text-right">{agent.avgResolutionHours}h</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-semibold ${agent.slaBreaches > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {agent.slaBreaches}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Time Tracking Export */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Export Ore Lavorate</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Progetto</label>
            <select
              value={timeExport.projectId}
              onChange={(e) => setTimeExport({ ...timeExport, projectId: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Tutti i progetti</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Da</label>
            <input
              type="date"
              value={timeExport.from}
              onChange={(e) => setTimeExport({ ...timeExport, from: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">A</label>
            <input
              type="date"
              value={timeExport.to}
              onChange={(e) => setTimeExport({ ...timeExport, to: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleTimeExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Export...' : 'Esporta CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
