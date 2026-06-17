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

// ── Color utility ──────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mixWithWhite(r: number, g: number, b: number, amount: number): string {
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

function mixWithBlack(r: number, g: number, b: number, amount: number): string {
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

function applyTheme(map: Settings) {
  const primaryHex  = map['site_primary_color'] || '#10b981';
  const fontFamily  = map['site_font_family']   || 'Tajawal';
  const fontSize    = map['site_font_size']      || 'medium';

  // Text colors (empty = keep default)
  const cHeading   = map['color_text_heading']   || '';
  const cBody      = map['color_text_body']      || '';
  const cSecondary = map['color_text_secondary'] || '';
  const cMuted     = map['color_text_muted']     || '';
  const cPrice     = map['color_text_price']     || '';
  const cPageBg    = map['color_page_bg']        || '';
  const cNavBg     = map['color_nav_bg']         || '';
  const cCardBg    = map['color_card_bg']        || '';

  // ── Font size ──
  const fontSizes: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.fontSize = fontSizes[fontSize] || '16px';

  // ── Google Font loading ──
  const prevLink = document.getElementById('dynamic-font');
  if (prevLink) prevLink.remove();
  if (fontFamily && fontFamily !== 'Tajawal') {
    const link = document.createElement('link');
    link.id = 'dynamic-font';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }

  // ── Primary color palette ──
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return;
  const { r, g, b } = rgb;
  const p50  = mixWithWhite(r, g, b, 0.94);
  const p100 = mixWithWhite(r, g, b, 0.87);
  const p200 = mixWithWhite(r, g, b, 0.72);
  const p300 = mixWithWhite(r, g, b, 0.55);
  const p400 = mixWithWhite(r, g, b, 0.30);
  const p600 = primaryHex;
  const p700 = mixWithBlack(r, g, b, 0.13);
  const p800 = mixWithBlack(r, g, b, 0.25);

  let styleEl = document.getElementById('dynamic-theme') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --primary: ${p600};
      --primary-50: ${p50};
      --primary-100: ${p100};
      --primary-200: ${p200};
      --primary-300: ${p300};
      --primary-400: ${p400};
      --primary-600: ${p600};
      --primary-700: ${p700};
      --primary-800: ${p800};
      --site-font: "${fontFamily}", "Tajawal", "Segoe UI", sans-serif;
    }
    html { font-family: var(--site-font) !important; }

    /* ── Override Tailwind emerald utilities ── */
    .bg-emerald-50  { background-color: var(--primary-50)  !important; }
    .bg-emerald-100 { background-color: var(--primary-100) !important; }
    .bg-emerald-200 { background-color: var(--primary-200) !important; }
    .bg-emerald-400 { background-color: var(--primary-400) !important; }
    .bg-emerald-600 { background-color: var(--primary-600) !important; }
    .bg-emerald-700 { background-color: var(--primary-700) !important; }

    .text-emerald-400 { color: var(--primary-400) !important; }
    .text-emerald-500 { color: var(--primary-600) !important; }
    .text-emerald-600 { color: var(--primary-600) !important; }
    .text-emerald-700 { color: var(--primary-700) !important; }

    .border-emerald-100 { border-color: var(--primary-100) !important; }
    .border-emerald-200 { border-color: var(--primary-200) !important; }
    .border-emerald-300 { border-color: var(--primary-300) !important; }
    .border-emerald-400 { border-color: var(--primary-400) !important; }
    .border-emerald-500 { border-color: var(--primary-600) !important; }
    .border-emerald-600 { border-color: var(--primary-600) !important; }

    .ring-emerald-300 { --tw-ring-color: var(--primary-300) !important; }
    .focus\\:ring-emerald-500:focus { --tw-ring-color: var(--primary-600) !important; }
    .focus\\:border-emerald-500:focus { border-color: var(--primary-600) !important; }

    .hover\\:bg-emerald-50:hover  { background-color: var(--primary-50)  !important; }
    .hover\\:bg-emerald-100:hover { background-color: var(--primary-100) !important; }
    .hover\\:bg-emerald-700:hover { background-color: var(--primary-700) !important; }
    .hover\\:text-emerald-600:hover { color: var(--primary-600) !important; }
    .hover\\:text-emerald-700:hover { color: var(--primary-700) !important; }
    .hover\\:border-emerald-200:hover { border-color: var(--primary-200) !important; }
    .hover\\:border-emerald-400:hover { border-color: var(--primary-400) !important; }

    .from-emerald-100 { --tw-gradient-from: var(--primary-100) !important; }
    .to-teal-100      { --tw-gradient-to:   var(--primary-200) !important; }
    .from-emerald-600 { --tw-gradient-from: var(--primary-600) !important; }
    .to-teal-700      { --tw-gradient-to:   var(--primary-700) !important; }

    .divide-emerald-100 > * + * { border-color: var(--primary-100) !important; }

    /* ── Text color overrides (only when set) ── */
    ${cHeading   ? `.text-gray-900 { color: ${cHeading} !important; }
    .text-gray-800 { color: ${cHeading} !important; }` : ''}

    ${cBody      ? `.text-gray-700 { color: ${cBody} !important; }` : ''}

    ${cSecondary ? `.text-gray-600 { color: ${cSecondary} !important; }` : ''}

    ${cMuted     ? `.text-gray-500 { color: ${cMuted} !important; }
    .text-gray-400 { color: ${cMuted}; }` : ''}

    ${cPrice     ? `.text-price-custom { color: ${cPrice} !important; }` : ''}

    /* ── Background overrides ── */
    ${cPageBg    ? `body { background-color: ${cPageBg} !important; }
    .bg-gray-50  { background-color: ${cPageBg} !important; }` : ''}

    ${cNavBg     ? `.site-header-bg { background-color: ${cNavBg} !important; }` : ''}

    ${cCardBg    ? `.bg-white { background-color: ${cCardBg} !important; }` : ''}

    /* ── Font size overrides (only when set) ── */
    ${map['fs_hero_title']          ? `.site-hero-title { font-size: ${map['fs_hero_title']}px !important; line-height: 1.15 !important; }` : ''}
    ${map['fs_hero_desc']           ? `.site-hero-desc { font-size: ${map['fs_hero_desc']}px !important; }` : ''}
    ${map['fs_section_heading']     ? `.site-section-heading { font-size: ${map['fs_section_heading']}px !important; }` : ''}
    ${map['fs_section_desc']        ? `.site-section-desc { font-size: ${map['fs_section_desc']}px !important; }` : ''}
    ${map['fs_product_card_name']   ? `.site-product-card-name { font-size: ${map['fs_product_card_name']}px !important; }` : ''}
    ${map['fs_product_card_price']  ? `.site-product-card-price { font-size: ${map['fs_product_card_price']}px !important; }` : ''}
    ${map['fs_product_detail_title'] ? `.site-product-detail-title { font-size: ${map['fs_product_detail_title']}px !important; }` : ''}
    ${map['fs_product_detail_price'] ? `.site-product-detail-price { font-size: ${map['fs_product_detail_price']}px !important; }` : ''}
    ${map['fs_nav_link']            ? `.site-nav-link { font-size: ${map['fs_nav_link']}px !important; }` : ''}
    ${map['fs_footer_text']         ? `.site-footer-text { font-size: ${map['fs_footer_text']}px !important; }` : ''}
    ${map['fs_category_label']      ? `.site-category-label { font-size: ${map['fs_category_label']}px !important; }` : ''}
    ${map['fs_button']              ? `.site-btn-text { font-size: ${map['fs_button']}px !important; }` : ''}
  `;
}

// ── Provider ───────────────────────────────────────────────────────
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

    // Apply theme (colors + font)
    applyTheme(map);

    // Update OG/meta tags
    const logoUrl = map['store_logo_url'];
    const storeName = map['store_name'];
    if (logoUrl) {
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(el => {
        (el as HTMLMetaElement).content = logoUrl;
      });
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null)?.setAttribute('href', logoUrl);
    }
    if (storeName) {
      document.title = `${storeName} - للأدوات المدرسية والمكتبية`;
      document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(el => {
        (el as HTMLMetaElement).content = `${storeName} - للأدوات المدرسية والمكتبية`;
      });
    }
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
