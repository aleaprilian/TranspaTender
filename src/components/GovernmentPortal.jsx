import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { formatIDR, truncateAddress, formatDuration } from '../utils/crypto';
import { AuditExplorer } from './AuditExplorer';
import { ContractViewer } from './ContractViewer';
import {
  Button,
  Card,
  StatusPill,
  STATUS_TONE,
  Stat,
  Tabs,
  EmptyState
} from './ui';
import {
  Building,
  PlusCircle,
  Lock,
  CheckCircle2,
  Users,
  TrendingDown,
  ShieldCheck,
  Search,
  FileText,
  Award,
  RefreshCw,
  Trophy
} from 'lucide-react';

const GOVERNMENT_TABS = [
  { id: 'tenders', label: 'Manajemen Paket Lelang & Monitoring Peserta', icon: Building },
  { id: 'audit', label: 'Jejak Audit Publik & Laporan KPK/BPK', icon: ShieldCheck },
  { id: 'contract', label: 'Arsitektur Smart Contract Base Sepolia', icon: FileText }
];

const STAGE_FILTERS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'COMMIT', label: 'Fase Commit (1)' },
  { id: 'REVEAL', label: 'Fase Reveal (2)' },
  { id: 'AWAITING_LOCK', label: 'Siap Disahkan' },
  { id: 'COMPLETED', label: 'Selesai' }
];

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

  const roleLabel = mode === 'web3'
    ? (isOwner
        ? 'Dompet Anda: Panitia (Contract Owner)'
        : `Auditor / Guest (${truncateAddress(web3Account)})`)
    : (currentAccount.role === 'AUDITOR'
        ? 'Akun Aktif: Auditor Publik (Simulasi) — mode hanya baca'
        : 'Akun Aktif: Panitia Pemerintah (Simulasi)');

  return (
    <div className="space-y-6">
      {/* Compact context row: active role + on-chain sync (no decorative banner) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-2xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-status-done-dot" />
          <span>{roleLabel}</span>
        </div>

        {mode === 'web3' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => syncContractData()}
            disabled={isSyncing}
            className="gap-1.5"
            title="Perbarui data lelang langsung dari blockchain"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan On-Chain'}</span>
          </Button>
        )}
      </div>

      {/* Government KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={Building}
          label="Total Paket Pengadaan"
          value={tenders.length}
          hint="Terdaftar di Smart Contract"
        />
        <Stat
          icon={Lock}
          label="Total Pagu Anggaran APBN/D"
          value={formatIDR(totalPagu)}
          hint="Batas Maksimal Pengadaan (IDR)"
          tone="brand"
        />
        <Stat
          icon={TrendingDown}
          label="Efisiensi Kas Negara"
          value={formatIDR(totalPenghematan)}
          hint="Penghematan dari Tender Selesai"
          tone="done"
        />
        <Stat
          icon={Award}
          label="Perlu Tindakan Panitia"
          value={awaitingLockTenders.length}
          hint="Paket Siap Ditetapkan Pemenangnya"
          tone="reveal"
        />
      </div>

      {/* Government Navigation Tabs */}
      <Tabs
        items={GOVERNMENT_TABS}
        value={govSubTab}
        onChange={setGovSubTab}
        variant="underline"
      />

      {/* SUB-TAB 1: TENDER LIST & MANAGEMENT */}
      {govSubTab === 'tenders' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama lelang, dinas, atau ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-control text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="w-full sm:w-auto overflow-x-auto">
              <Tabs
                items={STAGE_FILTERS}
                value={filterStage}
                onChange={setFilterStage}
                variant="pill"
              />
            </div>
          </Card>

          {/* Tender Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenders.length === 0 ? (
              <EmptyState
                className="col-span-full"
                icon={Building}
                title="Tidak ada paket lelang yang cocok"
                description="Silakan ubah kata kunci atau filter fase, atau terbitkan paket lelang baru."
                action={
                  currentAccount.role === 'PANITIA' ? (
                    <Button onClick={onOpenCreateModal} className="gap-2">
                      <PlusCircle className="w-4 h-4" />
                      <span>Terbitkan Paket Tender Baru</span>
                    </Button>
                  ) : null
                }
              />
            ) : (
              filteredTenders.map(t => {
                const st = getTenderStatus(t);
                const commitLeft = Math.max(0, t.batasWaktuCommit - currentTime);
                const revealLeft = Math.max(0, t.batasWaktuReveal - currentTime);

                return (
                  <Card
                    key={t.id}
                    className="flex flex-col justify-between overflow-hidden transition hover:border-slate-300"
                  >
                    <div className="p-5 space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{t.id}
                        </span>
                        <StatusPill tone={STATUS_TONE[st.stage] || 'neutral'}>
                          {st.label}
                        </StatusPill>
                      </div>

                      {/* Project Title & Agency */}
                      <div>
                        <h3
                          onClick={() => onSelectTender(t)}
                          className="font-bold text-slate-900 text-sm leading-snug hover:text-brand-700 cursor-pointer line-clamp-2"
                        >
                          {t.namaProyek}
                        </h3>
                        <p className="text-2xs text-slate-500 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{t.satuanKerja}</span>
                        </p>
                      </div>

                      {/* Financial info */}
                      <div className="bg-slate-50 p-2.5 rounded-control border border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between items-center gap-3 text-slate-500">
                          <span>Pagu Anggaran:</span>
                          <span className="font-bold text-slate-900 tabular-nums text-right">{formatIDR(t.paguAnggaranIDR)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-3 text-slate-500">
                          <span>Penawaran Terendah:</span>
                          <span className="font-bold tabular-nums text-right text-status-done-text">
                            {t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR
                              ? formatIDR(t.penawaranTerendahIDR)
                              : 'Rahasia (Sealed)'}
                          </span>
                        </div>
                      </div>

                      {/* Participants Count */}
                      <div className="flex items-center justify-between gap-2 text-2xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.peserta?.length || 0} Vendor Terdaftar</span>
                        </div>

                        {st.stage === 'COMMIT' && (
                          <div className="text-status-commit-text font-mono font-medium">
                            Sisa Commit: {formatDuration(commitLeft)}
                          </div>
                        )}
                        {st.stage === 'REVEAL' && (
                          <div className="text-status-reveal-text font-mono font-medium">
                            Sisa Reveal: {formatDuration(revealLeft)}
                          </div>
                        )}
                        {st.stage === 'COMPLETED' && (
                          <div className="text-status-done-text font-semibold flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-status-reveal-dot" />
                            <span>Pemenang Sah</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectTender(t)}
                      >
                        Detail &amp; KAK
                      </Button>

                      {st.stage === 'AWAITING_LOCK' ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={async () => {
                            try {
                              await kunciPemenangTender(t.id);
                            } catch (e) {
                              alert(e.reason || e.message);
                            }
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Kunci Pemenang</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectTender(t)}
                        >
                          Lihat Buku Besar
                        </Button>
                      )}
                    </div>
                  </Card>
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
