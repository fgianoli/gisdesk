import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mail, Info, Save, Send, CheckCircle, AlertCircle, Upload, Trash2, Globe } from 'lucide-react';
import api from '../api/client';
import { useAppSettings } from '../context/AppSettingsContext';

type Tab = 'email' | 'general' | 'system';

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
    </div>
  );
}
