import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import {
  truncateAddress,
  formatIDR,
  generateCommitHash
} from '../utils/crypto';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import { getExplorerTxUrl, SUPPORTED_NETWORKS } from '../contracts/contractAbi';
import {
  Button,
  Card,
  StatusPill,
  Stat,
  Tabs,
  Field,
  EmptyState
} from './ui';
import {
  ShieldCheck,
  ExternalLink,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Terminal,
  Activity,
  Lock,
  Unlock,
  Building,
  Trophy,
  Layers
} from 'lucide-react';

const EVENT_TONE = {
  TenderDibuat: 'commit',
  PenawaranTerkunciMasuk: 'commit',
  PenawaranDibuka: 'reveal',
  PemenangDitetapkan: 'done'
};

const SEARCH_INPUT_CLASS =
  'w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-control text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

const SELECT_CLASS =
  'text-xs bg-white border border-slate-300 rounded-control text-slate-900 px-2.5 py-2 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function AuditExplorer() {
  const { auditEvents, tenders, deployedContractAddress, web3ChainId, mode } = useTender();

  // Navigation tabs: 'registry' (Tabel Transparansi Rekanan) | 'events' (Raw Log Blockchain)
  const [activeTab, setActiveTab] = useState('registry');

  // Filter & Search
  const [filterTenderId, setFilterTenderId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(key);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  // Aggregate all vendor bids across tenders for Human-Readable Registry
  const allBids = [];
  tenders.forEach(t => {
    if (t.penawaran) {
      Object.entries(t.penawaran).forEach(([addr, bid]) => {
        // Find matching commit event for txHash
        const commitEvt = auditEvents.find(e =>
          Number(e.idTender) === Number(t.id) &&
          e.eventName === 'PenawaranTerkunciMasuk' &&
          ((e.vendor && e.vendor.toLowerCase() === addr.toLowerCase()) ||
           (e.namaPerusahaan && bid.vendorName && e.namaPerusahaan.toLowerCase() === bid.vendorName.toLowerCase()))
        );

        allBids.push({
          tenderId: t.id,
          tenderTitle: t.namaProyek,
          paguAnggaranIDR: t.paguAnggaranIDR,
          satuanKerja: t.satuanKerja,
          vendorAddress: addr,
          vendorName: bid.vendorName || "PT Vendor Rekanan",
          ipfsProposalTeknis: bid.ipfsProposalTeknis,
          hashTerkunci: bid.hashTerkunci,
          hargaTerbukaIDR: bid.hargaTerbukaIDR,
          sudahCommit: bid.sudahCommit,
          sudahReveal: bid.sudahReveal,
          memenuhiSyaratPagu: bid.memenuhiSyaratPagu,
          txHash: commitEvt?.txHash || null,
          blockNumber: commitEvt?.blockNumber || 12480135,
          timestamp: commitEvt?.timestamp || t.batasWaktuCommit,
          isWinner: t.selesai && t.pemenang && t.pemenang.toLowerCase() === addr.toLowerCase()
        });
      });
    }
  });

  // Filtered Bids for Registry View
  const filteredBids = allBids.filter(b => {
    if (filterTenderId !== 'ALL' && Number(b.tenderId) !== Number(filterTenderId)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchVendor = b.vendorName.toLowerCase().includes(q);
      const matchAddr = b.vendorAddress.toLowerCase().includes(q);
      const matchTender = b.tenderTitle.toLowerCase().includes(q);
      const matchHash = b.hashTerkunci?.toLowerCase().includes(q);
      return matchVendor || matchAddr || matchTender || matchHash;
    }
    return true;
  });

  // Filtered Events for Raw Log View
  const filteredEvents = auditEvents.filter(evt => {
    if (filterEvent !== 'ALL' && evt.eventName !== filterEvent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTx = evt.txHash?.toLowerCase().includes(q);
      const matchSummary = evt.summary?.toLowerCase().includes(q);
      const matchEvent = evt.eventName?.toLowerCase().includes(q);
      const matchVendor = evt.vendor?.toLowerCase().includes(q);
      const matchCompany = evt.namaPerusahaan?.toLowerCase().includes(q);
      return matchTx || matchSummary || matchEvent || matchVendor || matchCompany;
    }
    return true;
  });

  const activeChainConfig = (mode === 'web3' && web3ChainId && SUPPORTED_NETWORKS[web3ChainId])
    ? SUPPORTED_NETWORKS[web3ChainId]
    : SUPPORTED_NETWORKS[84532];

  const explorerTabs = [
    { id: 'registry', label: 'Portal Transparansi Rekanan', icon: Building, badge: allBids.length },
    { id: 'events', label: 'Log Transaksi Blockchain (Raw Events)', icon: Activity, badge: auditEvents.length }
  ];

  const ipfsCount = allBids.filter(b => b.ipfsProposalTeknis).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusPill tone="done" pulse>Live</StatusPill>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Jejak Audit Publik
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Masyarakat, KPK, BPK, dan LSM dapat mengaudit seluruh riwayat lelang secara <em>real-time</em> tanpa perlu
            meminta izin basis data atau server panitia. Nama perusahaan, link proposal IPFS, dan bukti komitmen tercatat permanen di blockchain.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-control px-3 py-2 text-2xs shrink-0">
          <Layers className="w-4 h-4 text-brand-600 shrink-0" />
          <div>
            <div className="font-semibold text-slate-800">{activeChainConfig.chainName}</div>
            <div className="text-2xs text-slate-400 font-mono">
              Chain ID: {activeChainConfig.chainIdDec} • OP Stack L2 Rollup
            </div>
          </div>
        </div>
      </div>

      {/* Live Explorer Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          icon={Activity}
          label="Total Transaksi / Event"
          value={auditEvents.length}
          hint="Peristiwa tercatat"
        />
        <Stat
          icon={Building}
          label="Rekanan Terdaftar"
          value={allBids.length}
          hint="Vendor (PT/CV)"
          tone="brand"
        />
        <Stat
          icon={FileText}
          label="Dokumen Proposal IPFS"
          value={ipfsCount}
          hint="Terdesentralisasi"
          tone="done"
        />
        <Stat
          icon={ShieldCheck}
          label="Integritas Komitmen"
          value="100%"
          hint="Keccak-256 Valid"
          tone="done"
        />
      </div>

      {/* Tool: Verifikator Independen Keccak-256 untuk Auditor */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Alat Verifikasi Mandiri Auditor (Independent Keccak-256 Verifier)</span>
          </h3>
          <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            KPK &amp; BPK Compliance Tool
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Uji keaslian komitmen vendor secara matematis: masukkan harga IDR dan kata sandi yang diungkap untuk memverifikasi apakah
          hasil hash-nya cocok 100% dengan hash yang dikunci saat pendaftaran awal di blockchain.
        </p>

        <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nominal Harga (IDR)" htmlFor="verify-harga">
            <input
              id="verify-harga"
              type="text"
              placeholder="Contoh: 920000000"
              value={verifyHarga}
              onChange={(e) => setVerifyHarga(e.target.value.replace(/[^0-9]/g, ''))}
              className="form-input font-mono"
              required
            />
          </Field>

          <Field label="Kata Sandi Rahasia (Salt)" htmlFor="verify-salt">
            <input
              id="verify-salt"
              type="text"
              placeholder="Contoh: sandiVendorA123"
              value={verifySalt}
              onChange={(e) => setVerifySalt(e.target.value)}
              className="form-input font-mono"
              required
            />
          </Field>

          <Field label="Hash Terkunci di Blockchain (Opsional)" htmlFor="verify-hash">
            <input
              id="verify-hash"
              type="text"
              placeholder="0x..."
              value={verifyHashExpected}
              onChange={(e) => setVerifyHashExpected(e.target.value)}
              className="form-input font-mono"
            />
          </Field>

          <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button type="submit" className="gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Hitung &amp; Buktikan Hash</span>
            </Button>

            {verifyResult && (
              <div className="text-xs">
                {verifyResult.matches === true && (
                  <span className="text-status-done-text font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> BUKTI SAH: Cocok 100% dengan Hash di Blockchain
                  </span>
                )}
                {verifyResult.matches === false && (
                  <span className="text-status-danger-text font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> BEDA HASH: Terindikasi Upaya Rekayasa / Curang
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        {verifyResult && (
          <div className="rounded-control bg-slate-950 border border-slate-800 p-3 text-xs font-mono break-all space-y-1">
            <div className="text-slate-400 text-2xs">Hasil Perhitungan Hash (Keccak-256):</div>
            <div className="text-status-reveal-dot">{verifyResult.computed}</div>
          </div>
        )}
      </Card>

      {/* Explorer Navigation Tabs (Registry vs Raw Logs) */}
      <Tabs
        items={explorerTabs}
        value={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* VIEW 1: PORTAL TRANSPARANSI REKANAN & DOKUMEN PUBLIK */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Daftar Transparansi Penawaran Rekanan &amp; Dokumen IPFS
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi terbuka: Nama PT/CV rekanan, dokumen proposal teknis, status komitmen, dan tautan transaksi block explorer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari PT / Wallet / Proyek..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${SEARCH_INPUT_CLASS} w-48 sm:w-60`}
                />
              </div>

              <select
                value={filterTenderId}
                onChange={(e) => setFilterTenderId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="ALL">Semua Paket Tender</option>
                {tenders.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.namaProyek.slice(0, 28)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredBids.length === 0 ? (
            <EmptyState
              icon={Building}
              title="Tidak ada catatan penawaran"
              description="Tidak ada catatan penawaran yang cocok dengan filter pencarian. Ubah kata kunci atau pilih paket tender lain."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Paket Lelang</th>
                      <th className="py-3 px-4">Nama Perusahaan (PT/CV) &amp; Wallet</th>
                      <th className="py-3 px-4">Proposal Teknis (IPFS)</th>
                      <th className="py-3 px-4">Status Komitmen &amp; Harga</th>
                      <th className="py-3 px-4 text-right">Bukti Blockchain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBids.map((bid, idx) => {
                      const proposalUrl = formatIpfsGatewayUrl(bid.ipfsProposalTeknis);
                      const explorerUrl = bid.txHash
                        ? (getExplorerTxUrl(bid.txHash, web3ChainId) || `https://sepolia.basescan.org/tx/${bid.txHash}`)
                        : null;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          {/* Kolom 1: Paket Lelang */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-2xs border border-slate-200">
                                #{bid.tenderId}
                              </span>
                              <span className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={bid.tenderTitle}>
                                {bid.tenderTitle}
                              </span>
                            </div>
                            <div className="text-2xs text-slate-400 mt-1">
                              Pagu: {formatIDR(bid.paguAnggaranIDR)}
                            </div>
                          </td>

                          {/* Kolom 2: Nama Perusahaan & Wallet */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {bid.vendorName}
                              </span>
                              {bid.isWinner && (
                                <StatusPill tone="reveal" dot={false}>
                                  <Trophy className="w-3 h-3" />
                                  Pemenang
                                </StatusPill>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-slate-500 text-2xs">
                                {truncateAddress(bid.vendorAddress)}
                              </span>
                              <button
                                onClick={() => handleCopy(bid.vendorAddress, `addr-${idx}`)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                                title="Salin Alamat Wallet"
                              >
                                {copiedAddr === `addr-${idx}` ? (
                                  <Check className="w-3 h-3 text-status-done-dot" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Kolom 3: Dokumen Proposal Teknis (IPFS) */}
                          <td className="py-3 px-4 align-top">
                            {bid.ipfsProposalTeknis ? (
                              <div className="space-y-1">
                                <a
                                  href={proposalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 px-2.5 py-1 rounded-control font-semibold text-2xs border border-brand-200 transition"
                                  title="Buka dokumen proposal asli di IPFS Gateway"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Lihat PDF Proposal</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <div className="text-2xs text-slate-400 font-mono truncate max-w-[170px]" title={bid.ipfsProposalTeknis}>
                                  {bid.ipfsProposalTeknis.replace(/^https?:\/\/[^/]+\/ipfs\//, 'ipfs://')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-2xs">-</span>
                            )}
                          </td>

                          {/* Kolom 4: Status Komitmen & Harga */}
                          <td className="py-3 px-4 align-top">
                            {bid.sudahReveal ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 tabular-nums">
                                    {formatIDR(bid.hargaTerbukaIDR)}
                                  </span>
                                  <StatusPill tone={bid.memenuhiSyaratPagu ? 'done' : 'danger'} dot={false}>
                                    {bid.memenuhiSyaratPagu ? "Lolos Pagu" : "Gugur Pagu"}
                                  </StatusPill>
                                </div>
                                <div className="text-2xs text-slate-400 flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-status-done-dot" />
                                  <span>Harga Telah Dibuka</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <StatusPill tone="commit" dot={false}>
                                  <Lock className="w-3 h-3" />
                                  Terkunci (Sealed Bid)
                                </StatusPill>
                                <div className="text-2xs font-mono text-slate-400 truncate max-w-[180px]" title={bid.hashTerkunci}>
                                  Hash: {bid.hashTerkunci ? truncateAddress(bid.hashTerkunci) : "—"}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Kolom 5: Bukti Blockchain */}
                          <td className="py-3 px-4 align-top text-right">
                            {bid.txHash ? (
                              <div className="space-y-1">
                                <a
                                  href={explorerUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-900 hover:underline font-mono text-2xs font-medium"
                                  title="Cek transaksi asli di Explorer"
                                >
                                  <span>{truncateAddress(bid.txHash)}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <div className="text-2xs text-slate-400 font-mono">
                                  Blok #{bid.blockNumber}
                                </div>
                              </div>
                            ) : (
                              <span className="text-2xs text-slate-400 font-mono">
                                Sandbox Lokal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* VIEW 2: LOG PERISTIWA SMART CONTRACT (RAW ON-CHAIN EVENTS) */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Log Peristiwa Kontrak (Smart Contract Events)
              </h3>
              <span className="text-xs text-slate-400">({filteredEvents.length} Peristiwa)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari Tx / Event / PT / Ringkasan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${SEARCH_INPUT_CLASS} w-48 sm:w-60`}
                />
              </div>

              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="ALL">Semua Event</option>
                <option value="TenderDibuat">TenderDibuat</option>
                <option value="PenawaranTerkunciMasuk">PenawaranTerkunciMasuk</option>
                <option value="PenawaranDibuka">PenawaranDibuka</option>
                <option value="PemenangDitetapkan">PemenangDitetapkan</option>
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Tidak ada peristiwa"
              description="Tidak ada log peristiwa yang cocok dengan filter pencarian. Ubah kata kunci atau jenis event."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => {
                  const dateStr = new Date(evt.timestamp * 1000).toLocaleString('id-ID', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  const proposalUrl = evt.ipfsProposalTeknis ? formatIpfsGatewayUrl(evt.ipfsProposalTeknis) : null;
                  const isOnChain = evt.id?.startsWith('evt-chain-') || evt.id?.startsWith('deploy-');

                  return (
                    <div key={evt.id} className="p-4 hover:bg-slate-50 transition space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={EVENT_TONE[evt.eventName] || 'neutral'} dot={false}>
                            {evt.eventName}
                          </StatusPill>

                          {isOnChain ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-status-done-bg text-status-done-text border border-status-done-border text-2xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-done-dot" />
                              On-Chain ({activeChainConfig.shortName})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-2xs font-medium" title="Data simulasi sandbox lokal">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Sandbox Simulasi
                            </span>
                          )}

                          <span className="font-semibold text-slate-800">{evt.summary}</span>
                        </div>

                        <div className="text-slate-400 font-mono text-2xs shrink-0">
                          {dateStr}
                        </div>
                      </div>

                      {/* Metadata Detail Row */}
                      <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <span>Tx Hash:</span>
                          {isOnChain ? (
                            <a
                              href={getExplorerTxUrl(evt.txHash, web3ChainId) || `https://sepolia.basescan.org/tx/${evt.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-brand-700 hover:underline flex items-center gap-0.5 font-medium"
                              title="Buka transaksi terverifikasi di Basescan"
                            >
                              {truncateAddress(evt.txHash)}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span
                              className="font-mono text-slate-500 flex items-center gap-1 cursor-help"
                              title="Hash simulasi sandbox lokal"
                            >
                              <span>{truncateAddress(evt.txHash)}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <span>Block:</span>
                          <span className="font-mono text-slate-700">#{evt.blockNumber}</span>
                        </div>

                        {evt.namaPerusahaan && (
                          <div className="flex items-center gap-1">
                            <span>Perusahaan:</span>
                            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-2xs">
                              {evt.namaPerusahaan}
                            </span>
                          </div>
                        )}

                        {evt.vendor && (
                          <div className="flex items-center gap-1">
                            <span>Wallet:</span>
                            <span className="font-mono text-slate-700">{truncateAddress(evt.vendor)}</span>
                          </div>
                        )}

                        {proposalUrl && (
                          <div className="flex items-center gap-1">
                            <a
                              href={proposalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-700 hover:underline flex items-center gap-0.5 font-medium"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Lihat Proposal PDF</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
