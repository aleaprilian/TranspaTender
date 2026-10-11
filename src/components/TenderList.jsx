import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { 
  formatIDR, 
  truncateAddress, 
  formatDuration 
} from '../utils/crypto';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  Users, 
  ShieldCheck, 
  Trophy, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  FastForward,
  Building,
  TrendingDown
} from 'lucide-react';

export function TenderList({ onSelectTender, onOpenVendorModal }) {
  const { 
    tenders, 
    currentTime, 
    getTenderStatus, 
    currentAccount, 
    kunciPemenangTender,
    jumpToPhase 
  } = useTender();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  // Metrics
  const totalPagu = tenders.reduce((acc, t) => acc + (t.paguAnggaranIDR || 0), 0);
  const completedTenders = tenders.filter(t => t.selesai);
  const totalPenghematan = completedTenders.reduce((acc, t) => {
    if (t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR) {
      return acc + (t.paguAnggaranIDR - t.penawaranTerendahIDR);
    }
    return acc;
  }, 0);

  // Filtered list
  const filteredTenders = tenders.filter(t => {
    const status = getTenderStatus(t);
    const matchesSearch = t.namaProyek.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.kategori?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(t.id).includes(searchQuery);
    if (!matchesSearch) return false;
    if (filterStage === 'ALL') return true;
    if (filterStage === 'COMMIT') return status.stage === 'COMMIT';
    if (filterStage === 'REVEAL') return status.stage === 'REVEAL';
    if (filterStage === 'COMPLETED') return status.stage === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="mini-card p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Total Paket Tender
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
            {tenders.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Terdaftar di Smart Contract
          </div>
        </div>

        <div className="mini-card p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Total Pagu Anggaran
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tracking-tight tabular-nums">
            {formatIDR(totalPagu)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Batas Maksimal Pengadaan (IDR)
          </div>
        </div>

        <div className="mini-card p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            Efisiensi Anggaran Negara
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 tracking-tight tabular-nums">
            {formatIDR(totalPenghematan)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Penghematan kas negara dari tender selesai
          </div>
        </div>

        <div className="mini-card p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Keamanan Kriptografi
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Commit-Reveal Aktif
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Keccak-256 Sealed Bid • Anti-Bocor
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama tender, instansi, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setFilterStage('ALL')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Semua ({tenders.length})
          </button>
          <button
            onClick={() => setFilterStage('COMMIT')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filterStage === 'COMMIT' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Fase Commit
          </button>
          <button
            onClick={() => setFilterStage('REVEAL')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filterStage === 'REVEAL' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Fase Reveal
          </button>
          <button
            onClick={() => setFilterStage('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${filterStage === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Tender Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenders.map((tender) => {
          const status = getTenderStatus(tender);
          const totalPeserta = tender.peserta ? tender.peserta.length : 0;
          
          // Time remaining calculations
          const commitTimeLeft = Math.max(0, tender.batasWaktuCommit - currentTime);
          const revealTimeLeft = Math.max(0, tender.batasWaktuReveal - currentTime);

          const isPanitia = currentAccount.role === 'PANITIA';

          return (
            <div 
              key={tender.id}
              className="mini-card p-5 flex flex-col justify-between relative group hover:border-slate-300"
            >
              <div>
                {/* Header: ID & Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      #{tender.id}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                      {tender.kategori || "Pengadaan Barang/Jasa"}
                    </span>
                  </div>

                  <span className={`badge-chip ${status.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    <span className="text-[10px] tracking-wide uppercase font-semibold">
                      {status.stage === 'COMMIT' && 'Fase Commit'}
                      {status.stage === 'REVEAL' && 'Fase Reveal'}
                      {status.stage === 'AWAITING_LOCK' && 'Finalisasi'}
                      {status.stage === 'COMPLETED' && 'Selesai'}
                    </span>
                  </span>
                </div>

                {/* Project Title */}
                <h3 
                  onClick={() => onSelectTender(tender)}
                  className="font-semibold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition cursor-pointer line-clamp-2 mb-1"
                >
                  {tender.namaProyek}
                </h3>
                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                  <span>{tender.satuanKerja || "Panitia Pengadaan Pemerintah"}</span>
                </p>

                {/* Financial Info */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Pagu Anggaran (IDR):</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatIDR(tender.paguAnggaranIDR)}
                    </span>
                  </div>

                  {status.stage === 'COMPLETED' ? (
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        Pemenang:
                      </span>
                      {tender.pemenang && tender.pemenang !== '0x0000000000000000000000000000000000000000' && tender.penawaranTerendahIDR <= tender.paguAnggaranIDR ? (
                        <span className="text-emerald-700 font-semibold truncate max-w-[220px]" title={tender.namaPerusahaanPemenang || tender.pemenang}>
                          {tender.namaPerusahaanPemenang ? `${tender.namaPerusahaanPemenang}` : truncateAddress(tender.pemenang)} ({formatIDR(tender.penawaranTerendahIDR)})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">
                          Tidak Ada (Gugur)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Peserta Lelang:
                      </span>
                      <span className="font-medium text-slate-800">
                        {totalPeserta} Vendor Terdaftar
                      </span>
                    </div>
                  )}
                </div>

                {/* Phase Timer / Progress Indicator */}
                <div className="space-y-1.5 mb-4 text-xs">
                  {status.stage === 'COMMIT' && (
                    <div className="flex items-center justify-between text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded-md border border-sky-100">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                        Batas Penawaran Terkunci:
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatDuration(commitTimeLeft)}
                      </span>
                    </div>
                  )}

                  {status.stage === 'REVEAL' && (
                    <div className="flex items-center justify-between text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-100">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Batas Pembukaan Harga:
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatDuration(revealTimeLeft)}
                      </span>
                    </div>
                  )}

                  {status.stage === 'AWAITING_LOCK' && (
                    <div className="flex items-center justify-between text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-md border border-indigo-100">
                      <span className="flex items-center gap-1 text-[11px] font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
                        Masa Buka Selesai
                      </span>
                      <span className="text-[10px] font-semibold uppercase">
                        Menunggu Pengesahan
                      </span>
                    </div>
                  )}

                  {status.stage === 'COMPLETED' && (
                    <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100">
                      <span className="flex items-center gap-1 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Status Lelang
                      </span>
                      <span className="text-[10px] font-semibold uppercase">
                        Sah & Final di Blockchain
                      </span>
                    </div>
                  )}

                  {/* Document KAK link */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>Dokumen KAK (IPFS):</span>
                    <a
                      href={formatIpfsGatewayUrl(tender.ipfsDokumenKAK)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-mono flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tender.ipfsDokumenKAK.slice(0, 18)}...
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectTender(tender)}
                    className="btn-secondary flex-1 text-xs py-1.5"
                  >
                    Detail & Audit
                  </button>

                  {status.stage === 'COMMIT' && (
                    <button
                      onClick={() => onOpenVendorModal(tender, 'commit')}
                      className="btn-primary flex-1 text-xs py-1.5 bg-sky-700 hover:bg-sky-800"
                    >
                      <Lock className="w-3 h-3" />
                      Kirim Sealed Bid
                    </button>
                  )}

                  {status.stage === 'REVEAL' && (
                    <button
                      onClick={() => onOpenVendorModal(tender, 'reveal')}
                      className="btn-primary flex-1 text-xs py-1.5 bg-amber-600 hover:bg-amber-700"
                    >
                      <KeyRound className="w-3 h-3" />
                      Buka Harga
                    </button>
                  )}

                  {status.stage === 'AWAITING_LOCK' && (
                    <button
                      onClick={async () => {
                        try {
                          await kunciPemenangTender(tender.id);
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      className="btn-primary flex-1 text-xs py-1.5 bg-indigo-700 hover:bg-indigo-800"
                      title="Panitia Pemerintah mengesahkan pemenang ke Smart Contract"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Kunci Pemenang
                    </button>
                  )}
                </div>

                {/* Simulation Time Warp Shortcut for fast demoing */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/80 px-2 py-1 rounded">
                  <span className="flex items-center gap-1 text-[10px]">
                    <FastForward className="w-3 h-3 text-slate-400" />
                    Warp Simulasi:
                  </span>
                  <div className="flex gap-1">
                    {status.stage === 'COMMIT' && (
                      <button
                        onClick={() => jumpToPhase(tender.id, 'reveal')}
                        className="text-[10px] text-blue-600 hover:underline font-medium"
                      >
                        Lompat ke Reveal &rarr;
                      </button>
                    )}
                    {status.stage === 'REVEAL' && (
                      <button
                        onClick={() => jumpToPhase(tender.id, 'finish')}
                        className="text-[10px] text-amber-700 hover:underline font-medium"
                      >
                        Lompat ke Selesai &rarr;
                      </button>
                    )}
                    {(status.stage === 'AWAITING_LOCK' || status.stage === 'COMPLETED') && (
                      <span className="text-[10px] text-slate-400">Tahap Akhir</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTenders.length === 0 && (
        <div className="mini-card p-12 text-center text-slate-500">
          <p className="font-medium text-slate-700">Tidak ada paket lelang yang cocok dengan pencarian.</p>
          <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau ganti filter status di atas.</p>
        </div>
      )}
    </div>
  );
}
