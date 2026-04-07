import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Ticket, Project, User, TicketTemplate, SavedFilter, Tag } from '../types';
import { Plus, Filter, Clock, AlertTriangle, X, List, LayoutGrid, Download, Save, Bookmark, Trash2, Search } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const statusLabels: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Corso',
  WAITING: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
};

const slaIcons: Record<string, string> = {
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
};

const KANBAN_COLUMNS: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

const kanbanColumnColors: Record<string, string> = {
  OPEN: 'border-blue-300 bg-blue-50',
  IN_PROGRESS: 'border-indigo-300 bg-indigo-50',
  WAITING: 'border-yellow-300 bg-yellow-50',
  RESOLVED: 'border-green-300 bg-green-50',
  CLOSED: 'border-gray-300 bg-gray-50',
};

// Draggable Kanban Card
function KanbanCard({ ticket, navigate }: { ticket: Ticket; navigate: (path: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-gray-900 mb-2 leading-tight">{ticket.title}</p>
      <p className="text-xs text-gray-500 mb-2">{ticket.project?.name}</p>
      <div className="flex items-center justify-between">
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority]}`}>
          {ticket.priority === 'FEATURE_REQUEST' ? 'Feature' : ticket.priority}
        </span>
        {ticket.assignee && (
          <span className="text-xs text-gray-500 truncate max-w-20">{ticket.assignee.name}</span>
        )}
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [filters, setFilters] = useState({ projectId: '', status: '', priority: '', tagId: '' });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', priority: 'MEDIUM', assigneeId: '', type: 'STANDARD' });
  const [loading, setLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[] | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kanban drag
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) { setProjectMembers([]); return; }
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProjectMembers(res.data.members?.map((m: any) => m.user) || []);
    } catch {
      setProjectMembers([]);
    }
  };

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.tagId) params.set('tagId', filters.tagId);
      const res = await api.get(`/tickets?${params}`);
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/tickets/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data));
    api.get('/templates').then((res) => setTemplates(res.data)).catch(() => {});
    api.get('/saved-filters').then((res) => setSavedFilters(res.data)).catch(() => {});
    api.get('/tags').then((res) => setAvailableTags(res.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchTickets(); }, [filters]);

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tmpl) => tmpl.id === templateId);
    if (t) {
      setForm((f) => ({
        ...f,
        title: t.titleTemplate,
        description: t.descriptionTemplate,
        priority: t.priority,
        type: t.type,
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.projectId) { alert('Seleziona un progetto'); return; }
    if (!form.title || form.title.length < 3) { alert('Il titolo deve avere almeno 3 caratteri'); return; }
    if (!form.description || form.description.length < 10) { alert('La descrizione deve avere almeno 10 caratteri'); return; }
    try {
      await api.post('/tickets', { ...form, assigneeId: form.assigneeId || undefined });
      setShowCreate(false);
      setForm({ projectId: '', title: '', description: '', priority: 'MEDIUM', assigneeId: '', type: 'STANDARD' });
      fetchTickets();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details?.length) {
        alert(data.details.map((d: any) => `• ${d.message}`).join('\n'));
      } else {
        alert(data?.error || 'Errore durante la creazione del ticket');
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === tickets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tickets.map(t => t.id)));
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    try {
      await api.post('/bulk/tickets', { ids: Array.from(selectedIds), action: bulkAction, value: bulkValue || undefined });
      setSelectedIds(new Set());
      setBulkAction('');
      setBulkValue('');
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const saveCurrentFilter = async () => {
    if (!filterName) return;
    try {
      const res = await api.post('/saved-filters', { name: filterName, filters });
      setSavedFilters(prev => [res.data, ...prev]);
      setFilterName('');
      setShowSaveFilter(false);
    } catch {}
  };

  const applyFilterPreset = (sf: SavedFilter) => {
    try {
      const parsed = typeof sf.filters === 'string' ? JSON.parse(sf.filters) : sf.filters;
      setFilters({ projectId: parsed.projectId || '', status: parsed.status || '', priority: parsed.priority || '', tagId: parsed.tagId || '' });
    } catch {}
  };

  const deleteSavedFilter = async (id: string) => {
    try {
      await api.delete(`/saved-filters/${id}`);
      setSavedFilters(prev => prev.filter(f => f.id !== id));
    } catch {}
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tickets/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Errore durante l\'esportazione');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const dragged = tickets.find(t => t.id === event.active.id);
    setActiveTicket(dragged || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    if (!over) return;
    const overId = over.id as string;
    // Check if dropped on a column id
    if (KANBAN_COLUMNS.includes(overId as Ticket['status'])) {
      const ticket = tickets.find(t => t.id === active.id);
      if (ticket && ticket.status !== overId) {
        setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: overId as Ticket['status'] } : t));
        try {
          await api.put(`/tickets/${active.id}`, { status: overId });
        } catch {
          fetchTickets();
        }
      }
    }
  };

  // Kanban view
  const renderKanban = () => (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col);
          return (
            <div
              key={col}
              id={col}
              className={`flex-shrink-0 w-64 rounded-lg border-2 ${kanbanColumnColors[col]} flex flex-col`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const ticketId = e.dataTransfer.getData('ticketId');
                if (ticketId) {
                  const ticket = tickets.find(t => t.id === ticketId);
                  if (ticket && ticket.status !== col) {
                    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: col } : t));
                    api.put(`/tickets/${ticketId}`, { status: col }).catch(() => fetchTickets());
                  }
                }
              }}
            >
              <div
                className="px-3 py-2 border-b border-current border-opacity-20"
                data-droppable-id={col}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-700">{statusLabels[col]}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[col]}`}>{colTickets.length}</span>
                </div>
              </div>
              <SortableContext items={colTickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[70vh]">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('ticketId', t.id); }}
                    >
                      <KanbanCard ticket={t} navigate={navigate} />
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Vuoto</p>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTicket && (
          <div className="bg-white rounded-lg p-3 shadow-lg border border-blue-200 w-60 opacity-90">
            <p className="text-sm font-medium text-gray-900">{activeTicket.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ticket</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Vista lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Vista kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            title="Esporta CSV"
          >
            <Download className="w-4 h-4" /> CSV
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" /> Nuovo Ticket
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cerca ticket per titolo o descrizione..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchResults !== null && (
          <div className="mt-1 text-xs text-gray-500">{searchResults.length} risultati trovati</div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-2 flex items-center gap-4 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm">
          <option value="">Tutti i progetti</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm">
          <option value="">Tutti gli stati</option>
          <option value="OPEN">Aperto</option>
          <option value="IN_PROGRESS">In Corso</option>
          <option value="WAITING">In Attesa</option>
          <option value="RESOLVED">Risolto</option>
          <option value="CLOSED">Chiuso</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm">
          <option value="">Tutte le priorità</option>
          <option value="LOW">Bassa</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Critica</option>
          <option value="FEATURE_REQUEST">Feature Request</option>
        </select>
        {availableTags.length > 0 && (
          <select value={filters.tagId} onChange={(e) => setFilters({ ...filters, tagId: e.target.value })}
            className="border rounded px-2 py-1.5 text-sm">
            <option value="">Tutti i tag</option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        )}
        {(filters.projectId || filters.status || filters.priority || filters.tagId) && (
          <button
            onClick={() => setFilters({ projectId: '', status: '', priority: '', tagId: '' })}
            className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSaveFilter(s => !s)}
            className="flex items-center gap-1 text-xs px-2 py-1.5 border rounded hover:bg-gray-50 text-gray-600"
            title="Salva vista"
          >
            <Save className="w-3 h-3" /> Salva vista
          </button>
        </div>
      </div>

      {/* Saved filters */}
      {(savedFilters.length > 0 || showSaveFilter) && (
        <div className="bg-white rounded-lg shadow p-3 mb-4 flex items-center gap-2 flex-wrap">
          <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {savedFilters.map(sf => (
            <div key={sf.id} className="flex items-center gap-1">
              <button
                onClick={() => applyFilterPreset(sf)}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                {sf.name}
              </button>
              <button onClick={() => deleteSavedFilter(sf.id)} className="text-gray-300 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {showSaveFilter && (
            <div className="flex items-center gap-2 ml-2">
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder="Nome vista..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCurrentFilter()}
              />
              <button
                onClick={saveCurrentFilter}
                disabled={!filterName}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Salva
              </button>
              <button onClick={() => setShowSaveFilter(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} ticket selezionati</span>
          <select
            value={bulkAction}
            onChange={e => { setBulkAction(e.target.value); setBulkValue(''); }}
            className="border rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Seleziona azione...</option>
            <option value="close">Chiudi</option>
            <option value="resolve">Risolvi</option>
            <option value="priority">Cambia priorità</option>
            {isAdmin && <option value="delete">Elimina</option>}
          </select>
          {bulkAction === 'priority' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-white">
              <option value="">Seleziona priorità...</option>
              <option value="LOW">Bassa</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Critica</option>
            </select>
          )}
          <button
            onClick={executeBulkAction}
            disabled={!bulkAction || (bulkAction === 'priority' && !bulkValue)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Applica
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">
            Deseleziona tutto
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nuovo Ticket</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usa template...</label>
                  <select
                    defaultValue=""
                    onChange={(e) => applyTemplate(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">— Seleziona template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progetto</label>
                <select value={form.projectId} onChange={(e) => { setForm({ ...form, projectId: e.target.value, assigneeId: '' }); fetchProjectMembers(e.target.value); }}
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
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Descrivi il problema in dettaglio (min. 10 caratteri)..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="LOW">Bassa</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Critica</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm">
                      <option value="STANDARD">Standard</option>
                      <option value="SERVICE">Servizio</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assegna a</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Nessuno</option>
                  {projectMembers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreate} disabled={!form.projectId || !form.title || !form.description}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                Crea Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-gray-500">Caricamento...</div>
      ) : viewMode === 'kanban' ? (
        renderKanban()
      ) : (searchResults !== null ? searchResults : tickets).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Nessun ticket trovato</div>
      ) : (
        <div className="space-y-2">
          {/* Select all header */}
          {!searchResults && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <input
                type="checkbox"
                checked={selectedIds.size === tickets.length && tickets.length > 0}
                onChange={selectAll}
                className="rounded"
              />
              <span className="text-xs text-gray-500">Seleziona tutti</span>
            </div>
          )}
          {(searchResults !== null ? searchResults : tickets).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggleSelect(t.id)}
                onClick={e => e.stopPropagation()}
                className="rounded flex-shrink-0"
              />
              <Link to={`/tickets/${t.id}`}
                className="flex-1 block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {t.isUnread && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      <h3 className={t.isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}>{t.title}</h3>
                      {!t.takenChargeAt && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.type !== 'SERVICE' && (
                        <span className="text-xs text-gray-400">⏳ Non iniziata</span>
                      )}
                      {t.slaStatus && t.slaStatus !== 'none' && (
                        <Clock className={`w-4 h-4 ${slaIcons[t.slaStatus]}`} />
                      )}
                      {t.slaStatus === 'red' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{t.project?.name}</span>
                      <span>·</span>
                      <span>{t.creator?.name}</span>
                      {t.assignee && <><span>→</span><span>{t.assignee.name}</span></>}
                      <span>·</span>
                      <span>{t._count?.comments || 0} commenti</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[t.priority]}`}>
                      {t.priority === 'FEATURE_REQUEST' ? 'Feature' : t.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
