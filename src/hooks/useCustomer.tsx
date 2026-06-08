import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Customer = {
  id: string;
  phone: string;
  name: string;
  country_code: string;
  created_at: string;
};

type CustomerContextType = {
  customer: Customer | null;
  loading: boolean;
  register: (countryCode: string, phone: string, password: string, name: string) => Promise<{ error: string | null }>;
  login: (countryCode: string, phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
};

const CustomerContext = createContext<CustomerContextType | null>(null);
const STORAGE_KEY = 'customer_session';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sahab_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustomer(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const register = useCallback(async (countryCode: string, phone: string, password: string, name: string) => {
    const fullPhone = phone.trim();
    const trimmedName = name.trim();
    const trimmedCode = countryCode.trim();

    if (!fullPhone) return { error: 'أدخل رقم الهاتف' };
    if (!trimmedName) return { error: 'أدخل اسمك' };
    if (password.length < 4) return { error: 'الرمز يجب أن يكون 4 أرقام على الأقل' };

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', fullPhone)
      .eq('country_code', trimmedCode)
      .maybeSingle();

    if (existing) return { error: 'هذا الرقم مسجل مسبقاً، سجل الدخول' };

    const passwordHash = await hashPassword(password);

    const { data: created, error: createError } = await supabase
      .from('customers')
      .insert({ phone: fullPhone, name: trimmedName, country_code: trimmedCode, password_hash: passwordHash })
      .select()
      .single();

    if (createError || !created) return { error: 'حدث خطأ أثناء إنشاء الحساب' };

    setCustomer(created);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    return { error: null };
  }, []);

  const login = useCallback(async (countryCode: string, phone: string, password: string) => {
    const fullPhone = phone.trim();
    const trimmedCode = countryCode.trim();

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', fullPhone)
      .eq('country_code', trimmedCode)
      .maybeSingle();

    if (!existing) return { error: 'الرقم غير مسجل، أنشئ حساباً جديداً' };

    const passwordHash = await hashPassword(password);
    if (existing.password_hash !== passwordHash) return { error: 'الرمز غير صحيح' };

    setCustomer(existing);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return { error: null };
  }, []);

  const signOut = useCallback(() => {
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <CustomerContext.Provider value={{ customer, loading, register, login, signOut }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider');
  return ctx;
}
