
import { TemplateType } from './types';

export const TEMPLATE_STYLES: Record<TemplateType, string> = {
  [TemplateType.VALENTINE]: "bg-gradient-to-br from-[#fff5f5] to-[#ffe3e3] min-h-screen text-[#800000]",
  [TemplateType.MODERN_EVENT]: "bg-gradient-to-br from-[#f0f3ff] to-[#e0e7ff] min-h-screen text-[#1e1b4b]",
  [TemplateType.BIBLICAL_SPIRITUAL]: "bg-[#f5f2ed] min-h-screen text-[#3e2723] selection:bg-[#d7ccc8]",
  [TemplateType.CORPORATE]: "bg-slate-50 min-h-screen text-[#0f172a]"
};

export const CARD_STYLES: Record<TemplateType, string> = {
  [TemplateType.VALENTINE]: "bg-white/95 backdrop-blur shadow-2xl border-2 border-[#ffc9c9] rounded-3xl p-8",
  [TemplateType.MODERN_EVENT]: "bg-white shadow-xl rounded-2xl p-8 border border-[#c7d2fe]",
  [TemplateType.BIBLICAL_SPIRITUAL]: "bg-[#fffdfa] shadow-[0_20px_60px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] rounded-none p-8 md:p-16 border-t-[16px] border-[#5d4037] font-serif relative overflow-hidden",
  [TemplateType.CORPORATE]: "bg-white shadow-sm rounded-lg p-8 border border-slate-300"
};

export const BUTTON_STYLES: Record<TemplateType, string> = {
  [TemplateType.VALENTINE]: "bg-[#c53030] hover:bg-[#9b2c2c] text-white font-bold py-3 px-6 rounded-full transition-all transform hover:scale-105 focus:ring-4 focus:ring-[#feb2b2]",
  [TemplateType.MODERN_EVENT]: "bg-[#4338ca] hover:bg-[#3730a3] text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md focus:ring-4 focus:ring-[#a5b4fc]",
  [TemplateType.BIBLICAL_SPIRITUAL]: "bg-[#5d4037] hover:bg-[#3e2723] text-[#fffdfa] font-serif italic py-4 px-10 rounded-none transition-all shadow-md hover:shadow-lg uppercase tracking-[0.25em] text-sm border-b-2 border-[#3e2723] focus:ring-4 focus:ring-[#d7ccc8]",
  [TemplateType.CORPORATE]: "bg-slate-900 hover:bg-black text-white font-medium py-3 px-6 rounded-md transition-all focus:ring-4 focus:ring-slate-300"
};
