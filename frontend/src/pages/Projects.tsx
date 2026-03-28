import React, { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Users, Ticket, X, Calendar } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Project } from '../types';

interface ProjectForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  slaHours: number;
}

const emptyForm: ProjectForm = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  slaHours: 24,
};

const statusConfig: Record<Project['status'], { label: string; color: string }> = {
  ACTIVE: { label: 'Attivo', color: 'bg-green-100 text-green-800' },
  ON_HOLD: { label: 'In Pausa', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completato', color: 'bg-blue-100 text-blue-800' },
  ARCHIVED: { label: 'Archiviato', color: 'bg-gray-100 text-gray-800' },
};

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch {
      setError('Errore nel caricamento dei progetti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.post('/projects', {
        name: form.name,
        description: form.description || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        slaHours: form.slaHours,
      });
      closeModal();
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante la creazione del progetto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Progetti</h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuovo Progetto
          </button>
        )}
      </div>

      {error && !showModal && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-900">Nessun progetto</p>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Crea il tuo primo progetto per iniziare.' : 'Non sei ancora assegnato a nessun progetto.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            const memberCount = project.members?.length ?? 0;
            const ticketCount = project._count?.tickets ?? 0;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                    {project.name}
                  </h3>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}

                {!project.description && <div className="mb-4" />}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {memberCount} {memberCount === 1 ? 'membro' : 'membri'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Ticket className="h-3.5 w-3.5" />
                    {ticketCount} {ticketCount === 1 ? 'ticket' : 'ticket'}
                  </span>
                  {project.startDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(project.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nuovo Progetto</h2>
              <button onClick={closeModal} className="rounded-md p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Progetto</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nome del progetto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Descrizione del progetto (opzionale)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SLA (ore)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.slaHours}
                  onChange={(e) => setForm({ ...form, slaHours: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creazione...' : 'Crea Progetto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
