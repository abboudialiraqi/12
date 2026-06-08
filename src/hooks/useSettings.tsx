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
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <span className="text-sm text-gray-400">جاري التحميل...</span>
          </div>
        </div>
      ) : children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
