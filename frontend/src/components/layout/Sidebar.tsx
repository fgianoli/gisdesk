import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  LayoutDashboard, Users, FolderKanban, Ticket, Wrench, LogOut,
  BarChart3, LayoutTemplate, Globe, Settings, User, BookOpen,
  Shield, Zap, Menu, X, Moon, Sun,
} from 'lucide-react';
import NotificationBell from '../NotificationBell';
import { LanguageSelector } from '../LanguageSelector';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { settings, logoUrl } = useAppSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkBase =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 outline-none';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? `${linkBase} text-white`
      : `${linkBase} hover:text-white`;

  const linkStyle = (isActive: boolean): React.CSSProperties =>
    isActive
      ? { backgroundColor: 'var(--bg-sidebar-active)', color: '#fff' }
      : { color: 'var(--text-sidebar)' };

  const close = () => setMobileOpen(false);

  const sidebarContent = (
    <aside
      className="w-64 min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-sidebar)' }}
    >
      {/* Logo */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-sidebar)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Globe className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-white font-semibold text-base tracking-tight truncate">
            {settings.appName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-sidebar)' }}
            title={dark ? 'Modalità chiara' : 'Modalità scura'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-md"
            style={{ color: 'var(--text-sidebar)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Main */}
        <p
          className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}
        >
          Principale
        </p>

        <NavLink to="/" end onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> Dashboard
        </NavLink>

        <NavLink to="/projects" onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <FolderKanban className="w-4 h-4 flex-shrink-0" /> Progetti
        </NavLink>

        <NavLink to="/tickets" onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <Ticket className="w-4 h-4 flex-shrink-0" /> Ticket
        </NavLink>

        {/* Admin */}
        {isAdmin && (
          <>
            <p
              className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}
            >
              Admin
            </p>

            <NavLink to="/users" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Users className="w-4 h-4 flex-shrink-0" /> Utenti
            </NavLink>

            <NavLink to="/service-tickets" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Wrench className="w-4 h-4 flex-shrink-0" /> Ticket Servizio
            </NavLink>

            <NavLink to="/analytics" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" /> Analytics
            </NavLink>

            <NavLink to="/templates" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <LayoutTemplate className="w-4 h-4 flex-shrink-0" /> Template
            </NavLink>
          </>
        )}

        {/* Settings */}
        <p
          className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}
        >
          Account
        </p>

        <NavLink to="/profile" onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <User className="w-4 h-4 flex-shrink-0" /> Profilo
        </NavLink>

        <NavLink to="/settings/2fa" onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <Shield className="w-4 h-4 flex-shrink-0" /> Autenticazione 2FA
        </NavLink>

        <NavLink to="/help" onClick={close}
          className={linkClass}
          style={({ isActive }) => linkStyle(isActive)}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" /> Guida
        </NavLink>

        {isAdmin && (
          <>
            <p
              className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-sidebar)', opacity: 0.5 }}
            >
              Sistema
            </p>

            <NavLink to="/settings" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Settings className="w-4 h-4 flex-shrink-0" /> Impostazioni
            </NavLink>

            <NavLink to="/audit" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Shield className="w-4 h-4 flex-shrink-0" /> Audit Log
            </NavLink>

            <NavLink to="/webhooks" onClick={close}
              className={linkClass}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Zap className="w-4 h-4 flex-shrink-0" /> Webhook
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer user */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--border-sidebar)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-sidebar)' }}>
              {user?.role === 'ADMIN' ? 'Amministratore' : 'Cliente'}
            </div>
          </div>
          <NotificationBell />
        </div>

        <div className="flex items-center justify-between mb-2">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs transition-colors hover:text-red-400"
            style={{ color: 'var(--text-sidebar)' }}
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
          <LanguageSelector compact />
        </div>

        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-sidebar)' }}>
          <a
            href="https://studiogis.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] transition-colors hover:text-indigo-400"
            style={{ color: 'var(--text-sidebar)', opacity: 0.6 }}
          >
            GISdesk by studiogis.eu
          </a>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-sidebar)' }}
        aria-label="Apri menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop */}
      <div className="hidden md:block sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-50" onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
