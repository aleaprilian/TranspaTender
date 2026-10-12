import React, { useState, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import {
  generateCommitHash,
  formatIDR,
  truncateAddress,
  formatDuration
} from '../utils/crypto';
import { IpfsUploadField } from './IpfsUploadField';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import {
  Button,
  Card,
  StatusPill,
  STATUS_TONE,
  Tabs,
  Field,
  EmptyState
} from './ui';
import {
  Lock,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Send,
  FileText,
  Unlock,
  AlertOctagon,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Archive,
  Search,
  Building,
  ExternalLink,
  Trophy,
  RefreshCw,
  Link as LinkIcon
} from 'lucide-react';

export function VendorPortal({ initialTenderId, initialTab = 'katalog', onSelectTender }) {
  const {
    tenders,
    currentTime,
    currentAccount,
    kirimPenawaranTerkunci,
    bukaPenawaran,
    getTenderStatus,
    jumpToPhase,
    mode,
    web3Account,
    deployedContractAddress,
    syncContractData,
    getVendorBidLocal,
    attachContract
  } = useTender();

  const [activeSubTab, setActiveSubTab] = useState(initialTab); // 'katalog' | 'hasher' | 'commit' | 'reveal' | 'vault' | 'anticheat'
  const [selectedTenderId, setSelectedTenderId] = useState(initialTenderId || null);

  // Hasher Tool State
  const [hasherHarga, setHasherHarga] = useState('920000000');
  const [hasherSalt, setHasherSalt] = useState('sandiVendorA123');
  const [hasherResult, setHasherResult] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);

  // Commit Form State
  const defaultCompanyName = currentAccount.institution || currentAccount.name || 'PT Rekanan Nusantara';
  const [commitVendorName, setCommitVendorName] = useState(defaultCompanyName);
  const [commitTenderId, setCommitTenderId] = useState(initialTenderId || null);
  const [commitHash, setCommitHash] = useState('');
  const [commitIpfs, setCommitIpfs] = useState('');
  const [commitStatus, setCommitStatus] = useState(null);
  const [isCommitSubmitting, setIsCommitSubmitting] = useState(false);

  // Sync default company name on account change
  useEffect(() => {
    if (currentAccount.institution && currentAccount.institution !== 'Peserta Vendor / Publik') {
      setCommitVendorName(currentAccount.institution);
    } else if (currentAccount.name && !currentAccount.name.startsWith('Wallet (')) {
      setCommitVendorName(currentAccount.name);
    }
  }, [currentAccount]);

  // Reveal Form State
  const [revealTenderId, setRevealTenderId] = useState(initialTenderId || null);
  const [revealHarga, setRevealHarga] = useState('');
  const [revealSalt, setRevealSalt] = useState('');
  const [revealStatus, setRevealStatus] = useState(null);
  const [isRevealSubmitting, setIsRevealSubmitting] = useState(false);

  // Search in catalog
  const [catalogSearch, setCatalogSearch] = useState('');

  // Contract attach (shown when the connected contract has no tenders)
  const [attachInput, setAttachInput] = useState('');
  const [attachError, setAttachError] = useState(null);

  // Live hasher effect
  useEffect(() => {
    if (hasherHarga && hasherSalt) {
      const h = generateCommitHash(hasherHarga, hasherSalt);
      setHasherResult(h);
    } else {
      setHasherResult('');
    }
  }, [hasherHarga, hasherSalt]);

  // When initial tender changes
  useEffect(() => {
    if (initialTenderId) {
      setSelectedTenderId(initialTenderId);
      setCommitTenderId(initialTenderId);
      setRevealTenderId(initialTenderId);
      if (initialTab) setActiveSubTab(initialTab);
    }
  }, [initialTenderId, initialTab]);

  // Copy hash helper
  const handleCopyHash = () => {
    if (!hasherResult) return;
    navigator.clipboard.writeText(hasherResult);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Quick preset helper
  const loadPreset = (vendorKey) => {
    if (vendorKey === 'vendorA') {
      setHasherHarga('920000000');
      setHasherSalt('sandiVendorA123');
      setCommitVendorName('PT Maju Bersama');
    } else if (vendorKey === 'vendorB') {
      setHasherHarga('850000000');
      setHasherSalt('sandiRahasiaB999');
      setCommitVendorName('PT Karya Nusantara');
    }
  };

  // Attach an existing contract address from the empty catalog
  const handleAttachContract = async (e) => {
    e.preventDefault();
    setAttachError(null);
    try {
      if (!attachInput.trim()) throw new Error('Masukkan alamat kontrak terlebih dahulu.');
      await attachContract(attachInput.trim());
      setAttachInput('');
    } catch (err) {
      setAttachError(err.reason || err.message || 'Gagal menghubungkan kontrak.');
    }
  };

  // Submit Commit
  const handleSubmitCommit = async (e) => {
    e.preventDefault();
    setCommitStatus(null);
    setIsCommitSubmitting(true);
    try {
      const hashToUse = commitHash || hasherResult;
      if (!hashToUse) {
        throw new Error("Hash penawaran tidak boleh kosong! Buat hash di tab Kalkulator terlebih dahulu.");
      }
      await kirimPenawaranTerkunci({
        idTender: commitTenderId,
        namaPerusahaan: commitVendorName,
        hashTerkunci: hashToUse,
        ipfsProposalTeknis: commitIpfs,
        hargaAsliIDR: hasherHarga,
        kataSandiRahasia: hasherSalt
      });
      setCommitStatus({
        type: 'success',
        message: 'Penawaran Terkunci (Sealed Bid) Berhasil Terkirim ke Smart Contract! Mengalihkan otomatis ke Menu 3 (Buka Penawaran / Fase Reveal)...'
      });
      // Auto navigate ke Menu 3 (Fase Reveal) setelah Fase 2 berhasil
      setTimeout(() => {
        setRevealTenderId(commitTenderId);
        setActiveSubTab('reveal');
      }, 2000);
    } catch (err) {
      setCommitStatus({
        type: 'error',
        message: err.reason || err.message || "Gagal mengirim penawaran."
      });
    } finally {
      setIsCommitSubmitting(false);
    }
  };

  // Submit Reveal
  const handleSubmitReveal = async (e) => {
    e.preventDefault();
    setRevealStatus(null);
    setIsRevealSubmitting(true);
    try {
      if (!revealHarga || !revealSalt) {
        throw new Error("Harga asli dan kata sandi rahasia wajib diisi!");
      }
      await bukaPenawaran({
        idTender: revealTenderId,
        hargaAsliIDR: revealHarga,
        kataSandiRahasia: revealSalt
      });
      setRevealStatus({
        type: 'success',
        message: 'Penawaran Berhasil Dibuka! Kriptografi Keccak-256 memvalidasi kecocokan hash 100%. Mengalihkan otomatis ke Katalog Lelang Pengadaan...'
      });
      // Auto navigate ke Katalog Lelang Pengadaan setelah Fase 3 berhasil
      setTimeout(() => {
        setActiveSubTab('katalog');
        setSelectedTenderId(null);
      }, 2500);
    } catch (err) {
      setRevealStatus({
        type: 'error',
        message: err.reason || err.message || "Gagal membuka penawaran."
      });
    } finally {
      setIsRevealSubmitting(false);
    }
  };

  // Current selected tender
  const selectedTender = selectedTenderId ? tenders.find(t => t.id === Number(selectedTenderId)) : null;

  // Current selected commit tender
  const selectedCommitTender = selectedTender || (commitTenderId ? tenders.find(t => t.id === Number(commitTenderId)) : null);
  const commitTenderStatus = selectedCommitTender ? getTenderStatus(selectedCommitTender) : null;

  // Current selected reveal tender
  const selectedRevealTender = selectedTender || (revealTenderId ? tenders.find(t => t.id === Number(revealTenderId)) : null);
  const revealTenderStatus = selectedRevealTender ? getTenderStatus(selectedRevealTender) : null;
  const userExistingBid = selectedRevealTender?.penawaran?.[currentAccount.address?.toLowerCase()] || selectedRevealTender?.penawaran?.[currentAccount.address];

  // Helper function to pick a tender and proceed into flow
  const handleSelectTenderForFlow = (tender, targetTab = 'hasher') => {
    setSelectedTenderId(tender.id);
    setCommitTenderId(tender.id);
    setRevealTenderId(tender.id);
    if (tender.paguAnggaranIDR && (!hasherHarga || Number(hasherHarga) > tender.paguAnggaranIDR)) {
      setHasherHarga(String(Math.floor(tender.paguAnggaranIDR * 0.9)));
    }
    setActiveSubTab(targetTab);
  };

  // Load all local saved bids for Vault
  const loadVaultBids = () => {
    const list = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('transpatender_vault_')) {
          const parts = key.split('_');
          const tenderId = parts[2];
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const tenderInfo = tenders.find(t => t.id === Number(tenderId));
            list.push({
              tenderId: Number(tenderId),
              namaProyek: tenderInfo?.namaProyek || `Paket Lelang #${tenderId}`,
              ...parsed
            });
          }
        }
      }
    } catch (e) {}
    return list;
  };

  const vaultBids = loadVaultBids();

  // Filter tenders for catalog
  const catalogTenders = tenders.filter(t => {
    return t.namaProyek.toLowerCase().includes(catalogSearch.toLowerCase()) ||
           t.kategori?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
           String(t.id).includes(catalogSearch);
  });

  const isFlowTab = activeSubTab === 'hasher' || activeSubTab === 'commit' || activeSubTab === 'reveal';

  const vendorTabs = [
    { id: 'katalog', label: 'Katalog Lelang', icon: Search },
    {
      id: 'hasher',
      label: '1. Kalkulator Hash',
      icon: Sparkles,
      disabled: !selectedTenderId,
      title: !selectedTenderId
        ? 'Pilih salah satu paket pengadaan di Katalog terlebih dahulu'
        : 'Hitung hash keccak256(harga, kata sandi) secara lokal'
    },
    {
      id: 'commit',
      label: '2. Kirim Penawaran',
      icon: Lock,
      disabled: !selectedTenderId,
      title: !selectedTenderId
        ? 'Pilih salah satu paket pengadaan di Katalog terlebih dahulu'
        : 'Kirim komitmen penawaran terkunci (Fase Commit)'
    },
    {
      id: 'reveal',
      label: '3. Buka Penawaran',
      icon: Unlock,
      disabled: !selectedTenderId,
      title: !selectedTenderId
        ? 'Pilih salah satu paket pengadaan di Katalog terlebih dahulu'
        : 'Buka harga penawaran (Fase Reveal)'
    },
    { id: 'vault', label: `Brankas Lokal (${vaultBids.length})`, icon: Archive },
    { id: 'anticheat', label: 'Uji Anti-Curang', icon: AlertOctagon }
  ];

  return (
    <div className="space-y-6">
      {/* Compact header: page title + active vendor identity + on-chain sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Katalog &amp; Alur Penawaran Vendor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun harga rahasia, setor komitmen terkunci, lalu buka penawaran secara adil (<em>sealed-bid</em>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-control bg-slate-50 border border-slate-200 px-3 py-1.5 text-2xs">
            <Briefcase className="w-3.5 h-3.5 text-brand-600" />
            <span className="font-medium text-slate-800">{currentAccount.name}</span>
            <span className="font-mono text-slate-400">{truncateAddress(currentAccount.address)}</span>
          </div>

          {mode === 'web3' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => syncContractData()}
              className="gap-1.5"
              title="Perbarui data lelang langsung dari blockchain"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <Tabs
        items={vendorTabs}
        value={activeSubTab}
        onChange={setActiveSubTab}
        variant="underline"
      />

      {/* Selected Tender Context Banner */}
      {selectedTender && (
        <Card className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-control bg-brand-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
              #{selectedTender.id}
            </span>
            <div className="min-w-0">
              <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                Paket Pengadaan Terpilih
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {selectedTender.namaProyek}
              </div>
              <div className="text-2xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Satuan Kerja: <strong className="text-slate-700">{selectedTender.satuanKerja}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Pagu: <strong className="text-slate-700">{formatIDR(selectedTender.paguAnggaranIDR)}</strong></span>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveSubTab('katalog')}
            className="gap-1.5 shrink-0 self-start sm:self-center"
            title="Kembali ke katalog untuk memilih paket pengadaan lain"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Pilih Pengadaan Lain</span>
          </Button>
        </Card>
      )}

      {/* Guard jika user belum memilih paket tender tapi berada di menu alur 1, 2, atau 3 */}
      {!selectedTenderId && isFlowTab && (
        <EmptyState
          icon={Lock}
          title="Pilih Paket Pengadaan Terlebih Dahulu"
          description="Menu 1. Kalkulator Hash, 2. Kirim Penawaran, dan 3. Buka Penawaran memerlukan paket lelang yang dipilih dari katalog agar proses kriptografi Keccak-256 dan pencatatan smart contract terarah."
          action={
            <Button onClick={() => setActiveSubTab('katalog')} className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Buka Katalog Lelang</span>
            </Button>
          }
        />
      )}

      {/* TAB 0: KATALOG LELANG UNTUK VENDOR */}
      {activeSubTab === 'katalog' && (
        <div className="space-y-4">
          <Card className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari lelang terbuka..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-control text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="text-2xs text-slate-500">
              Daftar lelang resmi pemerintah yang sedang berlangsung di smart contract
            </div>
          </Card>

          {catalogTenders.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Belum Ada Lelang Terbuka di Kontrak Ini"
              description={
                <>
                  Tidak ditemukan paket tender pada Smart Contract yang terhubung:{' '}
                  <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                    {truncateAddress(deployedContractAddress)}
                  </code>
                  . Pastikan akun vendor terhubung ke alamat kontrak yang sama dengan Panitia Pemerintah.
                </>
              }
              action={
                <div className="w-full max-w-lg space-y-3 text-left">
                  {mode === 'web3' && (
                    <form onSubmit={handleAttachContract} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={attachInput}
                        onChange={(e) => setAttachInput(e.target.value)}
                        placeholder="Tempel alamat kontrak pemerintah (0x...)"
                        className="form-input flex-1 font-mono text-xs"
                      />
                      <Button type="submit" size="sm" className="gap-1.5 shrink-0">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Hubungkan</span>
                      </Button>
                    </form>
                  )}
                  {attachError && (
                    <p className="text-2xs text-status-danger-text">{attachError}</p>
                  )}
                  <div className="flex justify-center pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => syncContractData()}
                      className="gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sinkronkan Ulang</span>
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogTenders.map(t => {
              const st = getTenderStatus(t);
              const commitLeft = Math.max(0, t.batasWaktuCommit - currentTime);
              const revealLeft = Math.max(0, t.batasWaktuReveal - currentTime);
              const myBid = t.penawaran?.[currentAccount.address.toLowerCase()] || t.penawaran?.[currentAccount.address];

              const isWinner = t.pemenang &&
                currentAccount.address &&
                t.pemenang.toLowerCase() === currentAccount.address.toLowerCase() &&
                t.penawaranTerendahIDR <= t.paguAnggaranIDR &&
                t.pemenang !== '0x0000000000000000000000000000000000000000';

              const hasWinner = t.pemenang &&
                t.pemenang !== '0x0000000000000000000000000000000000000000' &&
                t.penawaranTerendahIDR <= t.paguAnggaranIDR;

              return (
                <Card
                  key={t.id}
                  className={`flex flex-col justify-between overflow-hidden transition ${
                    isWinner
                      ? 'border-status-done-border ring-1 ring-status-done-border'
                      : 'hover:border-slate-300'
                  }`}
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{t.id}
                      </span>
                      <StatusPill tone={STATUS_TONE[st.stage] || 'neutral'}>
                        {st.label}
                      </StatusPill>
                    </div>

                    <div>
                      <h3
                        onClick={() => onSelectTender && onSelectTender(t)}
                        className={`font-bold text-slate-900 text-sm leading-snug line-clamp-2 ${onSelectTender ? 'cursor-pointer hover:text-brand-700 transition' : ''}`}
                        title="Klik untuk membuka rincian tender & dokumen lelang"
                      >
                        {t.namaProyek}
                      </h3>
                      <p className="text-2xs text-slate-500 mt-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{t.satuanKerja}</span>
                      </p>
                    </div>

                    {t.ipfsDokumenKAK && (
                      <div className="flex items-center justify-between gap-2 text-2xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-control border border-slate-100">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-brand-600" />
                          Dokumen KAK:
                        </span>
                        <a
                          href={formatIpfsGatewayUrl(t.ipfsDokumenKAK)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-700 hover:text-brand-900 font-mono flex items-center gap-1 font-semibold"
                          onClick={(e) => e.stopPropagation()}
                          title={`Buka Dokumen KAK: ${t.ipfsDokumenKAK}`}
                        >
                          <span>Buka via IPFS</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-control border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center gap-3 text-slate-500">
                        <span>Pagu Anggaran:</span>
                        <span className="font-bold text-slate-900 tabular-nums text-right">{formatIDR(t.paguAnggaranIDR)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 text-slate-500">
                        <span>Status Anda:</span>
                        <span className="text-right">
                          {isWinner ? (
                            <span className="font-bold text-status-done-text inline-flex items-center gap-1 bg-status-done-bg border border-status-done-border px-1.5 py-0.5 rounded">
                              <Trophy className="w-3 h-3 text-status-reveal-dot" />
                              MENANG ({formatIDR(t.penawaranTerendahIDR)})
                            </span>
                          ) : st.stage === 'COMPLETED' ? (
                            myBid ? (
                              myBid.sudahReveal ? (
                                <span className="font-medium text-slate-600">Kalah (Pemenang: {truncateAddress(t.pemenang)})</span>
                              ) : (
                                <span className="font-semibold text-status-danger-text">Gugur (Tidak Reveal)</span>
                              )
                            ) : (
                              <span className="text-slate-400">Tidak Berpartisipasi</span>
                            )
                          ) : myBid ? (
                            myBid.sudahReveal ? (
                              <span className="font-semibold text-status-done-text">Sudah Buka ({formatIDR(myBid.hargaTerbukaIDR)})</span>
                            ) : (
                              <span className="font-semibold text-status-commit-text" title="Penawaran rahasia terdaftar di blockchain, menunggu fase reveal">
                                Terkunci (Belum Reveal)
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">Belum Berpartisipasi</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-2xs text-slate-500 flex items-center justify-between gap-2">
                      {st.stage === 'COMMIT' && (
                        <span className="text-status-commit-text font-mono">Commit ditutup dlm: {formatDuration(commitLeft)}</span>
                      )}
                      {st.stage === 'REVEAL' && (
                        <span className="text-status-reveal-text font-mono">Reveal ditutup dlm: {formatDuration(revealLeft)}</span>
                      )}
                      {st.stage === 'COMPLETED' && (
                        hasWinner ? (
                          <span className="text-status-done-text font-semibold">Tender Selesai (Ada Pemenang)</span>
                        ) : (
                          <span className="text-status-reveal-text font-medium">Tender Selesai (Tanpa Pemenang)</span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {st.stage === 'COMMIT' && (
                        <Button
                          onClick={() => handleSelectTenderForFlow(t, 'hasher')}
                          className="w-full gap-1.5"
                          size="sm"
                          title="Pilih lelang ini dan mulai proses pengiriman penawaran dari Langkah 1 (Kalkulator Hash)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Kirim Penawaran Tersegel</span>
                        </Button>
                      )}

                      {st.stage === 'REVEAL' && (
                        <Button
                          onClick={() => handleSelectTenderForFlow(t, 'reveal')}
                          className="w-full gap-1.5"
                          size="sm"
                          title="Pilih lelang ini dan buka harga penawaran di Fase Reveal"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Penawaran (Reveal)</span>
                        </Button>
                      )}

                      {st.stage === 'COMPLETED' && (
                        isWinner ? (
                          <div className="w-full bg-status-done-bg border border-status-done-border text-status-done-text rounded-control py-2 text-center text-2xs font-bold flex items-center justify-center gap-1.5">
                            <Trophy className="w-4 h-4 text-status-reveal-dot" />
                            <span>SELAMAT! Anda Ditetapkan Sebagai Pemenang</span>
                          </div>
                        ) : myBid && !myBid.sudahReveal ? (
                          <div className="w-full bg-status-danger-bg border border-status-danger-border text-status-danger-text rounded-control py-1.5 px-2 text-center text-2xs font-medium flex items-center justify-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Penawaran Gugur: Tidak Dibuka pada Fase Reveal</span>
                          </div>
                        ) : !hasWinner ? (
                          <div className="w-full bg-status-reveal-bg border border-status-reveal-border text-status-reveal-text rounded-control py-1.5 px-2 text-center text-2xs font-medium">
                            Tender Selesai Tanpa Pemenang Sah (Gugur)
                          </div>
                        ) : (
                          <div className="w-full text-center text-2xs text-slate-500 py-1 font-medium">
                            Pengadaan Resmi Selesai
                          </div>
                        )
                      )}

                      {st.stage === 'AWAITING_LOCK' && (
                        <div className="w-full text-center text-2xs text-slate-500 py-1 font-medium">
                          Menunggu Pengesahan Panitia
                        </div>
                      )}
                    </div>

                    {onSelectTender && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectTender(t)}
                        className="w-full gap-1.5"
                        title="Lihat seluruh dokumen KAK, proposal teknis vendor, dan audit status di blockchain"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Detail Lelang &amp; Audit Dokumen</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* TAB 1: HASHER CALCULATOR */}
      {selectedTenderId && activeSubTab === 'hasher' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-status-reveal-bg text-status-reveal-text border border-status-reveal-border text-2xs font-bold uppercase tracking-wider">
                Langkah 1 dari 2
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-2xs text-slate-500 font-medium">Penyusunan Harga Rahasia (Off-Chain)</span>
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              1. Kalkulator Hash Keccak-256 (Sealed-Bid)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Fungsi ini menghitung <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">keccak256(abi.encodePacked(HargaIDR, KataSandi))</code> secara lokal pada peramban Anda.
              Nominal asli tidak pernah dikirim ke internet atau blockchain pada tahap ini.
            </p>
          </div>

          {/* Targeted Tender Info Banner */}
          {selectedCommitTender && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-control flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Paket Pengadaan
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                  #{selectedCommitTender.id} - {selectedCommitTender.namaProyek}
                </h4>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span>Pagu Anggaran: <strong className="text-slate-900">{formatIDR(selectedCommitTender.paguAnggaranIDR)}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Satuan Kerja: <strong className="text-slate-700">{selectedCommitTender.satuanKerja}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                <span className="text-2xs text-slate-500 font-medium mr-1">Rekomendasi Tawar:</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHasherHarga(String(Math.floor(selectedCommitTender.paguAnggaranIDR * 0.9)))}
                  className="h-7 px-2 text-2xs"
                >
                  90% Pagu
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHasherHarga(String(Math.floor(selectedCommitTender.paguAnggaranIDR * 0.85)))}
                  className="h-7 px-2 text-2xs"
                >
                  85% Pagu
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Preset Rekanan Uji Coba:</span>
            <Button variant="secondary" size="sm" onClick={() => loadPreset('vendorA')} className="h-7 px-2 text-2xs">
              Vendor A (Rp 920 Juta)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => loadPreset('vendorB')} className="h-7 px-2 text-2xs">
              Vendor B (Rp 850 Juta)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field
              label="Harga Penawaran Riil (Rupiah - IDR)"
              htmlFor="hasher-harga"
              hint={
                <span className="flex items-center justify-between gap-2">
                  <span>Terbaca: <strong className="text-slate-800">{formatIDR(hasherHarga)}</strong></span>
                  {selectedCommitTender && hasherHarga && (
                    Number(hasherHarga) > selectedCommitTender.paguAnggaranIDR ? (
                      <span className="text-status-danger-text font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Melebihi Pagu!
                      </span>
                    ) : (
                      <span className="text-status-done-text font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Di Bawah Pagu
                      </span>
                    )
                  )}
                </span>
              }
            >
              <input
                id="hasher-harga"
                type="text"
                value={hasherHarga}
                onChange={(e) => setHasherHarga(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 920000000"
                className="form-input font-mono"
              />
            </Field>

            <Field
              label="Kata Sandi Rahasia (Salt)"
              htmlFor="hasher-salt"
              hint="Simpan kata sandi ini! Anda wajib memasukkannya saat Fase Reveal."
            >
              <input
                id="hasher-salt"
                type="text"
                value={hasherSalt}
                onChange={(e) => setHasherSalt(e.target.value)}
                placeholder="Contoh: sandiVendorA123"
                className="form-input font-mono"
              />
            </Field>
          </div>

          <div className="rounded-card bg-slate-950 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 text-2xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-status-done-dot" />
                Hasil Hash Terkunci (bytes32)
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-2xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition"
              >
                {copiedHash ? <Check className="w-3 h-3 text-status-done-dot" /> : <Copy className="w-3 h-3" />}
                {copiedHash ? 'Tersalin!' : 'Salin Hash'}
              </button>
            </div>

            <div className="bg-black/40 p-3 rounded-control border border-slate-800 font-mono text-xs text-status-reveal-dot break-all select-all">
              {hasherResult || '— (Masukkan harga dan kata sandi di atas)'}
            </div>

            <p className="text-2xs text-slate-400 flex items-start gap-1.5">
              <Lock className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Hanya kode acak 64 karakter di atas yang akan tercatat di blockchain saat Anda mendaftar.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubTab('katalog')}
              className="gap-1.5 order-2 sm:order-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Katalog</span>
            </Button>
            <Button
              onClick={() => {
                setCommitHash(hasherResult);
                setActiveSubTab('commit');
              }}
              disabled={!hasherResult}
              className="gap-2 order-1 sm:order-2 w-full sm:w-auto"
              size="sm"
            >
              <span>Lanjut ke Langkah 2: Kirim Penawaran Terkunci</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 2: FASE 1 COMMIT */}
      {selectedTenderId && activeSubTab === 'commit' && (
        <Card as="form" onSubmit={handleSubmitCommit} className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-status-commit-bg text-status-commit-text border border-status-commit-border text-2xs font-bold uppercase tracking-wider">
                  Langkah 2 dari 2
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-2xs text-slate-500 font-medium">Transaksi On-Chain</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                2. Kirim Penawaran Terkunci (Fase Commit)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kirimkan hash harga dan tautan dokumen proposal teknis (IPFS) Anda ke Smart Contract Base Sepolia sebelum batas waktu pendaftaran berakhir.
              </p>
            </div>
            {commitTenderStatus && (
              <StatusPill tone={STATUS_TONE[commitTenderStatus.stage] || 'neutral'} className="shrink-0">
                {commitTenderStatus.label}
              </StatusPill>
            )}
          </div>

          {/* Step 2 Hash Status Banner */}
          <div className="bg-status-commit-bg border border-status-commit-border rounded-control p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-status-commit-dot text-white font-bold text-xs flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <div>
                <strong className="text-slate-900">Hash Penawaran dari Langkah 1:</strong>
                <div className="text-2xs text-slate-600 mt-0.5">
                  {commitHash || hasherResult ? (
                    <span>
                      Tersedia: <code className="font-mono bg-white/70 text-status-commit-text px-1 py-0.5 rounded">{(commitHash || hasherResult).slice(0, 18)}...</code> (Nilai riil: {formatIDR(hasherHarga)})
                    </span>
                  ) : (
                    <span className="text-status-reveal-text font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Anda belum membuat hash di Langkah 1 (Kalkulator Hash).
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('hasher')}
              className="text-2xs text-brand-700 hover:text-brand-900 font-semibold underline shrink-0 self-start sm:self-auto"
            >
              {commitHash || hasherResult ? "← Ubah Harga / Sandi di Langkah 1" : "Hitung di Langkah 1 Sekarang →"}
            </button>
          </div>

          {commitStatus && (
            <div className={`p-4 rounded-control text-xs flex items-start gap-2.5 border ${
              commitStatus.type === 'success'
                ? 'bg-status-done-bg text-status-done-text border-status-done-border'
                : 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
            }`}>
              {commitStatus.type === 'success'
                ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>{commitStatus.message}</div>
            </div>
          )}

          <div className="space-y-4">
            <Field label="Pilih Paket Tender" htmlFor="commit-tender">
              <select
                id="commit-tender"
                value={commitTenderId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCommitTenderId(id);
                  setSelectedTenderId(id);
                }}
                className="form-input"
              >
                {tenders.map(t => {
                  const st = getTenderStatus(t);
                  return (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.namaProyek} ({st.label})
                    </option>
                  );
                })}
              </select>
              {selectedCommitTender && (
                <div className="mt-2 text-2xs text-slate-600 bg-slate-50 p-2.5 rounded-control border border-slate-100 flex flex-wrap justify-between gap-2">
                  <span>Pagu Anggaran: <strong>{formatIDR(selectedCommitTender.paguAnggaranIDR)}</strong></span>
                  <span>Batas Commit: <strong>{new Date(selectedCommitTender.batasWaktuCommit * 1000).toLocaleTimeString('id-ID')}</strong></span>
                </div>
              )}
            </Field>

            <Field
              label="Nama Perusahaan (PT/CV Rekanan)"
              htmlFor="commit-vendor"
              required
              labelAction={<span className="text-2xs text-status-done-text font-medium">Terekam di Event Explorer</span>}
              hint="Identitas ini dipancarkan langsung ke tab Logs/Events Block Explorer agar auditor KPK & masyarakat dapat membaca nama PT Anda secara gamblang."
            >
              <input
                id="commit-vendor"
                type="text"
                value={commitVendorName}
                onChange={(e) => setCommitVendorName(e.target.value)}
                placeholder="Contoh: PT Maju Bersama / PT Karya Nusantara"
                className="form-input"
                required
              />
            </Field>

            <Field
              label="Hash Terkunci (bytes32 Keccak-256)"
              htmlFor="commit-hash"
              required
              labelAction={
                <button
                  type="button"
                  onClick={() => setCommitHash(hasherResult)}
                  className="text-2xs text-brand-700 hover:underline font-medium"
                >
                  Ambil dari Kalkulator
                </button>
              }
            >
              <input
                id="commit-hash"
                type="text"
                value={commitHash || hasherResult}
                onChange={(e) => setCommitHash(e.target.value)}
                placeholder="0x..."
                className="form-input font-mono"
                required
              />
            </Field>

            <IpfsUploadField
              label="Dokumen Proposal Teknis & Dokumen Penawaran Rekanan"
              value={commitIpfs}
              onChange={(val) => setCommitIpfs(val)}
              placeholder="ipfs://QmProposal..."
              helpText="Dokumen proposal asli di-pin ke IPFS. Hanya CID unik yang disetor ke Smart Contract Base Sepolia."
              required
            />
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {commitTenderStatus?.stage !== 'COMMIT' ? (
              <div className="text-xs text-status-reveal-text bg-status-reveal-bg px-3 py-1.5 rounded-control border border-status-reveal-border flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tender ini sedang tidak dalam Fase Commit.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Data penawaran Anda akan dicatat permanen di blockchain Base Sepolia.
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={commitTenderStatus?.stage !== 'COMMIT' || isCommitSubmitting}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isCommitSubmitting ? "Mengirim ke Blockchain..." : "Kirim Penawaran Terkunci"}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 3: FASE 2 REVEAL */}
      {selectedTenderId && activeSubTab === 'reveal' && (
        <Card as="form" onSubmit={handleSubmitReveal} className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-status-reveal-bg text-status-reveal-text border border-status-reveal-border text-2xs font-bold uppercase tracking-wider">
                  Fase Reveal
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                Fase 2: Pembukaan Harga (Reveal) &amp; Verifikasi Kejujuran
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan nominal harga asli dan kata sandi Anda. Smart Contract akan mencocokkan kembali keccak256 dengan hash komitmen awal Anda.
              </p>
            </div>
            {revealTenderStatus && (
              <StatusPill tone={STATUS_TONE[revealTenderStatus.stage] || 'neutral'} className="shrink-0">
                {revealTenderStatus.label}
              </StatusPill>
            )}
          </div>

          {revealStatus && (
            <div className={`p-4 rounded-control text-xs flex items-start gap-2.5 border ${
              revealStatus.type === 'success'
                ? 'bg-status-done-bg text-status-done-text border-status-done-border'
                : 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
            }`}>
              {revealStatus.type === 'success'
                ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>{revealStatus.message}</div>
            </div>
          )}

          <Field label="Pilih Paket Tender" htmlFor="reveal-tender">
            <select
              id="reveal-tender"
              value={revealTenderId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setRevealTenderId(id);
                setSelectedTenderId(id);
              }}
              className="form-input"
            >
              {tenders.map(t => {
                const st = getTenderStatus(t);
                return (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.namaProyek} ({st.label})
                  </option>
                );
              })}
            </select>
          </Field>

          <div className="bg-slate-50 border border-slate-200 rounded-control p-4 text-xs space-y-2">
            <div className="font-semibold text-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span>Status Pendaftaran Akun Anda ({currentAccount.name}):</span>
              {userExistingBid ? (
                userExistingBid.sudahReveal ? (
                  <span className="text-status-done-text font-medium">Sudah Dibuka ({formatIDR(userExistingBid.hargaTerbukaIDR)})</span>
                ) : (
                  <span className="text-status-commit-text font-medium">Terdaftar di Fase Commit (Belum Reveal)</span>
                )
              ) : (
                <span className="text-slate-400">Belum Mengirim Commit</span>
              )}
            </div>

            {userExistingBid && (
              <div className="font-mono text-2xs text-slate-500 bg-white p-2.5 rounded-control border border-slate-200 break-all">
                Hash Terkunci di Blockchain: <span className="text-slate-900 font-semibold">{userExistingBid.hashTerkunci}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Harga Asli yang Ditawarkan (IDR)" htmlFor="reveal-harga" required>
              <input
                id="reveal-harga"
                type="text"
                value={revealHarga}
                onChange={(e) => setRevealHarga(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 920000000"
                className="form-input font-mono"
                required
              />
              <span className="text-2xs text-slate-500 mt-1 block">
                Terbaca: <strong>{formatIDR(revealHarga)}</strong>
              </span>
            </Field>

            <Field label="Kata Sandi Rahasia (Salt)" htmlFor="reveal-salt" required>
              <input
                id="reveal-salt"
                type="text"
                value={revealSalt}
                onChange={(e) => setRevealSalt(e.target.value)}
                placeholder="Contoh: sandiVendorA123"
                className="form-input font-mono"
                required
              />
            </Field>
          </div>

          {/* Quick autofill from Local Vault */}
          {(userExistingBid?.saltDisimpan || getVendorBidLocal(revealTenderId, currentAccount.address)?.salt) && (
            <div className="flex items-center justify-between gap-2 bg-status-commit-bg border border-status-commit-border rounded-control p-2.5 text-xs text-slate-700">
              <span>Tersedia data penawaran tersimpan di Brankas Lokal peramban Anda.</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-2xs shrink-0"
                onClick={() => {
                  const saved = getVendorBidLocal(revealTenderId, currentAccount.address);
                  const price = userExistingBid?.hargaDisimpan || saved?.harga;
                  const salt = userExistingBid?.saltDisimpan || saved?.salt;
                  if (price) setRevealHarga(String(price));
                  if (salt) setRevealSalt(salt);
                }}
              >
                Auto-Isi dari Brankas
              </Button>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {revealTenderStatus?.stage !== 'REVEAL' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-status-reveal-text flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Tender saat ini belum/tidak dalam Fase Reveal.
                </span>
                {mode === 'simulation' && (
                  <button
                    type="button"
                    onClick={() => jumpToPhase(revealTenderId, 'reveal')}
                    className="text-2xs text-brand-700 hover:underline font-medium"
                  >
                    Lompatkan Waktu Simulasi ke Reveal &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Pencocokan hash Keccak-256 dieksekusi on-chain di Base Sepolia.
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={revealTenderStatus?.stage !== 'REVEAL' || isRevealSubmitting}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{isRevealSubmitting ? "Memverifikasi di Blockchain..." : "Buka Penawaran (Reveal)"}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 4: MY LOCAL VAULT */}
      {activeSubTab === 'vault' && (
        <Card className="p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Archive className="w-4 h-4 text-brand-600" />
              <span>Brankas Rahasia Lokal Rekanan (Encrypted Client Vault)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Daftar komitmen penawaran yang pernah Anda buat di peramban ini. Kata sandi rahasia disimpan di penyimpanan lokal
              agar Anda tidak lupa saat jadwal pembukaan harga (Fase Reveal) tiba.
            </p>
          </div>

          {vaultBids.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="Brankas Lokal Masih Kosong"
              description="Belum ada data penawaran tersimpan di brankas lokal. Kirim penawaran terkunci pada menu Fase Commit untuk mulai menyimpan."
            />
          ) : (
            <div className="space-y-3">
              {vaultBids.map((b, idx) => (
                <div key={idx} className="bg-white p-4 rounded-card border border-slate-200 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1 text-xs min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{b.namaProyek}</div>
                    <div className="text-slate-600">
                      Harga Asli: <strong className="text-slate-900">{formatIDR(b.harga)}</strong> • Kata Sandi:{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">{b.salt}</code>
                    </div>
                    <div className="font-mono text-2xs text-slate-400 truncate max-w-md">
                      Hash: {b.hash}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setSelectedTenderId(b.tenderId);
                      setRevealTenderId(b.tenderId);
                      setRevealHarga(String(b.harga));
                      setRevealSalt(b.salt);
                      setActiveSubTab('reveal');
                    }}
                  >
                    Buka di Fase Reveal
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: ANTI-CHEAT TEST */}
      {activeSubTab === 'anticheat' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-status-danger-dot" />
              <h3 className="font-semibold text-slate-900 text-base">
                Simulasi Uji Coba Vendor Curang (Anti-Cheating Test)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Misalkan seorang rekanan yang awalnya mengunci penawaran Rp 920.000.000 mencoba berbuat curang saat fase Reveal dengan mengaku menawar Rp 800.000.000 agar menang lelang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-card p-4 text-xs space-y-2">
              <div className="font-semibold text-slate-800">1. Data Komitmen Asli Vendor (Fase Commit):</div>
              <ul className="space-y-1 text-slate-600">
                <li>• Harga Terkunci: <strong>Rp 920.000.000</strong></li>
                <li>• Kata Sandi: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">sandiVendorA123</code></li>
                <li>• Hash Tersimpan di Smart Contract:</li>
              </ul>
              <div className="bg-white p-2 rounded-control border border-slate-200 font-mono text-2xs text-slate-700 break-all">
                {generateCommitHash(920000000, "sandiVendorA123")}
              </div>
            </div>

            <div className="bg-status-danger-bg border border-status-danger-border rounded-card p-4 text-xs space-y-2">
              <div className="font-semibold text-status-danger-text">2. Upaya Manipulasi Saat Reveal:</div>
              <ul className="space-y-1 text-status-danger-text">
                <li>• Harga yang Dicoba Disetor: <strong>Rp 800.000.000 (Palsu)</strong></li>
                <li>• Kata Sandi: <code className="bg-white px-1 py-0.5 rounded border border-status-danger-border">sandiVendorA123</code></li>
                <li>• Hash Baru yang Dihitung Smart Contract:</li>
              </ul>
              <div className="bg-white p-2 rounded-control border border-status-danger-border font-mono text-2xs text-status-danger-text break-all">
                {generateCommitHash(800000000, "sandiVendorA123")}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 text-white p-4 rounded-card text-xs space-y-2 border border-slate-800">
            <div className="font-semibold text-status-reveal-dot">Hasil Evaluasi Smart Contract (Solidity):</div>
            <pre className="bg-black/40 p-3 rounded-control border border-slate-800 font-mono text-2xs text-status-done-dot overflow-x-auto">
{`bytes32 buktiHash = keccak256(abi.encodePacked(_hargaAsliIDR, _kataSandiRahasia));
require(
    buktiHash == p.hashTerkunci,
    "DISKUALIFIKASI: Harga atau Kata Sandi tidak cocok dengan Hash yang dikunci di awal!"
);`}
            </pre>
            <p className="text-slate-300 text-2xs">
              Perbedaan 1 Rupiah saja membuat seluruh hash berubah total (*avalanche effect*), sehingga manipulasi tertolak secara mutlak!
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
