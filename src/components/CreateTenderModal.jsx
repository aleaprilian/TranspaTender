import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { formatIDR, truncateAddress } from '../utils/crypto';
import { IpfsUploadField } from './IpfsUploadField';
import { 
  X, 
  PlusCircle, 
  Building, 
  Clock, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Wallet, 
  Rocket 
} from 'lucide-react';

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
        className="modal-content max-w-xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <PlusCircle className="w-4 h-4 text-slate-100" />
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Operational Mode Info Banner */}
          {mode === 'simulation' ? (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-1"></span>
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-800">Mode Simulasi Sandbox (Off-Chain):</span> Tender akan diproses secara lokal di browser tanpa gas fee ETH. Hash transaksi yang dihasilkan adalah simulasi (tidak tercatat di Basescan). Untuk mencatat lelang langsung ke jaringan blockchain nyata, aktifkan <strong>Mode Web3 (Base Sepolia)</strong> di menu atas.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0 mt-1"></span>
              <div className="leading-relaxed">
                <span className="font-semibold text-blue-950">Mode Web3 On-Chain (Base Sepolia):</span> Tender akan disiarkan ke smart contract melalui MetaMask dan hash transaksi resmi akan tercatat di Base Sepolia Explorer (Basescan).
              </div>
            </div>
          )}

          {/* Web3 Warning if not owner or not connected */}
          {mode === 'web3' && !web3Account && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
              <span>Dompet MetaMask belum terhubung.</span>
              <button
                type="button"
                onClick={() => connectMetaMask()}
                className="px-2.5 py-1 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition"
              >
                Hubungkan Wallet
              </button>
            </div>
          )}

          {mode === 'web3' && web3Account && deployedContractAddress && !isOwner && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Peringatan Izin Akses Blockchain:</strong> Akun dompet Anda saat ini (<code>{truncateAddress(web3Account)}</code>) bukan pemilik kontrak (Owner: <code>{truncateAddress(contractOwner)}</code>).
                  Fungsi <code>buatTender</code> pada smart contract memiliki proteksi <code>hanyaPanitia</code>.
                </div>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-amber-800">Solusi:</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deployContractOnChain();
                    } catch (e) {}
                  }}
                  className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px] font-medium hover:bg-amber-700 transition"
                >
                  Deploy Kontrak Baru Milik Anda Sendiri
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => applyPreset('readme')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Skenario RSUD (Rp 1 Miliar / 6 Menit)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('quick')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              LPSE Cloud (4 Menit)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Proyek Tender
            </label>
            <input
              type="text"
              value={namaProyek}
              onChange={(e) => setNamaProyek(e.target.value)}
              placeholder="Contoh: Pengadaan Alat Medis RSUD Provinsi"
              className="form-input text-xs sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Pengadaan
              </label>
              <input
                type="text"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Satuan Kerja / Instansi
              </label>
              <input
                type="text"
                value={satuanKerja}
                onChange={(e) => setSatuanKerja(e.target.value)}
                className="form-input text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pagu Anggaran Maksimal (IDR)
            </label>
            <input
              type="text"
              value={paguAnggaranIDR}
              onChange={(e) => setPaguAnggaranIDR(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Contoh: 1000000000"
              className="form-input text-xs font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Terbaca: <strong className="text-slate-900">{formatIDR(paguAnggaranIDR)}</strong>
            </span>
          </div>

          <IpfsUploadField
            label="Dokumen Kerangka Acuan Kerja (KAK) & Spesifikasi Teknis"
            value={ipfsDokumenKAK}
            onChange={(val) => setIpfsDokumenKAK(val)}
            placeholder="ipfs://QmKAK..."
            helpText="Dokumen KAK diunggah ke IPFS. Smart Contract hanya menyimpan sidik jari kriptografi (CID)."
            required
          />

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Pengaturan Durasi Waktu Lelang On-Chain
              </span>
              <span className="text-[10px] text-slate-500">Pilih Preset Waktu:</span>
            </div>

            {/* Quick Duration Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '⚡ 3 Menit (Tes Kilat)', commit: '180', reveal: '180' },
                { label: '⏱️ 15 Menit (Uji Coba)', commit: '900', reveal: '900' },
                { label: '🕒 1 Jam (Leluasa)', commit: '3600', reveal: '3600' },
                { label: '📅 1 Hari (Simulasi Nyata)', commit: '86400', reveal: '86400' }
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setDurasiCommitDetik(p.commit);
                    setDurasiRevealDetik(p.reveal);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition ${
                    durasiCommitDetik === p.commit && durasiRevealDetik === p.reveal
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  Durasi Fase Commit (Detik)
                </label>
                <input
                  type="number"
                  value={durasiCommitDetik}
                  onChange={(e) => setDurasiCommitDetik(e.target.value)}
                  min="10"
                  className="form-input text-xs font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  = {Math.round(durasiCommitDetik / 60)} Menit Pendaftaran Tertutup
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Durasi Fase Reveal (Detik)
                </label>
                <input
                  type="number"
                  value={durasiRevealDetik}
                  onChange={(e) => setDurasiRevealDetik(e.target.value)}
                  min="10"
                  className="form-input text-xs font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  = {Math.round(durasiRevealDetik / 60)} Menit Pembukaan Harga
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed bg-white p-2 rounded-lg border border-slate-200/80">
              ℹ️ <strong>Alur Otomatis Blockchain:</strong> Setelah Fase Commit habis, tender beralih ke Fase Reveal. Setelah Fase Reveal habis, tender otomatis berstatus <strong>Menunggu Pengesahan Akhir Panitia</strong> agar Panitia dapat mengunci & menetapkan pemenang.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs w-full sm:w-auto justify-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || (mode === 'web3' && !web3Account)}
              className="btn-primary text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {isLoading ? "Mengirim ke Blockchain..." : "Terbitkan Tender ke Smart Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
