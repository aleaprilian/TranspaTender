import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { 
  SIMULATED_ACCOUNTS, 
  getInitialDemoTenders, 
  generateCommitHash,
  truncateAddress 
} from '../utils/crypto';
import { 
  TRANSPATENDER_ABI, 
  TRANSPATENDER_BYTECODE, 
  SUPPORTED_NETWORKS, 
  DEFAULT_NETWORK,
  getExplorerTxUrl 
} from '../contracts/contractAbi';
import { formatIpfsGatewayUrl } from '../utils/ipfsService';
import confetti from 'canvas-confetti';

const TenderContext = createContext();

export function TenderProvider({ children }) {
  // Mode: 'web3' | 'simulation'
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('transpatender_mode') || 'simulation';
  });

  // Current active account in simulation mode
  const [selectedAccountId, setSelectedAccountId] = useState('panitia');

  // Web3 state
  const [web3Account, setWeb3Account] = useState(null);
  const [web3ChainId, setWeb3ChainId] = useState(null);
  const [web3Balance, setWeb3Balance] = useState('0');
  const [contractOwner, setContractOwner] = useState(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState(() => {
    return localStorage.getItem('transpatender_contract_address') || '0x632d1F94F2D0f35128904bf062a568d2189586bb';
  });
  const [web3Error, setWeb3Error] = useState(null);
  const [isWeb3Loading, setIsWeb3Loading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global transaction status notification
  const [txStatus, setTxStatus] = useState({
    state: 'idle', // 'idle' | 'pending' | 'success' | 'error'
    message: '',
    txHash: null,
    error: null
  });

  // Time state:
  // In simulation: simulated offset allowed.
  // In web3: true real-world / blockchain time.
  const [timeOffset, setTimeOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Tenders state
  const [tenders, setTenders] = useState(() => {
    const saved = localStorage.getItem('transpatender_tenders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading saved tenders:", e);
      }
    }
    return getInitialDemoTenders();
  });

  // Audit Events
  const [auditEvents, setAuditEvents] = useState(() => {
    const saved = localStorage.getItem('transpatender_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        id: "evt-1",
        txHash: "0x8fae37299bb71018931b265c029fa2a884ecb1a80d52b4501a3cf8d120a11229",
        blockNumber: 12480112,
        eventName: "TenderDibuat",
        timestamp: now - 3600,
        idTender: 1,
        namaProyek: "Pengadaan Alat Medis RSUD Provinsi",
        summary: "Panitia Pemerintah menerbitkan tender dengan Pagu Rp 1.000.000.000 (Commit: 3m, Reveal: 3m)"
      },
      {
        id: "evt-2",
        txHash: "0x3ab82711ff60e451b033dceb976b0521eef00c735d4ba723ea6cae8d12975412",
        blockNumber: 12480135,
        eventName: "PenawaranTerkunciMasuk",
        timestamp: now - 3550,
        idTender: 1,
        vendor: SIMULATED_ACCOUNTS[1].address,
        namaPerusahaan: "PT Maju Bersama",
        ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalTeknisVendorA_RSUD",
        hashTerkunci: "0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658",
        summary: "PT Maju Bersama menyetor Hash Terkunci & Proposal IPFS"
      },
      {
        id: "evt-3",
        txHash: "0x77c229f3bb610d481239aaee8491bb4cae9710385ffca1927394ea00c2837261",
        blockNumber: 12480148,
        eventName: "PenawaranTerkunciMasuk",
        timestamp: now - 3520,
        idTender: 1,
        vendor: SIMULATED_ACCOUNTS[2].address,
        namaPerusahaan: "PT Karya Nusantara",
        ipfsProposalTeknis: "https://gateway.pinata.cloud/ipfs/QmProposalTeknisVendorB_RSUD",
        hashTerkunci: "0x4e61f26a1b2413e6c38dae094f31c26f005188bf246993ce8bb2e811c784e277",
        summary: "PT Karya Nusantara menyetor Hash Terkunci & Proposal IPFS"
      }
    ];
  });

  // Current active user identity
  const isOwner = Boolean(
    mode === 'web3' &&
    web3Account &&
    contractOwner &&
    web3Account.toLowerCase() === contractOwner.toLowerCase()
  );

  const currentAccount = mode === 'simulation'
    ? (SIMULATED_ACCOUNTS.find(a => a.id === selectedAccountId) || SIMULATED_ACCOUNTS[0])
    : {
        id: "web3-user",
        name: web3Account ? `Wallet (${truncateAddress(web3Account)})` : "Belum Terhubung",
        institution: isOwner 
          ? "Panitia Pemerintah (Contract Owner)" 
          : "Peserta Vendor / Publik",
        address: web3Account || ethers.ZeroAddress,
        role: isOwner ? "PANITIA" : "VENDOR",
        balance: `${web3Balance} ${(SUPPORTED_NETWORKS[web3ChainId]?.nativeCurrency?.symbol) || 'ETH'}`,
        badgeColor: isOwner ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-700 border border-brand-200"
      };

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      if (mode === 'simulation') {
        setCurrentTime(Math.floor(Date.now() / 1000) + timeOffset);
      } else {
        setCurrentTime(Math.floor(Date.now() / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, timeOffset]);

  // Persist mode & address
  useEffect(() => {
    localStorage.setItem('transpatender_mode', mode);
  }, [mode]);

  useEffect(() => {
    if (deployedContractAddress) {
      localStorage.setItem('transpatender_contract_address', deployedContractAddress);
      try {
        const raw = localStorage.getItem('transpatender_recent_contracts');
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        list = [deployedContractAddress, ...list.filter(a => a.toLowerCase() !== deployedContractAddress.toLowerCase())].slice(0, 8);
        localStorage.setItem('transpatender_recent_contracts', JSON.stringify(list));
      } catch (e) {}
    }
  }, [deployedContractAddress]);

  useEffect(() => {
    if (mode === 'simulation') {
      localStorage.setItem('transpatender_tenders', JSON.stringify(tenders));
    }
  }, [tenders, mode]);

  useEffect(() => {
    if (mode === 'simulation') {
      localStorage.setItem('transpatender_events', JSON.stringify(auditEvents));
    }
  }, [auditEvents, mode]);

  // -------------------------------------------------------------
  // Web3 Provider & Signer Helpers
  // -------------------------------------------------------------
  const getBrowserProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Dompet Web3 (MetaMask) tidak terdeteksi di peramban ini!");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const getSigner = useCallback(async () => {
    const provider = getBrowserProvider();
    return await provider.getSigner();
  }, [getBrowserProvider]);

  const getContractInstance = useCallback(async (withSigner = false) => {
    if (!deployedContractAddress || !ethers.isAddress(deployedContractAddress)) {
      throw new Error("Alamat smart contract TranspaTender belum ditentukan atau tidak valid!");
    }
    const provider = getBrowserProvider();
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(deployedContractAddress, TRANSPATENDER_ABI, signer);
    }
    return new ethers.Contract(deployedContractAddress, TRANSPATENDER_ABI, provider);
  }, [deployedContractAddress, getBrowserProvider]);

  // Refresh Account Balance
  const updateBalance = useCallback(async (account, provider) => {
    try {
      if (!account || !provider) return;
      const bal = await provider.getBalance(account);
      setWeb3Balance(Number(ethers.formatEther(bal)).toFixed(4));
    } catch (e) {
      console.warn("Could not fetch balance:", e);
    }
  }, []);

  // -------------------------------------------------------------
  // Web3 Connection & Network Switching
  // -------------------------------------------------------------
  const connectMetaMask = async (requestedChainId = 84532) => {
    if (!window.ethereum) {
      const err = "MetaMask tidak terdeteksi! Silakan pasang ekstensi browser MetaMask dari https://metamask.io";
      setWeb3Error(err);
      throw new Error(err);
    }

    try {
      setIsWeb3Loading(true);
      setWeb3Error(null);
      const provider = getBrowserProvider();
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const network = await provider.getNetwork();
      const currentChain = Number(network.chainId);

      setWeb3Account(accounts[0]);
      setWeb3ChainId(currentChain);
      setMode('web3');
      await updateBalance(accounts[0], provider);

      // Attempt to switch to requested network if different
      if (requestedChainId && currentChain !== requestedChainId) {
        await switchNetwork(requestedChainId);
      }
      return accounts[0];
    } catch (err) {
      console.error("MetaMask connection failed:", err);
      setWeb3Error(err.message);
      throw err;
    } finally {
      setIsWeb3Loading(false);
    }
  };

  const switchNetwork = async (targetChainId) => {
    const targetConfig = SUPPORTED_NETWORKS[targetChainId];
    if (!targetConfig || !window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetConfig.chainIdHex }],
      });
      setWeb3ChainId(targetChainId);
    } catch (switchError) {
      // 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetConfig.chainIdHex,
              chainName: targetConfig.chainName,
              rpcUrls: targetConfig.rpcUrls,
              nativeCurrency: targetConfig.nativeCurrency,
              blockExplorerUrls: targetConfig.blockExplorerUrls
            }],
          });
          setWeb3ChainId(targetChainId);
        } catch (addError) {
          console.error("Failed to add network:", addError);
          throw addError;
        }
      } else {
        console.error("Failed to switch network:", switchError);
        throw switchError;
      }
    }
  };

  const disconnectWallet = () => {
    setWeb3Account(null);
    setWeb3ChainId(null);
    setWeb3Balance('0');
    setContractOwner(null);
    setMode('simulation');
  };

  // Listen to MetaMask account & chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWeb3Account(accounts[0]);
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateBalance(accounts[0], provider);
        } catch (e) {}
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      setWeb3ChainId(chainId);
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Auto-check if already authorized
    window.ethereum.request({ method: 'eth_accounts' }).then(async (accs) => {
      if (accs && accs.length > 0) {
        setWeb3Account(accs[0]);
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const net = await provider.getNetwork();
          setWeb3ChainId(Number(net.chainId));
          await updateBalance(accs[0], provider);
        } catch (e) {}
      }
    }).catch(() => {});

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateBalance]);

  // -------------------------------------------------------------
  // Smart Contract Deployment from Injected Wallet
  // -------------------------------------------------------------
  const deployContractOnChain = async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask tidak terdeteksi!");
    }

    try {
      setTxStatus({
        state: 'pending',
        message: 'Menginisialisasi deployment TranspaTender.sol ke blockchain. Silakan konfirmasi di MetaMask...',
        txHash: null,
        error: null
      });

      const signer = await getSigner();
      const factory = new ethers.ContractFactory(TRANSPATENDER_ABI, TRANSPATENDER_BYTECODE, signer);
      
      const deploymentTx = await factory.deploy();
      const txHash = deploymentTx.deploymentTransaction()?.hash;

      setTxStatus({
        state: 'pending',
        message: 'Transaksi deployment terkirim! Menunggu konfirmasi penambangan blok (Mining)...',
        txHash,
        error: null
      });

      const deployedContract = await deploymentTx.waitForDeployment();
      const contractAddress = await deployedContract.getAddress();

      setDeployedContractAddress(contractAddress);
      setContractOwner(await signer.getAddress());

      // Register audit event for contract deployment
      const newEvt = {
        id: `deploy-${Date.now()}`,
        txHash: txHash || "0x00",
        blockNumber: await (getBrowserProvider()).getBlockNumber(),
        eventName: "ContractDeployed",
        timestamp: Math.floor(Date.now() / 1000),
        idTender: 0,
        summary: `Smart Contract TranspaTender resmi dideploy ke alamat ${contractAddress}`
      };
      setAuditEvents(prev => [newEvt, ...prev]);

      // Confetti celebration
      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}

      setTxStatus({
        state: 'success',
        message: `Smart Contract berhasil dideploy! Alamat: ${contractAddress}`,
        txHash,
        error: null
      });

      // Synchronize state from new contract
      await syncContractData(contractAddress);
      return contractAddress;
    } catch (err) {
      console.error("Contract deployment error:", err);
      const msg = err.reason || err.message || "Gagal mendepoy smart contract.";
      setTxStatus({
        state: 'error',
        message: `Deployment Gagal: ${msg}`,
        txHash: null,
        error: msg
      });
      throw err;
    }
  };

  // Connect to an existing deployed contract address
  const attachContract = async (address) => {
    if (!ethers.isAddress(address)) {
      throw new Error("Format alamat Ethereum tidak valid (harus diawali 0x dan 42 karakter).");
    }

    try {
      setIsSyncing(true);
      const provider = getBrowserProvider();
      const code = await provider.getCode(address);
      if (code === '0x' || code === '0x0') {
        throw new Error("Tidak ditemukan bytecode smart contract pada alamat ini di jaringan saat ini!");
      }

      const contract = new ethers.Contract(address, TRANSPATENDER_ABI, provider);
      const owner = await contract.panitiaPemerintah();

      setDeployedContractAddress(address);
      setContractOwner(owner);
      localStorage.setItem('transpatender_contract_address', address);

      await syncContractData(address);
      return owner;
    } catch (err) {
      console.error("Failed to attach contract:", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // -------------------------------------------------------------
  // Synchronize All On-Chain Data (Tenders + Bids + Events)
  // -------------------------------------------------------------
  const syncContractData = useCallback(async (targetAddress) => {
    const addr = targetAddress || deployedContractAddress;
    if (!addr || !ethers.isAddress(addr) || !window.ethereum) return;

    try {
      setIsSyncing(true);
      const provider = getBrowserProvider();
      const contract = new ethers.Contract(addr, TRANSPATENDER_ABI, provider);

      // 1. Fetch Owner
      try {
        const owner = await contract.panitiaPemerintah();
        setContractOwner(owner);
      } catch (e) {}

      // 2. Fetch Historical Logs from Blockchain (Base Sepolia limits eth_getLogs to 500 blocks)
      let tCreatedLogs = [], bidCommitLogs = [], bidRevealLogs = [], winnerLogs = [];
      try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 450); // Safe within 500 block limit

        [tCreatedLogs, bidCommitLogs, bidRevealLogs, winnerLogs] = await Promise.all([
          contract.queryFilter(contract.filters.TenderDibuat(), fromBlock, 'latest').catch(() => []),
          contract.queryFilter(contract.filters.PenawaranTerkunciMasuk(), fromBlock, 'latest').catch(() => []),
          contract.queryFilter(contract.filters.PenawaranDibuka(), fromBlock, 'latest').catch(() => []),
          contract.queryFilter(contract.filters.PemenangDitetapkan(), fromBlock, 'latest').catch(() => [])
        ]);

        const parsedEvents = [];

        tCreatedLogs.forEach(log => {
          parsedEvents.push({
            id: `evt-chain-${log.transactionHash}-${log.index}`,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            eventName: "TenderDibuat",
            timestamp: currentTime,
            idTender: Number(log.args.idTender),
            namaProyek: log.args.namaProyek,
            paguAnggaranIDR: Number(log.args.paguAnggaranIDR),
            summary: `Panitia Pemerintah menerbitkan tender #${Number(log.args.idTender)}: "${log.args.namaProyek}" (Pagu: Rp ${Number(log.args.paguAnggaranIDR).toLocaleString('id-ID')})`
          });
        });

        bidCommitLogs.forEach(log => {
          parsedEvents.push({
            id: `evt-chain-${log.transactionHash}-${log.index}`,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            eventName: "PenawaranTerkunciMasuk",
            timestamp: currentTime,
            idTender: Number(log.args.idTender),
            vendor: log.args.vendor,
            namaPerusahaan: log.args.namaPerusahaan || "",
            ipfsProposalTeknis: log.args.ipfsProposalTeknis || "",
            hashTerkunci: log.args.hashTerkunci,
            summary: `${log.args.namaPerusahaan ? `${log.args.namaPerusahaan} (${truncateAddress(log.args.vendor)})` : `Vendor ${truncateAddress(log.args.vendor)}`} mengunci Sealed Bid pada lelang #${Number(log.args.idTender)} (Hash: ${log.args.hashTerkunci.slice(0, 10)}...)`
          });
        });

        bidRevealLogs.forEach(log => {
          parsedEvents.push({
            id: `evt-chain-${log.transactionHash}-${log.index}`,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            eventName: "PenawaranDibuka",
            timestamp: currentTime,
            idTender: Number(log.args.idTender),
            vendor: log.args.vendor,
            namaPerusahaan: log.args.namaPerusahaan || "",
            hargaIDR: Number(log.args.hargaIDR),
            memenuhiSyaratPagu: log.args.memenuhiSyaratPagu,
            summary: `${log.args.namaPerusahaan ? `${log.args.namaPerusahaan} (${truncateAddress(log.args.vendor)})` : `Vendor ${truncateAddress(log.args.vendor)}`} berhasil membongkar harga lelang #${Number(log.args.idTender)}: Rp ${Number(log.args.hargaIDR).toLocaleString('id-ID')} (${log.args.memenuhiSyaratPagu ? "Lolos Pagu" : "Gugur Pagu"})`
          });
        });

        winnerLogs.forEach(log => {
          parsedEvents.push({
            id: `evt-chain-${log.transactionHash}-${log.index}`,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            eventName: "PemenangDitetapkan",
            timestamp: currentTime,
            idTender: Number(log.args.idTender),
            pemenang: log.args.pemenang,
            namaPerusahaanPemenang: log.args.namaPerusahaanPemenang || "",
            hargaFinalIDR: Number(log.args.hargaFinalIDR),
            summary: `LELANG RESMI DISELESAIKAN! Pemenang tender #${Number(log.args.idTender)}: ${log.args.namaPerusahaanPemenang ? `${log.args.namaPerusahaanPemenang} (${truncateAddress(log.args.pemenang)})` : truncateAddress(log.args.pemenang)} dengan nilai penawaran Rp ${Number(log.args.hargaFinalIDR).toLocaleString('id-ID')}`
          });
        });

        if (parsedEvents.length > 0) {
          setAuditEvents(prev => {
            const map = new Map();
            parsedEvents.forEach(e => map.set(e.id, e));
            prev.forEach(e => {
              if (!map.has(e.id)) map.set(e.id, e);
            });
            return Array.from(map.values()).sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
          });
        }
      } catch (e) {
        console.warn("Event query error:", e);
      }

      // 3. Fetch Total Tenders & assemble bids from on-chain records
      const totalBn = await contract.jumlahTender();
      const count = Number(totalBn);

      const loadedTenders = [];

      for (let i = 1; i <= count; i++) {
        let t;
        try {
          t = await contract.daftarTender(i);
        } catch (tErr) {
          console.warn(`Could not fetch tender #${i} directly from contract:`, tErr);
          // Retain from existing state if already present
          const existing = tenders.find(item => item.id === i);
          if (existing) loadedTenders.push(existing);
          continue;
        }

        let totalPesertaBn = 0;
        try {
          totalPesertaBn = await contract.lihatTotalPeserta(i);
        } catch (pErr) {}

        // Build tender bids dictionary
        const tenderBids = {};

        // 1. Populate from event logs if available
        bidCommitLogs
          .filter(log => Number(log.args.idTender) === i)
          .forEach(cLog => {
            const vAddr = cLog.args.vendor;
            const rLog = bidRevealLogs.find(r => Number(r.args.idTender) === i && r.args.vendor.toLowerCase() === vAddr.toLowerCase());
            const isMe = web3Account && vAddr.toLowerCase() === web3Account.toLowerCase();
            const localSaved = isMe ? getVendorBidLocal(i, web3Account) : null;
            const resolvedName = cLog.args.namaPerusahaan || localSaved?.namaPerusahaan || (isMe ? `Akun Anda (${truncateAddress(vAddr)})` : `Vendor (${truncateAddress(vAddr)})`);

            tenderBids[vAddr.toLowerCase()] = {
              vendorAddress: vAddr,
              vendorName: resolvedName,
              hashTerkunci: cLog.args.hashTerkunci,
              ipfsProposalTeknis: cLog.args.ipfsProposalTeknis,
              hargaTerbukaIDR: rLog ? Number(rLog.args.hargaIDR) : 0,
              sudahCommit: true,
              sudahReveal: !!rLog,
              memenuhiSyaratPagu: rLog ? rLog.args.memenuhiSyaratPagu : false,
              saltDisimpan: localSaved?.salt || '',
              hargaDisimpan: localSaved?.harga || (rLog ? Number(rLog.args.hargaIDR) : 0),
              waktuCommit: localSaved?.timestamp || 0,
              waktuReveal: 0
            };
          });

        // 2. Fetch directly from on-chain daftarPesertaTender to guarantee all participants are loaded
        const totalPesertaNum = Number(totalPesertaBn || 0);
        for (let pIdx = 0; pIdx < totalPesertaNum; pIdx++) {
          try {
            const pAddr = await contract.daftarPesertaTender(i, pIdx);
            if (pAddr && pAddr !== ethers.ZeroAddress && !tenderBids[pAddr.toLowerCase()]) {
              const rawBid = await contract.dataPenawaran(i, pAddr);
              const sudahCommit = Boolean(rawBid.sudahCommit !== undefined ? rawBid.sudahCommit : rawBid[3]);
              if (sudahCommit) {
                const isMe = web3Account && pAddr.toLowerCase() === web3Account.toLowerCase();
                const localSaved = getVendorBidLocal(i, pAddr);
                const isWinner = t.pemenang && pAddr.toLowerCase() === (t.pemenang !== undefined ? t.pemenang : t[7])?.toLowerCase();
                const resolvedName = rawBid.namaPerusahaan || localSaved?.namaPerusahaan || (isWinner ? `Vendor Pemenang (${truncateAddress(pAddr)})` : (isMe ? `Akun Anda (${truncateAddress(pAddr)})` : `Vendor Rekanan (${truncateAddress(pAddr)})`));

                tenderBids[pAddr.toLowerCase()] = {
                  vendorAddress: pAddr,
                  vendorName: resolvedName,
                  hashTerkunci: rawBid.hashTerkunci !== undefined ? rawBid.hashTerkunci : rawBid[0],
                  ipfsProposalTeknis: rawBid.ipfsProposalTeknis !== undefined ? rawBid.ipfsProposalTeknis : rawBid[1],
                  hargaTerbukaIDR: Number(rawBid.hargaTerbukaIDR !== undefined ? rawBid.hargaTerbukaIDR : rawBid[2]),
                  sudahCommit: true,
                  sudahReveal: Boolean(rawBid.sudahReveal !== undefined ? rawBid.sudahReveal : rawBid[4]),
                  memenuhiSyaratPagu: Boolean(rawBid.memenuhiSyaratPagu !== undefined ? rawBid.memenuhiSyaratPagu : rawBid[5]),
                  saltDisimpan: localSaved?.salt || '',
                  hargaDisimpan: localSaved?.harga || (rawBid.sudahReveal ? Number(rawBid.hargaTerbukaIDR) : 0),
                  waktuCommit: localSaved?.timestamp || 0,
                  waktuReveal: 0
                };
              }
            }
          } catch (pErr) {
            console.warn(`Error reading participant #${pIdx} for tender #${i}:`, pErr);
          }
        }

        // 3. Check winner address directly if not in tenderBids
        const tenderWinner = (t.pemenang !== undefined ? t.pemenang : t[7]) || ethers.ZeroAddress;
        if (tenderWinner && tenderWinner !== ethers.ZeroAddress && !tenderBids[tenderWinner.toLowerCase()]) {
          try {
            const rawBid = await contract.dataPenawaran(i, tenderWinner);
            const sudahCommit = Boolean(rawBid.sudahCommit !== undefined ? rawBid.sudahCommit : rawBid[3]);
            if (sudahCommit) {
              const localSaved = getVendorBidLocal(i, tenderWinner);
              tenderBids[tenderWinner.toLowerCase()] = {
                vendorAddress: tenderWinner,
                vendorName: rawBid.namaPerusahaan || localSaved?.namaPerusahaan || `Vendor Pemenang (${truncateAddress(tenderWinner)})`,
                hashTerkunci: rawBid.hashTerkunci !== undefined ? rawBid.hashTerkunci : rawBid[0],
                ipfsProposalTeknis: rawBid.ipfsProposalTeknis !== undefined ? rawBid.ipfsProposalTeknis : rawBid[1],
                hargaTerbukaIDR: Number(rawBid.hargaTerbukaIDR !== undefined ? rawBid.hargaTerbukaIDR : rawBid[2]),
                sudahCommit: true,
                sudahReveal: Boolean(rawBid.sudahReveal !== undefined ? rawBid.sudahReveal : rawBid[4]),
                memenuhiSyaratPagu: Boolean(rawBid.memenuhiSyaratPagu !== undefined ? rawBid.memenuhiSyaratPagu : rawBid[5]),
                saltDisimpan: localSaved?.salt || '',
                hargaDisimpan: localSaved?.harga || (rawBid.sudahReveal ? Number(rawBid.hargaTerbukaIDR) : 0),
                waktuCommit: localSaved?.timestamp || 0,
                waktuReveal: 0
              };
            }
          } catch (wErr) {}
        }

        // 4. Also check direct contract.dataPenawaran for web3Account in case of event index delay
        if (web3Account && !tenderBids[web3Account.toLowerCase()]) {
          try {
            const rawBid = await contract.dataPenawaran(i, web3Account);
            if (rawBid && (rawBid.sudahCommit || rawBid[3])) {
              const localSaved = getVendorBidLocal(i, web3Account);
              const resolvedName = rawBid.namaPerusahaan || localSaved?.namaPerusahaan || `Akun Anda (${truncateAddress(web3Account)})`;
              tenderBids[web3Account.toLowerCase()] = {
                vendorAddress: web3Account,
                vendorName: resolvedName,
                hashTerkunci: rawBid.hashTerkunci !== undefined ? rawBid.hashTerkunci : rawBid[0],
                ipfsProposalTeknis: rawBid.ipfsProposalTeknis !== undefined ? rawBid.ipfsProposalTeknis : rawBid[1],
                hargaTerbukaIDR: Number(rawBid.hargaTerbukaIDR !== undefined ? rawBid.hargaTerbukaIDR : rawBid[2]),
                sudahCommit: Boolean(rawBid.sudahCommit !== undefined ? rawBid.sudahCommit : rawBid[3]),
                sudahReveal: Boolean(rawBid.sudahReveal !== undefined ? rawBid.sudahReveal : rawBid[4]),
                memenuhiSyaratPagu: Boolean(rawBid.memenuhiSyaratPagu !== undefined ? rawBid.memenuhiSyaratPagu : rawBid[5]),
                saltDisimpan: localSaved?.salt || '',
                hargaDisimpan: localSaved?.harga || (rawBid.sudahReveal ? Number(rawBid.hargaTerbukaIDR) : 0),
                waktuCommit: localSaved?.timestamp || 0,
                waktuReveal: 0
              };
            }
          } catch (e) {
            console.warn(`Could not read bid for tender #${i}:`, e);
          }
        }

        const totalPesertaCount = Math.max(Number(totalPesertaBn), Object.keys(tenderBids).length);

        const tenderId = Number(t.id !== undefined ? t.id : t[0]);
        const namaProyek = (t.namaProyek !== undefined ? t.namaProyek : t[1]) || `Tender #${i}`;
        const ipfsDokumenKAK = (t.ipfsDokumenKAK !== undefined ? t.ipfsDokumenKAK : t[2]) || "";
        const paguAnggaranIDR = Number(t.paguAnggaranIDR !== undefined ? t.paguAnggaranIDR : t[3]);
        const batasWaktuCommit = Number(t.batasWaktuCommit !== undefined ? t.batasWaktuCommit : t[4]);
        const batasWaktuReveal = Number(t.batasWaktuReveal !== undefined ? t.batasWaktuReveal : t[5]);
        const selesai = Boolean(t.selesai !== undefined ? t.selesai : t[6]);
        const pemenang = (t.pemenang !== undefined ? t.pemenang : t[7]) || ethers.ZeroAddress;
        const penawaranTerendahIDR = Number(t.penawaranTerendahIDR !== undefined ? t.penawaranTerendahIDR : (t[8] !== undefined ? t[8] : 0));

        // Winner company name resolution
        let winnerCompanyName = "";
        if (pemenang && pemenang !== ethers.ZeroAddress) {
          winnerCompanyName = tenderBids[pemenang.toLowerCase()]?.vendorName || "";
          if (!winnerCompanyName) {
            try {
              const pData = await contract.dataPenawaran(i, pemenang);
              winnerCompanyName = pData.namaPerusahaan || "";
            } catch (e) {}
          }
        }

        loadedTenders.push({
          id: tenderId,
          namaProyek,
          kategori: "Pengadaan Publik Smart Contract",
          satuanKerja: "Panitia Pemerintah Terverifikasi",
          ipfsDokumenKAK,
          paguAnggaranIDR,
          waktuDibuat: batasWaktuCommit - 300,
          batasWaktuCommit,
          batasWaktuReveal,
          selesai,
          pemenang,
          namaPerusahaanPemenang: winnerCompanyName,
          penawaranTerendahIDR,
          peserta: Array.from({ length: totalPesertaCount }, () => "Peserta On-Chain"),
          penawaran: tenderBids
        });
      }

      if (loadedTenders.length > 0) {
        // Reverse so newest appears first
        loadedTenders.reverse();
        setTenders(loadedTenders);
      }
    } catch (err) {
      console.error("Error syncing on-chain data:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [deployedContractAddress, web3Account, currentTime, getBrowserProvider, tenders]);

  // Auto-sync when contract address changes or wallet changes
  useEffect(() => {
    if (mode === 'web3' && deployedContractAddress) {
      syncContractData();
    }
  }, [mode, deployedContractAddress, web3Account, syncContractData]);

  // -------------------------------------------------------------
  // Local Bid Vault Helper (Prevents vendor losing secret salt!)
  // -------------------------------------------------------------
  const saveVendorBidLocal = (tenderId, account, data) => {
    if (!tenderId || !account) return;
    const key = `transpatender_vault_${tenderId}_${account.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify({
      ...data,
      timestamp: Math.floor(Date.now() / 1000)
    }));
  };

  const getVendorBidLocal = (tenderId, account) => {
    if (!tenderId || !account) return null;
    const key = `transpatender_vault_${tenderId}_${account.toLowerCase()}`;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch (e) {
      return null;
    }
  };

  // Helper for generating random pseudo tx hash (for simulation)
  const pseudoHash = () => "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');

  // -------------------------------------------------------------
  // 1. Buat Tender Baru
  // -------------------------------------------------------------
  const buatTender = async ({ namaProyek, kategori, satuanKerja, ipfsDokumenKAK, paguAnggaranIDR, durasiCommitDetik, durasiRevealDetik }) => {
    if (mode === 'web3') {
      if (!deployedContractAddress) {
        throw new Error("Alamat smart contract belum terhubung! Silakan deploy atau masukkan alamat kontrak terlebih dahulu.");
      }

      setTxStatus({
        state: 'pending',
        message: 'Mengirim transaksi pembuatan tender ke blockchain. Silakan konfirmasi di MetaMask...',
        txHash: null,
        error: null
      });

      try {
        const contract = await getContractInstance(true);
        const tx = await contract.buatTender(
          namaProyek,
          ipfsDokumenKAK || `ipfs://QmKAK_${Date.now()}`,
          BigInt(paguAnggaranIDR),
          BigInt(durasiCommitDetik),
          BigInt(durasiRevealDetik)
        );

        setTxStatus({
          state: 'pending',
          message: 'Transaksi tender baru terkirim! Menunggu konfirmasi blok...',
          txHash: tx.hash,
          error: null
        });

        const receipt = await tx.wait();

        // Parse TenderDibuat from logs if available, or determine new tender ID
        let newTenderId = null;
        let newCommitDeadline = null;
        let newRevealDeadline = null;

        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const parsed = contract.interface.parseLog(log);
              if (parsed && parsed.name === 'TenderDibuat') {
                newTenderId = Number(parsed.args.idTender);
                newCommitDeadline = Number(parsed.args.batasWaktuCommit);
                newRevealDeadline = Number(parsed.args.batasWaktuReveal);
                break;
              }
            } catch (e) {}
          }
        }

        if (!newTenderId) {
          try {
            const countBn = await contract.jumlahTender();
            newTenderId = Number(countBn);
          } catch (e) {
            newTenderId = (tenders.length > 0 ? Math.max(...tenders.map(t => t.id)) : 0) + 1;
          }
        }

        const now = Math.floor(Date.now() / 1000);
        const finalCommit = newCommitDeadline || (now + Number(durasiCommitDetik));
        const finalReveal = newRevealDeadline || (finalCommit + Number(durasiRevealDetik));

        const optimisticTender = {
          id: newTenderId,
          namaProyek,
          kategori: kategori || "Pengadaan Publik Smart Contract",
          satuanKerja: satuanKerja || "Panitia Pemerintah Terverifikasi",
          ipfsDokumenKAK: ipfsDokumenKAK || `ipfs://QmKAK_${newTenderId}_${Date.now()}`,
          paguAnggaranIDR: Number(paguAnggaranIDR),
          waktuDibuat: now,
          batasWaktuCommit: finalCommit,
          batasWaktuReveal: finalReveal,
          selesai: false,
          pemenang: ethers.ZeroAddress,
          penawaranTerendahIDR: Number(paguAnggaranIDR) + 1,
          peserta: [],
          penawaran: {}
        };

        // Immediately update tenders state so it displays without waiting
        setTenders(prev => {
          const filtered = prev.filter(t => t.id !== newTenderId);
          return [optimisticTender, ...filtered];
        });

        // Add optimistic event to audit trail
        const optimisticEvent = {
          id: `evt-chain-${receipt.hash}-${newTenderId}`,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber || 0,
          eventName: "TenderDibuat",
          timestamp: now,
          idTender: newTenderId,
          namaProyek,
          paguAnggaranIDR: Number(paguAnggaranIDR),
          summary: `Panitia Pemerintah menerbitkan tender #${newTenderId}: "${namaProyek}" (Pagu: Rp ${Number(paguAnggaranIDR).toLocaleString('id-ID')})`
        };
        setAuditEvents(prev => [optimisticEvent, ...prev.filter(e => e.txHash !== receipt.hash)]);

        setTxStatus({
          state: 'success',
          message: `Tender "${namaProyek}" sukses diterbitkan di blockchain!`,
          txHash: receipt.hash,
          error: null
        });

        try {
          await syncContractData();
        } catch (sErr) {
          console.warn("Background sync error after buatTender:", sErr);
        }

        return receipt;
      } catch (err) {
        console.error("Web3 buatTender error:", err);
        const msg = err.reason || err.message || "Gagal membuat tender di blockchain.";
        setTxStatus({
          state: 'error',
          message: `Transaksi Ditolak: ${msg}`,
          txHash: null,
          error: msg
        });
        throw err;
      }
    }

    // --- SIMULATION MODE ---
    const newId = tenders.length > 0 ? Math.max(...tenders.map(t => t.id)) + 1 : 1;
    const waktuSekarang = currentTime;
    const batasWaktuCommit = waktuSekarang + Number(durasiCommitDetik);
    const batasWaktuReveal = batasWaktuCommit + Number(durasiRevealDetik);

    const newTender = {
      id: newId,
      namaProyek,
      kategori: kategori || "Pengadaan Barang / Jasa",
      satuanKerja: satuanKerja || "Panitia Pengadaan",
      ipfsDokumenKAK: ipfsDokumenKAK || `ipfs://QmKAK${newId}_${Date.now()}`,
      paguAnggaranIDR: Number(paguAnggaranIDR),
      waktuDibuat: waktuSekarang,
      batasWaktuCommit,
      batasWaktuReveal,
      selesai: false,
      pemenang: ethers.ZeroAddress,
      penawaranTerendahIDR: Number(paguAnggaranIDR) + 1,
      peserta: [],
      penawaran: {}
    };

    setTenders(prev => [newTender, ...prev]);

    const newEvent = {
      id: `evt-${Date.now()}`,
      txHash: pseudoHash(),
      blockNumber: 12480000 + Math.floor(Math.random() * 5000),
      eventName: "TenderDibuat",
      timestamp: waktuSekarang,
      idTender: newId,
      namaProyek,
      paguAnggaranIDR,
      summary: `Panitia Pemerintah membuat tender "${namaProyek}" (Pagu: Rp ${Number(paguAnggaranIDR).toLocaleString('id-ID')})`
    };

    setAuditEvents(prev => [newEvent, ...prev]);
    return newTender;
  };

  // -------------------------------------------------------------
  // 2. Kirim Penawaran Terkunci (Fase Commit / Sealed Bid)
  // -------------------------------------------------------------
  const kirimPenawaranTerkunci = async ({ idTender, namaPerusahaan, hashTerkunci, ipfsProposalTeknis, hargaAsliIDR, kataSandiRahasia }) => {
    const finalCompanyName = (namaPerusahaan || currentAccount.institution || currentAccount.name || "Vendor Rekanan").trim();
    const finalProposalUrl = ipfsProposalTeknis ? formatIpfsGatewayUrl(ipfsProposalTeknis) : `https://gateway.pinata.cloud/ipfs/QmProposal_${Date.now()}`;

    if (mode === 'web3') {
      if (!deployedContractAddress) {
        throw new Error("Smart contract belum terhubung!");
      }

      setTxStatus({
        state: 'pending',
        message: 'Mengirim penawaran terkunci (Sealed Bid) ke blockchain. Konfirmasi di MetaMask...',
        txHash: null,
        error: null
      });

      try {
        const contract = await getContractInstance(true);
        let tx;
        try {
          // Explicitly call the 4-parameter version with exact signature for Ethers v6
          const fn4 = contract.getFunction("kirimPenawaranTerkunci(uint256,string,bytes32,string)");
          tx = await fn4(
            BigInt(idTender),
            finalCompanyName,
            hashTerkunci,
            finalProposalUrl
          );
        } catch (firstErr) {
          // Fallback to legacy 3-parameter overload only if contract does not support 4 parameters
          console.warn("Falling back to 3-parameter kirimPenawaranTerkunci:", firstErr);
          const fn3 = contract.getFunction("kirimPenawaranTerkunci(uint256,bytes32,string)");
          tx = await fn3(
            BigInt(idTender),
            hashTerkunci,
            finalProposalUrl
          );
        }

        setTxStatus({
          state: 'pending',
          message: 'Transaksi penawaran terkirim! Menunggu konfirmasi blok...',
          txHash: tx.hash,
          error: null
        });

        const receipt = await tx.wait();

        // Save secret credentials in local encrypted/safe vault for reveal phase
        if (web3Account) {
          saveVendorBidLocal(idTender, web3Account, {
            namaPerusahaan: finalCompanyName,
            harga: Number(hargaAsliIDR),
            salt: kataSandiRahasia,
            hash: hashTerkunci,
            ipfs: finalProposalUrl
          });
        }

        // Optimistically update tender bids in state
        if (web3Account) {
          setTenders(prev => prev.map(t => {
            if (t.id === Number(idTender)) {
              const currentPeserta = t.peserta || [];
              const updatedPeserta = currentPeserta.includes(web3Account) ? currentPeserta : [...currentPeserta, web3Account];
              return {
                ...t,
                peserta: updatedPeserta,
                penawaran: {
                  ...(t.penawaran || {}),
                  [web3Account.toLowerCase()]: {
                    vendorAddress: web3Account,
                    vendorName: finalCompanyName,
                    hashTerkunci,
                    ipfsProposalTeknis: finalProposalUrl,
                    hargaTerbukaIDR: 0,
                    sudahCommit: true,
                    sudahReveal: false,
                    memenuhiSyaratPagu: false,
                    saltDisimpan: kataSandiRahasia || '',
                    hargaDisimpan: Number(hargaAsliIDR) || 0,
                    waktuCommit: Math.floor(Date.now() / 1000),
                    waktuReveal: 0
                  }
                }
              };
            }
            return t;
          }));
        }

        setTxStatus({
          state: 'success',
          message: 'Penawaran Terkunci (Sealed Bid) berhasil dicatat permanen di blockchain!',
          txHash: receipt.hash,
          error: null
        });

        try {
          await syncContractData();
        } catch (sErr) {
          console.warn("Background sync warning after bid commit:", sErr);
        }

        return receipt;
      } catch (err) {
        console.error("Web3 kirimPenawaranTerkunci error:", err);
        const msg = err.reason || err.message || "Gagal mengirim penawaran terkunci.";
        setTxStatus({
          state: 'error',
          message: `Transaksi Gagal: ${msg}`,
          txHash: null,
          error: msg
        });
        throw err;
      }
    }

    // --- SIMULATION MODE ---
    const tender = tenders.find(t => t.id === Number(idTender));
    if (!tender) throw new Error("Tender tidak ditemukan!");

    if (currentTime > tender.batasWaktuCommit) {
      throw new Error("Gagal: Masa pendaftaran (Commit) sudah ditutup!");
    }

    const vendorAddress = currentAccount.address;
    if (tender.penawaran[vendorAddress]?.sudahCommit) {
      throw new Error("Gagal: Anda sudah mengirim penawaran sebelumnya untuk tender ini!");
    }

    const updatedTenders = tenders.map(t => {
      if (t.id === Number(idTender)) {
        return {
          ...t,
          peserta: t.peserta.includes(vendorAddress) ? t.peserta : [...t.peserta, vendorAddress],
          penawaran: {
            ...t.penawaran,
            [vendorAddress]: {
              vendorAddress,
              vendorName: finalCompanyName,
              hashTerkunci,
              ipfsProposalTeknis: finalProposalUrl,
              hargaTerbukaIDR: 0,
              saltDisimpan: kataSandiRahasia || "",
              hargaDisimpan: hargaAsliIDR || 0,
              sudahCommit: true,
              sudahReveal: false,
              memenuhiSyaratPagu: false,
              waktuCommit: currentTime,
              waktuReveal: 0
            }
          }
        };
      }
      return t;
    });

    setTenders(updatedTenders);

    const newEvent = {
      id: `evt-${Date.now()}`,
      txHash: pseudoHash(),
      blockNumber: 12480000 + Math.floor(Math.random() * 5000),
      eventName: "PenawaranTerkunciMasuk",
      timestamp: currentTime,
      idTender: Number(idTender),
      vendor: vendorAddress,
      namaPerusahaan: finalCompanyName,
      ipfsProposalTeknis: finalProposalUrl,
      hashTerkunci,
      summary: `${finalCompanyName} (${truncateAddress(vendorAddress)}) menyetor Sealed Bid & Proposal IPFS (Hash: ${hashTerkunci.slice(0, 10)}...)`
    };

    setAuditEvents(prev => [newEvent, ...prev]);
  };

  // -------------------------------------------------------------
  // 3. Buka Penawaran (Fase Reveal / Pembongkaran Harga)
  // -------------------------------------------------------------
  const bukaPenawaran = async ({ idTender, hargaAsliIDR, kataSandiRahasia }) => {
    const hargaClean = Number(String(hargaAsliIDR).replace(/[^0-9]/g, ''));
    if (!hargaClean || hargaClean <= 0) {
      throw new Error("Harga penawaran asli harus berupa nominal valid lebih dari 0!");
    }
    if (!kataSandiRahasia) {
      throw new Error("Kata sandi rahasia komitmen wajib diisi!");
    }

    if (mode === 'web3') {
      if (!deployedContractAddress) {
        throw new Error("Smart contract belum terhubung!");
      }

      setTxStatus({
        state: 'pending',
        message: 'Mengirim verifikasi buka harga ke blockchain. Konfirmasi di MetaMask...',
        txHash: null,
        error: null
      });

      try {
        const contract = await getContractInstance(true);
        const tx = await contract.bukaPenawaran(
          BigInt(idTender),
          BigInt(hargaClean),
          kataSandiRahasia
        );

        setTxStatus({
          state: 'pending',
          message: 'Transaksi pembukaan harga terkirim! Menunggu verifikasi keabsahan hash di blockchain...',
          txHash: tx.hash,
          error: null
        });

        const receipt = await tx.wait();

        // Optimistically update tender bid state
        if (web3Account) {
          setTenders(prev => prev.map(t => {
            if (t.id === Number(idTender)) {
              const userBid = t.penawaran?.[web3Account.toLowerCase()] || {};
              const fitsBudget = hargaClean <= t.paguAnggaranIDR && hargaClean > 0;
              let lowest = t.penawaranTerendahIDR;
              let winner = t.pemenang;
              if (fitsBudget && (lowest > t.paguAnggaranIDR || hargaClean < lowest)) {
                lowest = hargaClean;
                winner = web3Account;
              }
              return {
                ...t,
                penawaranTerendahIDR: lowest,
                pemenang: winner,
                penawaran: {
                  ...(t.penawaran || {}),
                  [web3Account.toLowerCase()]: {
                    ...userBid,
                    sudahReveal: true,
                    hargaTerbukaIDR: hargaClean,
                    memenuhiSyaratPagu: fitsBudget
                  }
                }
              };
            }
            return t;
          }));
        }

        setTxStatus({
          state: 'success',
          message: `Pembukaan harga berhasil terverifikasi matematis di smart contract! Nilai: Rp ${hargaClean.toLocaleString('id-ID')}`,
          txHash: receipt.hash,
          error: null
        });

        try {
          await syncContractData();
        } catch (sErr) {
          console.warn("Background sync warning after reveal:", sErr);
        }

        return receipt;
      } catch (err) {
        console.error("Web3 bukaPenawaran error:", err);
        const msg = err.reason || err.message || "Gagal membuka penawaran.";
        setTxStatus({
          state: 'error',
          message: `Pembukaan Harga Gagal: ${msg}`,
          txHash: null,
          error: msg
        });
        throw err;
      }
    }

    // --- SIMULATION MODE ---
    const tender = tenders.find(t => t.id === Number(idTender));
    if (!tender) throw new Error("Tender tidak ditemukan!");

    if (currentTime <= tender.batasWaktuCommit) {
      throw new Error("Gagal: Fase Commit belum berakhir, belum saatnya membuka harga!");
    }
    if (currentTime > tender.batasWaktuReveal) {
      throw new Error("Gagal: Masa pembukaan harga (Reveal) sudah habis!");
    }

    const vendorAddress = currentAccount.address;
    const penawaran = tender.penawaran[vendorAddress];
    if (!penawaran || !penawaran.sudahCommit) {
      throw new Error("Gagal: Anda tidak terdaftar pada fase Commit tender ini!");
    }
    if (penawaran.sudahReveal) {
      throw new Error("Gagal: Anda sudah membuka penawaran sebelumnya!");
    }

    // Pembuktian Matematis Kriptografi
    const buktiHash = generateCommitHash(hargaClean, kataSandiRahasia);

    if (buktiHash.toLowerCase() !== penawaran.hashTerkunci.toLowerCase()) {
      const failEvent = {
        id: `evt-${Date.now()}`,
        txHash: pseudoHash(),
        blockNumber: 12480000 + Math.floor(Math.random() * 5000),
        eventName: "DiskualifikasiVendor",
        timestamp: currentTime,
        idTender: Number(idTender),
        vendor: vendorAddress,
        summary: `DISKUALIFIKASI: ${currentAccount.name} gagal verifikasi Hash! Hash input tidak cocok dengan komitmen awal.`
      };
      setAuditEvents(prev => [failEvent, ...prev]);

      throw new Error("DISKUALIFIKASI: Harga atau Kata Sandi tidak cocok dengan Hash yang dikunci di awal!");
    }

    const memenuhiSyaratPagu = (hargaClean <= tender.paguAnggaranIDR && hargaClean > 0);
    let newLowest = tender.penawaranTerendahIDR;
    let newWinner = tender.pemenang;

    if (memenuhiSyaratPagu && hargaClean < newLowest) {
      newLowest = hargaClean;
      newWinner = vendorAddress;
    }

    const companyName = penawaran.vendorName || currentAccount.name;

    const updatedTenders = tenders.map(t => {
      if (t.id === Number(idTender)) {
        return {
          ...t,
          penawaranTerendahIDR: newLowest,
          pemenang: newWinner,
          namaPerusahaanPemenang: newWinner === vendorAddress ? companyName : t.namaPerusahaanPemenang,
          penawaran: {
            ...t.penawaran,
            [vendorAddress]: {
              ...t.penawaran[vendorAddress],
              sudahReveal: true,
              hargaTerbukaIDR: hargaClean,
              memenuhiSyaratPagu,
              waktuReveal: currentTime
            }
          }
        };
      }
      return t;
    });

    setTenders(updatedTenders);

    const newEvent = {
      id: `evt-${Date.now()}`,
      txHash: pseudoHash(),
      blockNumber: 12480000 + Math.floor(Math.random() * 5000),
      eventName: "PenawaranDibuka",
      timestamp: currentTime,
      idTender: Number(idTender),
      vendor: vendorAddress,
      namaPerusahaan: companyName,
      hargaIDR: hargaClean,
      memenuhiSyaratPagu,
      summary: `${companyName} (${truncateAddress(vendorAddress)}) berhasil memverifikasi harga Rp ${hargaClean.toLocaleString('id-ID')} (${memenuhiSyaratPagu ? "Memenuhi Pagu" : "Melebihi Pagu"})`
    };

    setAuditEvents(prev => [newEvent, ...prev]);
  };

  // -------------------------------------------------------------
  // 4. Kunci Pemenang Tender (Fase Finalisasi oleh Panitia)
  // -------------------------------------------------------------
  const kunciPemenangTender = async (idTender) => {
    if (mode === 'web3') {
      if (!deployedContractAddress) {
        throw new Error("Smart contract belum terhubung!");
      }

      setTxStatus({
        state: 'pending',
        message: 'Mengirim pengesahan pemenang ke smart contract. Silakan konfirmasi di MetaMask...',
        txHash: null,
        error: null
      });

      try {
        const contract = await getContractInstance(true);
        const tx = await contract.kunciPemenangTender(BigInt(idTender));

        setTxStatus({
          state: 'pending',
          message: 'Transaksi penetapan pemenang terkirim! Menunggu konfirmasi penambangan blok...',
          txHash: tx.hash,
          error: null
        });

        const receipt = await tx.wait();

        // Optimistically mark tender as completed
        setTenders(prev => prev.map(t => {
          if (t.id === Number(idTender)) {
            return { ...t, selesai: true };
          }
          return t;
        }));

        try {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}

        setTxStatus({
          state: 'success',
          message: `Tender #${idTender} resmi disahkan & dikunci di blockchain!`,
          txHash: receipt.hash,
          error: null
        });

        try {
          await syncContractData();
        } catch (sErr) {
          console.warn("Background sync warning after lock winner:", sErr);
        }

        return receipt;
      } catch (err) {
        console.error("Web3 kunciPemenangTender error:", err);
        const msg = err.reason || err.message || "Gagal menetapkan pemenang lelang.";
        setTxStatus({
          state: 'error',
          message: `Gagal Mengesahkan Pemenang: ${msg}`,
          txHash: null,
          error: msg
        });
        throw err;
      }
    }

    // --- SIMULATION MODE ---
    const tender = tenders.find(t => t.id === Number(idTender));
    if (!tender) throw new Error("Tender tidak ditemukan!");

    if (currentTime <= tender.batasWaktuReveal) {
      throw new Error("Gagal: Masa Reveal masih berlangsung! Tunggu hingga waktu habis.");
    }
    if (tender.selesai) {
      throw new Error("Gagal: Tender ini sudah diselesaikan sebelumnya!");
    }

    const winnerBid = tender.penawaran && tender.pemenang && tender.penawaran[tender.pemenang];
    const winnerName = winnerBid?.vendorName || tender.namaPerusahaanPemenang || (tender.pemenang !== ethers.ZeroAddress ? truncateAddress(tender.pemenang) : "Tidak ada pemenang sah");

    const updatedTenders = tenders.map(t => {
      if (t.id === Number(idTender)) {
        return {
          ...t,
          namaPerusahaanPemenang: winnerName,
          selesai: true
        };
      }
      return t;
    });

    setTenders(updatedTenders);

    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    const newEvent = {
      id: `evt-${Date.now()}`,
      txHash: pseudoHash(),
      blockNumber: 12480000 + Math.floor(Math.random() * 5000),
      eventName: "PemenangDitetapkan",
      timestamp: currentTime,
      idTender: Number(idTender),
      pemenang: tender.pemenang,
      namaPerusahaanPemenang: winnerName,
      hargaFinalIDR: tender.penawaranTerendahIDR,
      summary: `LELANG RESMI DISELESAIKAN! Pemenang tender #${Number(idTender)}: ${winnerName} (${truncateAddress(tender.pemenang)}) dengan nilai Rp ${tender.penawaranTerendahIDR.toLocaleString('id-ID')}`
    };

    setAuditEvents(prev => [newEvent, ...prev]);
  };

  // Fast forward simulation time (simulation mode only)
  const fastForwardTime = (seconds) => {
    if (mode === 'web3') {
      alert("Catatan: Anda sedang dalam Mode Web3 Real Blockchain. Waktu lelang diatur oleh timestamp blok blockchain, bukan simulasi.");
      return;
    }
    setTimeOffset(prev => prev + seconds);
    setCurrentTime(prev => prev + seconds);
  };

  const jumpToPhase = (tenderId, phase) => {
    if (mode === 'web3') {
      alert("Catatan: Pada jaringan Blockchain sungguhan (Base Sepolia / Sepolia), waktu berjalan secara alami sesuai jam blok.");
      return;
    }
    const tender = tenders.find(t => t.id === tenderId);
    if (!tender) return;
    if (phase === 'reveal') {
      const targetTime = tender.batasWaktuCommit + 5;
      const diff = targetTime - currentTime;
      if (diff > 0) fastForwardTime(diff);
    } else if (phase === 'finish') {
      const targetTime = tender.batasWaktuReveal + 5;
      const diff = targetTime - currentTime;
      if (diff > 0) fastForwardTime(diff);
    }
  };

  const resetSimulation = () => {
    localStorage.removeItem('transpatender_tenders');
    localStorage.removeItem('transpatender_events');
    setTimeOffset(0);
    setCurrentTime(Math.floor(Date.now() / 1000));
    setTenders(getInitialDemoTenders());
  };

  const getTenderStatus = (tender) => {
    if (tender.selesai) {
      return { 
        stage: 'COMPLETED', 
        label: 'SELESAI & DIKUNCI', 
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
        dot: 'bg-emerald-500' 
      };
    }
    if (currentTime <= tender.batasWaktuCommit) {
      return { 
        stage: 'COMMIT', 
        label: 'FASE 1: COMMIT (PENDAFTARAN TERKUNCI)', 
        badge: 'bg-sky-50 text-sky-800 border-sky-200', 
        dot: 'bg-sky-500' 
      };
    }
    if (currentTime <= tender.batasWaktuReveal) {
      return { 
        stage: 'REVEAL', 
        label: 'FASE 2: REVEAL (PEMBUKAAN HARGA)', 
        badge: 'bg-amber-50 text-amber-800 border-amber-200', 
        dot: 'bg-amber-500 animate-pulse' 
      };
    }
    return { 
      stage: 'AWAITING_LOCK', 
      label: 'MENUNGGU PENGESAHAN AKHIR PANITIA', 
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200', 
      dot: 'bg-indigo-500' 
    };
  };

  return (
    <TenderContext.Provider value={{
      mode,
      setMode,
      selectedAccountId,
      setSelectedAccountId,
      currentAccount,
      currentTime,
      fastForwardTime,
      jumpToPhase,
      resetSimulation,
      tenders,
      auditEvents,
      getTenderStatus,
      buatTender,
      kirimPenawaranTerkunci,
      bukaPenawaran,
      kunciPemenangTender,
      
      // Web3 properties
      connectMetaMask,
      disconnectWallet,
      switchNetwork,
      deployContractOnChain,
      attachContract,
      syncContractData,
      getVendorBidLocal,
      saveVendorBidLocal,
      web3Account,
      web3ChainId,
      web3Balance,
      contractOwner,
      isOwner,
      deployedContractAddress,
      setDeployedContractAddress,
      web3Error,
      isWeb3Loading,
      isSyncing,
      txStatus,
      setTxStatus
    }}>
      {children}
    </TenderContext.Provider>
  );
}

export function useTender() {
  return useContext(TenderContext);
}
