import React, { useState, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import { 
  formatIDR, 
  truncateAddress, 
  formatDuration 
} from '../utils/crypto';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import { 
  X, 
  Clock, 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  Building,
  FastForward,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

import { ethers } from 'ethers';

export function TenderDetailModal({ tender, onClose, onOpenVendorModal }) {
  const { 
    currentTime, 
    getTenderStatus, 
    currentAccount, 
    kunciPemenangTender,
    jumpToPhase,
    mode,
    isOwner,
    contractOwner,
    syncContractData,
    isSyncing,
    deployedContractAddress
  } = useTender();

  const [isLocking, setIsLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [asyncBids, setAsyncBids] = useState([]);

  if (!tender) return null;

  const status = getTenderStatus(tender);
  const commitTimeLeft = Math.max(0, (tender.batasWaktuCommit || 0) - currentTime);
  const revealTimeLeft = Math.max(0, (tender.batasWaktuReveal || 0) - currentTime);

  const rawBids = tender?.penawaran ? Object.values(tender.penawaran) : [];

  // Directly fetch real on-chain participant and winner bids from smart contract
  useEffect(() => {
    let isCancelled = false;
    async function fetchOnChainBids() {
      if (mode !== 'web3' || !tender?.id || !deployedContractAddress) return;
      try {
        const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
        const abi = [
          'function lihatTotalPeserta(uint256) view returns (uint256)',
          'function daftarPesertaTender(uint256, uint256) view returns (address)',
          'function dataPenawaran(uint256, address) view returns (bytes32 hashTerkunci, string ipfsProposalTeknis, uint256 hargaTerbukaIDR, bool sudahCommit, bool sudahReveal, bool memenuhiSyaratPagu)'
        ];
        const contract = new ethers.Contract(deployedContractAddress, abi, provider);
        
        const fetchedList = [];
        const seenAddrs = new Set();

        // 1. Fetch winner bid directly if tender already has a winner
        if (tender.pemenang && tender.pemenang !== ethers.ZeroAddress) {
          try {
            const raw = await contract.dataPenawaran(tender.id, tender.pemenang);
            const sudahCommit = Boolean(raw.sudahCommit !== undefined ? raw.sudahCommit : raw[3]);
            if (sudahCommit) {
              seenAddrs.add(tender.pemenang.toLowerCase());
              fetchedList.push({
                vendorAddress: tender.pemenang,
                vendorName: tender.namaPerusahaanPemenang || `Vendor Pemenang (${truncateAddress(tender.pemenang)})`,
                hashTerkunci: raw.hashTerkunci || raw[0],
                ipfsProposalTeknis: raw.ipfsProposalTeknis || raw[1] || '',
                hargaTerbukaIDR: Number(raw.hargaTerbukaIDR !== undefined ? raw.hargaTerbukaIDR : raw[2]),
                sudahCommit: true,
                sudahReveal: Boolean(raw.sudahReveal !== undefined ? raw.sudahReveal : raw[4]),
                memenuhiSyaratPagu: Boolean(raw.memenuhiSyaratPagu !== undefined ? raw.memenuhiSyaratPagu : raw[5])
              });
            }
          } catch (e) {}
        }

        // 2. Fetch all participants via daftarPesertaTender
        try {
          const totalBn = await contract.lihatTotalPeserta(tender.id);
          const totalNum = Number(totalBn);
          for (let idx = 0; idx < totalNum; idx++) {
            const pAddr = await contract.daftarPesertaTender(tender.id, idx);
            if (pAddr && pAddr !== ethers.ZeroAddress && !seenAddrs.has(pAddr.toLowerCase())) {
              seenAddrs.add(pAddr.toLowerCase());
              const raw = await contract.dataPenawaran(tender.id, pAddr);
              const sudahCommit = Boolean(raw.sudahCommit !== undefined ? raw.sudahCommit : raw[3]);
              if (sudahCommit) {
                fetchedList.push({
                  vendorAddress: pAddr,
                  vendorName: `Vendor Rekanan (${truncateAddress(pAddr)})`,
                  hashTerkunci: raw.hashTerkunci || raw[0],
                  ipfsProposalTeknis: raw.ipfsProposalTeknis || raw[1] || '',
                  hargaTerbukaIDR: Number(raw.hargaTerbukaIDR !== undefined ? raw.hargaTerbukaIDR : raw[2]),
                  sudahCommit: true,
                  sudahReveal: Boolean(raw.sudahReveal !== undefined ? raw.sudahReveal : raw[4]),
                  memenuhiSyaratPagu: Boolean(raw.memenuhiSyaratPagu !== undefined ? raw.memenuhiSyaratPagu : raw[5])
                });
              }
            }
          }
        } catch (e) {}

        if (!isCancelled && fetchedList.length > 0) {
          setAsyncBids(fetchedList);
        }
      } catch (err) {
        console.warn("fetchOnChainBids error:", err);
      }
    }

    fetchOnChainBids();
    return () => { isCancelled = true; };
  }, [tender?.id, tender?.pemenang, mode, deployedContractAddress]);

  // Use rawBids from context if available, otherwise use freshly fetched on-chain bids
  const bids = rawBids.length > 0 ? rawBids : asyncBids;

  const handleKunciPemenang = async () => {
    setErrorMsg(null);
    try {
      setIsLocking(true);
      await kunciPemenangTender(tender.id);
    } catch (e) {
      setErrorMsg(e.reason || e.message || "Gagal mengunci pemenang.");
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Tender #{tender.id}
              </span>
              <span className={`badge-chip ${status.badge} text-[10px]`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                {status.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {tender.namaProyek}
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{tender.satuanKerja || "Panitia Pengadaan Pemerintah"}</span>
              <span>•</span>
              <span>{tender.kategori}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] text-slate-500 font-medium">Pagu Anggaran Maksimal:</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatIDR(tender.paguAnggaranIDR)}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] text-slate-500 font-medium">Penawaran Terendah Saat Ini:</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5 tabular-nums">
                {tender.pemenang && tender.pemenang !== '0x0000000000000000000000000000000000000000' && tender.penawaranTerendahIDR && tender.penawaranTerendahIDR <= tender.paguAnggaranIDR
                  ? formatIDR(tender.penawaranTerendahIDR)
                  : (status.stage === 'COMPLETED' ? "Tidak Ada (Gugur)" : "Belum Terbuka / Rahasia")}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] text-slate-500 font-medium">Total Peserta Terdaftar:</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {tender.peserta?.length || 0} Vendor
              </div>
            </div>
          </div>

          {/* Winner Banner if finished */}
          {status.stage === 'COMPLETED' && (
            tender.pemenang && tender.pemenang !== '0x0000000000000000000000000000000000000000' && tender.penawaranTerendahIDR && tender.penawaranTerendahIDR <= tender.paguAnggaranIDR ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    <span>Pemenang Resmi Disahkan di Blockchain</span>
                    {tender.namaPerusahaanPemenang && (
                      <span className="bg-emerald-200/80 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                        {tender.namaPerusahaanPemenang}
                      </span>
                    )}
                  </div>
                  <div className="text-emerald-800 mt-0.5">
                    {tender.namaPerusahaanPemenang ? (
                      <span>Perusahaan: <strong>{tender.namaPerusahaanPemenang}</strong> • Wallet: <span className="font-mono font-semibold">{truncateAddress(tender.pemenang)}</span></span>
                    ) : (
                      <span>Alamat Vendor: <span className="font-mono font-semibold">{tender.pemenang}</span></span>
                    )}
                  </div>
                  <div className="text-emerald-700 text-[11px] mt-0.5">
                    Nilai Penawaran Sah: <strong>{formatIDR(tender.penawaranTerendahIDR)}</strong> (Efisiensi Anggaran {formatIDR(tender.paguAnggaranIDR - tender.penawaranTerendahIDR)})
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-amber-950 text-sm">
                    Tender Selesai Tanpa Pemenang Sah (Gugur)
                  </div>
                  <div className="text-amber-800 mt-0.5">
                    Tidak ada vendor peserta yang membuka harga (<strong>Reveal</strong>) sebelum batas waktu habis, sehingga penawaran terkunci tidak dapat dinilai.
                  </div>
                </div>
              </div>
            )
          )}

          {/* Timeline & Phase Deadlines */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Jadwal Waktu Blok (Block Timestamp Timetable)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span>Fase Commit (Penawaran Rahasia):</span>
                  <span className="font-mono font-medium">
                    {commitTimeLeft > 0 ? formatDuration(commitTimeLeft) : "Ditutup"}
                  </span>
                </div>
                <div className="font-medium text-slate-800">
                  {new Date(tender.batasWaktuCommit * 1000).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span>Fase Reveal (Pembukaan Harga):</span>
                  <span className="font-mono font-medium">
                    {revealTimeLeft > 0 ? formatDuration(revealTimeLeft) : "Ditutup"}
                  </span>
                </div>
                <div className="font-medium text-slate-800">
                  {new Date(tender.batasWaktuReveal * 1000).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>

          {/* Dokumen Kerangka Acuan Kerja (KAK) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                Kerangka Acuan Kerja (KAK) Pemerintah
              </span>
              <a 
                href={formatIpfsGatewayUrl(tender.ipfsDokumenKAK)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Buka via IPFS Gateway</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-600 break-all select-all">
              {tender.ipfsDokumenKAK}
            </div>
            <p className="text-[11px] text-slate-400">
              Dokumen spesifikasi teknis dan tata cara pengadaan yang ditandatangani PPK dan tersimpan di IPFS.
            </p>
          </div>

          {/* Bid List / Peserta Lelang */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Audit Buku Besar Penawaran ({bids.length} Vendor)
                </h4>
                {mode === 'web3' && (
                  <button
                    type="button"
                    onClick={() => syncContractData()}
                    disabled={isSyncing}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                    title="Sinkronkan data peserta langsung dari blockchain"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Kriptografi Commit-Reveal Log
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {bids.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Belum ada vendor yang mengirimkan penawaran pada lelang ini.
                </div>
              ) : (
                bids.map((bid, idx) => (
                  <div key={idx} className="p-3.5 bg-white hover:bg-slate-50 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{bid.vendorName}</span>
                        <span className="font-mono text-[11px] text-slate-400">({truncateAddress(bid.vendorAddress)})</span>
                      </div>

                      {bid.sudahReveal ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm tabular-nums">
                            {formatIDR(bid.hargaTerbukaIDR)}
                          </span>
                          {bid.memenuhiSyaratPagu ? (
                            <span className="badge-chip bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Memenuhi Pagu
                            </span>
                          ) : (
                            <span className="badge-chip bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                              Melebihi Pagu
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sky-800 bg-sky-50 px-2 py-0.5 rounded text-[11px] font-medium border border-sky-100">
                          <Lock className="w-3 h-3 text-sky-600" />
                          <span>Harga Terkunci (Sealed Bid)</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <div className="truncate">
                        Hash Komitmen: <span className="font-mono text-slate-700">{truncateAddress(bid.hashTerkunci)}</span>
                      </div>
                      <div className="truncate flex items-center gap-1.5">
                        <span>Proposal IPFS:</span>
                        {bid.ipfsProposalTeknis ? (
                          <a
                            href={formatIpfsGatewayUrl(bid.ipfsProposalTeknis)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                            title="Buka dokumen proposal teknis di IPFS Gateway"
                          >
                            <span>{bid.ipfsProposalTeknis.slice(0, 18)}...</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {mode === 'simulation' ? (
              <>
                <FastForward className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulasi Waktu Cepat:</span>
                {status.stage === 'COMMIT' && (
                  <button
                    onClick={() => jumpToPhase(tender.id, 'reveal')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Maju ke Fase Reveal &rarr;
                  </button>
                )}
                {status.stage === 'REVEAL' && (
                  <button
                    onClick={() => jumpToPhase(tender.id, 'finish')}
                    className="text-amber-700 hover:underline font-medium"
                  >
                    Maju ke Selesai &rarr;
                  </button>
                )}
                {(status.stage === 'AWAITING_LOCK' || status.stage === 'COMPLETED') && (
                  <span className="text-slate-400">Waktu Final</span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-500">
                Mode Web3 Aktif • Transaksi divalidasi oleh konsensus Base Sepolia (OP Stack L2).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Tutup
            </button>

            {status.stage === 'COMMIT' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVendorModal(tender, 'commit');
                }}
                className="btn-primary text-xs bg-sky-700 hover:bg-sky-800"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kirim Penawaran Terkunci</span>
              </button>
            )}

            {status.stage === 'REVEAL' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVendorModal(tender, 'reveal');
                }}
                className="btn-primary text-xs bg-amber-600 hover:bg-amber-700"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Penawaran (Reveal)</span>
              </button>
            )}

            {status.stage === 'AWAITING_LOCK' && (
              <button
                onClick={handleKunciPemenang}
                disabled={isLocking || (mode === 'web3' && !isOwner)}
                className="btn-primary text-xs bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1.5"
                title={mode === 'web3' && !isOwner ? "Hanya Panitia Pemerintah (Owner) yang dapat mengunci pemenang" : ""}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isLocking ? "Mengesahkan di Blockchain..." : "Kunci Pemenang Tender"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
