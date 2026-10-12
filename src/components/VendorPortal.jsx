import React, { useState, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import { 
  generateCommitHash, 
  formatIDR, 
  truncateAddress,
  formatDuration,
  SIMULATED_ACCOUNTS 
} from '../utils/crypto';
import { IpfsUploadField } from './IpfsUploadField';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import { 
  KeyRound, 
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
  Layers,
  Archive,
  Search,
  Building,
  Clock,
  ExternalLink,
  Trophy,
  CheckCircle2
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
    getVendorBidLocal
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

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar text-xs sm:text-sm font-medium pb-0.5">
        <button
          onClick={() => setActiveSubTab('katalog')}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'katalog' 
              ? 'border-blue-600 text-blue-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Katalog Lelang Pengadaan</span>
        </button>

        <button
          onClick={() => selectedTenderId ? setActiveSubTab('hasher') : null}
          disabled={!selectedTenderId}
          title={!selectedTenderId ? "Pilih salah satu paket pengadaan di Katalog terlebih dahulu agar alur tidak berantakan" : "1. Kalkulator Hash Keccak-256"}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
            !selectedTenderId 
              ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
              : activeSubTab === 'hasher' 
                ? 'border-amber-500 text-amber-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>1. Kalkulator Hash Keccak-256</span>
          {!selectedTenderId && <Lock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => selectedTenderId ? setActiveSubTab('commit') : null}
          disabled={!selectedTenderId}
          title={!selectedTenderId ? "Pilih salah satu paket pengadaan di Katalog terlebih dahulu agar alur tidak berantakan" : "2. Kirim Penawaran Terkunci (Fase Commit)"}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
            !selectedTenderId 
              ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
              : activeSubTab === 'commit' 
                ? 'border-sky-600 text-sky-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-sky-600" />
          <span>2. Kirim Penawaran Terkunci (Fase Commit)</span>
          {!selectedTenderId && <Lock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => selectedTenderId ? setActiveSubTab('reveal') : null}
          disabled={!selectedTenderId}
          title={!selectedTenderId ? "Pilih salah satu paket pengadaan di Katalog terlebih dahulu agar alur tidak berantakan" : "3. Buka Penawaran (Fase Reveal)"}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
            !selectedTenderId 
              ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
              : activeSubTab === 'reveal' 
                ? 'border-amber-600 text-amber-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Unlock className="w-4 h-4 text-amber-600" />
          <span>3. Buka Penawaran (Fase Reveal)</span>
          {!selectedTenderId && <Lock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => setActiveSubTab('vault')}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'vault' 
              ? 'border-emerald-600 text-emerald-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Archive className="w-4 h-4 text-emerald-600" />
          <span>Brankas Rahasia Lokal ({vaultBids.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('anticheat')}
          className={`pb-2.5 pt-1 px-3 sm:px-3.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'anticheat' 
              ? 'border-rose-600 text-rose-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Uji Coba Anti-Curang</span>
        </button>
      </div>

      {/* Selected Tender Context Banner */}
      {selectedTender && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/90 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              #{selectedTender.id}
            </span>
            <div>
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Paket Pengadaan Terpilih:</span>
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {selectedTender.namaProyek}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Satuan Kerja: <strong className="text-slate-700">{selectedTender.satuanKerja}</strong></span>
                <span>•</span>
                <span>Pagu Anggaran: <strong className="text-slate-800">{formatIDR(selectedTender.paguAnggaranIDR)}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('katalog')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg text-xs shadow-xs transition self-start sm:self-center shrink-0 flex items-center gap-1.5"
            title="Kembali ke katalog untuk memilih paket pengadaan lain"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Pilih Pengadaan Lain di Katalog</span>
          </button>
        </div>
      )}

      {/* Guard jika user belum memilih paket tender tapi berada di menu alur 1, 2, atau 3 */}
      {!selectedTenderId && (activeSubTab === 'hasher' || activeSubTab === 'commit' || activeSubTab === 'reveal') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-bold text-slate-900 text-base">Pilih Paket Pengadaan Terlebih Dahulu</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menu 1. Kalkulator Hash, 2. Kirim Penawaran Terkunci, dan 3. Buka Penawaran memerlukan paket lelang yang dipilih dari katalog agar proses kriptografi Keccak-256 dan pencatatan smart contract terarah.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('katalog')}
              className="btn-primary text-xs bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buka Katalog Lelang Pengadaan</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 0: KATALOG LELANG UNTUK VENDOR */}
      {activeSubTab === 'katalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari lelang terbuka..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              Daftar lelang resmi pemerintah yang sedang berlangsung di Smart Contract
            </div>
          </div>

          {catalogTenders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Briefcase className="w-7 h-7 text-blue-500" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-bold text-slate-900 text-base">Belum Ada Lelang Terbuka di Kontrak Ini</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tidak ditemukan paket tender pada Smart Contract yang sedang terhubung: <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{truncateAddress(deployedContractAddress)}</code>
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-lg mx-auto text-left space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tips Menghubungkan Kontrak Lelang Pemerintah:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Pastikan akun vendor terhubung ke <strong>alamat Smart Contract yang sama</strong> dengan yang digunakan oleh Panitia Pemerintah. Jika Panitia mendeply lelang di kontrak lain, salin alamat kontrak tersebut, klik tombol <strong>"Ganti Kontrak"</strong> di bilah atas, lalu tempelkan dan klik <strong>"Hubungkan"</strong>.
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => syncContractData()}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Sinkronkan Ulang
                  </button>
                </div>
              </div>
            </div>
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
                <div key={t.id} className={`bg-white rounded-xl border transition shadow-sm flex flex-col justify-between overflow-hidden ${isWinner ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-200/90 hover:border-slate-300'}`}>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{t.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.badge} flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                        <span>{st.label}</span>
                      </span>
                    </div>

                    <div>
                      <h3 
                        onClick={() => onSelectTender && onSelectTender(t)}
                        className={`font-bold text-slate-900 text-sm leading-snug line-clamp-2 ${onSelectTender ? 'cursor-pointer hover:text-blue-600 transition' : ''}`}
                        title="Klik untuk membuka rincian tender & dokumen lelang"
                      >
                        {t.namaProyek}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{t.satuanKerja}</span>
                      </p>
                    </div>

                    {t.ipfsDokumenKAK && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-blue-50/60 px-2.5 py-1.5 rounded-lg border border-blue-100/80">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          Dokumen KAK Pemerintah:
                        </span>
                        <a
                          href={formatIpfsGatewayUrl(t.ipfsDokumenKAK)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-mono flex items-center gap-1 font-semibold text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                          title={`Buka Dokumen KAK: ${t.ipfsDokumenKAK}`}
                        >
                          <span>Buka via IPFS</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pagu Anggaran:</span>
                        <span className="font-bold text-slate-900 tabular-nums">{formatIDR(t.paguAnggaranIDR)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Status Anda:</span>
                        {isWinner ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            MENANG TENDER ({formatIDR(t.penawaranTerendahIDR)})
                          </span>
                        ) : st.stage === 'COMPLETED' ? (
                          myBid ? (
                            myBid.sudahReveal ? (
                              <span className="font-medium text-slate-600">Kalah (Pemenang: {truncateAddress(t.pemenang)})</span>
                            ) : (
                              <span className="font-semibold text-rose-600">Gugur (Tidak Reveal)</span>
                            )
                          ) : (
                            <span className="text-slate-400">Tidak Berpartisipasi</span>
                          )
                        ) : myBid ? (
                          myBid.sudahReveal ? (
                            <span className="font-semibold text-emerald-700">Sudah Buka ({formatIDR(myBid.hargaTerbukaIDR)})</span>
                          ) : (
                            <span className="font-semibold text-sky-700" title="Penawaran rahasia terdaftar di blockchain, menunggu fase reveal">
                              Terkunci (Belum Reveal)
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">Belum Berpartisipasi</span>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      {st.stage === 'COMMIT' && (
                        <span className="text-sky-700 font-mono">Commit ditutup dlm: {formatDuration(commitLeft)}</span>
                      )}
                      {st.stage === 'REVEAL' && (
                        <span className="text-amber-700 font-mono">Reveal ditutup dlm: {formatDuration(revealLeft)}</span>
                      )}
                      {st.stage === 'COMPLETED' && (
                        hasWinner ? (
                          <span className="text-emerald-700 font-semibold">Tender Selesai (Ada Pemenang)</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Tender Selesai (Tanpa Pemenang)</span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {st.stage === 'COMMIT' && (
                        <button
                          onClick={() => handleSelectTenderForFlow(t, 'hasher')}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
                          title="Pilih lelang ini dan mulai proses pengiriman penawaran dari Langkah 1 (Kalkulator Hash)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Kirim Penawaran Tersegel</span>
                        </button>
                      )}

                      {st.stage === 'REVEAL' && (
                        <button
                          onClick={() => handleSelectTenderForFlow(t, 'reveal')}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
                          title="Pilih lelang ini dan buka harga penawaran di Fase Reveal"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Penawaran (Reveal)</span>
                        </button>
                      )}

                      {st.stage === 'COMPLETED' && (
                        isWinner ? (
                          <div className="w-full bg-emerald-500 text-white rounded-lg py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                            <Trophy className="w-4 h-4 text-amber-300" />
                            <span>SELAMAT! Anda Ditetapkan Sebagai Pemenang</span>
                          </div>
                        ) : myBid && !myBid.sudahReveal ? (
                          <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-lg py-1.5 px-2 text-center text-[11px] font-medium">
                            ⚠️ Penawaran Gugur: Tidak Dibuka pada Fase Reveal
                          </div>
                        ) : !hasWinner ? (
                          <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-lg py-1.5 px-2 text-center text-[11px] font-medium">
                            Tender Selesai Tanpa Pemenang Sah (Gugur)
                          </div>
                        ) : (
                          <div className="w-full text-center text-xs text-slate-500 py-1 font-medium">
                            Pengadaan Resmi Selesai
                          </div>
                        )
                      )}

                      {st.stage === 'AWAITING_LOCK' && (
                        <div className="w-full text-center text-xs text-slate-500 py-1 font-medium">
                          Menunggu Pengesahan Panitia
                        </div>
                      )}
                    </div>

                    {onSelectTender && (
                      <button
                        type="button"
                        onClick={() => onSelectTender(t)}
                        className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition flex items-center justify-center gap-1.5"
                        title="Lihat seluruh dokumen KAK, proposal teknis vendor, dan audit status di blockchain"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Detail Lelang & Audit Dokumen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* TAB 1: HASHER CALCULATOR */}
      {selectedTenderId && activeSubTab === 'hasher' && (
        <div className="mini-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                Langkah 1 dari 2
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-slate-500 font-medium">Penyusunan Harga Rahasia (Off-Chain)</span>
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
            <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-blue-50/80 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Target Paket Pengadaan:
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                  #{selectedCommitTender.id} - {selectedCommitTender.namaProyek}
                </h4>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span>Pagu Anggaran Pemerintah: <strong className="text-slate-900">{formatIDR(selectedCommitTender.paguAnggaranIDR)}</strong></span>
                  <span>•</span>
                  <span>Satuan Kerja: <strong>{selectedCommitTender.satuanKerja}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                <span className="text-[10px] text-slate-500 font-medium mr-1">Rekomendasi Tawar:</span>
                <button
                  type="button"
                  onClick={() => setHasherHarga(String(Math.floor(selectedCommitTender.paguAnggaranIDR * 0.9)))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                >
                  90% Pagu
                </button>
                <button
                  type="button"
                  onClick={() => setHasherHarga(String(Math.floor(selectedCommitTender.paguAnggaranIDR * 0.85)))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                >
                  85% Pagu
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Preset Rekanan Uji Coba:</span>
            <button
              onClick={() => loadPreset('vendorA')}
              className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition"
            >
              Vendor A (Rp 920 Juta)
            </button>
            <button
              onClick={() => loadPreset('vendorB')}
              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition"
            >
              Vendor B (Rp 850 Juta)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Harga Penawaran Riil (Rupiah - IDR)
              </label>
              <input
                type="text"
                value={hasherHarga}
                onChange={(e) => setHasherHarga(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 920000000"
                className="form-input text-sm font-mono"
              />
              <div className="flex items-center justify-between text-[11px] mt-1.5">
                <span className="text-slate-500">
                  Terbaca: <strong className="text-slate-800">{formatIDR(hasherHarga)}</strong>
                </span>
                {selectedCommitTender && hasherHarga && (
                  Number(hasherHarga) > selectedCommitTender.paguAnggaranIDR ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Melebihi Pagu!
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Di Bawah Pagu
                    </span>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi Rahasia (*Salt*)
              </label>
              <input
                type="text"
                value={hasherSalt}
                onChange={(e) => setHasherSalt(e.target.value)}
                placeholder="Contoh: sandiVendorA123"
                className="form-input text-sm font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Simpan kata sandi ini! Anda wajib memasukkannya saat Fase Reveal.
              </span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Hasil Hash Terkunci (bytes32):
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedHash ? "Tersalin!" : "Salin Hash"}
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-300 break-all select-all">
              {hasherResult || "— (Masukkan harga dan kata sandi di atas)"}
            </div>

            <p className="text-[11px] text-slate-400">
              🔒 Hanya kode acak 64 karakter di atas yang akan tercatat di blockchain saat Anda mendaftar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveSubTab('katalog')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium order-2 sm:order-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Katalog Lelang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCommitHash(hasherResult);
                setActiveSubTab('commit');
              }}
              disabled={!hasherResult}
              className="btn-primary text-xs flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center"
            >
              <span>Lanjut ke Langkah 2: Kirim Penawaran Terkunci</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: FASE 1 COMMIT */}
      {selectedTenderId && activeSubTab === 'commit' && (
        <form onSubmit={handleSubmitCommit} className="mini-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider">
                  Langkah 2 dari 2
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs text-slate-500 font-medium">Transaksi On-Chain</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                2. Kirim Penawaran Terkunci (Fase Commit)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kirimkan hash harga dan tautan dokumen proposal teknis (IPFS) Anda ke Smart Contract Base Sepolia sebelum batas waktu pendaftaran berakhir.
              </p>
            </div>
            {commitTenderStatus && (
              <span className={`badge-chip ${commitTenderStatus.badge} text-[10px]`}>
                {commitTenderStatus.label}
              </span>
            )}
          </div>

          {/* Step 2 Hash Status Banner */}
          <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                ✓
              </span>
              <div>
                <strong className="text-slate-900">Hash Penawaran dari Langkah 1:</strong>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {commitHash || hasherResult ? (
                    <span>
                      Tersedia: <code className="font-mono bg-sky-100 text-sky-900 px-1 py-0.5 rounded text-[10px]">{(commitHash || hasherResult).slice(0, 18)}...</code> (Nilai riil: {formatIDR(hasherHarga)})
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">⚠️ Anda belum membuat hash di Langkah 1 (Kalkulator Hash).</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('hasher')}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold underline shrink-0 self-start sm:self-auto"
            >
              {commitHash || hasherResult ? "← Ubah Harga / Sandi di Langkah 1" : "Hitung di Langkah 1 Sekarang →"}
            </button>
          </div>

          {commitStatus && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${commitStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {commitStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />}
              <div>{commitStatus.message}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Paket Tender
              </label>
              <select
                value={commitTenderId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCommitTenderId(id);
                  setSelectedTenderId(id);
                }}
                className="form-input text-xs sm:text-sm"
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
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 flex justify-between">
                  <span>Pagu Anggaran: <strong>{formatIDR(selectedCommitTender.paguAnggaranIDR)}</strong></span>
                  <span>Batas Waktu Commit: <strong>{new Date(selectedCommitTender.batasWaktuCommit * 1000).toLocaleTimeString('id-ID')}</strong></span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Nama Perusahaan (PT/CV Rekanan)</span>
                <span className="text-[10px] text-emerald-600 font-medium">Terekam di Event Explorer</span>
              </label>
              <input
                type="text"
                value={commitVendorName}
                onChange={(e) => setCommitVendorName(e.target.value)}
                placeholder="Contoh: PT Maju Bersama / PT Karya Nusantara"
                className="form-input text-xs sm:text-sm"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Identitas ini dipancarkan langsung ke tab <em>Logs/Events</em> Block Explorer agar auditor KPK & masyarakat dapat membaca nama PT Anda secara gamblang.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Hash Terkunci (bytes32 Keccak-256)
                </label>
                <button
                  type="button"
                  onClick={() => setCommitHash(hasherResult)}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  Ambil dari Kalkulator
                </button>
              </div>
              <input
                type="text"
                value={commitHash || hasherResult}
                onChange={(e) => setCommitHash(e.target.value)}
                placeholder="0x..."
                className="form-input text-xs font-mono"
                required
              />
            </div>

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
              <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Tender ini sedang tidak dalam Fase Commit.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Data penawaran Anda akan dicatat permanen di blockchain Base Sepolia.
              </div>
            )}

            <button
              type="submit"
              disabled={commitTenderStatus?.stage !== 'COMMIT' || isCommitSubmitting}
              className="btn-primary text-xs w-full sm:w-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isCommitSubmitting ? "Mengirim ke Blockchain..." : "Kirim Penawaran Terkunci"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: FASE 2 REVEAL */}
      {selectedTenderId && activeSubTab === 'reveal' && (
        <form onSubmit={handleSubmitReveal} className="mini-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Fase 2: Pembukaan Harga (Reveal) & Verifikasi Kejujuran
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan nominal harga asli dan kata sandi Anda. Smart Contract akan mencocokkan kembali keccak256 dengan hash komitmen awal Anda.
              </p>
            </div>
            {revealTenderStatus && (
              <span className={`badge-chip ${revealTenderStatus.badge} text-[10px]`}>
                {revealTenderStatus.label}
              </span>
            )}
          </div>

          {revealStatus && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${revealStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {revealStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />}
              <div>{revealStatus.message}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Paket Tender
            </label>
            <select
              value={revealTenderId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setRevealTenderId(id);
                setSelectedTenderId(id);
              }}
              className="form-input text-xs sm:text-sm"
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
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Status Pendaftaran Akun Anda ({currentAccount.name}):</span>
              {userExistingBid ? (
                userExistingBid.sudahReveal ? (
                  <span className="text-emerald-700 font-medium">Sudah Dibuka ({formatIDR(userExistingBid.hargaTerbukaIDR)})</span>
                ) : (
                  <span className="text-sky-700 font-medium">Terdaftar di Fase Commit (Belum Reveal)</span>
                )
              ) : (
                <span className="text-slate-400">Belum Mengirim Commit</span>
              )}
            </div>

            {userExistingBid && (
              <div className="font-mono text-[11px] text-slate-500 bg-white p-2.5 rounded border border-slate-200 break-all">
                Hash Terkunci di Blockchain: <span className="text-slate-900 font-semibold">{userExistingBid.hashTerkunci}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Harga Asli yang Ditawarkan (IDR)
              </label>
              <input
                type="text"
                value={revealHarga}
                onChange={(e) => setRevealHarga(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 920000000"
                className="form-input text-sm font-mono"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Terbaca: <strong>{formatIDR(revealHarga)}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi Rahasia (*Salt*)
              </label>
              <input
                type="text"
                value={revealSalt}
                onChange={(e) => setRevealSalt(e.target.value)}
                placeholder="Contoh: sandiVendorA123"
                className="form-input text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* Quick autofill from Local Vault */}
          {(userExistingBid?.saltDisimpan || getVendorBidLocal(revealTenderId, currentAccount.address)?.salt) && (
            <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900">
              <span>Tersedia data penawaran tersimpan di Brankas Lokal peramban Anda.</span>
              <button
                type="button"
                onClick={() => {
                  const saved = getVendorBidLocal(revealTenderId, currentAccount.address);
                  const price = userExistingBid?.hargaDisimpan || saved?.harga;
                  const salt = userExistingBid?.saltDisimpan || saved?.salt;
                  if (price) setRevealHarga(String(price));
                  if (salt) setRevealSalt(salt);
                }}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px]"
              >
                Auto-Isi dari Brankas
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {revealTenderStatus?.stage !== 'REVEAL' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700">Tender saat ini belum/tidak dalam Fase Reveal.</span>
                {mode === 'simulation' && (
                  <button
                    type="button"
                    onClick={() => jumpToPhase(revealTenderId, 'reveal')}
                    className="text-xs text-blue-600 hover:underline font-medium"
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

            <button
              type="submit"
              disabled={revealTenderStatus?.stage !== 'REVEAL' || isRevealSubmitting}
              className="btn-primary text-xs w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{isRevealSubmitting ? "Memverifikasi di Blockchain..." : "Buka Penawaran (Reveal)"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: MY LOCAL VAULT */}
      {activeSubTab === 'vault' && (
        <div className="mini-card p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-600" />
              <span>Brankas Rahasia Lokal Rekanan (Encrypted Client Vault)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Daftar komitmen penawaran yang pernah Anda buat di peramban ini. Kata sandi rahasia disimpan di penyimpanan lokal 
              agar Anda tidak lupa saat jadwal pembukaan harga (Fase Reveal) tiba.
            </p>
          </div>

          {vaultBids.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
              Belum ada data penawaran tersimpan di brankas lokal. Kirim penawaran terkunci pada menu Fase 1 untuk mulai menyimpan.
            </div>
          ) : (
            <div className="space-y-3">
              {vaultBids.map((b, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm">{b.namaProyek}</div>
                    <div className="text-slate-600">
                      Harga Asli: <strong className="text-slate-900">{formatIDR(b.harga)}</strong> • Kata Sandi: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">{b.salt}</code>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 truncate max-w-md">
                      Hash: {b.hash}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTenderId(b.tenderId);
                      setRevealTenderId(b.tenderId);
                      setRevealHarga(String(b.harga));
                      setRevealSalt(b.salt);
                      setActiveSubTab('reveal');
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shrink-0 transition"
                  >
                    Buka di Fase Reveal
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANTI-CHEAT TEST */}
      {activeSubTab === 'anticheat' && (
        <div className="mini-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <h3 className="font-semibold text-slate-900 text-base">
                Simulasi Uji Coba Vendor Curang (Anti-Cheating Test)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Misalkan seorang rekanan yang awalnya mengunci penawaran Rp 920.000.000 mencoba berbuat curang saat fase Reveal dengan mengaku menawar Rp 800.000.000 agar menang lelang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-semibold text-slate-800">1. Data Komitmen Asli Vendor (Fase Commit):</div>
              <ul className="space-y-1 text-slate-600">
                <li>• Harga Terkunci: <strong>Rp 920.000.000</strong></li>
                <li>• Kata Sandi: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">sandiVendorA123</code></li>
                <li>• Hash Tersimpan di Smart Contract:</li>
              </ul>
              <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[10px] text-slate-700 break-all">
                {generateCommitHash(920000000, "sandiVendorA123")}
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-semibold text-rose-900">2. Upaya Manipulasi Saat Reveal:</div>
              <ul className="space-y-1 text-rose-800">
                <li>• Harga yang Dicoba Disetor: <strong className="text-rose-700">Rp 800.000.000 (Palsu)</strong></li>
                <li>• Kata Sandi: <code className="bg-white px-1 py-0.5 rounded border border-rose-200">sandiVendorA123</code></li>
                <li>• Hash Baru yang Dihitung Smart Contract:</li>
              </ul>
              <div className="bg-white p-2 rounded border border-rose-200 font-mono text-[10px] text-rose-700 break-all">
                {generateCommitHash(800000000, "sandiVendorA123")}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2">
            <div className="font-semibold text-amber-400">Hasil Evaluasi Smart Contract (Solidity):</div>
            <pre className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`bytes32 buktiHash = keccak256(abi.encodePacked(_hargaAsliIDR, _kataSandiRahasia));
require(
    buktiHash == p.hashTerkunci,
    "DISKUALIFIKASI: Harga atau Kata Sandi tidak cocok dengan Hash yang dikunci di awal!"
);`}
            </pre>
            <p className="text-slate-300 text-[11px]">
              Perbedaan 1 Rupiah saja membuat seluruh hash berubah total (*avalanche effect*), sehingga manipulasi tertolak secara mutlak!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
