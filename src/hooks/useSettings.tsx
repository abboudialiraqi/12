import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type Settings = Record<string, string>;

type SettingsContextType = {
  settings: Settings;
  loading: boolean;
  get: (key: string, fallback?: string) => string;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('key, value');
    const map: Settings = {};
    (data || []).forEach((row: { key: string; value: string }) => {
      map[row.key] = row.value;
    });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const get = useCallback((key: string, fallback: string = '') => {
    return settings[key] ?? fallback;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, get, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
