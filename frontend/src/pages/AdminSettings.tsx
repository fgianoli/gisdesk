import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mail, Info, Save, Send, CheckCircle, AlertCircle, Upload, Trash2, Globe, GitBranch, Plus, X, Edit2, MessageSquare, Tag } from 'lucide-react';
import api from '../api/client';
import { useAppSettings } from '../context/AppSettingsContext';
import { CannedResponse, Tag as TagType } from '../types';
import RichTextEditor from '../components/RichTextEditor';

type Tab = 'email' | 'general' | 'system' | 'assignment' | 'canned' | 'tags';

interface SettingsData {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  appName: string;
  frontendUrl: string;
}

const defaultSettings: SettingsData = {
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFrom: 'noreply@gisdesk.local',
  appName: 'GISdesk',
  frontendUrl: 'http://localhost:3000',
};

export default function AdminSettings() {
  const { logoUrl, refresh: refreshAppSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<Tab>('email');
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoMsg, setLogoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<SettingsData>('/settings').then((r) => {
      setSettings({ ...defaultSettings, ...r.data });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put('/settings', settings);
      setSaveMsg({ type: 'success', text: 'Impostazioni salvate con successo.' });
    } catch {
      setSaveMsg({ type: 'error', text: 'Errore durante il salvataggio.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestMsg(null);
    try {
      const r = await api.post<{ message: string }>('/settings/test-email', {});
      setTestMsg({ type: 'success', text: r.data.message || 'Email di test inviata.' });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Errore invio email.';
      setTestMsg({ type: 'error', text: msg });
    } finally {
      setTestingEmail(false);
      setTimeout(() => setTestMsg(null), 6000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setLogoMsg(null);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshAppSettings();
      setLogoMsg({ type: 'success', text: 'Logo caricato con successo.' });
    } catch (err: any) {
      setLogoMsg({ type: 'error', text: err.response?.data?.error || 'Errore caricamento logo.' });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
      setTimeout(() => setLogoMsg(null), 4000);
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm('Rimuovere il logo personalizzato?')) return;
    try {
      await api.delete('/settings/logo');
      await refreshAppSettings();
      setLogoMsg({ type: 'success', text: 'Logo rimosso.' });
    } catch {
      setLogoMsg({ type: 'error', text: 'Errore rimozione logo.' });
    } finally {
      setTimeout(() => setLogoMsg(null), 4000);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'email', label: 'Email SMTP', icon: <Mail className="w-4 h-4" /> },
    { key: 'general', label: 'Generale', icon: <Settings className="w-4 h-4" /> },
    { key: 'assignment', label: 'Assegnazione Auto', icon: <GitBranch className="w-4 h-4" /> },
    { key: 'canned', label: 'Risposte Rapide', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'tags', label: 'Tag', icon: <Tag className="w-4 h-4" /> },
    { key: 'system', label: 'Info Sistema', icon: <Info className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          Impostazioni di Sistema
        </h1>
        <p className="mt-1 text-sm text-gray-500">Configura le impostazioni globali di GISdesk</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Email SMTP */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              In sviluppo locale le email vengono catturate da Mailhog su{' '}
              <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                http://localhost:8025
              </a>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Configurazione SMTP</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => handleChange('smtpHost', e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => handleChange('smtpPort', e.target.value)}
                  placeholder="587"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User</label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => handleChange('smtpUser', e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={settings.smtpPass}
                  onChange={(e) => handleChange('smtpPass', e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP From</label>
                <input
                  type="email"
                  value={settings.smtpFrom}
                  onChange={(e) => handleChange('smtpFrom', e.target.value)}
                  placeholder="noreply@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frontend URL</label>
                <input
                  type="url"
                  value={settings.frontendUrl}
                  onChange={(e) => handleChange('frontendUrl', e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {testMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${testMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {testMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testMsg.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva impostazioni'}
            </button>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="flex items-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              {testingEmail ? 'Invio...' : 'Invia email di test'}
            </button>
          </div>

          {saveMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${saveMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {saveMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {saveMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Tab: Generale */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Nome applicazione */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Identità Applicazione</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Applicazione</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                placeholder="GISdesk"
                className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Appare nella sidebar, nella pagina di login e nelle email.</p>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Logo</h2>
            <p className="text-xs text-gray-500">PNG, JPG, SVG o WebP — max 2 MB. Verrà mostrato nella sidebar e nella pagina di login al posto dell'icona predefinita.</p>

            <div className="flex items-center gap-6">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="logo attuale" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Globe className="w-8 h-8 text-gray-300" />
                    <span className="text-xs text-gray-400">Nessun logo</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Caricamento...' : 'Carica logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={handleLogoDelete}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Rimuovi logo
                  </button>
                )}
              </div>
            </div>

            {logoMsg && (
              <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${logoMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {logoMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {logoMsg.text}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva nome'}
            </button>
          </div>

          {saveMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${saveMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {saveMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {saveMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Tab: Informazioni Sistema */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informazioni Sistema</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Versione</div>
                <div className="font-semibold text-gray-800">GISdesk 1.0.0</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Licenza</div>
                <div className="font-semibold text-gray-800">Apache 2.0</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Sviluppato da</div>
                <a
                  href="https://studiogis.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  studiogis.eu
                </a>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Ambiente</div>
                <div className="font-semibold text-gray-800">
                  {(import.meta as any).env?.MODE === 'production' ? 'Produzione' : 'Sviluppo'}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 space-y-1">
              <div><span className="text-emerald-400">Stack tecnologico:</span></div>
              <div className="pl-4">
                <span className="text-yellow-300">Frontend:</span> React 18, TypeScript, Tailwind CSS
              </div>
              <div className="pl-4">
                <span className="text-yellow-300">Backend:</span> Node.js, Express, Prisma ORM
              </div>
              <div className="pl-4">
                <span className="text-yellow-300">Database:</span> PostgreSQL
              </div>
              <div className="pl-4">
                <span className="text-yellow-300">Auth:</span> JWT (7 giorni)
              </div>
              <div className="pl-4">
                <span className="text-yellow-300">Email:</span> Nodemailer / Mailhog (dev)
              </div>
              <div className="pl-4">
                <span className="text-yellow-300">Container:</span> Docker / Docker Compose
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'assignment' && <AssignmentRulesTab />}
      {activeTab === 'canned' && <CannedResponsesTab />}
      {activeTab === 'tags' && <TagsTab />}
    </div>
  );
}

function AssignmentRulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ projectId: '', priority: '', type: '', assigneeId: '', isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await api.get('/assignment-rules');
      setRules(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
    api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.assigneeId) { alert('Seleziona un assegnatario'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/assignment-rules/${editingId}`, form);
      } else {
        await api.post('/assignment-rules', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ projectId: '', priority: '', type: '', assigneeId: '', isActive: true, sortOrder: 0 });
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
    setSaving(false);
  };

  const handleEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({
      projectId: rule.projectId || '',
      priority: rule.priority || '',
      type: rule.type || '',
      assigneeId: rule.assigneeId || '',
      isActive: rule.isActive,
      sortOrder: rule.sortOrder,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa regola?')) return;
    try {
      await api.delete(`/assignment-rules/${id}`);
      fetchRules();
    } catch {}
  };

  const handleToggle = async (rule: any) => {
    try {
      await api.put(`/assignment-rules/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch {}
  };

  if (loading) return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Regole di Assegnazione Automatica</h2>
            <p className="text-sm text-gray-500 mt-1">Assegna automaticamente i nuovi ticket in base a progetto, priorità e tipo.</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ projectId: '', priority: '', type: '', assigneeId: '', isActive: true, sortOrder: 0 }); }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Aggiungi Regola
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-3">
            <h3 className="font-medium text-sm text-gray-800">{editingId ? 'Modifica Regola' : 'Nuova Regola'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Progetto (opzionale)</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Tutti i progetti</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assegnatario *</label>
                <select value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Seleziona...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priorità (opzionale)</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Tutte</option>
                  <option value="LOW">Bassa</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Critica</option>
                  <option value="FEATURE_REQUEST">Feature Request</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo (opzionale)</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Tutti</option>
                  <option value="STANDARD">Standard</option>
                  <option value="SERVICE">Servizio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordine</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full border rounded px-2 py-1.5 text-sm" min={0} />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Regola attiva</label>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Annulla</button>
            </div>
          </div>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nessuna regola di assegnazione. Creane una per automatizzare l'assegnazione dei ticket.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Progetto</th>
                  <th className="px-3 py-2 text-left">Priorità</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Assegnatario</th>
                  <th className="px-3 py-2 text-left">Ordine</th>
                  <th className="px-3 py-2 text-left">Attiva</th>
                  <th className="px-3 py-2 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map(rule => (
                  <tr key={rule.id} className={`${!rule.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">{rule.project?.name || <span className="text-gray-400">Tutti</span>}</td>
                    <td className="px-3 py-2">{rule.priority || <span className="text-gray-400">Tutte</span>}</td>
                    <td className="px-3 py-2">{rule.type || <span className="text-gray-400">Tutti</span>}</td>
                    <td className="px-3 py-2 font-medium">{rule.assignee?.name}</td>
                    <td className="px-3 py-2">{rule.sortOrder}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleToggle(rule)} className={`px-2 py-0.5 rounded text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.isActive ? 'Sì' : 'No'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(rule)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CannedResponsesTab() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchResponses = async () => {
    try {
      const res = await api.get('/canned-responses');
      setResponses(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchResponses(); }, []);

  const handleSave = async () => {
    if (!form.title || !form.content) { alert('Titolo e contenuto sono obbligatori'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/canned-responses/${editingId}`, form);
      } else {
        await api.post('/canned-responses', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', content: '', category: '', sortOrder: 0 });
      fetchResponses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
    setSaving(false);
  };

  const handleEdit = (cr: CannedResponse) => {
    setEditingId(cr.id);
    setForm({ title: cr.title, content: cr.content, category: cr.category || '', sortOrder: cr.sortOrder });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa risposta rapida?')) return;
    try {
      await api.delete(`/canned-responses/${id}`);
      fetchResponses();
    } catch {}
  };

  if (loading) return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Risposte Rapide</h2>
            <p className="text-sm text-gray-500 mt-1">Testi predefiniti da usare nei commenti dei ticket.</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', content: '', category: '', sortOrder: 0 }); }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-3">
            <h3 className="font-medium text-sm text-gray-800">{editingId ? 'Modifica Risposta' : 'Nuova Risposta Rapida'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Es: Richiesta informazioni aggiuntive" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Es: Chiusura, Escalation..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordine</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5 text-sm" min={0} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contenuto *</label>
              <RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="Testo della risposta..." />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Annulla</button>
            </div>
          </div>
        )}

        {responses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nessuna risposta rapida. Creane una per velocizzare le risposte ai ticket.</p>
        ) : (
          <div className="space-y-2">
            {responses.map((cr) => (
              <div key={cr.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium text-sm text-gray-800">{cr.title}</p>
                  {cr.category && <p className="text-xs text-gray-400 mt-0.5">{cr.category}</p>}
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <button onClick={() => handleEdit(cr)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(cr.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TagsTab() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!form.name) { alert('Il nome è obbligatorio'); return; }
    setSaving(true);
    try {
      await api.post('/tags', form);
      setForm({ name: '', color: '#6366f1' });
      fetchTags();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Errore');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo tag? Verrà rimosso da tutti i ticket.')) return;
    try {
      await api.delete(`/tags/${id}`);
      fetchTags();
    } catch {}
  };

  if (loading) return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-800">Tag</h2>
          <p className="text-sm text-gray-500 mt-1">Crea e gestisci i tag per categorizzare i ticket.</p>
        </div>

        {/* Add tag form */}
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Nuovo Tag</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="Es: bug, urgente, documentazione..."
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Colore</label>
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-10 h-9 rounded border cursor-pointer"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Crea
            </button>
          </div>
          {form.name && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Anteprima: </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: form.color }}>
                {form.name}
              </span>
            </div>
          )}
        </div>

        {tags.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nessun tag creato.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-1 border rounded-full pl-3 pr-1 py-1">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium text-gray-700 mr-1">{tag.name}</span>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="text-gray-300 hover:text-red-500 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
