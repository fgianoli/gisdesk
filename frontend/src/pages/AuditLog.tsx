import React, { useState, useEffect } from 'react';
import { Shield, Search } from 'lucide-react';
import api from '../api/client';
import type { AuditLog } from '../types';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/audit')
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.name.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-indigo-600" size={24} />
        <h1 className="text-2xl font-bold dark:text-white">Audit Log</h1>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          placeholder="Filtra per azione, entità, utente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Caricamento...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Utente</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Azione</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Entità</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('it-IT')}
                  </td>
                  <td className="px-4 py-3 dark:text-white">
                    {log.user ? (
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-xs text-gray-400">{log.user.email}</div>
                      </div>
                    ) : <span className="text-gray-400">Sistema</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded text-xs font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 dark:text-gray-300">{log.entity}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nessun log trovato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
