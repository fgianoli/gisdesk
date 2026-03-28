import React, { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/client';
import type { Webhook } from '../types';

const EVENT_OPTIONS = [
  { value: 'ticket.created', label: 'Ticket creato' },
  { value: 'ticket.updated', label: 'Ticket aggiornato' },
  { value: 'ticket.closed', label: 'Ticket chiuso' },
  { value: 'comment.created', label: 'Commento aggiunto' },
  { value: 'sla.warning', label: 'SLA in scadenza' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = async () => {
    try {
      const r = await api.get('/webhooks');
      setWebhooks(r.data);
    } catch {}
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const save = async () => {
    if (!form.name || !form.url || form.events.length === 0) return;
    setSaving(true);
    try {
      await api.post('/webhooks', form);
      setShowForm(false);
      setForm({ name: '', url: '', events: [], secret: '' });
      fetchWebhooks();
    } catch {}
    setSaving(false);
  };

  const toggle = async (hook: Webhook) => {
    try {
      await api.put(`/webhooks/${hook.id}`, { active: !hook.active });
      fetchWebhooks();
    } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo webhook?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      fetchWebhooks();
    } catch {}
  };

  const test = async (id: string) => {
    try {
      await api.post(`/webhooks/${id}/test`);
      alert('Webhook di test inviato!');
    } catch {
      alert("Errore nell'invio del test");
    }
  };

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="text-indigo-600" size={24} />
          <h1 className="text-2xl font-bold dark:text-white">Webhook</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          <Plus size={16} /> Nuovo Webhook
        </button>
      </div>

      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow">
            <Zap size={32} className="mx-auto mb-3 opacity-30" />
            <p>Nessun webhook configurato</p>
            <p className="text-sm mt-1">Integra GISdesk con Slack, Teams, o sistemi esterni</p>
          </div>
        ) : webhooks.map(hook => (
          <div key={hook.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-white">{hook.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${hook.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {hook.active ? 'Attivo' : 'Disattivato'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">{hook.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {hook.events.split(',').map(ev => (
                    <span key={ev} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded">
                      {ev.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => test(hook.id)} className="p-2 text-gray-400 hover:text-blue-600 text-xs border rounded" title="Test">
                  Test
                </button>
                <button onClick={() => toggle(hook)} className="p-2 text-gray-400 hover:text-green-600">
                  {hook.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => remove(hook.id)} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Nuovo Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="es. Notifiche Slack" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://hooks.slack.com/..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret (opzionale)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.secret} onChange={e => setForm({...form, secret: e.target.value})} placeholder="Chiave HMAC per verifica firma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
                <div className="space-y-2">
                  {EVENT_OPTIONS.map(ev => (
                    <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(ev.value)} onChange={() => toggleEvent(ev.value)}
                        className="rounded" />
                      <span className="dark:text-gray-300">{ev.label}</span>
                      <span className="text-gray-400 font-mono text-xs">{ev.value}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-gray-300">
                Annulla
              </button>
              <button onClick={save} disabled={saving || !form.name || !form.url || form.events.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
