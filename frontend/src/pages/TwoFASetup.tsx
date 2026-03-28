import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import api from '../api/client';

export default function TwoFASetup() {
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/2fa/status').then(r => setStatus(r.data)).catch(() => {});
  }, []);

  const startSetup = async () => {
    setLoading(true);
    try {
      const r = await api.post('/2fa/setup');
      setQrCode(r.data.qrCode);
      setSecret(r.data.secret);
      setStep('setup');
    } catch {}
    setLoading(false);
  };

  const enable = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await api.post('/2fa/enable', { token });
      setStatus({ enabled: true });
      setStep('idle');
      setToken('');
      alert('2FA attivato con successo!');
    } catch {
      alert('Codice non valido. Riprova.');
    }
    setLoading(false);
  };

  const disable = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await api.post('/2fa/disable', { token });
      setStatus({ enabled: false });
      setToken('');
      alert('2FA disattivato.');
    } catch {
      alert('Codice non valido. Riprova.');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-indigo-600" size={24} />
        <h1 className="text-2xl font-bold dark:text-white">Autenticazione a 2 Fattori</h1>
      </div>

      {status?.enabled ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-green-500" size={24} />
            <span className="font-semibold text-green-700 dark:text-green-400">2FA attivo</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Il tuo account è protetto con l'autenticazione a due fattori.
          </p>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Inserisci codice OTP per disattivare"
              value={token}
              onChange={e => setToken(e.target.value)}
              maxLength={6}
            />
            <button
              onClick={disable}
              disabled={loading || !token}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Verifica...' : 'Disattiva 2FA'}
            </button>
          </div>
        </div>
      ) : step === 'idle' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Proteggi il tuo account con Google Authenticator, Authy o qualsiasi app TOTP.
          </p>
          <button
            onClick={startSetup}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Generazione...' : 'Attiva 2FA'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Scansiona il QR code con la tua app TOTP, poi inserisci il codice generato per confermare.
          </p>
          <div className="flex justify-center mb-4">
            <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
          </div>
          <p className="text-xs text-center text-gray-400 mb-4 font-mono break-all">{secret}</p>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm text-center text-lg tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="000000"
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <button
              onClick={enable}
              disabled={loading || token.length !== 6}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Verifica...' : 'Conferma e Attiva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
