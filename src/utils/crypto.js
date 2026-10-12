import { ethers } from 'ethers';

/**
 * Menghasilkan Keccak-256 hash dari (Harga IDR + Kata Sandi Rahasia)
 * Identik dengan fungsi Solidity: keccak256(abi.encodePacked(uint256, string))
 */
export function generateCommitHash(hargaIDR, salt) {
  if (!hargaIDR || !salt) return "";
  try {
    const cleanHarga = String(hargaIDR).replace(/[^0-9]/g, '');
    if (!cleanHarga) return "";
    return ethers.solidityPackedKeccak256(
      ['uint256', 'string'],
      [BigInt(cleanHarga), String(salt)]
    );
  } catch (err) {
    console.error("Error generating commit hash:", err);
    return "";
  }
}

/**
 * Format angka ke mata uang Rupiah (IDR)
 */
export function formatIDR(amount) {
  if (amount === undefined || amount === null || amount === "") return "Rp 0";
  const num = typeof amount === 'bigint' ? Number(amount) : Number(String(amount).replace(/[^0-9]/g, ''));
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Singkat alamat Ethereum untuk display minimalis
 */
export function truncateAddress(address) {
  if (!address || address === ethers.ZeroAddress) return "—";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format detik ke MM:SS atau Jam Menit Detik
 */
export function formatDuration(seconds) {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}j ${remM}m ${s}d`;
}

/**
 * Akun simulasi sesuai skenario dokumentasi README
 */
export const SIMULATED_ACCOUNTS = [
  {
    id: "panitia",
    name: "Panitia Pemerintah (PPK)",
    institution: "Dinas Kesehatan Prov. DKI Jakarta",
    address: "0x71C8A5637Cd74D230536c4b245FE1275Db7F5801",
    role: "PANITIA",
    portal: "pemerintah",
    balance: "4.82 POL",
    badgeColor: "bg-brand-900 text-white"
  },
  {
    id: "vendor_a",
    name: "Vendor A (PT Maju Bersama)",
    institution: "Kontraktor & Supplier Medika",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    role: "VENDOR",
    portal: "vendor",
    balance: "1.25 POL",
    badgeColor: "bg-brand-50 text-brand-700 border border-brand-200"
  },
  {
    id: "vendor_b",
    name: "Vendor B (PT Karya Nusantara)",
    institution: "Penyedia Teknologi & Logistik",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    role: "VENDOR",
    portal: "vendor",
    balance: "2.10 POL",
    badgeColor: "bg-brand-50 text-brand-700 border border-brand-200"
  },
  {
    id: "auditor",
    name: "Auditor Publik (BPK / KPK)",
    institution: "Lembaga Pengawas Keuangan Negara",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    role: "AUDITOR",
    portal: "pemerintah",
    balance: "0.50 POL",
    badgeColor: "bg-slate-100 text-slate-700 border border-slate-200"
  }
];

/**
 * Data awal realistis untuk demo interaktif
 */
export function getInitialDemoTenders() {
  const now = Math.floor(Date.now() / 1000);

  // Vendor A & B preset data for Scenario 1
  const vendorA = SIMULATED_ACCOUNTS[1].address;
  const vendorB = SIMULATED_ACCOUNTS[2].address;

  const vendorAPrice = 920000000;
  const vendorASalt = "sandiVendorA123";
  const vendorAHash = generateCommitHash(vendorAPrice, vendorASalt);

  const vendorBPrice = 850000000;
  const vendorBSalt = "sandiRahasiaB999";
  const vendorBHash = generateCommitHash(vendorBPrice, vendorBSalt);

  return [
    {
      id: 1,
      namaProyek: "Pengadaan Alat Medis RSUD Provinsi",
      kategori: "Kesehatan & Fasilitas Publik",
      satuanKerja: "Dinas Kesehatan Daerah",
      ipfsDokumenKAK: "ipfs://QmKAKPemerintahRSUDMedika2026",
      paguAnggaranIDR: 1000000000, // Rp 1 Miliar
      waktuDibuat: now - 60,
      batasWaktuCommit: now + 180, // Masih fase Commit (3 menit)
      batasWaktuReveal: now + 360, // Total 6 menit
      selesai: false,
      pemenang: ethers.ZeroAddress,
      namaPerusahaanPemenang: "",
      penawaranTerendahIDR: 1000000001,
      peserta: [vendorA, vendorB],
      penawaran: {
        [vendorA]: {
          vendorAddress: vendorA,
          vendorName: "PT Maju Bersama",
          hashTerkunci: vendorAHash,
          ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalTeknisVendorA_RSUD",
          hargaTerbukaIDR: 0,
          saltDisimpan: vendorASalt, // untuk helper simulasi
          hargaDisimpan: vendorAPrice,
          sudahCommit: true,
          sudahReveal: false,
          memenuhiSyaratPagu: false,
          waktuCommit: now - 40,
          waktuReveal: 0
        },
        [vendorB]: {
          vendorAddress: vendorB,
          vendorName: "PT Karya Nusantara",
          hashTerkunci: vendorBHash,
          ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalTeknisVendorB_RSUD",
          hargaTerbukaIDR: 0,
          saltDisimpan: vendorBSalt,
          hargaDisimpan: vendorBPrice,
          sudahCommit: true,
          sudahReveal: false,
          memenuhiSyaratPagu: false,
          waktuCommit: now - 20,
          waktuReveal: 0
        }
      }
    },
    {
      id: 2,
      namaProyek: "Modernisasi Sistem Informasi Pelabuhan & Logistik Maritim",
      kategori: "Infrastruktur Digital",
      satuanKerja: "Dinas Perhubungan & Maritim",
      ipfsDokumenKAK: "https://gateway.pinata.cloud/ipfs/QmKAKPelabuhanDigitalNusantara2026",
      paguAnggaranIDR: 2500000000, // Rp 2.5 Miliar
      waktuDibuat: now - 400,
      batasWaktuCommit: now - 100, // Fase Commit selesai
      batasWaktuReveal: now + 200, // Sedang Fase REVEAL!
      selesai: false,
      pemenang: ethers.ZeroAddress,
      namaPerusahaanPemenang: "",
      penawaranTerendahIDR: 2500000001,
      peserta: [vendorA],
      penawaran: {
        [vendorA]: {
          vendorAddress: vendorA,
          vendorName: "PT Maju Bersama",
          hashTerkunci: generateCommitHash(2350000000, "saltPelabuhanA2026"),
          ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalTeknisPelabuhanVendorA",
          hargaTerbukaIDR: 2350000000,
          saltDisimpan: "saltPelabuhanA2026",
          hargaDisimpan: 2350000000,
          sudahCommit: true,
          sudahReveal: true,
          memenuhiSyaratPagu: true,
          waktuCommit: now - 250,
          waktuReveal: now - 50
        }
      }
    },
    {
      id: 3,
      namaProyek: "Pembangunan Jembatan Gantung Penghubung Antar-Desa",
      kategori: "Pekerjaan Umum & Tata Ruang",
      satuanKerja: "Dinas Bina Marga & Konstruksi",
      ipfsDokumenKAK: "https://gateway.pinata.cloud/ipfs/QmKAKJembatanDesaKonektivitas2025",
      paguAnggaranIDR: 1800000000, // Rp 1.8 Miliar
      waktuDibuat: now - 7200,
      batasWaktuCommit: now - 5400,
      batasWaktuReveal: now - 3600,
      selesai: true,
      pemenang: vendorB,
      namaPerusahaanPemenang: "PT Karya Nusantara",
      penawaranTerendahIDR: 1620000000, // Penghematan Rp 180.000.000 (10%)
      peserta: [vendorA, vendorB],
      penawaran: {
        [vendorA]: {
          vendorAddress: vendorA,
          vendorName: "PT Maju Bersama",
          hashTerkunci: generateCommitHash(1750000000, "saltJembatanA"),
          ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalJembatanA",
          hargaTerbukaIDR: 1750000000,
          saltDisimpan: "saltJembatanA",
          hargaDisimpan: 1750000000,
          sudahCommit: true,
          sudahReveal: true,
          memenuhiSyaratPagu: true,
          waktuCommit: now - 6000,
          waktuReveal: now - 4500
        },
        [vendorB]: {
          vendorAddress: vendorB,
          vendorName: "PT Karya Nusantara",
          hashTerkunci: generateCommitHash(1620000000, "saltJembatanB"),
          ipfsProposalTeknis: "ipfs://QmProposalJembatanB",
          hargaTerbukaIDR: 1620000000,
          saltDisimpan: "saltJembatanB",
          hargaDisimpan: 1620000000,
          sudahCommit: true,
          sudahReveal: true,
          memenuhiSyaratPagu: true,
          waktuCommit: now - 5800,
          waktuReveal: now - 4300
        }
      }
    }
  ];
}
