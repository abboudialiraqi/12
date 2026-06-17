import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
    </svg>
  );
}

export default function Footer() {
  const { get } = useSettings();

  const whatsappNumber = get('whatsapp_number', '');
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : null;

  const socialLinks = [
    { href: get('social_facebook', ''),  Icon: FacebookIcon,  label: 'فيسبوك',   hoverColor: 'hover:text-blue-400  hover:bg-blue-400/10' },
    { href: get('social_instagram', ''), Icon: InstagramIcon, label: 'إنستغرام', hoverColor: 'hover:text-pink-400  hover:bg-pink-400/10' },
    { href: get('social_tiktok', ''),    Icon: TikTokIcon,    label: 'تيك توك',  hoverColor: 'hover:text-white     hover:bg-white/10' },
  ].filter(s => s.href);

  const footerDesc = get('footer_brand_description', '');

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Description + Social */}
          {footerDesc && (
            <div className="space-y-4">
              <p className="site-footer-text text-sm leading-relaxed text-gray-400">{footerDesc}</p>
              {(socialLinks.length > 0 || whatsappHref) && (
                <div className="flex items-center gap-2">
                  {socialLinks.map(({ href, Icon, label, hoverColor }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                      className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 transition-all duration-200 hover:scale-110 ${hoverColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" title="واتساب"
                      className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-green-400 hover:bg-green-400/10 hover:scale-110 transition-all duration-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div>
            <h3 className="site-footer-text text-white font-semibold mb-5 text-sm">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-600/20 transition-colors shrink-0">
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <a href={`tel:${get('footer_phone', '')}`} className="text-sm hover:text-emerald-400 transition-colors" dir="ltr">
                  {get('footer_phone', '+964 784 004 0066')}
                </a>
              </li>

              {whatsappHref && (
                <li className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-green-600/20 transition-colors shrink-0">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                    className="text-sm hover:text-green-400 transition-colors flex items-center gap-1.5"
                  >
                    تواصل عبر واتساب
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-medium">مباشر</span>
                  </a>
                </li>
              )}

              <li className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-600/20 transition-colors shrink-0">
                  <Mail className="w-4 h-4 text-emerald-400" />
                </div>
                <a href={`mailto:${get('footer_email', '')}`} className="text-sm hover:text-emerald-400 transition-colors">
                  {get('footer_email', 'info@suhab.iq')}
                </a>
              </li>

              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-600/20 transition-colors shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm">{get('footer_address', 'بغداد، العراق')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {get('store_name', 'سحاب')}</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-emerald-400 transition-colors text-xs">سياسة الخصوصية</a>
            <a href="#" className="hover:text-emerald-400 transition-colors text-xs">شروط الاستخدام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
