import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { Globe } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { settings, logoUrl } = useAppSettings();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login fallito. Controlla le credenziali.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
      </div>

      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 0 0 1px var(--border), 0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Brand */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-16 h-16 object-contain mx-auto mb-4 rounded-xl" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
              <Globe className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{settings.appName}</h1>
          <p className="text-sm mt-1 font-medium text-indigo-500">Helpdesk &amp; Project Management</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Accedi al tuo account</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {isLoading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          Sviluppato da{' '}
          <a href="https://studiogis.eu" target="_blank" rel="noopener noreferrer"
            className="text-indigo-500 hover:text-indigo-400 transition-colors font-medium">
            studiogis.eu
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
