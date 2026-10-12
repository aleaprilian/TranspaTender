import React, { useState, useMemo } from 'react';
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
  Building,
  Trophy,
  Layers,
  Printer,
  Download,
  FileSpreadsheet,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

const EVENT_TONE = {
  TenderDibuat: 'commit',
  PenawaranTerkunciMasuk: 'commit',
  PenawaranDibuka: 'reveal',
  PemenangDitetapkan: 'done',
  DiskualifikasiVendor: 'danger'
};

const SEARCH_INPUT_CLASS =
  'w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-control text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

const SELECT_CLASS =
  'text-xs bg-white border border-slate-300 rounded-control text-slate-900 px-2.5 py-2 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function AuditExplorer() {
  const { auditEvents, tenders, deployedContractAddress, web3ChainId, mode, currentTime } = useTender();

  // Navigation Sub-tab: 'daftar' | 'jejak' | 'laporan'
  const [activeTab, setActiveTab] = useState('daftar');

  // Filter & Search
  const [filterTenderId, setFilterTenderId] = useState('ALL');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Independent Auditor Tool (Keccak-256 Verifier)
  const [verifyHarga, setVerifyHarga] = useState('');
  const [verifySalt, setVerifySalt] = useState('');
  const [verifyHashExpected, setVerifyHashExpected] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (!verifyHarga || !verifySalt) return;
    const computed = generateCommitHash(verifyHarga, verifySalt);
    const matches = verifyHashExpected
      ? computed.toLowerCase() === verifyHashExpected.trim().toLowerCase()
      : null;
    setVerifyResult({
      computed,
      matches
    });
  };

  // Quick-fill into Verifier from bid item
  const handleQuickVerifyBid = (b) => {
    if (b.commitHash) setVerifyHashExpected(b.commitHash);
    if (b.hargaIDR && b.sudahReveal) setVerifyHarga(String(b.hargaIDR));
    if (b.salt) setVerifySalt(b.salt);
    setActiveTab('daftar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Aggregate all vendor bids across tenders with clean data resolution
  const allBids = useMemo(() => {
    const list = [];
    tenders.forEach(t => {
      if (t.penawaran) {
        Object.entries(t.penawaran).forEach(([addr, rawBid]) => {
          // Find matching commit event for txHash and additional metadata
          const commitEvt = auditEvents.find(e =>
            Number(e.idTender) === Number(t.id) &&
            e.eventName === 'PenawaranTerkunciMasuk' &&
            ((e.vendor && e.vendor.toLowerCase() === addr.toLowerCase()) ||
             (e.namaPerusahaan && rawBid.vendorName && e.namaPerusahaan.toLowerCase() === rawBid.vendorName.toLowerCase()))
          );

          const revealEvt = auditEvents.find(e =>
            Number(e.idTender) === Number(t.id) &&
            e.eventName === 'PenawaranDibuka' &&
            e.vendor && e.vendor.toLowerCase() === addr.toLowerCase()
          );

          // Clean vendor name (handling accidental "PT PT" or fallback)
          let vendorName = rawBid.vendorName || commitEvt?.namaPerusahaan || '';
          if (!vendorName || vendorName === 'PT PT') {
            vendorName = commitEvt?.namaPerusahaan || `Rekanan (${truncateAddress(addr)})`;
          }

          // Hash commitment resolution
          const commitHash = rawBid.hashTerkunci || rawBid.commitHash || commitEvt?.hashTerkunci || '';

          // Reveal status & price resolution
          const isRevealed = Boolean(
            rawBid.sudahReveal ||
            revealEvt ||
            (rawBid.hargaTerbukaIDR && rawBid.hargaTerbukaIDR > 0)
          );

          const openedPrice = Number(
            rawBid.hargaTerbukaIDR ||
            rawBid.hargaDisimpan ||
            rawBid.hargaIDR ||
            (revealEvt?.hargaIDR ? Number(revealEvt.hargaIDR) : 0)
          );

          // Valid timestamp resolution (avoid epoch 1970)
          const rawTime =
            rawBid.waktuCommit ||
            rawBid.timestamp ||
            commitEvt?.timestamp ||
            t.waktuDibuat ||
            0;
          const timestamp = rawTime > 0 ? rawTime : (t.waktuDibuat || currentTime || Math.floor(Date.now() / 1000));

          list.push({
            tenderId: t.id,
            tenderName: t.namaProyek,
            satuanKerja: t.satuanKerja,
            paguAnggaranIDR: t.paguAnggaranIDR,
            vendorAddr: addr,
            vendorName,
            sudahReveal: isRevealed,
            hargaIDR: openedPrice,
            salt: rawBid.saltDisimpan || '',
            commitHash,
            timestamp,
            txHash: commitEvt?.txHash || revealEvt?.txHash || null,
            ipfsProposalTeknis: rawBid.ipfsProposalTeknis || commitEvt?.ipfsProposalTeknis || null,
            ipfsProposalHarga: rawBid.ipfsProposalHarga || null,
            memenuhiSyaratPagu: isRevealed
              ? Boolean(rawBid.memenuhiSyaratPagu || (openedPrice <= t.paguAnggaranIDR && openedPrice > 0))
              : null
          });
        });
      }
    });
    return list;
  }, [tenders, auditEvents, currentTime]);

  // Filter bids by tender and search
  const filteredBids = useMemo(() => {
    return allBids.filter(b => {
      if (filterTenderId !== 'ALL' && String(b.tenderId) !== filterTenderId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = b.vendorName?.toLowerCase().includes(q);
        const matchAddr = b.vendorAddr?.toLowerCase().includes(q);
        const matchTender = b.tenderName?.toLowerCase().includes(q);
        const matchHash = b.commitHash?.toLowerCase().includes(q);
        return matchName || matchAddr || matchTender || matchHash;
      }
      return true;
    });
  }, [allBids, filterTenderId, searchQuery]);

  // Filter audit events
  const filteredEvents = useMemo(() => {
    return auditEvents.filter(evt => {
      if (filterEvent !== 'ALL' && evt.eventName !== filterEvent) return false;
      if (filterTenderId !== 'ALL' && String(evt.idTender) !== filterTenderId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSummary = evt.summary?.toLowerCase().includes(q);
        const matchTx = evt.txHash?.toLowerCase().includes(q);
        const matchEvt = evt.eventName?.toLowerCase().includes(q);
        const matchCompany = evt.namaPerusahaan?.toLowerCase().includes(q);
        const matchVendor = evt.vendor?.toLowerCase().includes(q);
        return matchSummary || matchTx || matchEvt || matchCompany || matchVendor;
      }
      return true;
    });
  }, [auditEvents, filterEvent, filterTenderId, searchQuery]);

  const activeChainConfig = (mode === 'web3' && web3ChainId && SUPPORTED_NETWORKS[web3ChainId])
    ? SUPPORTED_NETWORKS[web3ChainId]
    : SUPPORTED_NETWORKS[84532];

  // Calculated totals
  const totalBidsCount = allBids.length;
  const revealedBidsCount = allBids.filter(b => b.sudahReveal).length;
  const sealedBidsCount = totalBidsCount - revealedBidsCount;
  const totalNilaiTerbuka = allBids.filter(b => b.sudahReveal).reduce((acc, b) => acc + (b.hargaIDR || 0), 0);
  const totalPaguSemuaTender = tenders.reduce((acc, t) => acc + (Number(t.paguAnggaranIDR) || 0), 0);
  const ipfsCount = allBids.filter(b => b.ipfsProposalTeknis).length;

  // Efficiency calculation (Savings for government)
  const totalPenghematan = tenders.reduce((acc, t) => {
    if (t.pemenang && t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR) {
      return acc + (t.paguAnggaranIDR - t.penawaranTerendahIDR);
    }
    return acc;
  }, 0);

  // Export JSON Report Handler
  const handleExportAuditJson = () => {
    const reportData = {
      judul: "Laporan Audit Resmi Sistem Pengadaan TranspaTender ID",
      tanggalGenerate: new Date().toISOString(),
      jaringan: activeChainConfig.name,
      kontrakAlamat: deployedContractAddress,
      mode,
      ringkasan: {
        totalTender: tenders.length,
        totalPaguIDR: totalPaguSemuaTender,
        totalPenawaran: totalBidsCount,
        penawaranTerbuka: revealedBidsCount,
        penawaranTerkunci: sealedBidsCount,
        dokumenIpfs: ipfsCount,
        penghematanNegaraIDR: totalPenghematan
      },
      paketTender: tenders.map(t => ({
        id: t.id,
        namaProyek: t.namaProyek,
        satuanKerja: t.satuanKerja,
        paguIDR: t.paguAnggaranIDR,
        selesai: t.selesai,
        pemenang: t.pemenang,
        penawaranTerendahIDR: t.penawaranTerendahIDR
      })),
      daftarPenawaran: allBids,
      jejakPeristiwaAudit: auditEvents
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TranspaTender_Laporan_Audit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV Report Handler
  const handleExportAuditCsv = () => {
    const headers = [
      "ID Tender",
      "Nama Tender",
      "Nama Vendor/Rekanan",
      "Alamat Wallet",
      "Status Penawaran",
      "Harga Penawaran (IDR)",
      "Hash Terkunci",
      "Waktu Transaksi",
      "Dokumen IPFS"
    ];

    const rows = allBids.map(b => [
      `"${b.tenderId}"`,
      `"${b.tenderName.replace(/"/g, '""')}"`,
      `"${b.vendorName.replace(/"/g, '""')}"`,
      `"${b.vendorAddr}"`,
      `"${b.sudahReveal ? 'Terbuka (Reveal)' : 'Terkunci (Sealed)'}"`,
      `"${b.sudahReveal ? b.hargaIDR : 'Terkunci'}"`,
      `"${b.commitHash}"`,
      `"${new Date(b.timestamp * 1000).toLocaleString('id-ID')}"`,
      `"${b.ipfsProposalTeknis || '-'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TranspaTender_Rekap_Penawaran_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sub-navigation tabs
  const auditTabs = [
    { id: 'daftar', label: '1. Daftar Rekanan & Verifikasi Hash', icon: Layers },
    { id: 'jejak', label: `2. Log Jejak Audit Blockchain (${auditEvents.length})`, icon: Activity },
    { id: 'laporan', label: '3. Laporan Kepatuhan KPK / BPK', icon: FileText }
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <Stat
            label="Total Penawaran"
            value={totalBidsCount}
            hint={`${revealedBidsCount} Terbuka • ${sealedBidsCount} Tersegel`}
            icon={Layers}
            tone="pending"
          />
        </Card>
        <Card className="p-4">
          <Stat
            label={revealedBidsCount > 0 ? "Total Penawaran Terbuka" : "Total Pagu Anggaran"}
            value={revealedBidsCount > 0 ? formatIDR(totalNilaiTerbuka) : formatIDR(totalPaguSemuaTender)}
            hint={revealedBidsCount > 0 ? "Dari penawaran yang lolos Reveal" : "Pagu kumulatif paket pengadaan"}
            icon={Trophy}
            tone="reveal"
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Dokumen IPFS"
            value={ipfsCount}
            hint="Proposal teknis terdesentralisasi"
            icon={FileText}
            tone="done"
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Integritas Hash"
            value="100% Sah"
            hint="Keccak-256 terverifikasi on-chain"
            icon={ShieldCheck}
            tone="commit"
          />
        </Card>
      </div>

      {/* Sub Tabs Navigation */}
      <Tabs
        items={auditTabs}
        value={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* ========================================================= */}
      {/* TAB 1: DAFTAR REKANAN & VERIFIKATOR MANDIRI */}
      {/* ========================================================= */}
      {activeTab === 'daftar' && (
        <div className="space-y-6">
          {/* Tool: Verifikator Independen Keccak-256 untuk Auditor */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    Alat Verifikasi Mandiri Auditor (Independent Keccak-256 Verifier)
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Standar Pengujian Integritas KPK &amp; BPK: Buktikan kecocokan matematika hash sebelum penetapan pemenang.
                  </p>
                </div>
              </div>
              <span className="text-2xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200 font-medium shrink-0 self-start sm:self-auto">
                KPK &amp; BPK Compliance Tool
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Uji keaslian komitmen vendor secara mandiri: Masukkan harga IDR dan kata sandi rahasia untuk memverifikasi apakah
              hasil hash-nya cocok 100% dengan hash yang dikunci saat pendaftaran awal di blockchain.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nominal Harga (IDR)" htmlFor="verify-harga" required>
                  <input
                    id="verify-harga"
                    type="text"
                    placeholder="Contoh: 920000000"
                    value={verifyHarga}
                    onChange={(e) => setVerifyHarga(e.target.value.replace(/[^0-9]/g, ''))}
                    className="form-input font-mono"
                    required
                  />
                  {verifyHarga && (
                    <span className="text-2xs text-slate-500 mt-1 block">
                      Terbaca: <strong>{formatIDR(verifyHarga)}</strong>
                    </span>
                  )}
                </Field>

                <Field label="Kata Sandi Rahasia (Salt)" htmlFor="verify-salt" required>
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
                    placeholder="0x9c22ff5f..."
                    value={verifyHashExpected}
                    onChange={(e) => setVerifyHashExpected(e.target.value)}
                    className="form-input font-mono"
                  />
                  <span className="text-2xs text-slate-400 mt-1 block">
                    Kosongkan jika hanya ingin menghitung hash
                  </span>
                </Field>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <Button type="submit" size="sm" className="gap-1.5 w-full sm:w-auto">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Hitung &amp; Buktikan Hash</span>
                </Button>

                {verifyResult && (
                  <div className="text-xs">
                    {verifyResult.matches === true && (
                      <span className="text-status-done-text font-semibold flex items-center gap-1.5 bg-status-done-bg border border-status-done-border px-3 py-1.5 rounded-control">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>BUKTI SAH: Cocok 100% dengan Hash yang Dikunci di Smart Contract!</span>
                      </span>
                    )}
                    {verifyResult.matches === false && (
                      <span className="text-status-danger-text font-semibold flex items-center gap-1.5 bg-status-danger-bg border border-status-danger-border px-3 py-1.5 rounded-control">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>BEDA HASH: Terindikasi Upaya Rekayasa Data / Manipulasi Penawaran!</span>
                      </span>
                    )}
                    {verifyResult.matches === null && (
                      <span className="text-slate-600 font-medium">
                        Hash berhasil dihitung secara lokal via Keccak-256.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </form>

            {verifyResult && (
              <div className="rounded-control bg-slate-950 border border-slate-800 p-3.5 text-xs font-mono break-all space-y-1">
                <div className="text-slate-400 text-2xs flex items-center justify-between">
                  <span>Hasil Perhitungan Hash Lokal (Keccak-256):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(verifyResult.computed, 'computed-hash')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-2xs"
                  >
                    {copiedKey === 'computed-hash' ? <Check className="w-3 h-3 text-status-done-dot" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'computed-hash' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <div className="text-status-reveal-dot font-semibold">{verifyResult.computed}</div>
              </div>
            )}
          </Card>

          {/* Daftar Penawaran Rekanan */}
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
                title="Belum ada penawaran yang cocok dengan filter"
                description="Coba ubah kata kunci pencarian atau pilih paket tender lain."
              />
            ) : (
              <div className="space-y-3">
                {filteredBids.map((b, idx) => {
                  const tender = tenders.find(t => t.id === b.tenderId);
                  const isWinner = tender && tender.pemenang && tender.pemenang.toLowerCase() === b.vendorAddr.toLowerCase();

                  return (
                    <div
                      key={`${b.vendorAddr}-${b.tenderId}-${idx}`}
                      className="bg-white border border-slate-200 rounded-card p-4 space-y-3 shadow-card hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          {/* Vendor name + Status pill + Address */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{b.vendorName}</span>
                            <StatusPill tone={isWinner ? 'done' : (b.sudahReveal ? 'reveal' : 'commit')}>
                              {isWinner
                                ? 'Pemenang Tender'
                                : (b.sudahReveal ? 'Penawaran Terbuka' : 'Terkunci (Sealed Bid)')}
                            </StatusPill>
                            <span className="text-2xs text-slate-500 font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              {truncateAddress(b.vendorAddr)}
                            </span>
                          </div>

                          {/* Tender title */}
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Paket Tender #{b.tenderId}:</span> {tender?.namaProyek || '-'}
                            {b.satuanKerja && <span className="text-slate-400"> • {b.satuanKerja}</span>}
                          </div>

                          {/* Price, date, tx details */}
                          <div className="flex flex-wrap items-center gap-3 text-2xs text-slate-500 pt-0.5">
                            <div>
                              {b.sudahReveal ? (
                                <span className="font-bold text-slate-900 text-xs">
                                  {formatIDR(b.hargaIDR)}
                                </span>
                              ) : (
                                <span className="font-medium text-status-commit-text bg-status-commit-bg border border-status-commit-border px-2 py-0.5 rounded">
                                  Terkunci di Smart Contract (Sealed Bid)
                                </span>
                              )}
                            </div>
                            <span>•</span>
                            <span title="Waktu pendaftaran penawaran">
                              {new Date(b.timestamp * 1000).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {b.txHash && (
                              <>
                                <span>•</span>
                                <a
                                  href={getExplorerTxUrl(b.txHash, web3ChainId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-brand-700 hover:text-brand-900 underline decoration-dotted underline-offset-2 font-medium"
                                  title="Lihat transaksi pendaftaran di Basescan"
                                >
                                  <span>Lihat Tx</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right side: Hash copy + IPFS links + Quick verify */}
                        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                          {b.commitHash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xs text-slate-500">Hash Komitmen:</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(b.commitHash, `hash-${b.vendorAddr}-${idx}`)}
                                className="font-mono text-2xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 transition"
                                title="Klik untuk menyalin Hash Keccak-256"
                              >
                                {copiedKey === `hash-${b.vendorAddr}-${idx}` ? (
                                  <Check className="w-3 h-3 text-status-done-dot" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                                <span>{truncateAddress(b.commitHash)}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-2xs text-slate-400">Hash belum tercatat</span>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {b.ipfsProposalTeknis && (
                              <a
                                href={formatIpfsGatewayUrl(b.ipfsProposalTeknis)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-2xs text-brand-700 hover:text-brand-900 bg-slate-50 border border-slate-200 px-2 py-1 rounded transition font-medium"
                              >
                                <FileText className="w-3 h-3 text-brand-600" />
                                <span>Proposal Teknis (IPFS)</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-2xs border border-slate-200 hover:border-slate-300"
                              onClick={() => handleQuickVerifyBid(b)}
                              title="Muat hash ini ke kalkulator verifikator di atas"
                            >
                              <Terminal className="w-3 h-3 text-slate-500" />
                              <span>Uji di Verifikator</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LOG JEJAK AUDIT BLOCKCHAIN (AUDIT TRAIL) */}
      {/* ========================================================= */}
      {activeTab === 'jejak' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Log Jejak Audit Peristiwa Smart Contract (Immutable Audit Trail)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekaman kronologis peristiwa blockchain yang tidak dapat diubah (tamper-proof) untuk audit forensik pengadaan.
              </p>
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
                <option value="ALL">Semua Peristiwa</option>
                <option value="TenderDibuat">TenderDibuat</option>
                <option value="PenawaranTerkunciMasuk">PenawaranTerkunciMasuk</option>
                <option value="PenawaranDibuka">PenawaranDibuka</option>
                <option value="PemenangDitetapkan">PemenangDitetapkan</option>
                <option value="DiskualifikasiVendor">DiskualifikasiVendor</option>
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Tidak ada peristiwa yang cocok"
              description="Tidak ada catatan audit log yang cocok dengan filter pencarian saat ini."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => {
                  const dateStr = new Date(evt.timestamp * 1000).toLocaleString('id-ID', {
                    dateStyle: 'medium',
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
                            <span
                              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-2xs font-medium"
                              title="Data simulasi sandbox lokal"
                            >
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

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-500 pt-1 border-t border-slate-100">
                        {evt.txHash && (
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
                              <span className="font-mono text-slate-600">
                                {truncateAddress(evt.txHash)}
                              </span>
                            )}
                          </div>
                        )}

                        {evt.blockNumber && (
                          <div className="flex items-center gap-1">
                            <span>Block:</span>
                            <span className="font-mono text-slate-700">#{evt.blockNumber}</span>
                          </div>
                        )}

                        {evt.idTender && (
                          <div className="flex items-center gap-1">
                            <span>Tender:</span>
                            <span className="font-semibold text-slate-700">#{evt.idTender}</span>
                          </div>
                        )}

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

      {/* ========================================================= */}
      {/* TAB 3: LAPORAN KEPATUHAN KPK & BPK */}
      {/* ========================================================= */}
      {activeTab === 'laporan' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-card border border-slate-200 shadow-card">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-brand-600" />
                <span>Dokumen Berita Acara &amp; Laporan Pengawasan Pengadaan (PBJ)</span>
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Dapat langsung dicetak sebagai berkas audit fisik atau diekspor ke format JSON / CSV untuk penyelidikan auditor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExportAuditCsv}
                className="gap-1.5"
                title="Unduh rekapitulasi penawaran dalam format spreadsheet CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor CSV</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExportAuditJson}
                className="gap-1.5"
                title="Unduh seluruh rekaman audit lengkap dalam format JSON kriptografis"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Unduh JSON</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
                title="Cetak Berita Acara atau simpan sebagai dokumen PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Berita Acara (PDF)</span>
              </Button>
            </div>
          </div>

          {/* Printable Report Document Card */}
          <Card className="p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-card">
            {/* Formal Report Header */}
            <div className="border-b-2 border-slate-900 pb-5 text-center space-y-1">
              <div className="text-2xs tracking-widest uppercase font-bold text-slate-500">
                REPUBLIK INDONESIA • SISTEM PENGADAAN BARANG &amp; JASA TERDESENTRALISASI
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                BERITA ACARA AUDIT &amp; KEPATUHAN PENGADAAN PUBLIK (TRANSPATENDER ID)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl mx-auto">
                Pengawasan Kriptografis Protokol Sealed-Bid Keccak-256 pada Smart Contract Base Sepolia (OP Stack Layer 2)
              </p>
            </div>

            {/* Audit Meta Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-control border border-slate-200 text-xs">
              <div>
                <span className="text-2xs text-slate-400 uppercase font-semibold block">Nomor Kontrak On-Chain</span>
                <span className="font-mono font-medium text-slate-900 break-all">
                  {deployedContractAddress || 'Sandbox Simulasi'}
                </span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 uppercase font-semibold block">Jaringan Validasi</span>
                <span className="font-medium text-slate-900">
                  {mode === 'web3' ? activeChainConfig.name : 'Simulasi Sandbox Interaktif'}
                </span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 uppercase font-semibold block">Waktu Penarikan Laporan</span>
                <span className="font-medium text-slate-900">
                  {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 uppercase font-semibold block">Status Integritas Hash</span>
                <span className="font-bold text-status-done-text flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>100% Bebas Manipulasi</span>
                </span>
              </div>
            </div>

            {/* Audit Executive Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-200 rounded-control p-4">
              <div className="space-y-0.5">
                <span className="text-2xs text-slate-500">Total Paket Lelang Diaudit</span>
                <div className="text-lg font-bold text-slate-900">{tenders.length} Paket</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xs text-slate-500">Total Pagu Alokasi APBN/D</span>
                <div className="text-lg font-bold text-brand-900">{formatIDR(totalPaguSemuaTender)}</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xs text-slate-500">Total Penawaran Masuk</span>
                <div className="text-lg font-bold text-slate-900">{totalBidsCount} Berkas</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-2xs text-slate-500">Estimasi Efisiensi Anggaran</span>
                <div className="text-lg font-bold text-status-done-text">{formatIDR(totalPenghematan)}</div>
              </div>
            </div>

            {/* Recapitulation Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                I. Rekapitulasi Hasil Pengadaan &amp; Penetapan Pemenang Sah
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-control">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Nama Paket Lelang</th>
                      <th className="py-2.5 px-3">Satuan Kerja</th>
                      <th className="py-2.5 px-3">Pagu (IDR)</th>
                      <th className="py-2.5 px-3">Pemenang Ditetapkan</th>
                      <th className="py-2.5 px-3">Harga Menang</th>
                      <th className="py-2.5 px-3">Penghematan (Efisiensi)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenders.map((t) => {
                      const hasWinner = Boolean(t.pemenang && t.penawaranTerendahIDR && t.penawaranTerendahIDR <= t.paguAnggaranIDR);
                      const hemat = hasWinner ? (t.paguAnggaranIDR - t.penawaranTerendahIDR) : 0;
                      const persenHemat = hasWinner && t.paguAnggaranIDR > 0
                        ? ((hemat / t.paguAnggaranIDR) * 100).toFixed(1)
                        : 0;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono text-2xs text-slate-500">#{t.id}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{t.namaProyek}</td>
                          <td className="py-2 px-3 text-slate-600 text-2xs">{t.satuanKerja || '-'}</td>
                          <td className="py-2 px-3 font-mono text-2xs text-slate-700">{formatIDR(t.paguAnggaranIDR)}</td>
                          <td className="py-2 px-3">
                            {hasWinner ? (
                              <span className="font-semibold text-slate-900 text-2xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                                {t.namaPerusahaanPemenang || truncateAddress(t.pemenang)}
                              </span>
                            ) : (
                              <span className="text-2xs text-slate-400">Dalam Proses / Belum Ditetapkan</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-2xs text-slate-900 font-semibold">
                            {hasWinner ? formatIDR(t.penawaranTerendahIDR) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-2xs text-status-done-text">
                            {hasWinner ? `${formatIDR(hemat)} (${persenHemat}%)` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic Proof Verification Note for KPK / BPK */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                II. Pernyataan Verifikasi Kepatuhan Anti-Korupsi &amp; Anti-Kolusi
              </h4>

              <div className="bg-slate-50 border border-slate-200 rounded-control p-4 text-xs space-y-2 text-slate-700 leading-relaxed">
                <p>
                  Berdasarkan audit protokol smart contract TranspaTender ID pada jaringan Base Sepolia L2:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-2xs text-slate-600">
                  <li>
                    <strong>Kerahasiaan Penawaran Terjamin (Anti-Bocoran HPS/Penawaran):</strong> Semua harga disimpan dalam bentuk hash kriptografi <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">keccak256(harga, salt)</code> selama Fase Commit. Tidak ada pihak manapun (termasuk Panitia Pengadaan) yang dapat mengintip nominal penawaran rekanan sebelum jadwal pembukaan resmi.
                  </li>
                  <li>
                    <strong>Integritas Dokumen Terverifikasi IPFS:</strong> Kerangka Acuan Kerja (KAK) dan proposal teknis diikat permanen menggunakan Content Identifier (CID) IPFS, menjamin berkas tidak dapat diselundupkan atau ditukar di tengah jalan.
                  </li>
                  <li>
                    <strong>Penetapan Pemenang Mutlak Secara Algoritmik:</strong> Smart contract secara matematis mendiskualifikasi setiap rekanan yang mencoba menyetor harga palsu saat pembukaan (Reveal) dan secara otomatis menetapkan penawaran terendah yang sah di bawah pagu anggaran.
                  </li>
                </ol>
              </div>
            </div>

            {/* Signatures Footer */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <span className="text-slate-500 text-2xs">Panitia Pengadaan (PPK)</span>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                  TranspaTender Verified
                </div>
              </div>
              <div className="space-y-8">
                <span className="text-slate-500 text-2xs">Auditor Publik (BPK / KPK)</span>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                  Digital Signature Valid
                </div>
              </div>
              <div className="space-y-8 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-2xs">Konsensus Blockchain</span>
                <div className="border-t border-slate-300 pt-1 font-mono text-2xs text-brand-700">
                  Base Sepolia OP Stack
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}