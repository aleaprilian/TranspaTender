import React from 'react';
import { Building2, Briefcase, ExternalLink, ShieldCheck } from 'lucide-react';

export function PortalSwitcherBar({ activePortal, setActivePortal }) {
  const openNewWindow = (portalType) => {
    const url = new URL(window.location.href);
    url.searchParams.set('portal', portalType);
    window.open(url.toString(), '_blank', 'width=1200,height=800');
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white text-xs px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Portal selector tabs */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium hidden sm:inline">Pilih Portal:</span>
          
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActivePortal('pemerintah')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold transition ${
                activePortal === 'pemerintah'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏛️ Portal Pemerintah (LPSE / PPK)</span>
            </button>

            <button
              onClick={() => setActivePortal('vendor')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold transition ${
                activePortal === 'vendor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>🏢 Portal Rekanan (Vendor Penyedia)</span>
            </button>
          </div>
        </div>

        {/* Right: Multi-window test helper */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="hidden lg:flex items-center gap-1.5 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Terhubung ke Smart Contract Base Sepolia yang sama</span>
          </div>

          <button
            onClick={() => openNewWindow(activePortal === 'pemerintah' ? 'vendor' : 'pemerintah')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
            title="Buka portal lawan di tab baru untuk simulasi dua pengguna (Pemerintah vs Rekanan)"
          >
            <span>Buka {activePortal === 'pemerintah' ? 'Portal Vendor' : 'Portal Pemerintah'} di Tab Baru</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
