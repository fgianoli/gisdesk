import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  Ticket,
  AlertCircle,
  CircleDot,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Project, Ticket as TicketType } from '../types';

interface DashboardStats {
  totalProjects: number;
  totalTickets: number;
  openTickets: number;
  criticalTickets: number;
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-gray-100 text-gray-800',
  closed: 'bg-gray-200 text-gray-600',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const formatLabel = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, ticketsRes] = await Promise.all([
          api.get<Project[]>('/projects'),
          api.get<TicketType[]>('/tickets'),
        ]);
        setProjects(projectsRes.data);
        setTickets(ticketsRes.data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats: DashboardStats = {
    totalProjects: projects.length,
    totalTickets: tickets.length,
    openTickets: tickets.filter((t) => t.status === 'OPEN').length,
    criticalTickets: tickets.filter((t) => t.priority === 'CRITICAL').length,
  };

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const ticketsByStatus = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const ticketsByPriority = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Open Tickets',
      value: stats.openTickets,
      icon: CircleDot,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Critical Tickets',
      value: stats.criticalTickets,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name ?? 'User'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4"
          >
            <div className={`${card.bg} rounded-lg p-3`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tickets by Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Tickets by Status</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(ticketsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {formatLabel(status)}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets by Priority */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Tickets by Priority</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(ticketsByPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[priority] ?? 'bg-gray-100 text-gray-800'}`}>
                    {formatLabel(priority)}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
        </div>

        {recentTickets.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No tickets found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[ticket.status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {formatLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {formatLabel(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString()}
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
};

export default Dashboard;
