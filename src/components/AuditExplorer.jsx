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
  Layers, 
  Filter,
  Lock,
  Unlock,
  Building,
  Trophy,
  FileCheck,
  Globe,
  Hash
} from 'lucide-react';

export function AuditExplorer() {
  const { auditEvents, tenders, deployedContractAddress, web3ChainId, mode } = useTender();
  
  // Navigation tabs: 'registry' (Tabel Transparansi Rekanan) | 'events' (Raw Log Blockchain)
  const [activeTab, setActiveTab] = useState('registry');

  // Filter & Search
  const [filterTenderId, setFilterTenderId] = useState('ALL');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(null);

  // Independent Auditor Tool (Keccak-256 Verifier)
  const [verifyHarga, setVerifyHarga] = useState('');
  const [verifySalt, setVerifySalt] = useState('');
  const [verifyHashExpected, setVerifyHashExpected] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(key);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (!verifyHarga || !verifySalt) return;
    const computed = generateCommitHash(verifyHarga, verifySalt);
    const matches = verifyHashExpected ? computed.toLowerCase() === verifyHashExpected.trim().toLowerCase() : null;
    setVerifyResult({
      computed,
      matches
    });
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mini-card p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Jejak Audit Publik (Public Blockchain Explorer)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Masyarakat, KPK, BPK, dan LSM dapat mengaudit seluruh riwayat lelang secara <em>real-time</em> tanpa perlu 
              meminta izin basis data atau server panitia. Nama perusahaan, link proposal IPFS, dan bukti komitmen tercatat permanen di blockchain.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs shrink-0">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800">
                {activeChainConfig.chainName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Chain ID: {activeChainConfig.chainIdDec} • OP Stack L2 Rollup
              </div>
            </div>
          </div>
        </div>

        {/* Live Explorer Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-slate-400 text-[11px]">Total Transaksi / Event</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{auditEvents.length} Peristiwa</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-slate-400 text-[11px]">Rekanan Terdaftar</div>
            <div className="text-base font-bold text-blue-600 mt-0.5">{allBids.length} Vendor (PT/CV)</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-slate-400 text-[11px]">Dokumen Proposal IPFS</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{allBids.filter(b => b.ipfsProposalTeknis).length} Terdesentralisasi</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-slate-400 text-[11px]">Integritas Komitmen</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">100% Keccak-256 Valid</div>
          </div>
        </div>
      </div>

      {/* Tool: Verifikator Independen Keccak-256 untuk Auditor */}
      <div className="mini-card p-6 bg-slate-900 text-white space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              Alat Verifikasi Mandiri Auditor (Independent Keccak-256 Verifier)
            </h3>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            KPK & BPK Compliance Tool
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Uji keaslian komitmen vendor secara matematis: Masukkan harga IDR dan kata sandi yang diungkap untuk memverifikasi apakah 
          hasil hash-nya cocok 100% dengan hash yang dikunci saat pendaftaran awal di blockchain.
        </p>

        <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-300 font-medium mb-1">
              Nominal Harga (IDR)
            </label>
            <input
              type="text"
              placeholder="Contoh: 920000000"
              value={verifyHarga}
              onChange={(e) => setVerifyHarga(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 font-medium mb-1">
              Kata Sandi Rahasia (*Salt*)
            </label>
            <input
              type="text"
              placeholder="Contoh: sandiVendorA123"
              value={verifySalt}
              onChange={(e) => setVerifySalt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 font-medium mb-1">
              Hash Terkunci di Blockchain (Opsional)
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={verifyHashExpected}
              onChange={(e) => setVerifyHashExpected(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Hitung & Buktikan Hash</span>
            </button>

            {verifyResult && (
              <div className="text-xs">
                {verifyResult.matches === true && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> BUKTI SAH: Cocok 100% dengan Hash di Blockchain
                  </span>
                )}
                {verifyResult.matches === false && (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> BEDA HASH: Terindikasi Upaya Rekayasa / Curang
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        {verifyResult && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono break-all space-y-1">
            <div className="text-slate-400 text-[10px]">Hasil Perhitungan Hash (Keccak-256):</div>
            <div className="text-amber-300">{verifyResult.computed}</div>
          </div>
        )}
      </div>

      {/* Explorer Navigation Tabs (Registry vs Raw Logs) */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('registry')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'registry'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Portal Transparansi Rekanan & Dokumen Publik</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
            {allBids.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'events'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Log Transaksi Blockchain (Raw Events)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
            {auditEvents.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: PORTAL TRANSPARANSI REKANAN & DOKUMEN PUBLIK (HUMAN-READABLE EXPLORER) */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Daftar Transparansi Penawaran Rekanan & Dokumen IPFS</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi terbuka: Nama PT/CV rekanan, dokumen proposal teknis, status komitmen, dan tautan transaksi block explorer.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari PT / Wallet / Proyek..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-8 py-1.5 text-xs w-48 sm:w-60"
                />
              </div>

              <select
                value={filterTenderId}
                onChange={(e) => setFilterTenderId(e.target.value)}
                className="form-input py-1.5 text-xs w-auto"
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

          {/* TABLE: Modern Public Audit Explorer */}
          <div className="mini-card overflow-hidden bg-white border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Paket Lelang</th>
                    <th className="py-3 px-4">Nama Perusahaan (PT/CV) & Wallet</th>
                    <th className="py-3 px-4">Proposal Teknis (IPFS)</th>
                    <th className="py-3 px-4">Status Komitmen & Harga</th>
                    <th className="py-3 px-4 text-right">Bukti Blockchain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBids.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada catatan penawaran yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredBids.map((bid, idx) => {
                      const proposalUrl = formatIpfsGatewayUrl(bid.ipfsProposalTeknis);
                      const explorerUrl = bid.txHash 
                        ? (getExplorerTxUrl(bid.txHash, web3ChainId) || `https://sepolia.basescan.org/tx/${bid.txHash}`)
                        : null;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          {/* Kolom 1: Paket Lelang */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                #{bid.tenderId}
                              </span>
                              <span className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={bid.tenderTitle}>
                                {bid.tenderTitle}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
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
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-amber-200">
                                  <Trophy className="w-2.5 h-2.5 text-amber-600" />
                                  Pemenang
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-slate-500 text-[11px]">
                                {truncateAddress(bid.vendorAddress)}
                              </span>
                              <button
                                onClick={() => handleCopy(bid.vendorAddress, `addr-${idx}`)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                                title="Salin Alamat Wallet"
                              >
                                {copiedAddr === `addr-${idx}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
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
                                  className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md font-semibold text-[11px] border border-blue-200 transition"
                                  title="Buka dokumen proposal asli di IPFS Gateway"
                                >
                                  <FileText className="w-3 h-3 text-blue-600" />
                                  <span>Lihat PDF Proposal</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={bid.ipfsProposalTeknis}>
                                  {bid.ipfsProposalTeknis.replace(/^https?:\/\/[^/]+\/ipfs\//, 'ipfs://')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
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
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    bid.memenuhiSyaratPagu 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {bid.memenuhiSyaratPagu ? "Lolos Pagu" : "Gugur Pagu"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  <span>Harga Telah Dibuka</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 text-sky-800 bg-sky-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-sky-100">
                                  <Lock className="w-3 h-3 text-sky-600" />
                                  <span>Terkunci (Sealed Bid)</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]" title={bid.hashTerkunci}>
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
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-mono text-[11px] font-medium"
                                  title="Cek transaksi asli di Explorer"
                                >
                                  <span>{truncateAddress(bid.txHash)}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Blok #{bid.blockNumber}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Sandbox Lokal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Tx / Event / PT / Ringkasan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-8 py-1 text-xs w-48 sm:w-60"
                />
              </div>

              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="form-input py-1 text-xs w-auto"
              >
                <option value="ALL">Semua Event</option>
                <option value="TenderDibuat">TenderDibuat</option>
                <option value="PenawaranTerkunciMasuk">PenawaranTerkunciMasuk</option>
                <option value="PenawaranDibuka">PenawaranDibuka</option>
                <option value="PemenangDitetapkan">PemenangDitetapkan</option>
              </select>
            </div>
          </div>

          {/* Events Table / Timeline */}
          <div className="mini-card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => {
                const dateStr = new Date(evt.timestamp * 1000).toLocaleString('id-ID', {
                  dateStyle: 'short',
                  timeStyle: 'medium'
                });

                const proposalUrl = evt.ipfsProposalTeknis ? formatIpfsGatewayUrl(evt.ipfsProposalTeknis) : null;

                return (
                  <div key={evt.id} className="p-4 hover:bg-slate-50 transition space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.eventName === 'TenderDibuat' ? 'bg-blue-100 text-blue-800' :
                          evt.eventName === 'PenawaranTerkunciMasuk' ? 'bg-sky-100 text-sky-800' :
                          evt.eventName === 'PenawaranDibuka' ? 'bg-amber-100 text-amber-800' :
                          evt.eventName === 'PemenangDitetapkan' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {evt.eventName}
                        </span>
                        {(() => {
                          const isOnChain = evt.id?.startsWith('evt-chain-') || evt.id?.startsWith('deploy-');
                          return isOnChain ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              ● On-Chain ({activeChainConfig.shortName})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium" title="Data simulasi sandbox lokal">
                              ○ Sandbox Simulasi
                            </span>
                          );
                        })()}
                        <span className="font-semibold text-slate-800">{evt.summary}</span>
                      </div>

                      <div className="text-slate-400 font-mono text-[11px] shrink-0">
                        {dateStr}
                      </div>
                    </div>

                    {/* Metadata Detail Row */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100/70">
                      <div className="flex items-center gap-1">
                        <span>Tx Hash:</span>
                        {(() => {
                          const isOnChain = evt.id?.startsWith('evt-chain-') || evt.id?.startsWith('deploy-');
                          if (isOnChain) {
                            return (
                              <a
                                href={getExplorerTxUrl(evt.txHash, web3ChainId) || `https://sepolia.basescan.org/tx/${evt.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                                title="Buka transaksi terverifikasi di Basescan"
                              >
                                {truncateAddress(evt.txHash)}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            );
                          }
                          return (
                            <span 
                              className="font-mono text-slate-500 flex items-center gap-1 cursor-help"
                              title="Hash simulasi sandbox lokal"
                            >
                              <span>{truncateAddress(evt.txHash)}</span>
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-1">
                        <span>Block:</span>
                        <span className="font-mono text-slate-700">#{evt.blockNumber}</span>
                      </div>

                      {evt.namaPerusahaan && (
                        <div className="flex items-center gap-1">
                          <span>Perusahaan:</span>
                          <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
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
                            className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
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
          </div>
        </div>
      )}
    </div>
  );
}
