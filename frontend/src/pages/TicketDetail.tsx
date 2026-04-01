import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Ticket, User, TicketAttachment, TimeEntry, TicketDependency, CannedResponse, Tag } from '../types';
import {
  ArrowLeft, Clock, AlertTriangle, Send, Edit2, Save, X, Paperclip, Download, Image,
  Timer, Link2, Plus, Trash2, Star, Lock, MessageSquare, Merge, Tag as TagIcon,
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import RichTextDisplay from '../components/RichTextDisplay';

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

const slaColors: Record<string, string> = {
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  none: 'text-gray-400',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Corso',
  WAITING: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
  FEATURE_REQUEST: 'Feature Request',
};

// Render comment content with @mentions highlighted
function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@[\w\-\.]+)/g);
  return (
    <p className="text-sm text-gray-700 whitespace-pre-wrap">
      {parts.map((part, i) =>
        /^@[\w\-\.]+$/.test(part) ? (
          <span key={i} className="text-blue-600 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ status: '', priority: '', assigneeId: '' });
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Satisfaction survey
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  // Time entries
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeForm, setTimeForm] = useState({ minutes: '', note: '' });
  const [addingTime, setAddingTime] = useState(false);

  // Dependencies
  const [dependencies, setDependencies] = useState<{ blockedBy: TicketDependency[], blocks: TicketDependency[] }>({ blockedBy: [], blocks: [] });
  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [depTicketId, setDepTicketId] = useState('');
  const [addingDep, setAddingDep] = useState(false);

  // Canned responses
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCanned, setShowCanned] = useState(false);

  // Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Merge
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [merging, setMerging] = useState(false);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
      setEditData({
        status: res.data.status,
        priority: res.data.priority,
        assigneeId: res.data.assigneeId || '',
      });
      const projRes = await api.get(`/projects/${res.data.projectId}`);
      setProjectMembers(projRes.data.members?.map((m: any) => m.user) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const res = await api.get(`/time-entries/ticket/${id}`);
      setTimeEntries(res.data);
    } catch { /* ignore */ }
  };

  const fetchDependencies = async () => {
    try {
      const res = await api.get(`/dependencies/ticket/${id}`);
      setDependencies(res.data);
    } catch { /* ignore */ }
  };

  const fetchProjectTickets = async (projectId: string) => {
    try {
      const res = await api.get(`/tickets?projectId=${projectId}`);
      setProjectTickets(res.data.filter((t: Ticket) => t.id !== id));
    } catch { /* ignore */ }
  };

  const fetchCannedResponses = async () => {
    try {
      const res = await api.get('/canned-responses');
      setCannedResponses(res.data);
    } catch { /* ignore */ }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setAvailableTags(res.data);
    } catch { /* ignore */ }
  };

  const fetchAllTickets = async () => {
    try {
      const res = await api.get('/tickets');
      setAllTickets(res.data.filter((t: Ticket) => t.id !== id));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchTicket();
    fetchTimeEntries();
    fetchDependencies();
    fetchCannedResponses();
    fetchTags();
    if (isAdmin) fetchAllTickets();
  }, [id]);

  // Show survey modal if ?survey=1 in URL and ticket is resolved/closed
  useEffect(() => {
    if (searchParams.get('survey') === '1' && ticket) {
      if ((ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && !(ticket as any).satisfaction) {
        setShowSurvey(true);
      }
    }
  }, [searchParams, ticket]);

  useEffect(() => {
    if (ticket?.projectId) {
      fetchProjectTickets(ticket.projectId);
    }
  }, [ticket?.projectId]);

  const handleUpdate = async () => {
    try {
      await api.put(`/tickets/${id}`, editData);
      setEditing(false);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tickets/${id}/comments`, { content: comment, isInternal });
      setComment('');
      setIsInternal(false);
      fetchTicket();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/tickets/${id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore nel caricamento');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Eliminare questo allegato?')) return;
    try {
      await api.delete(`/attachments/${attachmentId}`);
      fetchTicket();
    } catch {
      alert('Errore nella cancellazione');
    }
  };

  const handleDeleteTicket = async () => {
    if (!confirm(`Eliminare definitivamente il ticket "${ticket?.title}"? L'operazione non è reversibile.`)) return;
    try {
      await api.delete(`/tickets/${id}`);
      navigate('/tickets');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore durante l\'eliminazione');
    }
  };

  const handleAddTimeEntry = async () => {
    if (!timeForm.minutes || Number(timeForm.minutes) <= 0) return;
    try {
      await api.post('/time-entries', {
        ticketId: id,
        minutes: Number(timeForm.minutes),
        note: timeForm.note || undefined,
      });
      setTimeForm({ minutes: '', note: '' });
      setAddingTime(false);
      fetchTimeEntries();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    try {
      await api.delete(`/time-entries/${entryId}`);
      fetchTimeEntries();
    } catch { /* ignore */ }
  };

  const handleAddDependency = async () => {
    if (!depTicketId) return;
    try {
      await api.post('/dependencies', { ticketId: id, dependsOnId: depTicketId });
      setDepTicketId('');
      setAddingDep(false);
      fetchDependencies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    try {
      await api.delete(`/dependencies/${depId}`);
      fetchDependencies();
    } catch { /* ignore */ }
  };

  const handleSurveySubmit = async () => {
    if (!surveyRating) return;
    setSurveySubmitting(true);
    try {
      await api.post(`/tickets/${id}/satisfaction`, { rating: surveyRating, comment: surveyComment || undefined });
      setSurveySubmitted(true);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    } finally {
      setSurveySubmitting(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      await api.post(`/tags/ticket/${id}`, { tagId });
      setShowTagPicker(false);
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.delete(`/tags/ticket/${id}/${tagId}`);
      fetchTicket();
    } catch { /* ignore */ }
  };

  const handleMerge = async () => {
    if (!mergeTargetId) return;
    if (!confirm('Sei sicuro di voler unire questo ticket? L\'operazione non è reversibile.')) return;
    setMerging(true);
    try {
      const res = await api.post(`/tickets/${id}/merge`, { targetId: mergeTargetId });
      setShowMerge(false);
      navigate(`/tickets/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore durante il merge');
    } finally {
      setMerging(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const totalMinutes = timeEntries.reduce((s, e) => s + e.minutes, 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimetype: string) => mimetype.startsWith('image/');

  const ticketTagIds = new Set(ticket?.tags?.map((tt) => tt.tagId) || []);
  const unaddedTags = availableTags.filter((t) => !ticketTagIds.has(t.id));

  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!ticket) return <div className="p-6">Ticket non trovato</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/tickets" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Torna ai ticket
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[ticket.status]}`}>
                {statusLabels[ticket.status]}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[ticket.priority]}`}>
                {priorityLabels[ticket.priority]}
              </span>
              {ticket.type === 'SERVICE' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-white">Servizio</span>
              )}
              {ticket.slaDeadline && (
                <span className={`flex items-center gap-1 text-xs ${slaColors[ticket.slaStatus]}`}>
                  <Clock className="w-3 h-3" />
                  SLA: {new Date(ticket.slaDeadline).toLocaleString('it-IT')}
                  {ticket.slaStatus === 'red' && <AlertTriangle className="w-3 h-3" />}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap mt-2">
              {ticket.tags?.map((tt) => (
                <span
                  key={tt.tagId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tt.tag.color }}
                >
                  {tt.tag.name}
                  {isAdmin && (
                    <button onClick={() => handleRemoveTag(tt.tagId)} className="ml-1 opacity-70 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowTagPicker((v) => !v)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500"
                  >
                    <TagIcon className="w-3 h-3" /> Tag
                  </button>
                  {showTagPicker && (
                    <div className="absolute left-0 top-7 z-20 bg-white border rounded-lg shadow-lg p-2 min-w-40">
                      {unaddedTags.length === 0 ? (
                        <p className="text-xs text-gray-400 px-2 py-1">Nessun tag disponibile</p>
                      ) : (
                        unaddedTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleAddTag(tag.id)}
                            className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-50 text-sm"
                          >
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))
                      )}
                      <button onClick={() => setShowTagPicker(false)} className="mt-1 w-full text-xs text-gray-400 hover:text-gray-600 text-right pr-1">Chiudi</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(isAdmin || ticket.creatorId === currentUser?.id) && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">
                <Edit2 className="w-4 h-4" /> Modifica
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setShowMerge(true); fetchAllTickets(); }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200"
              >
                <Merge className="w-4 h-4" /> Unisci
              </button>
            )}
            {(isAdmin || ticket.creatorId === currentUser?.id) && (
              <button
                onClick={handleDeleteTicket}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200"
              >
                <Trash2 className="w-4 h-4" /> Elimina
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="bg-gray-50 rounded p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
                <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priorità</label>
                  <select value={editData.priority} onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assegnato a</label>
                <select value={editData.assigneeId} onChange={(e) => setEditData({ ...editData, assigneeId: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Nessuno</option>
                  {projectMembers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                <Save className="w-4 h-4" /> Salva
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">
                <X className="w-4 h-4" /> Annulla
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          <div><strong>Progetto:</strong> <Link to={`/projects/${ticket.project?.id}`} className="text-blue-600 hover:underline">{ticket.project?.name}</Link></div>
          <div><strong>Creato da:</strong> {ticket.creator?.name}</div>
          <div><strong>Assegnato a:</strong> {ticket.assignee?.name || 'Nessuno'}</div>
          <div><strong>Creato:</strong> {new Date(ticket.createdAt).toLocaleString('it-IT')}</div>
        </div>

        {/* Description */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-2">Descrizione</h3>
          <RichTextDisplay html={ticket.description} />
        </div>

        {/* Satisfaction score display */}
        {(ticket as any).satisfaction && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-2">Valutazione Cliente</h3>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= (ticket as any).satisfaction.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              ))}
              <span className="text-sm text-gray-600 ml-2">{(ticket as any).satisfaction.rating}/5</span>
            </div>
            {(ticket as any).satisfaction.comment && (
              <p className="text-sm text-gray-600 mt-1 italic">"{(ticket as any).satisfaction.comment}"</p>
            )}
          </div>
        )}
      </div>

      {/* Merge Modal */}
      {showMerge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Unisci Ticket</h3>
              <button onClick={() => setShowMerge(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Seleziona il ticket destinazione. I commenti e gli allegati di questo ticket verranno copiati nel ticket selezionato, e questo ticket verrà chiuso.
            </p>
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mb-4"
            >
              <option value="">— Seleziona ticket destinazione —</option>
              {allTickets.map((t) => (
                <option key={t.id} value={t.id}>[{t.status}] {t.title}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMerge(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Annulla</button>
              <button
                onClick={handleMerge}
                disabled={!mergeTargetId || merging}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {merging ? 'Unione...' : 'Unisci'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Tracking */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Ore Registrate
            {totalMinutes > 0 && (
              <span className="text-sm text-gray-500 font-normal">— Totale: {formatMinutes(totalMinutes)}</span>
            )}
          </h3>
          <button
            onClick={() => setAddingTime((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>

        {addingTime && (
          <div className="bg-gray-50 rounded p-3 mb-3 flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minuti *</label>
              <input
                type="number"
                min={1}
                value={timeForm.minutes}
                onChange={(e) => setTimeForm({ ...timeForm, minutes: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm w-24"
                placeholder="60"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota</label>
              <input
                value={timeForm.note}
                onChange={(e) => setTimeForm({ ...timeForm, note: e.target.value })}
                className="w-full border rounded px-3 py-1.5 text-sm"
                placeholder="Opzionale..."
              />
            </div>
            <button
              onClick={handleAddTimeEntry}
              disabled={!timeForm.minutes || Number(timeForm.minutes) <= 0}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Salva
            </button>
            <button
              onClick={() => setAddingTime(false)}
              className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Annulla
            </button>
          </div>
        )}

        {timeEntries.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna ora registrata.</p>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-700">{formatMinutes(e.minutes)}</span>
                  <span className="text-gray-600">{e.user.name}</span>
                  {e.note && <span className="text-gray-500 text-xs">— {e.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString('it-IT')}</span>
                  {(isAdmin || e.userId === currentUser?.id) && (
                    <button onClick={() => handleDeleteTimeEntry(e.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Dipendenze
          </h3>
          <button
            onClick={() => setAddingDep((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>

        {addingDep && (
          <div className="bg-gray-50 rounded p-3 mb-3 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Questo ticket è bloccato da...</label>
              <select
                value={depTicketId}
                onChange={(e) => setDepTicketId(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm"
              >
                <option value="">— Seleziona ticket —</option>
                {projectTickets.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddDependency}
              disabled={!depTicketId}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Aggiungi
            </button>
            <button
              onClick={() => setAddingDep(false)}
              className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Annulla
            </button>
          </div>
        )}

        {dependencies.blockedBy.length === 0 && dependencies.blocks.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna dipendenza.</p>
        ) : (
          <div className="space-y-3">
            {dependencies.blockedBy.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bloccato da</p>
                {dependencies.blockedBy.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between bg-red-50 rounded p-2 mb-1">
                    <Link to={`/tickets/${dep.dependsOn.id}`} className="text-sm text-red-700 hover:underline font-medium">
                      {dep.dependsOn.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[dep.dependsOn.status]}`}>
                        {statusLabels[dep.dependsOn.status]}
                      </span>
                      <button onClick={() => handleDeleteDependency(dep.id)} className="text-gray-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {dependencies.blocks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocca</p>
                {dependencies.blocks.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between bg-orange-50 rounded p-2 mb-1">
                    <Link to={`/tickets/${dep.ticket.id}`} className="text-sm text-orange-700 hover:underline font-medium">
                      {dep.ticket.title}
                    </Link>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[dep.ticket.status]}`}>
                      {statusLabels[dep.ticket.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {ticket.history && ticket.history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Storico Modifiche</h3>
          <div className="space-y-2">
            {ticket.history.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">{h.user.name}</span> ha cambiato
                <span className="font-medium">{h.field}</span> da
                <span className="line-through">{h.oldValue}</span> a
                <span className="font-medium text-blue-600">{h.newValue}</span>
                <span className="text-gray-400 ml-auto">{new Date(h.createdAt).toLocaleString('it-IT')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Allegati ({ticket.attachments?.length || 0})
          </h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
              {uploading ? 'Caricamento...' : 'Aggiungi allegato'}
            </button>
          </div>
        </div>

        {(!ticket.attachments || ticket.attachments.length === 0) ? (
          <p className="text-sm text-gray-400">Nessun allegato.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ticket.attachments.map((att) => (
              <div key={att.id} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                {isImage(att.mimetype) ? (
                  <a href={`/api/attachments/${att.id}`} target="_blank" rel="noopener noreferrer">
                    <img
                      src={`/api/attachments/${att.id}`}
                      alt={att.originalName}
                      className="w-full h-24 object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={`/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-24 text-gray-400 hover:text-blue-600"
                  >
                    <Download className="w-8 h-8 mb-1" />
                    <span className="text-xs text-center px-1 truncate w-full text-center">{att.originalName}</span>
                  </a>
                )}
                <div className="p-2 border-t bg-white">
                  <p className="text-xs text-gray-700 truncate" title={att.originalName}>{att.originalName}</p>
                  <p className="text-xs text-gray-400">{formatSize(att.size)}</p>
                </div>
                {(isAdmin || att.uploadedById === currentUser?.id) && (
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Satisfaction Survey Modal */}
      {showSurvey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            {surveySubmitted ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Grazie per il feedback!</h3>
                <p className="text-gray-500 text-sm mb-4">La tua valutazione è stata registrata.</p>
                <button onClick={() => setShowSurvey(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  Chiudi
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Come valuteresti il supporto ricevuto?</h3>
                  <button onClick={() => setShowSurvey(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setSurveyRating(s)} className="transition-transform hover:scale-110">
                      <Star className={`w-8 h-8 ${s <= surveyRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mb-4">
                  {surveyRating === 1 ? 'Molto insoddisfatto' : surveyRating === 2 ? 'Insoddisfatto' : surveyRating === 3 ? 'Neutro' : surveyRating === 4 ? 'Soddisfatto' : surveyRating === 5 ? 'Molto soddisfatto' : 'Seleziona una valutazione'}
                </p>
                <textarea
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  placeholder="Commento opzionale..."
                  className="w-full border rounded px-3 py-2 text-sm resize-none mb-4"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowSurvey(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Salta</button>
                  <button
                    onClick={handleSurveySubmit}
                    disabled={!surveyRating || surveySubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {surveySubmitting ? 'Invio...' : 'Invia valutazione'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-medium text-gray-900 mb-4">Commenti ({ticket.comments?.length || 0})</h3>

        <div className="space-y-4 mb-4">
          {ticket.comments?.map((c) => (
            <div
              key={c.id}
              className={c.isInternal
                ? 'bg-amber-50 border-l-4 border-amber-400 rounded p-3'
                : 'bg-gray-50 rounded p-3'
              }
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {c.isInternal && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                  <span className="font-medium text-sm text-gray-900">{c.user.name}</span>
                  {c.isInternal && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">🔒 Nota interna</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('it-IT')}</span>
              </div>
              <RichTextDisplay html={c.content} />
            </div>
          ))}
          {(!ticket.comments || ticket.comments.length === 0) && (
            <p className="text-sm text-gray-400">Nessun commento ancora.</p>
          )}
        </div>

        <div className="space-y-2">
          {/* Canned responses */}
          {isAdmin && cannedResponses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCanned((v) => !v)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded hover:bg-gray-50 text-gray-600 mb-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Risposte rapide
              </button>
              {showCanned && (
                <div className="absolute z-20 bottom-full mb-1 left-0 bg-white border rounded-lg shadow-lg p-2 w-72 max-h-56 overflow-y-auto">
                  {cannedResponses.map((cr) => (
                    <button
                      key={cr.id}
                      onClick={() => { setComment(cr.content); setShowCanned(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm"
                    >
                      <span className="font-medium text-gray-800">{cr.title}</span>
                      {cr.category && <span className="text-xs text-gray-400 ml-1">({cr.category})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <RichTextEditor
            value={comment}
            onChange={setComment}
            placeholder="Scrivi un commento... Usa @nome per menzionare un utente"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">Usa @nome per menzionare un utente del progetto</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsInternal((v) => !v)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors ${
                    isInternal
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isInternal ? 'Nota interna' : 'Nota interna'}
                </button>
              )}
            </div>
            <button
              onClick={handleComment}
              disabled={!comment || comment === '<p></p>'}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" /> Invia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
