import React, { useState, useEffect, useCallback, useRef } from 'react';
import RichTextEditor from '../components/RichTextEditor';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Send,
  Clock,
  Users,
  FileText,
  ListTodo,
  HelpCircle,
  BarChart3,
  Bot,
  AlertCircle,
  Loader2,
  Calendar,
  UserPlus,
  UserMinus,
  Save,
  CheckCircle2,
  Circle,
  Paperclip,
  Download,
  ExternalLink,
  MessageSquare,
  Pin,
  PinOff,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  Project,
  ProjectMember,
  Ticket,
  TimelineItem,
  Todo,
  ProjectFaq,
  ProjectDocument,
  ProjectAttachment,
  ProjectMessage,
  User,
  TicketTemplate,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  FEATURE_REQUEST: 'bg-purple-100 text-purple-800',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
  FEATURE_REQUEST: 'Feature Request',
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const projectStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

const slaIndicator: Record<string, string> = {
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  none: 'text-gray-300',
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('it-IT') : '—';

// ─── Tab definitions ──────────────────────────────────────

type TabId =
  | 'overview'
  | 'tickets'
  | 'timeline'
  | 'todo'
  | 'faq'
  | 'documents'
  | 'ai'
  | 'board';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Panoramica', icon: <BarChart3 size={16} /> },
  { id: 'tickets', label: 'Ticket', icon: <FileText size={16} /> },
  { id: 'timeline', label: 'Timeline', icon: <Calendar size={16} /> },
  { id: 'todo', label: 'Todo', icon: <ListTodo size={16} /> },
  { id: 'faq', label: 'FAQ', icon: <HelpCircle size={16} /> },
  { id: 'documents', label: 'Documenti', icon: <FileText size={16} /> },
  { id: 'ai', label: 'AI Assistant', icon: <Bot size={16} /> },
  { id: 'board', label: 'Bacheca', icon: <MessageSquare size={16} /> },
];

