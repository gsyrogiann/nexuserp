import React from 'react';
import { useLang } from '@/lib/LanguageContext';

export default function LanguageSwitcher() {
  const { lang, changeLang } = useLang();

  return (
    <div className="flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200 rounded-xl shadow-sm px-1 py-1">
      <button
        onClick={() => changeLang('el')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          lang === 'el'
            ? 'bg-slate-900 text-white shadow'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        🇬🇷 ΕΛ
      </button>
      <button
        onClick={() => changeLang('en')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          lang === 'en'
            ? 'bg-slate-900 text-white shadow'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}