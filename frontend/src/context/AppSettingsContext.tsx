import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

interface AppSettings {
  appName: string;
  appLogo: string; // filename, empty = no logo
}

interface AppSettingsContextType {
  settings: AppSettings;
  refresh: () => Promise<void>;
  logoUrl: string | null;
}

const defaults: AppSettings = { appName: 'GISdesk', appLogo: '' };

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: defaults,
  refresh: async () => {},
  logoUrl: null,
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<AppSettings>('/settings/public');
      setSettings(res.data);
    } catch {
      // fallback to defaults
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logoUrl = settings.appLogo ? `/api/uploads/${settings.appLogo}` : null;

  return (
    <AppSettingsContext.Provider value={{ settings, refresh, logoUrl }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
