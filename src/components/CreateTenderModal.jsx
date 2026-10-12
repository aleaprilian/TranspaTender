import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { formatIDR, truncateAddress } from '../utils/crypto';
import { IpfsUploadField } from './IpfsUploadField';
import { Button, Field, cn } from './ui';
import {
  X,
  PlusCircle,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';

const DURATION_PRESETS = [
  { label: '3 Menit (Tes Kilat)', commit: '180', reveal: '180' },
  { label: '15 Menit (Uji Coba)', commit: '900', reveal: '900' },
  { label: '1 Jam (Leluasa)', commit: '3600', reveal: '3600' },
  { label: '1 Hari (Simulasi Nyata)', commit: '86400', reveal: '86400' }
];

export function CreateTenderModal({ onClose }) {
  const {
    buatTender,
    currentAccount,
    mode,
    web3Account,
    contractOwner,
    isOwner,
    deployedContractAddress,
    deployContractOnChain,
    connectMetaMask
  } = useTender();

  const [namaProyek, setNamaProyek] = useState('');
  const [kategori, setKategori] = useState('Pekerjaan Konstruksi & Infrastruktur');
  const [satuanKerja, setSatuanKerja] = useState('Dinas Pekerjaan Umum & Penataan Ruang');
  const [ipfsDokumenKAK, setIpfsDokumenKAK] = useState('');
  const [paguAnggaranIDR, setPaguAnggaranIDR] = useState('1000000000');
  const [durasiCommitDetik, setDurasiCommitDetik] = useState('180'); // 3 menit
  const [durasiRevealDetik, setDurasiRevealDetik] = useState('180'); // 3 menit
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Preset loader
  const applyPreset = (type) => {
    if (type === 'readme') {
      setNamaProyek('Pengadaan Alat Medis RSUD Provinsi');
      setKategori('Kesehatan & Fasilitas Publik');
      setSatuanKerja('Dinas Kesehatan Provinsi DKI Jakarta');
      setIpfsDokumenKAK('ipfs://QmKAKPemerintahRSUDMedika2026');
      setPaguAnggaranIDR('1000000000');
      setDurasiCommitDetik('180');
      setDurasiRevealDetik('180');
    } else if (type === 'quick') {
      setNamaProyek('Penyediaan Server & Cloud LPSE Terdesentralisasi');
      setKategori('Pengadaan Teknologi Informasi');
      setSatuanKerja('Dinas Komunikasi & Informatika');
      setIpfsDokumenKAK('ipfs://QmKAKServerLPSE2026');
      setPaguAnggaranIDR('750000000');
      setDurasiCommitDetik('120'); // 2 menit
      setDurasiRevealDetik('120'); // 2 menit
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!namaProyek.trim()) throw new Error('Nama proyek lelang wajib diisi!');
      if (Number(paguAnggaranIDR) <= 0) throw new Error('Pagu anggaran harus lebih dari 0!');
      if (Number(durasiCommitDetik) <= 0 || Number(durasiRevealDetik) <= 0) {
        throw new Error('Durasi waktu fase lelang tidak valid!');
      }

      await buatTender({
        namaProyek,
        kategori,
        satuanKerja,
        ipfsDokumenKAK,
        paguAnggaranIDR: Number(paguAnggaranIDR),
        durasiCommitDetik: Number(durasiCommitDetik),
        durasiRevealDetik: Number(durasiRevealDetik)
      });

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.reason || err.message || 'Gagal menerbitkan tender.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-900 text-white flex items-center justify-center shrink-0">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Buat Paket Tender Baru</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {mode === 'web3' ? "Terbitkan langsung ke Blockchain via Smart Contract" : "Panitia Pemerintah (Contract Owner) menerbitkan lelang"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-control bg-status-danger-bg text-status-danger-text border border-status-danger-border text-xs">
              {errorMsg}
            </div>
          )}

          {/* Operational Mode Info Banner */}
          {mode === 'simulation' ? (
            <div className="p-3 rounded-control bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-1"></span>
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-800">Mode Simulasi Sandbox (Off-Chain):</span> Tender akan diproses secara lokal di browser tanpa gas fee ETH. Hash transaksi yang dihasilkan adalah simulasi (tidak tercatat di Basescan). Untuk mencatat lelang langsung ke jaringan blockchain nyata, aktifkan <strong>Mode Web3 (Base Sepolia)</strong> di menu atas.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-control bg-status-commit-bg border border-status-commit-border text-status-commit-text text-xs flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-status-commit-dot animate-pulse shrink-0 mt-1"></span>
              <div className="leading-relaxed">
                <span className="font-semibold">Mode Web3 On-Chain (Base Sepolia):</span> Tender akan disiarkan ke smart contract melalui MetaMask dan hash transaksi resmi akan tercatat di Base Sepolia Explorer (Basescan).
              </div>
            </div>
          )}

          {/* Web3 Warning if not owner or not connected */}
          {mode === 'web3' && !web3Account && (
            <div className="p-3 rounded-control bg-status-commit-bg border border-status-commit-border text-status-commit-text text-xs flex items-center justify-between gap-3">
              <span>Dompet MetaMask belum terhubung.</span>
              <Button
                type="button"
                size="sm"
                onClick={() => connectMetaMask()}
                className="shrink-0"
              >
                Hubungkan Wallet
              </Button>
            </div>
          )}

          {mode === 'web3' && web3Account && deployedContractAddress && !isOwner && (
            <div className="p-3 rounded-control bg-status-reveal-bg border border-status-reveal-border text-status-reveal-text text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-status-reveal-dot mt-0.5 shrink-0" />
                <div>
                  <strong>Peringatan Izin Akses Blockchain:</strong> Akun dompet Anda saat ini (<code>{truncateAddress(web3Account)}</code>) bukan pemilik kontrak (Owner: <code>{truncateAddress(contractOwner)}</code>).
                  Fungsi <code>buatTender</code> pada smart contract memiliki proteksi <code>hanyaPanitia</code>.
                </div>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-2xs opacity-80">Solusi:</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    try {
                      await deployContractOnChain();
                    } catch (e) {}
                  }}
                >
                  Deploy Kontrak Baru Milik Anda Sendiri
                </Button>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => applyPreset('readme')}
              className="px-2 py-1 rounded-control bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Skenario RSUD (Rp 1 Miliar / 6 Menit)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('quick')}
              className="px-2 py-1 rounded-control bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              LPSE Cloud (4 Menit)
            </button>
          </div>

          <Field label="Nama Proyek Tender" htmlFor="ct-nama" required>
            <input
              id="ct-nama"
              type="text"
              value={namaProyek}
              onChange={(e) => setNamaProyek(e.target.value)}
              placeholder="Contoh: Pengadaan Alat Medis RSUD Provinsi"
              className="form-input"
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Kategori Pengadaan" htmlFor="ct-kategori" required>
              <input
                id="ct-kategori"
                type="text"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="form-input"
                required
              />
            </Field>

            <Field label="Satuan Kerja / Instansi" htmlFor="ct-satker" required>
              <input
                id="ct-satker"
                type="text"
                value={satuanKerja}
                onChange={(e) => setSatuanKerja(e.target.value)}
                className="form-input"
                required
              />
            </Field>
          </div>

          <Field
            label="Pagu Anggaran Maksimal (IDR)"
            htmlFor="ct-pagu"
            required
            hint={<span>Terbaca: <strong className="text-slate-900">{formatIDR(paguAnggaranIDR)}</strong></span>}
          >
            <input
              id="ct-pagu"
              type="text"
              value={paguAnggaranIDR}
              onChange={(e) => setPaguAnggaranIDR(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Contoh: 1000000000"
              className="form-input font-mono"
              required
            />
          </Field>

          <IpfsUploadField
            label="Dokumen Kerangka Acuan Kerja (KAK) & Spesifikasi Teknis"
            value={ipfsDokumenKAK}
            onChange={(val) => setIpfsDokumenKAK(val)}
            placeholder="ipfs://QmKAK..."
            helpText="Dokumen KAK diunggah ke IPFS. Smart Contract hanya menyimpan sidik jari kriptografi (CID)."
            required
          />

          <div className="space-y-3 bg-slate-50 p-3.5 rounded-control border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                Pengaturan Durasi Waktu Lelang On-Chain
              </span>
              <span className="text-2xs text-slate-500">Pilih Preset Waktu:</span>
            </div>

            {/* Quick Duration Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {DURATION_PRESETS.map(p => {
                const isActive = durasiCommitDetik === p.commit && durasiRevealDetik === p.reveal;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setDurasiCommitDetik(p.commit);
                      setDurasiRevealDetik(p.reveal);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-control text-2xs font-medium border transition',
                      isActive
                        ? 'bg-brand-900 text-white border-brand-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Field
                label={<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-commit-dot"></span>Durasi Fase Commit (Detik)</span>}
                htmlFor="ct-commit"
              >
                <input
                  id="ct-commit"
                  type="number"
                  value={durasiCommitDetik}
                  onChange={(e) => setDurasiCommitDetik(e.target.value)}
                  min="10"
                  className="form-input font-mono"
                  required
                />
                <p className="text-2xs text-slate-500 mt-1">
                  = {Math.round(durasiCommitDetik / 60)} Menit Pendaftaran Tertutup
                </p>
              </Field>

              <Field
                label={<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-reveal-dot"></span>Durasi Fase Reveal (Detik)</span>}
                htmlFor="ct-reveal"
              >
                <input
                  id="ct-reveal"
                  type="number"
                  value={durasiRevealDetik}
                  onChange={(e) => setDurasiRevealDetik(e.target.value)}
                  min="10"
                  className="form-input font-mono"
                  required
                />
                <p className="text-2xs text-slate-500 mt-1">
                  = {Math.round(durasiRevealDetik / 60)} Menit Pembukaan Harga
                </p>
              </Field>
            </div>

            <p className="text-2xs text-slate-500 leading-relaxed bg-white p-2.5 rounded-control border border-slate-200 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
              <span>
                <strong>Alur Otomatis Blockchain:</strong> Setelah Fase Commit habis, tender beralih ke Fase Reveal. Setelah Fase Reveal habis, tender otomatis berstatus <strong>Menunggu Pengesahan Akhir Panitia</strong> agar Panitia dapat mengunci &amp; menetapkan pemenang.
              </span>
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (mode === 'web3' && !web3Account)}
              className="gap-1.5"
            >
              {isLoading ? "Mengirim ke Blockchain..." : "Terbitkan Tender ke Smart Contract"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
