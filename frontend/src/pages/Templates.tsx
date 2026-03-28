import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { TicketTemplate, Project } from '../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

const priorityLabels: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
  FEATURE_REQUEST: 'Feature Request',
};

const typeLabels: Record<string, string> = {
  STANDARD: 'Standard',
  SERVICE: 'Servizio',
};

const emptyForm = {
  name: '',
  titleTemplate: '',
  descriptionTemplate: '',
  priority: 'MEDIUM' as TicketTemplate['priority'],
  type: 'STANDARD' as TicketTemplate['type'],
  projectId: '',
};

export default function TemplatesPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TicketTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchTemplates();
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => {});
  }, [isAdmin, navigate]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (t: TicketTemplate) => {
    setEditItem(t);
    setForm({
      name: t.name,
      titleTemplate: t.titleTemplate,
      descriptionTemplate: t.descriptionTemplate,
      priority: t.priority,
      type: t.type,
      projectId: t.projectId || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        projectId: form.projectId || null,
      };
      if (editItem) {
        await api.put(`/templates/${editItem.id}`, payload);
      } else {
        await api.post('/templates', payload);
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch {
      alert('Errore nella cancellazione');
    }
  };

  const createDefaultTemplates = async () => {
    const defaults = [
      {
        name: 'Feature Request',
        titleTemplate: 'Richiesta funzionalità: ',
        descriptionTemplate: '## Descrizione\nDescrivere la funzionalità richiesta.\n\n## Motivo\nPerché è necessaria questa funzionalità?\n\n## Impatto atteso\nQuale impatto avrà questa funzionalità?',
        priority: 'FEATURE_REQUEST' as TicketTemplate['priority'],
        type: 'STANDARD' as TicketTemplate['type'],
        projectId: null,
      },
      {
        name: 'Bug Report',
        titleTemplate: 'Bug: ',
        descriptionTemplate: '## Descrizione del problema\nDescrivere il bug riscontrato.\n\n## Passaggi per riprodurre\n1. \n2. \n3. \n\n## Comportamento atteso\n\n## Comportamento attuale\n\n## Screenshot / Log',
        priority: 'HIGH' as TicketTemplate['priority'],
        type: 'STANDARD' as TicketTemplate['type'],
        projectId: null,
      },
    ];
    for (const t of defaults) {
      try {
        await api.post('/templates', t);
      } catch {
        // ignore duplicates
      }
    }
    fetchTemplates();
  };

  if (loading) return <div className="p-6 text-gray-500">Caricamento...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Template Ticket</h1>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button
              onClick={createDefaultTemplates}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Carica template predefiniti
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" /> Nuovo Template
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="mb-2">Nessun template creato.</p>
          <p className="text-sm">Usa il pulsante "Carica template predefiniti" per aggiungere template di base.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Titolo Template</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priorità</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progetto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {templates.map((t) => {
                const proj = projects.find((p) => p.id === t.projectId);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{t.titleTemplate}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{priorityLabels[t.priority] || t.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{typeLabels[t.type] || t.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{proj?.name || 'Globale'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(t)} className="p-1 text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editItem ? 'Modifica Template' : 'Nuovo Template'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome template *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Es. Feature Request, Bug Report..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo pre-compilato *</label>
                <input
                  value={form.titleTemplate}
                  onChange={(e) => setForm({ ...form, titleTemplate: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Titolo iniziale del ticket"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione template *</label>
                <textarea
                  value={form.descriptionTemplate}
                  onChange={(e) => setForm({ ...form, descriptionTemplate: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm font-mono text-xs"
                  rows={6}
                  placeholder="Testo iniziale della descrizione (supporta markdown)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TicketTemplate['priority'] })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as TicketTemplate['type'] })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progetto (opzionale)</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Globale (tutti i progetti)</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.titleTemplate || !form.descriptionTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" /> {editItem ? 'Salva Modifiche' : 'Crea Template'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
