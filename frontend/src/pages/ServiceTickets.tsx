import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Ticket, Project } from '../types';
import { Plus, Wrench, X } from 'lucide-react';

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  FEATURE_REQUEST: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  WAITING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function ServiceTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', priority: 'MEDIUM' });

  const fetchTickets = async () => {
    const res = await api.get('/tickets?type=SERVICE');
    setTickets(res.data);
  };

  useEffect(() => {
    fetchTickets();
    api.get('/projects').then((r) => setProjects(r.data));
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/tickets', { ...form, type: 'SERVICE' });
      setShowCreate(false);
      setForm({ projectId: '', title: '', description: '', priority: 'MEDIUM' });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-6 h-6" /> Ticket di Servizio
        </h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm">
          <Plus className="w-4 h-4" /> Nuovo Ticket Servizio
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        I ticket di servizio sono visibili solo agli admin e non sono soggetti a SLA.
      </p>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nuovo Ticket di Servizio</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progetto</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Seleziona...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" rows={4} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="LOW">Bassa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Critica</option>
                </select>
              </div>
              <button onClick={handleCreate} disabled={!form.projectId || !form.title || !form.description}
                className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 disabled:opacity-50 text-sm font-medium">
                Crea Ticket Servizio
              </button>
            </div>
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Nessun ticket di servizio</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`}
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-l-4 border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{t.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{t.project?.name}</span>
                    <span>·</span>
                    <span>{t.creator?.name}</span>
                    <span>·</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[t.priority]}`}>
                    {t.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
