// SPDX-License-Identifier: MIT
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
        string ipfsDokumenKAK;       // CID IPFS untuk Kerangka Acuan Kerja Pemerintah
        uint256 paguAnggaranIDR;     // Batas maksimal anggaran dalam satuan Rupiah
        uint256 batasWaktuCommit;    // Timestamp penutupan pengiriman penawaran terkunci
        uint256 batasWaktuReveal;    // Timestamp penutupan pembukaan harga
        bool selesai;
        address pemenang;
        uint256 penawaranTerendahIDR;
    }

    struct Penawaran {
        bytes32 hashTerkunci;        // Hash Keccak256 dari (Harga IDR + Kata Sandi)
        string ipfsProposalTeknis;   // CID IPFS untuk dokumen proposal teknis vendor
        uint256 hargaTerbukaIDR;     // Harga asli yang terverifikasi pada fase Reveal
        bool sudahCommit;
        bool sudahReveal;
        bool memenuhiSyaratPagu;
    }

    // Penyimpanan state kontrak
    mapping(uint256 => Tender) public daftarTender;
    mapping(uint256 => mapping(address => Penawaran)) public dataPenawaran;
    mapping(uint256 => address[]) public daftarPesertaTender;

    // Event log untuk jejak audit publik di Block Explorer (Polygonscan / Basescan)
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
        bytes32 hashTerkunci,
        string ipfsProposalTeknis
    );
    event PenawaranDibuka(
        uint256 indexed idTender,
        address indexed vendor,
        uint256 hargaIDR,
        bool memenuhiSyaratPagu
    );
    event PemenangDitetapkan(
        uint256 indexed idTender,
        address indexed pemenang,
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
        bytes32 _hashTerkunci,
        string memory _ipfsProposalTeknis
    ) public {
        Tender storage t = daftarTender[_idTender];
        require(t.id != 0, "Tender tidak ditemukan!");
        require(block.timestamp <= t.batasWaktuCommit, "Gagal: Masa pendaftaran (Commit) sudah ditutup!");
        require(!dataPenawaran[_idTender][msg.sender].sudahCommit, "Gagal: Anda sudah mengirim penawaran sebelumnya!");

        dataPenawaran[_idTender][msg.sender] = Penawaran({
            hashTerkunci: _hashTerkunci,
            ipfsProposalTeknis: _ipfsProposalTeknis,
            hargaTerbukaIDR: 0,
            sudahCommit: true,
            sudahReveal: false,
            memenuhiSyaratPagu: false
        });

        daftarPesertaTender[_idTender].push(msg.sender);

        emit PenawaranTerkunciMasuk(_idTender, msg.sender, _hashTerkunci, _ipfsProposalTeknis);
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

        // Pembuktian Kriptografi: Mencocokkan Hash yang di-reveal dengan komitmen awal
        bytes32 buktiHash = keccak256(abi.encodePacked(_hargaAsliIDR, _kataSandiRahasia));
        require(
            buktiHash == p.hashTerkunci,
            "DISKUALIFIKASI: Harga atau Kata Sandi tidak cocok dengan Hash yang dikunci di awal!"
        );

        p.sudahReveal = true;
        p.hargaTerbukaIDR = _hargaAsliIDR;

        // Evaluasi Otomatis Smart Contract (Zero Insider Trading)
        if (_hargaAsliIDR <= t.paguAnggaranIDR && _hargaAsliIDR > 0) {
            p.memenuhiSyaratPagu = true;
            // Jika harga lebih rendah dari penawaran terendah saat ini, jadikan kandidat pemenang
            if (_hargaAsliIDR < t.penawaranTerendahIDR) {
                t.penawaranTerendahIDR = _hargaAsliIDR;
                t.pemenang = msg.sender;
            }
        }

        emit PenawaranDibuka(_idTender, msg.sender, _hargaAsliIDR, p.memenuhiSyaratPagu);
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
        emit PemenangDitetapkan(_idTender, t.pemenang, t.penawaranTerendahIDR);
    }

    // =========================================================================
    // 5. FUNGSI AUDIT PUBLIK (READ-ONLY)
    // =========================================================================
    function lihatTotalPeserta(uint256 _idTender) public view returns (uint256) {
        return daftarPesertaTender[_idTender].length;
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
}