// ─── Main component ───────────────────────────────────────

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );

  if (!project)
    return (
      <div className="p-8 text-center text-gray-500">
        Progetto non trovato.
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{project.name}</h1>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${projectStatusColors[project.status]}`}
        >
          {project.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          project={project}
          projectId={projectId!}
          isAdmin={isAdmin}
          onUpdate={fetchProject}
        />
      )}
      {activeTab === 'tickets' && (
        <TicketsTab projectId={projectId!} isAdmin={isAdmin} />
      )}
      {activeTab === 'timeline' && (
        <TimelineTab projectId={projectId!} isAdmin={isAdmin} />
      )}
      {activeTab === 'todo' && (
        <TodoTab projectId={projectId!} isAdmin={isAdmin} />
      )}
      {activeTab === 'faq' && (
        <FaqTab projectId={projectId!} isAdmin={isAdmin} />
      )}
      {activeTab === 'documents' && (
        <DocumentsTab projectId={projectId!} isAdmin={isAdmin} />
      )}
      {activeTab === 'ai' && <AiTab projectId={projectId!} />}
      {activeTab === 'board' && <BoardTab projectId={projectId!} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 1 — Overview
// ════════════════════════════════════════════════════════════

function OverviewTab({
  project,
  projectId,
  isAdmin,
  onUpdate,
}: {
  project: Project;
  projectId: string;
  isAdmin: boolean;
  onUpdate: () => void;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    startDate: project.startDate?.slice(0, 10) ?? '',
    endDate: project.endDate?.slice(0, 10) ?? '',
    slaHours: project.slaHours,
    slaCriticalHours: (project as any).slaCriticalHours ?? 4,
    slaHighHours: (project as any).slaHighHours ?? 48,
    slaMediumHours: (project as any).slaMediumHours ?? 120,
    slaLowHours: (project as any).slaLowHours ?? 336,
  });
  const [members, setMembers] = useState<ProjectMember[]>(
    project.members ?? []
  );
  const [users, setUsers] = useState<User[]>([]);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'MANAGER' | 'MEMBER'>(
    'MEMBER'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setMembers(res.data.members ?? []);
    } catch {}
  }, [projectId]);

  const saveProject = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}`, {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        slaCriticalHours: Number(form.slaCriticalHours) || null,
        slaHighHours: Number(form.slaHighHours) || null,
        slaMediumHours: Number(form.slaMediumHours) || null,
        slaLowHours: Number(form.slaLowHours) || null,
      });
      setEditing(false);
      onUpdate();
    } catch {}
    setSaving(false);
  };

  const deleteProject = async () => {
    if (!confirm(`Eliminare definitivamente il progetto "${project.name}"?\n\nVerranno eliminati anche tutti i ticket, i documenti e i dati associati.`)) return;
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/projects');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore durante l\'eliminazione');
    }
  };

  const addMember = async () => {
    if (!addMemberUserId) return;
    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: addMemberUserId,
        role: addMemberRole,
      });
      setAddMemberUserId('');
      fetchMembers();
    } catch {}
  };

  const removeMember = async (userId: string) => {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      fetchMembers();
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Project info */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Informazioni Progetto</h2>
          {isAdmin && !editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              >
                <Edit size={14} /> Impostazioni
              </button>
              <button
                onClick={deleteProject}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
              >
                <Trash2 size={14} /> Elimina
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Project['status'] })}>
                  <option value="ACTIVE">Attivo</option>
                  <option value="ON_HOLD">In Pausa</option>
                  <option value="COMPLETED">Completato</option>
                  <option value="ARCHIVED">Archiviato</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                  value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                  value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            {/* SLA per priorità */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={14} /> Configurazione SLA per Priorità
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'slaCriticalHours', label: 'Critica (Cat. 1)', color: 'bg-red-100 text-red-700', desc: 'Grave indisponibilità' },
                  { key: 'slaHighHours',     label: 'Alta (Cat. 2)',    color: 'bg-orange-100 text-orange-700', desc: 'Parziale interruzione' },
                  { key: 'slaMediumHours',   label: 'Media (Cat. 3)',   color: 'bg-yellow-100 text-yellow-700', desc: 'Servizio degradato' },
                  { key: 'slaLowHours',      label: 'Bassa (Cat. 4)',   color: 'bg-green-100 text-green-700', desc: 'Pianificabile' },
                ].map(({ key, label, color, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded w-32 text-center ${color}`}>{label}</span>
                    <span className="text-xs text-gray-500 flex-1">{desc}</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min={1}
                        className="w-20 border rounded px-2 py-1 text-sm text-center"
                        value={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
                      <span className="text-xs text-gray-500">ore</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1 border-t border-gray-200 mt-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded w-32 text-center bg-gray-200 text-gray-600">Default</span>
                  <span className="text-xs text-gray-500 flex-1">Fallback se non specificato</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1}
                      className="w-20 border rounded px-2 py-1 text-sm text-center"
                      value={form.slaHours}
                      onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} />
                    <span className="text-xs text-gray-500">ore</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveProject}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={14} /> Salva
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                <X size={14} /> Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              {project.description || 'Nessuna descrizione'}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-gray-500">Data Inizio:</span>{' '}
                <span className="font-medium">{fmt(project.startDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Data Fine:</span>{' '}
                <span className="font-medium">{fmt(project.endDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Creato il:</span>{' '}
                <span className="font-medium">{fmt(project.createdAt)}</span>
              </div>
            </div>
            {/* SLA table */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Clock size={12} /> SLA per Priorità</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {[
                  { label: '🔴 Critica', val: (project as any).slaCriticalHours ?? 4 },
                  { label: '🟠 Alta',    val: (project as any).slaHighHours ?? 48 },
                  { label: '🟡 Media',   val: (project as any).slaMediumHours ?? 120 },
                  { label: '🟢 Bassa',   val: (project as any).slaLowHours ?? 336 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-0.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium">{val}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={18} /> Membri
        </h2>
        <ul className="space-y-2 mb-4">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between p-2 rounded bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-gray-500">
                  {m.role === 'MANAGER' ? '📬 Admin Progetto' : 'Membro'} &middot;{' '}
                  {m.user.email}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Rimuovi membro"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </li>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-gray-400">Nessun membro</p>
          )}
        </ul>

        {isAdmin && (
          <div className="border-t pt-4 space-y-2">
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={addMemberUserId}
              onChange={(e) => setAddMemberUserId(e.target.value)}
            >
              <option value="">Seleziona utente...</option>
              {users
                .filter((u) => !members.some((m) => m.userId === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={addMemberRole}
              onChange={(e) => setAddMemberRole(e.target.value as 'MANAGER' | 'MEMBER')}
            >
              <option value="MEMBER">Membro</option>
              <option value="MANAGER">Admin Progetto (riceve notifiche ticket)</option>
            </select>
            <button
              onClick={addMember}
              disabled={!addMemberUserId}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <UserPlus size={14} /> Aggiungi membro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2 — Tickets
// ════════════════════════════════════════════════════════════

function TicketsTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Ticket['priority'],
    assigneeId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get('/tickets', {
        params: { projectId },
      });
      setTickets(Array.isArray(res.data) ? res.data : res.data.data ?? []);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTickets();
    if (isAdmin) {
      api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
    }
    api.get('/templates', { params: { projectId } }).then((r) => setTemplates(r.data)).catch(() => {});
  }, [fetchTickets, isAdmin, projectId]);

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) setForm((f) => ({ ...f, title: t.titleTemplate, description: t.descriptionTemplate, priority: t.priority }));
  };

  const createTicket = async () => {
    setCreateError(null);
    if (!form.title || form.title.length < 3) { setCreateError('Il titolo deve avere almeno 3 caratteri'); return; }
    if (!form.description || form.description.length < 10) { setCreateError('La descrizione deve avere almeno 10 caratteri'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/tickets', {
        projectId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        assigneeId: form.assigneeId || undefined,
      });
      const ticketId = res.data.id;
      // Upload pending files
      for (const file of pendingFiles) {
        const fd = new FormData(); fd.append('file', file);
        await api.post(`/tickets/${ticketId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      setShowModal(false);
      setCreateError(null);
      setForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '' });
      setPendingFiles([]);
      fetchTickets();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details?.length) setCreateError(data.details.map((d: any) => d.message).join(', '));
      else setCreateError(data?.error || 'Errore durante la creazione del ticket');
    }
    setSubmitting(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Ticket ({tickets.length})
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          <Plus size={14} /> Nuovo Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          Nessun ticket per questo progetto.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Priorità</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Creatore</th>
                <th className="px-4 py-3">Assegnatario</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[t.priority]}`}
                    >
                      {priorityLabels[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Clock
                      size={16}
                      className={slaIndicator[t.slaStatus]}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.creator?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.assignee?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create ticket modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nuovo Ticket</h3>
            <div className="space-y-3">
              {/* Template selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usa template</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm bg-blue-50 border-blue-200"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) applyTemplate(e.target.value); }}
                  >
                    <option value="">— Seleziona un template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Titolo del ticket..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Descrivi il problema in dettaglio (min. 10 caratteri)..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Ticket['priority'] })}>
                    <option value="LOW">Bassa</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Critica</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assegnatario</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={form.assigneeId}
                      onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                      <option value="">Nessuno</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* File attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allegati (opzionale)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingFiles((prev) => [...prev, ...files]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center">
                  <Paperclip className="w-4 h-4" /> Aggiungi file
                </button>
                {pendingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pendingFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {createError && (
              <div className="mt-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{createError}</div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowModal(false); setCreateError(null); setPendingFiles([]); }}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Annulla</button>
              <button onClick={createTicket}
                disabled={!form.title || form.description.length < 10 || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Creazione...' : 'Crea Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 3 — Timeline (Cronoprogramma)
// ════════════════════════════════════════════════════════════

// ── Gantt helpers ──────────────────────────────────────────
const GANTT_DAY_W = 28;

const GANTT_STATUS: Record<string, { bar: string; bg: string; text: string }> = {
  TODO:        { bar: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600'  },
  IN_PROGRESS: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700'},
  DONE:        { bar: 'bg-teal-500',    bg: 'bg-teal-50',    text: 'text-teal-700'   },
};

const GANTT_LABELS: Record<string, string> = {
  TODO: 'Da fare', IN_PROGRESS: 'In corso', DONE: 'Completato',
};

function ganttAddDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function ganttDaysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
function ganttStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Flatten items + subtasks into rows for the Gantt
interface GanttRow {
  item: TimelineItem;
  depth: number; // 0 = root, 1 = subtask
  isParent: boolean;
}
function flattenGantt(items: TimelineItem[]): GanttRow[] {
  const rows: GanttRow[] = [];
  for (const item of items) {
    const hasChildren = (item.subTasks?.length ?? 0) > 0;
    rows.push({ item, depth: 0, isParent: hasChildren });
    for (const sub of item.subTasks ?? []) {
      rows.push({ item: sub, depth: 1, isParent: false });
    }
  }
  return rows;
}
// Collect all dates including subtasks
function allItemDates(items: TimelineItem[]): Date[] {
  const dates: Date[] = [];
  for (const item of items) {
    dates.push(ganttStartOfDay(new Date(item.startDate)));
    dates.push(ganttStartOfDay(new Date(item.endDate)));
    for (const sub of item.subTasks ?? []) {
      dates.push(ganttStartOfDay(new Date(sub.startDate)));
      dates.push(ganttStartOfDay(new Date(sub.endDate)));
    }
  }
  return dates;
}

function TimelineTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TimelineItem | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', startDate: '', endDate: '',
    status: 'TODO' as TimelineItem['status'],
    progress: 0, color: '', todoId: '', parentId: '',
  });

  const fetchAll = useCallback(async () => {
    try {
      const [tlRes, tdRes] = await Promise.all([
        api.get(`/timeline/project/${projectId}`),
        api.get(`/todos/project/${projectId}`),
      ]);
      setItems(tlRes.data);
      setTodos(tdRes.data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = (parentId = '') => {
    setEditItem(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ title: '', description: '', startDate: today, endDate: today, status: 'TODO', progress: 0, color: '', todoId: '', parentId });
    setShowForm(true);
  };

  const openEdit = (item: TimelineItem) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description ?? '',
      startDate: item.startDate.slice(0, 10), endDate: item.endDate.slice(0, 10),
      status: item.status, progress: item.progress ?? 0,
      color: item.color ?? '', todoId: item.todoId ?? '', parentId: item.parentId ?? '',
    });
    setShowForm(true);
  };

  const saveItem = async () => {
    const payload = {
      projectId, title: form.title, description: form.description || null,
      startDate: form.startDate, endDate: form.endDate, status: form.status,
      progress: Number(form.progress), color: form.color || null,
      todoId: form.todoId || null, parentId: form.parentId || null,
    };
    try {
      if (editItem) await api.put(`/timeline/${editItem.id}`, payload);
      else await api.post('/timeline', payload);
      setShowForm(false); fetchAll();
    } catch {}
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Eliminare questa attività e tutti i suoi subtask?')) return;
    try { await api.delete(`/timeline/${id}`); fetchAll(); } catch {}
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>;

  // ── Gantt geometry ──────────────────────────────────────────
  const today = ganttStartOfDay(new Date());
  let ganttStart: Date, ganttEnd: Date;
  if (items.length === 0) {
    ganttStart = ganttAddDays(today, -3);
    ganttEnd = ganttAddDays(today, 30);
  } else {
    const dates = allItemDates(items);
    ganttStart = ganttAddDays(new Date(Math.min(...dates.map(d => d.getTime()))), -3);
    ganttEnd = ganttAddDays(new Date(Math.max(...dates.map(d => d.getTime()))), 5);
  }
  const totalDays = ganttDaysBetween(ganttStart, ganttEnd) + 1;
  const ganttWidth = totalDays * GANTT_DAY_W;
  const todayOffset = ganttDaysBetween(ganttStart, today);

  const months: { label: string; days: number }[] = [];
  let cur = new Date(ganttStart);
  while (cur <= ganttEnd) {
    const y = cur.getFullYear(), m = cur.getMonth();
    const nextMonth = new Date(y, m + 1, 1);
    const end = nextMonth > ganttAddDays(ganttEnd, 1) ? ganttAddDays(ganttEnd, 1) : nextMonth;
    months.push({ label: cur.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }), days: ganttDaysBetween(cur, end) });
    cur = nextMonth;
  }

  const weekLines: number[] = [];
  { let d = new Date(ganttStart); while (d.getDay() !== 1) d = ganttAddDays(d, 1);
    while (d <= ganttEnd) { weekLines.push(ganttDaysBetween(ganttStart, d)); d = ganttAddDays(d, 7); } }

  const rows = flattenGantt(items);
  const ROW_H = 40;

  const GanttBar = ({ row }: { row: GanttRow }) => {
    const { item, depth, isParent } = row;
    const s = ganttStartOfDay(new Date(item.startDate));
    const e = ganttStartOfDay(new Date(item.endDate));
    const barLeft = ganttDaysBetween(ganttStart, s);
    const barDays = Math.max(ganttDaysBetween(s, e) + 1, 1);
    const progress = item.progress ?? 0;
    const c = GANTT_STATUS[item.status];
    return (
      <div className="relative border-b border-gray-100 hover:bg-gray-50/50"
        style={{ width: Math.max(ganttWidth, 400), height: ROW_H }}>
        {weekLines.map(w => (
          <div key={w} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: w * GANTT_DAY_W }} />
        ))}
        {todayOffset >= 0 && todayOffset < totalDays && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-300/70" style={{ left: todayOffset * GANTT_DAY_W }} />
        )}
        <div
          onClick={() => isAdmin && openEdit(item)}
          title={`${item.title}: ${fmt(item.startDate)} → ${fmt(item.endDate)} | ${progress}%`}
          className={`absolute rounded overflow-hidden flex items-center ${!item.color ? c.bar : ''} ${isAdmin ? 'cursor-pointer' : ''}`}
          style={{
            left: barLeft * GANTT_DAY_W, width: barDays * GANTT_DAY_W,
            top: depth === 1 ? 10 : 8,
            height: depth === 1 ? 20 : 24,
            backgroundColor: item.color || undefined,
            opacity: depth === 1 ? 0.75 : 0.9,
          }}>
          {progress > 0 && (
            <div className="absolute top-0 left-0 h-full bg-white/30 pointer-events-none" style={{ width: `${progress}%` }} />
          )}
          {isParent && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20" />
          )}
          <span className="relative px-1.5 text-white text-xs font-medium truncate z-10 drop-shadow-sm" style={{ fontSize: depth === 1 ? 10 : 11 }}>
            {barDays * GANTT_DAY_W > 50 ? item.title : ''}
            {progress > 0 && progress < 100 && barDays * GANTT_DAY_W > 90 ? ` · ${progress}%` : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-600" /> Cronoprogramma Gantt
        </h2>
        {isAdmin && (
          <button onClick={() => openCreate()}
            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">
            <Plus size={14} /> Aggiungi Task
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Nessuna attività. Creane una per iniziare il cronoprogramma.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <div className="flex">
            {/* ── Label column ── */}
            <div className="flex-shrink-0 w-56 border-r border-gray-200 z-10 bg-white">
              <div className="h-8 border-b border-gray-200 bg-gray-50" />
              <div className="h-6 border-b border-gray-200 bg-gray-50" />
              {rows.map(({ item, depth, isParent }) => {
                const c = GANTT_STATUS[item.status];
                return (
                  <div key={item.id}
                    className={`flex items-center gap-1.5 border-b border-gray-100 group ${c.bg}`}
                    style={{ height: ROW_H, paddingLeft: depth === 1 ? 24 : 12, paddingRight: 8 }}>
                    {isParent ? (
                      <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                    ) : depth === 1 ? (
                      <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.bar}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`truncate leading-tight ${depth === 1 ? 'text-xs text-gray-600' : 'text-xs font-medium'}`}>
                        {item.title}
                      </p>
                      {item.todo && depth === 0 && (
                        <p className="text-xs text-gray-400 truncate leading-tight">
                          {item.todo.completed ? '✅' : '⬜'} {item.todo.title}
                        </p>
                      )}
                      {isParent && (
                        <p className="text-xs text-gray-400">{item.progress}% · {item.subTasks?.length} subtask</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        {!isParent && depth === 0 && (
                          <button onClick={() => openCreate(item.id)} className="p-0.5 text-gray-400 hover:text-emerald-600" title="Aggiungi subtask"><Plus size={10} /></button>
                        )}
                        <button onClick={() => openEdit(item)} className="p-0.5 text-gray-400 hover:text-emerald-600"><Edit size={10} /></button>
                        <button onClick={() => deleteItem(item.id)} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 size={10} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Gantt area ── */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: Math.max(ganttWidth, 400) }}>
                <div className="flex h-8 border-b border-gray-200 bg-gray-50">
                  {months.map((m, i) => (
                    <div key={i} className="border-r border-gray-300 flex items-center px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap overflow-hidden"
                      style={{ width: m.days * GANTT_DAY_W, minWidth: 0 }}>
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="relative h-6 border-b border-gray-200 bg-gray-50" style={{ width: Math.max(ganttWidth, 400) }}>
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const d = ganttAddDays(ganttStart, i);
                    if (d.getDate() !== 1 && d.getDay() !== 1) return null;
                    return <span key={i} className="absolute text-gray-400 top-1 select-none" style={{ left: i * GANTT_DAY_W + 2, fontSize: 9 }}>{d.getDate()}</span>;
                  })}
                  {weekLines.map(w => <div key={w} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: w * GANTT_DAY_W }} />)}
                  {todayOffset >= 0 && todayOffset < totalDays && <div className="absolute top-0 bottom-0 w-0.5 bg-red-400" style={{ left: todayOffset * GANTT_DAY_W }} />}
                </div>
                {rows.map(row => <GanttBar key={row.item.id} row={row} />)}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-center text-xs">
            {Object.entries(GANTT_LABELS).map(([k, v]) => (
              <span key={k} className={`flex items-center gap-1.5 ${GANTT_STATUS[k].text}`}>
                <span className={`w-3 h-3 rounded ${GANTT_STATUS[k].bar}`} /> {v}
              </span>
            ))}
            <span className="text-gray-400">Clicca su una barra per modificarla</span>
            <span className="ml-auto flex items-center gap-1.5 text-red-500">
              <span className="inline-block w-0.5 h-3 bg-red-400" /> Oggi
            </span>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold">
                {editItem ? 'Modifica Attività' : form.parentId ? 'Nuovo Subtask' : 'Nuova Attività'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {form.parentId && !editItem && (
                <div className="bg-emerald-50 text-emerald-700 text-xs px-3 py-2 rounded-lg">
                  Subtask di: <strong>{items.find(i => i.id === form.parentId)?.title}</strong>
                  <br/>Il completamento dei subtask aggiornerà automaticamente il progresso del task padre.
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
                <input className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nome attività" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Inizio *</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                    value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Fine *</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                    value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as TimelineItem['status'], progress: e.target.value === 'DONE' ? 100 : e.target.value === 'TODO' ? 0 : form.progress })}>
                    <option value="TODO">Da fare</option>
                    <option value="IN_PROGRESS">In corso</option>
                    <option value="DONE">Completato</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Avanzamento — {form.progress}%</label>
                  <input type="range" min={0} max={100} step={5} className="w-full mt-2"
                    value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                    disabled={!!form.parentId} />
                  {form.parentId && <p className="text-xs text-gray-400 mt-1">Calcolato dai subtask</p>}
                </div>
              </div>
              {todos.length > 0 && !form.parentId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Collega a TODO (opzionale)</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.todoId}
                    onChange={e => setForm({ ...form, todoId: e.target.value })}>
                    <option value="">— Nessuno —</option>
                    {todos.map(t => <option key={t.id} value={t.id}>{t.completed ? '✅' : '⬜'} {t.title}</option>)}
                  </select>
                </div>
              )}
              {isAdmin && !form.parentId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Colore barra</label>
                  <div className="flex gap-3 items-center flex-wrap">
                    {['', '#059669', '#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                      <button key={c} onClick={() => setForm({ ...form, color: c })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? 'scale-125 border-gray-700' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c || '#94a3b8' }} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrizione opzionale" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Annulla</button>
              <button onClick={saveItem} disabled={!form.title || !form.startDate || !form.endDate}
                className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50">
                {editItem ? 'Salva Modifiche' : form.parentId ? 'Crea Subtask' : 'Crea Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 4 — Todo
// ════════════════════════════════════════════════════════════

function TodoTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    userId: '',
    dueDate: '',
    recurrence: 'NONE',
  });

  const fetchTodos = useCallback(async () => {
    try {
      const res = await api.get(`/todos/project/${projectId}`);
      setTodos(res.data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTodos();
    if (isAdmin) {
      api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
    }
  }, [fetchTodos, isAdmin]);

  const toggleTodo = async (todo: Todo) => {
    try {
      await api.put(`/todos/${todo.id}`, { completed: !todo.completed });
      fetchTodos();
    } catch {}
  };

  const addTodo = async () => {
    try {
      await api.post('/todos', {
        projectId,
        title: form.title,
        userId: form.userId || null,
        dueDate: form.dueDate || null,
        recurrence: form.recurrence || 'NONE',
      });
      setForm({ title: '', userId: '', dueDate: '', recurrence: 'NONE' });
      setShowForm(false);
      fetchTodos();
    } catch {}
  };

  const deleteTodo = async (id: string) => {
    try {
      await api.delete(`/todos/${id}`);
      fetchTodos();
    } catch {}
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Todo ({pending.length}/{todos.length})
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Aggiungi
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {pending.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <button onClick={() => toggleTodo(todo)} className="text-gray-400 hover:text-blue-600">
              <Circle size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-1">
                {todo.title}
                {todo.recurrence && todo.recurrence !== 'NONE' && (
                  <span title={todo.recurrence === 'WEEKLY' ? 'Ogni settimana' : 'Ogni mese'} className="text-blue-500 text-xs">🔄</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {todo.user?.name ?? 'Non assegnato'}
                {todo.dueDate && ` · Scadenza: ${fmt(todo.dueDate)}`}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-gray-400 hover:text-red-600 p-1"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {completed.length > 0 && (
          <div className="pt-2">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
              Completati
            </p>
            {completed.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <button
                  onClick={() => toggleTodo(todo)}
                  className="text-green-500 hover:text-green-700"
                >
                  <CheckCircle2 size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-gray-400 flex items-center gap-1">
                    {todo.title}
                    {todo.recurrence && todo.recurrence !== 'NONE' && (
                      <span title={todo.recurrence === 'WEEKLY' ? 'Ogni settimana' : 'Ogni mese'} className="text-blue-400 text-xs">🔄</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {todo.user?.name ?? 'Non assegnato'}
                    {todo.dueDate && ` · Scadenza: ${fmt(todo.dueDate)}`}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {todos.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">
            Nessun elemento todo.
          </p>
        )}
      </div>

      {/* Add todo form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4">Nuovo Todo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assegnatario
                  </label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.userId}
                    onChange={(e) =>
                      setForm({ ...form, userId: e.target.value })
                    }
                  >
                    <option value="">Nessuno</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scadenza
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ricorrenza
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.recurrence}
                  onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                >
                  <option value="NONE">Non ricorrente</option>
                  <option value="WEEKLY">Ogni settimana</option>
                  <option value="MONTHLY">Ogni mese</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={addTodo}
                disabled={!form.title}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 5 — FAQ
// ════════════════════════════════════════════════════════════

function FaqTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const [faqs, setFaqs] = useState<ProjectFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ProjectFaq | null>(null);
  const [form, setForm] = useState({ question: '', answer: '' });

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await api.get(`/faq/project/${projectId}`);
      setFaqs(res.data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ question: '', answer: '' });
    setShowForm(true);
  };

  const openEdit = (faq: ProjectFaq) => {
    setEditItem(faq);
    setForm({ question: faq.question, answer: faq.answer });
    setShowForm(true);
  };

  const saveFaq = async () => {
    try {
      if (editItem) {
        await api.put(`/faq/${editItem.id}`, form);
      } else {
        await api.post('/faq', { projectId, ...form });
      }
      setShowForm(false);
      fetchFaqs();
    } catch {}
  };

  const deleteFaq = async (id: string) => {
    try {
      await api.delete(`/faq/${id}`);
      fetchFaqs();
    } catch {}
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">FAQ ({faqs.length})</h2>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Aggiungi FAQ
          </button>
        )}
      </div>

      {faqs.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          Nessuna FAQ per questo progetto.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <button
                onClick={() =>
                  setExpandedId(expandedId === faq.id ? null : faq.id)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  {expandedId === faq.id ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {faq.question}
                </span>
                {isAdmin && (
                  <span
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEdit(faq)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => deleteFaq(faq.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </button>
              {expandedId === faq.id && (
                <div className="px-4 pb-4 pl-10 text-sm text-gray-600 whitespace-pre-wrap">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editItem ? 'Modifica FAQ' : 'Nuova FAQ'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domanda
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.question}
                  onChange={(e) =>
                    setForm({ ...form, question: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risposta
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={5}
                  value={form.answer}
                  onChange={(e) =>
                    setForm({ ...form, answer: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={saveFaq}
                disabled={!form.question || !form.answer}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 6 — Documenti
// ════════════════════════════════════════════════════════════

function DocumentsTab({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ProjectDocument | null>(null);
  const [form, setForm] = useState({ title: '', content: '', url: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const [docsRes, attRes] = await Promise.all([
        api.get(`/faq/documents/project/${projectId}`),
        api.get(`/faq/project-attachments/${projectId}`),
      ]);
      setDocs(docsRes.data);
      setAttachments(attRes.data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const openCreate = () => { setEditItem(null); setForm({ title: '', content: '', url: '' }); setShowForm(true); };
  const openEdit = (doc: ProjectDocument) => { setEditItem(doc); setForm({ title: doc.title, content: doc.content, url: doc.url || '' }); setShowForm(true); };

  const saveDoc = async () => {
    try {
      if (editItem) await api.put(`/faq/documents/${editItem.id}`, form);
      else await api.post('/faq/documents', { projectId, ...form });
      setShowForm(false);
      fetchDocs();
    } catch {}
  };

  const deleteDoc = async (id: string) => {
    try { await api.delete(`/faq/documents/${id}`); fetchDocs(); } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/faq/project-attachments/${projectId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore nel caricamento');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm('Eliminare questo file?')) return;
    try { await api.delete(`/faq/project-attachments/file/${id}`); fetchDocs(); } catch {}
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );

  return (
    <div className="space-y-8">
      {/* ── File allegati ───────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Paperclip size={18} /> File Allegati ({attachments.length})
          </h2>
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus size={14} /> {uploading ? 'Caricamento...' : 'Carica File'}
              </button>
            </>
          )}
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nessun file allegato.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map((att) => (
              <div key={att.id} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                {isImage(att.mimetype) ? (
                  <a href={`/api/faq/project-attachments/file/${att.id}`} target="_blank" rel="noopener noreferrer">
                    <img src={`/api/faq/project-attachments/file/${att.id}`} alt={att.originalName} className="w-full h-24 object-cover" />
                  </a>
                ) : (
                  <a href={`/api/faq/project-attachments/file/${att.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-24 text-gray-400 hover:text-indigo-600">
                    <Download size={28} className="mb-1" />
                    <span className="text-xs px-1 truncate w-full text-center">{att.originalName}</span>
                  </a>
                )}
                <div className="p-2 border-t bg-white">
                  <p className="text-xs text-gray-700 truncate" title={att.originalName}>{att.originalName}</p>
                  <p className="text-xs text-gray-400">{formatSize(att.size)} · {att.uploadedBy.name}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteAttachment(att.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Link Esterni ─────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Link Esterni ({docs.filter(d => d.url && !d.content).length})</h2>
          {isAdmin && (
            <button onClick={openCreate}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              <Plus size={14} /> Aggiungi Link
            </button>
          )}
        </div>

        {docs.filter(d => d.url && !d.content).length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nessun link esterno.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.filter(d => d.url && !d.content).map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <a
                  href={doc.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm truncate"
                >
                  <ExternalLink size={16} className="flex-shrink-0" />
                  {doc.title}
                </a>
                {isAdmin && (
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => openEdit(doc)} className="p-1 text-gray-400 hover:text-blue-600">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => deleteDoc(doc.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Documenti testo ─────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Documenti Testo ({docs.filter(d => !d.url || d.content).length})</h2>
          {isAdmin && (
            <button onClick={openCreate}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              <Plus size={14} /> Aggiungi Documento
            </button>
          )}
        </div>

      {docs.filter(d => !d.url || d.content).length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          Nessun documento per questo progetto.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.filter(d => !d.url || d.content).map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm">{doc.title}</h3>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(doc)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {doc.content}
              </div>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <ExternalLink size={12} /> {doc.url}
                </a>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Creato il {fmt(doc.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editItem ? 'Modifica Documento' : 'Nuovo Documento'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenuto
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={10}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL esterno (opzionale)
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="https://..."
                  value={form.url || ''}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={saveDoc}
                disabled={!form.title}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 7 — AI Assistant
// ════════════════════════════════════════════════════════════

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  sourcesUsed?: number;
}

function AiTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/ai/ask', { projectId, question });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          sourcesUsed: res.data.sourcesUsed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Errore nella risposta. Riprova.',
        },
      ]);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: 600 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot size={48} className="mb-3" />
            <p className="text-sm">
              Chiedi qualcosa sull&apos;assistente AI del progetto.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sourcesUsed !== undefined && (
                <p className="text-xs mt-1 opacity-70">
                  Fonti utilizzate: {msg.sourcesUsed}
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2.5">
              <Loader2 className="animate-spin text-gray-400" size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Chiedi qualcosa sul progetto..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 8 — Bacheca
// ════════════════════════════════════════════════════════════

function BoardTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const r = await api.get(`/messages/${projectId}`);
      setMessages(r.data);
    } catch {}
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Scroll in fondo quando arrivano nuovi messaggi
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  // SSE: ascolta nuovi messaggi in tempo reale
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const es = new EventSource(`/api/sse/subscribe?token=${token}`);
    es.addEventListener('board_message', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.projectId === projectId) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          // Pinned in cima, poi per data
          const updated = [...prev, data.message];
          return updated.sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        });
      }
    });
    return () => es.close();
  }, [projectId]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const r = await api.post(`/messages/${projectId}`, { content: input.trim() });
      setMessages(prev => [...prev, r.data]);
      setInput('');
      textareaRef.current?.focus();
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const togglePin = async (msg: ProjectMessage) => {
    try {
      const r = await api.patch(`/messages/${projectId}/${msg.id}/pin`);
      setMessages(prev => {
        const updated = prev.map(m => m.id === msg.id ? r.data : m);
        return updated.sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned ? -1 : 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      });
    } catch {}
  };

  const deleteMsg = async (id: string) => {
    if (!confirm('Eliminare questo messaggio?')) return;
    try {
      await api.delete(`/messages/${projectId}/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  const startEdit = (msg: ProjectMessage) => {
    setEditId(msg.id);
    setEditContent(msg.content);
  };

  const saveEdit = async () => {
    if (!editId || !editContent.trim()) return;
    try {
      const r = await api.put(`/messages/${projectId}/${editId}`, { content: editContent.trim() });
      setMessages(prev => prev.map(m => m.id === editId ? r.data : m));
      setEditId(null);
    } catch {}
  };

  const fmtTime = (d: string) => new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const pinned = messages.filter(m => m.pinned);
  const normal = messages.filter(m => !m.pinned);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-indigo-500" size={24} />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px]">

      {/* Messaggi fissati */}
      {pinned.length > 0 && (
        <div className="mb-3 space-y-2">
          {pinned.map(msg => (
            <div key={msg.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Pin size={14} className="text-amber-500 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-amber-800">{msg.user.name}</span>
                  <span className="text-xs text-amber-500">{fmtTime(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
              {(isAdmin || user?.id === msg.userId) && (
                <button onClick={() => togglePin(msg)} className="p-1 text-amber-400 hover:text-amber-700 shrink-0">
                  <PinOff size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Area messaggi scrollabile */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {normal.length === 0 && pinned.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <MessageSquare size={40} className="opacity-20" />
            <p className="text-sm">Nessun messaggio. Inizia la conversazione!</p>
          </div>
        )}
        {normal.map(msg => {
          const isMe = msg.userId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isMe ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                {msg.user.name.charAt(0).toUpperCase()}
              </div>

              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Header */}
                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-semibold text-gray-700">{msg.user.name}</span>
                  <span className="text-xs text-gray-400">{fmtTime(msg.createdAt)}</span>
                  {msg.updatedAt !== msg.createdAt && (
                    <span className="text-xs text-gray-300 italic">modificato</span>
                  )}
                </div>

                {/* Bubble */}
                {editId === msg.id ? (
                  <div className="w-full">
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                      rows={3}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={saveEdit} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Salva</button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1 border text-xs rounded hover:bg-gray-50">Annulla</button>
                    </div>
                  </div>
                ) : (
                  <div className={`relative px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm
                    ${isMe
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
                    {msg.content}

                    {/* Azioni hover */}
                    <div className={`absolute top-1 ${isMe ? 'left-0 -translate-x-full pl-0 pr-2' : 'right-0 translate-x-full pl-2'} hidden group-hover:flex items-center gap-1`}>
                      {(isAdmin || user?.id === msg.userId) && (
                        <>
                          {isAdmin && (
                            <button onClick={() => togglePin(msg)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-amber-500" title="Fissa">
                              <Pin size={13} />
                            </button>
                          )}
                          {user?.id === msg.userId && (
                            <button onClick={() => startEdit(msg)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500" title="Modifica">
                              <Edit size={13} />
                            </button>
                          )}
                          <button onClick={() => deleteMsg(msg.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500" title="Elimina">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2 border-t pt-3">
        <textarea
          ref={textareaRef}
          className="flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none max-h-32"
          placeholder="Scrivi un messaggio... (Invio per inviare, Shift+Invio per andare a capo)"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
