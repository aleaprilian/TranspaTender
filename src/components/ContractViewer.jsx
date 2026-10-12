import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Code2, ShieldAlert } from 'lucide-react';
import { Button, Card } from './ui';

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

const LAYERS = [
  { title: 'Presentation', desc: 'React + Ethers.js + Web3 Provider' },
  { title: 'Consensus & Execution', desc: 'Base Sepolia Testnet (OP Stack L2 Rollup)' },
  { title: 'Storage Layer', desc: 'IPFS Decentralized CID (Dokumen KAK & Proposal)' },
  { title: 'Public Audit', desc: 'Basescan Explorer (KPK, BPK, Publik)' }
];

export function ContractViewer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Intro */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Arsitektur &amp; Kode Smart Contract (TranspaTender.sol)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Solidity ^0.8.20 • Base Sepolia Testnet • Protokol Kriptografi Commit-Reveal (Sealed-Bid)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              as="a"
              href="https://remix.ethereum.org/"
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="sm"
            >
              <span>Buka Remix IDE</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button onClick={handleCopy} size="sm" className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Kode Solidity"}</span>
            </Button>
          </div>
        </div>

        {/* 4 System Layers Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          {LAYERS.map((layer, i) => (
            <div key={layer.title} className="p-3 rounded-control bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-100 text-brand-700 text-2xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="font-semibold text-slate-800">{layer.title}</div>
              </div>
              <p className="text-2xs text-slate-500 leading-relaxed">{layer.desc}</p>
            </div>
          ))}
        </div>

        {/* Rupiah Compliance Alert */}
        <div className="bg-status-reveal-bg border border-status-reveal-border rounded-control p-3 text-xs text-status-reveal-text flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-status-reveal-dot mt-0.5 shrink-0" />
          <div>
            <strong>Kepatuhan UU Mata Uang No. 7 Tahun 2011:</strong> Sistem ini tidak menggunakan aset kripto sebagai alat transaksi.
            Blockchain murni difungsikan sebagai <em>Immutable Audit Log</em> dan mesin pengunci lelang. Seluruh penawaran dan pagu anggaran dicatat dalam nominal <strong>Rupiah (IDR)</strong>,
            sedangkan pembayaran akhir tetap via kas perbankan APBN/APBD.
          </div>
        </div>
      </Card>

      {/* Code Box */}
      <Card className="overflow-hidden">
        <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-brand-300" />
            <span>contracts/TranspaTender.sol</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-brand-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
          <code>{CONTRACT_CODE}</code>
        </pre>
      </Card>
    </div>
  );
}
