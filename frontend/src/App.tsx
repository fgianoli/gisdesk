import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import ProjectsPage from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TicketsPage from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import ServiceTickets from './pages/ServiceTickets';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import AdminSettings from './pages/AdminSettings';
import UserProfile from './pages/UserProfile';
import Help from './pages/Help';
import AuditLogPage from './pages/AuditLog';
import WebhooksPage from './pages/Webhooks';
import TwoFASetup from './pages/TwoFASetup';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Caricamento...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Caricamento...</div>;
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/service-tickets" element={<AdminRoute><ServiceTickets /></AdminRoute>} />
        <Route path="/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
        <Route path="/templates" element={<AdminRoute><Templates /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/help" element={<Help />} />
        <Route path="/audit" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
        <Route path="/webhooks" element={<AdminRoute><WebhooksPage /></AdminRoute>} />
        <Route path="/settings/2fa" element={<TwoFASetup />} />
      </Route>
    </Routes>
  );
}
