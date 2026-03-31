import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Info, Save, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/client';

type Tab = 'profile' | 'security' | 'account';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  phone: string | null;
  company: string | null;
  avatar: string | null;
  createdAt: string;
  _count?: { createdTickets: number };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<ProfileData>('/profile/me').then((r) => {
      setProfile(r.data);
      setName(r.data.name);
      setEmail(r.data.email);
      setPhone(r.data.phone || '');
      setCompany(r.data.company || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const r = await api.put<ProfileData>('/profile/me', { name, email, phone, company });
      setProfile(r.data);
      setProfileMsg({ type: 'success', text: 'Profilo aggiornato con successo.' });
    } catch {
      setProfileMsg({ type: 'error', text: 'Errore durante il salvataggio.' });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'La nuova password deve avere almeno 8 caratteri.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Le password non coincidono.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await api.put('/profile/me/password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password aggiornata con successo.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Errore durante il cambio password.';
      setPasswordMsg({ type: 'error', text: msg });
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(null), 5000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const r = await api.post<{ avatar: string }>('/profile/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => prev ? { ...prev, avatar: r.data.avatar } : prev);
    } catch {
      // silent
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profilo', icon: <User className="w-4 h-4" /> },
    { key: 'security', label: 'Sicurezza', icon: <Lock className="w-4 h-4" /> },
    { key: 'account', label: 'Info Account', icon: <Info className="w-4 h-4" /> },
  ];

  const avatarUrl = profile?.avatar ? `/api/profile/avatar/${profile.id}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-emerald-600" />
          Il Mio Profilo
        </h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci le tue informazioni personali e la sicurezza</p>
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

      {/* Tab: Profilo */}
      {activeTab === 'profile' && profile && (
        <div className="space-y-6">
          {/* Avatar section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Foto Profilo</h2>
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-emerald-200">
                  {getInitials(profile.name)}
                </div>
              )}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  <Camera className="w-4 h-4" />
                  {avatarUploading ? 'Caricamento...' : 'Cambia foto'}
                </button>
                <p className="mt-1 text-xs text-gray-400">Max 5MB, solo immagini</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>
          </div>

          {/* Profile fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informazioni Personali</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 012 3456789"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nome azienda"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {profileMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {profileMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {profileMsg.text}
            </div>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {profileSaving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      )}

      {/* Tab: Sicurezza */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Cambio Password</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password attuale</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 caratteri"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma nuova password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la nuova password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {passwordMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {passwordMsg.text}
            </div>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={passwordSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            <Lock className="w-4 h-4" />
            {passwordSaving ? 'Aggiornamento...' : 'Aggiorna password'}
          </button>
        </div>
      )}

      {/* Tab: Info Account */}
      {activeTab === 'account' && profile && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Dettagli Account</h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Ruolo</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${profile.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                  {profile.role}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Stato account</span>
                <span className={`text-sm font-medium ${profile.active ? 'text-emerald-700' : 'text-red-600'}`}>
                  {profile.active ? 'Attivo' : 'Disabilitato'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Data creazione</span>
                <span className="text-sm font-medium text-gray-800">
                  {new Date(profile.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              {profile._count !== undefined && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Ticket creati</span>
                  <span className="text-sm font-medium text-gray-800">{profile._count.createdTickets}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
