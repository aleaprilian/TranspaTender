import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Code2, ShieldAlert, Cpu, Layers } from 'lucide-react';

const CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TranspaTender ID
 * @dev Sistem E-Procurement Pemerintah dengan skema Commit-Reveal (Sealed-Bid)
 * @notice Berjalan di jaringan Base Sepolia Testnet (OP Stack L2). Nilai anggaran menggunakan satuan Rupiah (IDR).
 */
contract TranspaTender {
    address public panitiaPemerintah;
    uint256 public jumlahTender;

    struct Tender {
        uint256 id;
        string namaProyek;
        string ipfsDokumenKAK;       // CID IPFS / URL untuk Kerangka Acuan Kerja Pemerintah
        uint256 paguAnggaranIDR;     // Batas maksimal anggaran dalam satuan Rupiah
        uint256 batasWaktuCommit;    // Timestamp penutupan pengiriman penawaran terkunci
        uint256 batasWaktuReveal;    // Timestamp penutupan pembukaan harga
        bool selesai;
        address pemenang;
        string namaPerusahaanPemenang; // Nama PT/CV Pemenang lelang
        uint256 penawaranTerendahIDR;
    }

    struct Penawaran {
        string namaPerusahaan;       // Nama PT/CV Vendor (misal: "PT Maju Bersama")
        bytes32 hashTerkunci;        // Hash Keccak256 dari (Harga IDR + Kata Sandi)
        string ipfsProposalTeknis;   // URL HTTPS atau CID IPFS untuk dokumen proposal teknis
        uint256 hargaTerbukaIDR;     // Harga asli yang terverifikasi pada fase Reveal
        bool sudahCommit;
        bool sudahReveal;
        bool memenuhiSyaratPagu;
    }

    // Penyimpanan state kontrak
    mapping(uint256 => Tender) public daftarTender;
    mapping(uint256 => mapping(address => Penawaran)) public dataPenawaran;
    mapping(uint256 => address[]) public daftarPesertaTender;

    // Event log untuk jejak audit publik di Block Explorer (Basescan / Polygonscan)
    event TenderDibuat(
        uint256 indexed idTender,
        string namaProyek,
        uint256 paguAnggaranIDR,
        uint256 batasWaktuCommit,
        uint256 batasWaktuReveal
    );
    event PenawaranTerkunciMasuk(
        uint256 indexed idTender,
        address indexed vendor,
        string namaPerusahaan,
        string ipfsProposalTeknis,
        bytes32 hashTerkunci
    );
    event PenawaranDibuka(
        uint256 indexed idTender,
        address indexed vendor,
        string namaPerusahaan,
        uint256 hargaIDR,
        bool memenuhiSyaratPagu
    );
    event PemenangDitetapkan(
        uint256 indexed idTender,
        address indexed pemenang,
        string namaPerusahaanPemenang,
        uint256 hargaFinalIDR
    );

    modifier hanyaPanitia() {
        require(msg.sender == panitiaPemerintah, "Akses Ditolak: Hanya akun Panitia Pemerintah!");
        _;
    }

    constructor() {
        panitiaPemerintah = msg.sender;
    }

    // =========================================================================
    // 1. FUNGSI PEMERINTAH: MEMBUAT PROYEK TENDER BARU
    // =========================================================================
    function buatTender(
        string memory _namaProyek,
        string memory _ipfsDokumenKAK,
        uint256 _paguAnggaranIDR,
        uint256 _durasiCommitDetik,
        uint256 _durasiRevealDetik
    ) public hanyaPanitia {
        require(_paguAnggaranIDR > 0, "Pagu anggaran harus lebih dari 0!");
        require(_durasiCommitDetik > 0 && _durasiRevealDetik > 0, "Durasi waktu tidak valid!");

        jumlahTender++;
        uint256 waktuSekarang = block.timestamp;
        uint256 waktuCommit = waktuSekarang + _durasiCommitDetik;
        uint256 waktuReveal = waktuCommit + _durasiRevealDetik;

        daftarTender[jumlahTender] = Tender({
            id: jumlahTender,
            namaProyek: _namaProyek,
            ipfsDokumenKAK: _ipfsDokumenKAK,
            paguAnggaranIDR: _paguAnggaranIDR,
            batasWaktuCommit: waktuCommit,
            batasWaktuReveal: waktuReveal,
            selesai: false,
            pemenang: address(0),
            namaPerusahaanPemenang: "",
            penawaranTerendahIDR: _paguAnggaranIDR + 1 // Inisialisasi di atas pagu
        });

        emit TenderDibuat(jumlahTender, _namaProyek, _paguAnggaranIDR, waktuCommit, waktuReveal);
    }

    // =========================================================================
    // FUNGSI UTILITAS: PEMBUAT HASH KRIPTOGRAFI (HELPER)
    // =========================================================================
    function generateHashPenawaran(uint256 _hargaIDR, string memory _kataSandiRahasia) 
        public 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(_hargaIDR, _kataSandiRahasia));
    }

    // =========================================================================
    // 2. FASE COMMIT: VENDOR MENGIRIMKAN PENAWARAN TERKUNCI (SEALED BID)
    // =========================================================================
    function kirimPenawaranTerkunci(
        uint256 _idTender,
        string memory _namaPerusahaan,
        bytes32 _hashTerkunci,
        string memory _ipfsProposalTeknis
    ) public {
        Tender storage t = daftarTender[_idTender];
        require(t.id != 0, "Tender tidak ditemukan!");
        require(block.timestamp <= t.batasWaktuCommit, "Gagal: Masa pendaftaran (Commit) sudah ditutup!");
        require(!dataPenawaran[_idTender][msg.sender].sudahCommit, "Gagal: Anda sudah mengirim penawaran sebelumnya!");
        require(bytes(_namaPerusahaan).length > 0, "Nama perusahaan vendor tidak boleh kosong!");

        dataPenawaran[_idTender][msg.sender] = Penawaran({
            namaPerusahaan: _namaPerusahaan,
            hashTerkunci: _hashTerkunci,
            ipfsProposalTeknis: _ipfsProposalTeknis,
            hargaTerbukaIDR: 0,
            sudahCommit: true,
            sudahReveal: false,
            memenuhiSyaratPagu: false
        });

        daftarPesertaTender[_idTender].push(msg.sender);

        emit PenawaranTerkunciMasuk(
            _idTender, 
            msg.sender, 
            _namaPerusahaan, 
            _ipfsProposalTeknis, 
            _hashTerkunci
        );
    }

    // =========================================================================
    // 3. FASE REVEAL: VENDOR MEMBUKA HARGA ASLI & VERIFIKASI KEJUJURAN
    // =========================================================================
    function bukaPenawaran(
        uint256 _idTender,
        uint256 _hargaAsliIDR,
        string memory _kataSandiRahasia
    ) public {
        Tender storage t = daftarTender[_idTender];
        Penawaran storage p = dataPenawaran[_idTender][msg.sender];

        require(t.id != 0, "Tender tidak ditemukan!");
        require(block.timestamp > t.batasWaktuCommit, "Gagal: Fase Commit belum berakhir, belum saatnya membuka harga!");
        require(block.timestamp <= t.batasWaktuReveal, "Gagal: Masa pembukaan harga (Reveal) sudah habis!");
        require(p.sudahCommit, "Gagal: Anda tidak terdaftar pada fase Commit tender ini!");
        require(!p.sudahReveal, "Gagal: Anda sudah membuka penawaran sebelumnya!");

        bytes32 buktiHash = keccak256(abi.encodePacked(_hargaAsliIDR, _kataSandiRahasia));
        require(
            buktiHash == p.hashTerkunci,
            "DISKUALIFIKASI: Harga atau Kata Sandi tidak cocok dengan Hash yang dikunci di awal!"
        );

        p.sudahReveal = true;
        p.hargaTerbukaIDR = _hargaAsliIDR;

        if (_hargaAsliIDR <= t.paguAnggaranIDR && _hargaAsliIDR > 0) {
            p.memenuhiSyaratPagu = true;
            if (_hargaAsliIDR < t.penawaranTerendahIDR) {
                t.penawaranTerendahIDR = _hargaAsliIDR;
                t.pemenang = msg.sender;
                t.namaPerusahaanPemenang = p.namaPerusahaan;
            }
        }

        emit PenawaranDibuka(
            _idTender, 
            msg.sender, 
            p.namaPerusahaan, 
            _hargaAsliIDR, 
            p.memenuhiSyaratPagu
        );
    }

    // =========================================================================
    // 4. FASE FINALISASI: PENGESAHAN PEMENANG TENDER
    // =========================================================================
    function kunciPemenangTender(uint256 _idTender) public hanyaPanitia {
        Tender storage t = daftarTender[_idTender];
        require(t.id != 0, "Tender tidak ditemukan!");
        require(block.timestamp > t.batasWaktuReveal, "Gagal: Masa Reveal masih berlangsung!");
        require(!t.selesai, "Gagal: Tender ini sudah diselesaikan sebelumnya!");

        t.selesai = true;
        string memory namaPemenang = "";
        if (t.pemenang != address(0)) {
            namaPemenang = dataPenawaran[_idTender][t.pemenang].namaPerusahaan;
            if (bytes(namaPemenang).length == 0) {
                namaPemenang = "Vendor Pemenang";
            }
            t.namaPerusahaanPemenang = namaPemenang;
        }

        emit PemenangDitetapkan(
            _idTender, 
            t.pemenang, 
            namaPemenang, 
            t.penawaranTerendahIDR
        );
    }

    // =========================================================================
    // 5. FUNGSI AUDIT PUBLIK (READ-ONLY)
    // =========================================================================
    function lihatTotalPeserta(uint256 _idTender) public view returns (uint256) {
        return daftarPesertaTender[_idTender].length;
    }

    function lihatPenawaranVendor(uint256 _idTender, address _vendor) public view returns (
        string memory namaPerusahaan,
        bytes32 hashTerkunci,
        string memory ipfsProposalTeknis,
        uint256 hargaTerbukaIDR,
        bool sudahCommit,
        bool sudahReveal,
        bool memenuhiSyaratPagu
    ) {
        Penawaran memory p = dataPenawaran[_idTender][_vendor];
        return (
            p.namaPerusahaan,
            p.hashTerkunci,
            p.ipfsProposalTeknis,
            p.hargaTerbukaIDR,
            p.sudahCommit,
            p.sudahReveal,
            p.memenuhiSyaratPagu
        );
    }

    function cekStatusWaktuTender(uint256 _idTender) public view returns (string memory statusFase, uint256 waktuSekarang) {
        Tender memory t = daftarTender[_idTender];
        require(t.id != 0, "Tender tidak ditemukan!");
        
        uint256 sekarang = block.timestamp;
        if (t.selesai) {
            return ("SELESAI & DIKUNCI", sekarang);
        } else if (sekarang <= t.batasWaktuCommit) {
            return ("FASE 1: PENDAFTARAN TERKUNCI (COMMIT)", sekarang);
        } else if (sekarang <= t.batasWaktuReveal) {
            return ("FASE 2: PEMBUKAAN HARGA (REVEAL)", sekarang);
        } else {
            return ("MENUNGGU PENGESAHAN AKHIR PANITIA", sekarang);
        }
    }
}`;

export function ContractViewer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Intro Banner */}
      <div className="mini-card p-4 sm:p-6 bg-white border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Arsitektur & Kode Smart Contract (TranspaTender.sol)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Solidity ^0.8.20 • Base Sepolia Testnet • Protokol Kriptografi Commit-Reveal (Sealed-Bid)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <a
              href="https://remix.ethereum.org/"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs justify-center"
            >
              <span>Buka Remix IDE</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handleCopy}
              className="btn-primary text-xs justify-center"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Kode Solidity"}</span>
            </button>
          </div>
        </div>

        {/* 4 System Layers Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-semibold text-slate-800 mb-1">1. Presentation</div>
            <p className="text-[11px] text-slate-500">React + Ethers.js + Web3 Provider</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="font-semibold text-blue-900 mb-1">2. Consensus & Execution</div>
            <p className="text-[11px] text-blue-700">Base Sepolia Testnet (OP Stack L2 Rollup)</p>
          </div>
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
            <div className="font-semibold text-sky-900 mb-1">3. Storage Layer</div>
            <p className="text-[11px] text-sky-700">IPFS Decentralized CID (Dokumen KAK & Proposal)</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="font-semibold text-emerald-900 mb-1">4. Public Audit</div>
            <p className="text-[11px] text-emerald-700">Basescan Explorer (KPK, BPK, Publik)</p>
          </div>
        </div>

        {/* Rupiah Compliance Alert */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong>Kepatuhan UU Mata Uang No. 7 Tahun 2011:</strong> Sistem ini tidak menggunakan aset kripto sebagai alat transaksi. 
            Blockchain murni difungsikan sebagai <em>Immutable Audit Log</em> dan mesin pengunci lelang. Seluruh penawaran dan pagu anggaran dicatat dalam nominal <strong>Rupiah (IDR)</strong>, 
            sedangkan pembayaran akhir tetap via kas perbankan APBN/APBD.
          </div>
        </div>
      </div>

      {/* Code Box */}
      <div className="mini-card overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>contracts/TranspaTender.sol</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
          <code>{CONTRACT_CODE}</code>
        </pre>
      </div>
    </div>
  );
}
