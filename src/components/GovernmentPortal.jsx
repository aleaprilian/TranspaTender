import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { formatIDR, truncateAddress, formatDuration } from '../utils/crypto';
import { AuditExplorer } from './AuditExplorer';
import { ContractViewer } from './ContractViewer';
import { 
  Building, 
  PlusCircle, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingDown, 
  ShieldCheck, 
  Search, 
  Filter, 
  FileText, 
  ExternalLink, 
  Trophy,
  AlertTriangle,
  Layers,
  Sparkles,
  Award,
  RefreshCw
} from 'lucide-react';

export function GovernmentPortal({ onOpenCreateModal, onSelectTender }) {
  const { 
    tenders, 
    currentTime, 
    getTenderStatus, 
    kunciPemenangTender, 
    currentAccount, 
    isOwner, 
    mode, 
    web3Account,
    contractOwner,
    jumpToPhase,
    syncContractData,
    isSyncing
  } = useTender();

  const [govSubTab, setGovSubTab] = useState('tenders'); // 'tenders' | 'audit' | 'contract'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  // Metrics
  const totalPagu = tenders.reduce((acc, t) => acc + (t.paguAnggaranIDR || 0), 0);
  const completedTenders = tenders.filter(t => t.selesai);
  const awaitingLockTenders = tenders.filter(t => {
    const st = getTenderStatus(t);
    return st.stage === 'AWAITING_LOCK';
  });

  const totalPenghematan = completedTenders.reduce((acc, t) => {
    if (t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR) {
      return acc + (t.paguAnggaranIDR - t.penawaranTerendahIDR);
    }
    return acc;
  }, 0);

  // Filtered tenders
  const filteredTenders = tenders.filter(t => {
    const status = getTenderStatus(t);
    const matchesSearch = t.namaProyek.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.kategori?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(t.id).includes(searchQuery);
    if (!matchesSearch) return false;
    if (filterStage === 'ALL') return true;
    if (filterStage === 'COMMIT') return status.stage === 'COMMIT';
    if (filterStage === 'REVEAL') return status.stage === 'REVEAL';
    if (filterStage === 'AWAITING_LOCK') return status.stage === 'AWAITING_LOCK';
    if (filterStage === 'COMPLETED') return status.stage === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Official Government Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold text-[11px] border border-amber-500/30 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                <span>Portal Resmi Panitia Pengadaan & PPK</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
                Kepatuhan Perpres Pengadaan Barang/Jasa
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sistem LPSE Terdesentralisasi — TranspaTender ID
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Portal Panitia Pemerintah untuk menerbitkan lelang pengadaan barang/jasa publik, memantau partisipasi vendor 
              secara tertutup (*sealed-bid*), dan mengesahkan pemenang dengan bukti matematis on-chain di Base Sepolia Testnet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenCreateModal}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Terbitkan Paket Tender Baru</span>
              </button>

              {mode === 'web3' && (
                <button
                  onClick={() => syncContractData()}
                  disabled={isSyncing}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Perbarui data lelang langsung dari blockchain"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan On-Chain"}</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {mode === 'web3' 
                  ? (isOwner ? "👑 Dompet Anda: Panitia (Contract Owner)" : `Auditor / Guest (${truncateAddress(web3Account)})`) 
                  : "Akun Aktif: Panitia Pemerintah (Simulasi)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Government KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-400" />
            <span>Total Paket Pengadaan</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {tenders.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Terdaftar di Smart Contract
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Total Pagu Anggaran APBN/D</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {formatIDR(totalPagu)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Batas Maksimal Pengadaan (IDR)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>Efisiensi Kas Negara</span>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 tabular-nums">
            {formatIDR(totalPenghematan)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            Penghematan dari Tender Selesai
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Perlu Tindakan Panitia</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 tabular-nums">
            {awaitingLockTenders.length}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            Paket Siap Ditetapkan Pemenangnya
          </div>
        </div>
      </div>

      {/* Government Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs sm:text-sm font-medium">
        <button
          onClick={() => setGovSubTab('tenders')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition ${
            govSubTab === 'tenders' 
              ? 'border-amber-600 text-amber-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-amber-600" />
          <span>1. Manajemen Paket Lelang & Monitoring Peserta</span>
        </button>

        <button
          onClick={() => setGovSubTab('audit')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition ${
            govSubTab === 'audit' 
              ? 'border-indigo-600 text-indigo-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>2. Jejak Audit Publik & Laporan KPK/BPK</span>
        </button>

        <button
          onClick={() => setGovSubTab('contract')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition ${
            govSubTab === 'contract' 
              ? 'border-slate-900 text-slate-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-700" />
          <span>3. Arsitektur Smart Contract Base Sepolia</span>
        </button>
      </div>

      {/* SUB-TAB 1: TENDER LIST & MANAGEMENT */}
      {govSubTab === 'tenders' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama lelang, dinas, atau ID..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
              <span className="text-slate-400 text-[11px] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'COMMIT', label: 'Fase Commit (1)' },
                { id: 'REVEAL', label: 'Fase Reveal (2)' },
                { id: 'AWAITING_LOCK', label: 'Siap Disahkan' },
                { id: 'COMPLETED', label: 'Selesai' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStage(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    filterStage === f.id
                      ? 'bg-slate-900 text-white font-semibold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tender Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenders.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3">
                <Building className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-700 text-sm">Tidak ada paket lelang yang cocok</h3>
                <p className="text-xs text-slate-400">Silakan ubah filter pencarian atau buat paket lelang baru.</p>
              </div>
            ) : (
              filteredTenders.map(t => {
                const st = getTenderStatus(t);
                const commitLeft = Math.max(0, t.batasWaktuCommit - currentTime);
                const revealLeft = Math.max(0, t.batasWaktuReveal - currentTime);

                return (
                  <div 
                    key={t.id} 
                    className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow transition flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5 space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{t.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.badge} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          <span>{st.label}</span>
                        </span>
                      </div>

                      {/* Project Title & Agency */}
                      <div>
                        <h3 
                          onClick={() => onSelectTender(t)}
                          className="font-bold text-slate-900 text-sm leading-snug hover:text-amber-700 cursor-pointer line-clamp-2"
                        >
                          {t.namaProyek}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{t.satuanKerja}</span>
                        </p>
                      </div>

                      {/* Financial info */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Pagu Anggaran:</span>
                          <span className="font-bold text-slate-900 tabular-nums">{formatIDR(t.paguAnggaranIDR)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Penawaran Terendah:</span>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            {t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR 
                              ? formatIDR(t.penawaranTerendahIDR) 
                              : "Rahasia (Sealed)"}
                          </span>
                        </div>
                      </div>

                      {/* Participants Count */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.peserta?.length || 0} Vendor Terdaftar</span>
                        </div>

                        {st.stage === 'COMMIT' && (
                          <div className="text-sky-700 font-mono font-medium">
                            Sisa Commit: {formatDuration(commitLeft)}
                          </div>
                        )}
                        {st.stage === 'REVEAL' && (
                          <div className="text-amber-700 font-mono font-medium">
                            Sisa Reveal: {formatDuration(revealLeft)}
                          </div>
                        )}
                        {st.stage === 'COMPLETED' && (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span>Pemenang Sah</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectTender(t)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium transition"
                      >
                        Detail & KAK
                      </button>

                      {st.stage === 'AWAITING_LOCK' ? (
                        <button
                          onClick={async () => {
                            try {
                              await kunciPemenangTender(t.id);
                            } catch (e) {
                              alert(e.reason || e.message);
                            }
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Kunci Pemenang</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTender(t)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          Lihat Buku Besar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AUDIT EXPLORER */}
      {govSubTab === 'audit' && (
        <AuditExplorer />
      )}

      {/* SUB-TAB 3: CONTRACT ARCHITECTURE */}
      {govSubTab === 'contract' && (
        <ContractViewer />
      )}
    </div>
  );
}
