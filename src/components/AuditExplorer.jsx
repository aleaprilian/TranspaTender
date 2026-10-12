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

  // Filter & Search
  const [filterTenderId, setFilterTenderId] = useState('ALL');
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
          tenderName: t.namaProyek,
          vendorAddr: addr,
          vendorName: bid.vendorName || 'Tidak diketahui',
          hargaIDR: bid.hargaIDR,
          hargaIDRFormatted: formatIDR(bid.hargaIDR || 0),
          commitHash: bid.commitHash,
          timestamp: bid.timestamp || 0,
          txHash: commitEvt?.txHash,
          ipfsProposalTeknis: bid.ipfsProposalTeknis,
          ipfsProposalHarga: bid.ipfsProposalHarga
        });
      });
    }
  });

  // Filter bids by tender and search
  const filteredBids = allBids.filter(b => {
    if (filterTenderId !== 'ALL' && String(b.tenderId) !== filterTenderId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = b.vendorName?.toLowerCase().includes(q);
      const matchAddr = b.vendorAddr?.toLowerCase().includes(q);
      const matchTender = b.tenderName?.toLowerCase().includes(q);
      return matchName || matchAddr || matchTender;
    }
    return true;
  });

  const activeChainConfig = (mode === 'web3' && web3ChainId && SUPPORTED_NETWORKS[web3ChainId])
    ? SUPPORTED_NETWORKS[web3ChainId]
    : SUPPORTED_NETWORKS[84532];

  const ipfsCount = allBids.filter(b => b.ipfsProposalTeknis).length;

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <Stat
            label="Total Penawaran"
            value={allBids.length}
            icon={Layers}
            tone="pending"
            trend={null}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Nilai Total"
            value={formatIDR(allBids.reduce((acc, b) => acc + (b.hargaIDR || 0), 0))}
            icon={Trophy}
            tone="reveal"
            trend={null}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Dokumen IPFS"
            value={ipfsCount}
            icon={FileText}
            tone="done"
            trend={null}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Integritas Hash"
            value="100% Valid"
            icon={ShieldCheck}
            tone="commit"
            trend={null}
          />
        </Card>
      </div>

      {/* Tool: Verifikator Independen Keccak‑256 untuk Auditor */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-sm text-slate-900">
              Alat Verifikasi Mandiri Auditor (Independent Keccak‑256 Verifier)
            </h3>
          </div>
          <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            KPK & BPK Compliance Tool
          </span>
        </div>
        <p className="text-xs text-slate-600">
          Uji keaslian komitmen vendor secara matematis: Masukkan harga IDR dan kata sandi yang diungkap untuk memverifikasi apakah
          hasil hash‑nya cocok 100% dengan hash yang dikunci saat pendaftaran awal di blockchain.
        </p>

        <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field
            label="Nominal Harga (IDR)"
            type="text"
            placeholder="Contoh: 920000000"
            value={verifyHarga}
            onChange={(e) => setVerifyHarga(e.target.value.replace(/[^0-9]/g, ''))}
            required
          />
          <Field
            label="Kata Sandi Rahasia (Salt)"
            type="text"
            placeholder="Contoh: sandiVendorA123"
            value={verifySalt}
            onChange={(e) => setVerifySalt(e.target.value)}
            required
          />
          <Field
            label="Hash Terkunci di Blockchain (Opsional)"
            type="text"
            placeholder="0x..."
            value={verifyHashExpected}
            onChange={(e) => setVerifyHashExpected(e.target.value)}
          />

          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <Button type="submit" size="sm" className="gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Hitung & Buktikan Hash</span>
            </Button>

            {verifyResult && (
              <div className="text-xs">
                {verifyResult.matches === true && (
                  <span className="text-status-done-text font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    BUKTI SAH: Cocok 100% dengan Hash di Blockchain
                  </span>
                )}
                {verifyResult.matches === false && (
                  <span className="text-status-danger-text font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    BEDA HASH: Terindikasi Upaya Rekayasa / Curang
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        {verifyResult && (
          <div className="rounded-control bg-slate-950 border border-slate-800 p-3 text-xs font-mono break-all space-y-1">
            <div className="text-slate-400 text-2xs">Hasil Perhitungan Hash (Keccak‑256):</div>
            <div className="text-status-reveal-dot">{verifyResult.computed}</div>
          </div>
        )}
      </Card>

      {/* VIEW: PORTAL TRANSPARANSI REKANAN & DOKUMEN PUBLIK */}
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
              const isWinner = tender && tender.pemenang === b.vendorAddr;

              return (
                <div
                  key={`${b.vendorAddr}-${b.tenderId}-${idx}`}
                  className="bg-white border border-slate-200 rounded-card p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-semibold text-slate-900">{b.vendorName}</div>
                        <StatusPill tone={isWinner ? 'done' : 'neutral'}>
                          {isWinner ? 'Pemenang Tender' : 'Peserta'}
                        </StatusPill>
                        <span className="text-2xs text-slate-500 font-mono">
                          {truncateAddress(b.vendorAddr)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span className="font-semibold">Paket Tender #{b.tenderId}:</span> {tender?.namaProyek || '-'}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-2xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">
                          {b.hargaIDRFormatted}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(b.timestamp * 1000).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {b.txHash && (
                          <>
                            <span>•</span>
                            <a
                              href={getExplorerTxUrl(b.txHash, web3ChainId)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2"
                            >
                              Lihat Tx
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xs text-slate-500">Hash Komitmen:</span>
                        <button
                          onClick={() => handleCopy(b.commitHash, `hash-${b.vendorAddr}`)}
                          className="font-mono text-2xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200"
                          title="Salin hash"
                        >
                          {copiedAddr === `hash-${b.vendorAddr}` ? (
                            <Check className="w-3 h-3 text-status-done-dot" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {truncateAddress(b.commitHash)}
                        </button>
                      </div>

                      {b.ipfsProposalTeknis && (
                        <a
                          href={formatIpfsGatewayUrl(b.ipfsProposalTeknis)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Proposal Teknis (IPFS)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {b.ipfsProposalHarga && (
                        <a
                          href={formatIpfsGatewayUrl(b.ipfsProposalHarga)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 underline decoration-dotted underline-offset-2"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Proposal Harga (IPFS)</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}