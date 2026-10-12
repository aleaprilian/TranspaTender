import React, { useState, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import { 
  SIMULATED_ACCOUNTS, 
  truncateAddress 
} from '../utils/crypto';
import { SUPPORTED_NETWORKS } from '../contracts/contractAbi';
import { 
  Building2, 
  Briefcase,
  Clock, 
  RotateCcw, 
  Wallet, 
  ChevronDown,
  Layers,
  ExternalLink,
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  Building,
  Cloud
} from 'lucide-react';
import { IpfsConfigModal } from './IpfsConfigModal';
import { getPinataJwt, getUseLocalNode } from '../utils/ipfsService';

export function Header({ activePortal, setActivePortal, onOpenCreateModal }) {
  const {
    mode,
    setMode,
    selectedAccountId,
    setSelectedAccountId,
    currentAccount,
    currentTime,
    fastForwardTime,
    resetSimulation,
    connectMetaMask,
    disconnectWallet,
    web3Account,
    web3ChainId,
    web3Balance,
    isWeb3Loading,
    isOwner
  } = useTender();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [isIpfsModalOpen, setIsIpfsModalOpen] = useState(false);

  const formatSimTime = (timestamp) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const currentNetworkConfig = SUPPORTED_NETWORKS[web3ChainId] || {
    shortName: 'Base Sepolia',
    nativeCurrency: { symbol: 'ETH' }
  };

  const isGov = activePortal === 'pemerintah';
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigChange = () => setConfigVersion(v => v + 1);
    window.addEventListener('ipfs-config-changed', handleConfigChange);
    return () => window.removeEventListener('ipfs-config-changed', handleConfigChange);
  }, []);

  const hasPinata = Boolean(getPinataJwt());
  const useLocal = getUseLocalNode();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-slate-950 text-white text-xs px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="font-semibold text-slate-200 text-[11px] sm:text-xs">
            {mode === 'web3' ? (SUPPORTED_NETWORKS[web3ChainId]?.chainName || 'Base Sepolia (84532)') : 'Simulasi Sandbox E-Procurement'}
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400 hidden md:inline">Zero Insider Trading Protocol</span>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* IPFS Node / Pinata Settings Shortcut */}
          <button
            onClick={() => setIsIpfsModalOpen(true)}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition ${
              hasPinata || useLocal
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:text-white'
            }`}
            title="Kelola Kunci Akses IPFS Pinata / Node Lokal"
          >
            <Cloud className="w-3 h-3 text-indigo-400" />
            <span>{hasPinata ? "IPFS: Pinata" : useLocal ? "IPFS: Lokal" : "IPFS"}</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px] sm:text-[11px]">
            <button
              onClick={() => setMode('web3')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'web3' 
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Gunakan Dompet Blockchain Asli (MetaMask)"
            >
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Mode Web3</span>
              <span className="sm:hidden">Web3</span>
            </button>

            <button
              onClick={() => setMode('simulation')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                mode === 'simulation' 
                  ? 'bg-slate-800 text-white font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mode Simulasi Cepat (Bebas Gas, Kendali Waktu)"
            >
              <span className="hidden sm:inline">Sandbox Simulasi</span>
              <span className="sm:hidden">Simulasi</span>
            </button>
          </div>

          <a 
            href={SUPPORTED_NETWORKS[web3ChainId]?.blockExplorerUrls?.[0] || "https://sepolia.basescan.org/"} 
            target="_blank" 
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 hidden sm:flex items-center gap-1 text-[11px]"
          >
            <span>Basescan</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand adapted to Portal */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm shrink-0 ${
            isGov 
              ? 'bg-slate-900 text-white border border-slate-800' 
              : 'bg-blue-900 text-white border border-blue-800'
          }`}>
            {isGov ? <Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                {isGov ? "LPSE Pemerintah" : "Vendor Hub Rekanan"}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                isGov 
                  ? 'bg-slate-100 text-slate-800 border-slate-200' 
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {isGov ? "PANITIA / PPK" : "PENYEDIA"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {isGov 
                ? "Sistem E-Procurement Pemerintah — TranspaTender ID" 
                : "Portal Partisipasi & Sealed-Bid Rekanan — TranspaTender ID"}
            </p>
          </div>
        </div>



        {/* Right Section: Time Controls & User Wallet */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Time simulation widget (only for simulation mode) */}
          {mode === 'simulation' ? (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-mono font-medium text-slate-800 tabular-nums text-[11px] sm:text-xs">
                {formatSimTime(currentTime)}
              </span>
              <div className="flex items-center border-l border-slate-200 pl-1 sm:pl-1.5 gap-0.5 sm:gap-1">
                <button
                  onClick={() => fastForwardTime(60)}
                  className="px-1 sm:px-1.5 py-0.5 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                  title="Maju 1 Menit"
                >
                  +1m
                </button>
                <button
                  onClick={() => fastForwardTime(180)}
                  className="px-1 sm:px-1.5 py-0.5 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700"
                  title="Maju 3 Menit (Ganti Fase Commit / Reveal)"
                >
                  +3m
                </button>
                <button
                  onClick={resetSimulation}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                  title="Reset simulasi ke kondisi awal"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-slate-700">Waktu Base:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatSimTime(currentTime)}
              </span>
            </div>
          )}

          {/* Web3 Mode: Wallet Button or Connect Button */}
          {mode === 'web3' ? (
            web3Account ? (
              <div className="relative">
                <button
                  onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-blue-50/80 border border-blue-200 hover:border-blue-300 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs text-left shadow-sm transition"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  <div className="leading-tight">
                    <div className="font-semibold text-slate-900 font-mono text-[11px] sm:text-xs">
                      {truncateAddress(web3Account)}
                    </div>
                    <div className="text-[10px] text-blue-700 font-mono hidden xs:block">
                      {web3Balance} {currentNetworkConfig.nativeCurrency?.symbol || 'ETH'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                </button>

                {isWalletMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsWalletMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-900">Dompet Terhubung</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                          Base Sepolia
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-400">Alamat Wallet</div>
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg font-mono text-slate-800">
                          <span>{truncateAddress(web3Account)}</span>
                          <button
                            onClick={() => handleCopy(web3Account)}
                            className="text-slate-500 hover:text-slate-800 p-1"
                            title="Salin Alamat"
                          >
                            {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-500">Saldo Gas:</span>
                        <span className="font-bold font-mono text-slate-900">
                          {web3Balance} {currentNetworkConfig.nativeCurrency?.symbol || 'ETH'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-500">Peran Kontrak:</span>
                        <span className="font-semibold text-blue-700">
                          {currentAccount.institution}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={disconnectWallet}
                          className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 text-xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Putuskan Hubungan</span>
                        </button>

                        <a
                          href={`https://sepolia.basescan.org/address/${web3Account}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
                        >
                          <span>Basescan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => connectMetaMask(84532)}
                disabled={isWeb3Loading}
                className="btn-primary text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 shrink-0"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isWeb3Loading ? "Menghubungkan..." : "Hubungkan MetaMask"}</span>
                <span className="sm:hidden">{isWeb3Loading ? "..." : "MetaMask"}</span>
              </button>
            )
          ) : (
            /* Simulation Account Selector */
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs text-left shadow-sm transition"
              >
                <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="leading-tight">
                  <div className="font-medium text-slate-900 text-[11px] sm:text-xs truncate max-w-[100px] sm:max-w-none">{currentAccount.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono hidden sm:block">{truncateAddress(currentAccount.address)}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isAccountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsAccountMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Pilih Entitas Simulasi
                    </div>
                    {SIMULATED_ACCOUNTS.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsAccountMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-start justify-between hover:bg-slate-50 transition ${selectedAccountId === acc.id ? 'bg-slate-50/80 font-medium' : ''}`}
                      >
                        <div>
                          <div className="text-slate-900 font-medium">{acc.name}</div>
                          <div className="text-[10px] text-slate-500">{acc.institution}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{truncateAddress(acc.address)}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* IPFS Configuration Modal */}
      <IpfsConfigModal
        isOpen={isIpfsModalOpen}
        onClose={() => setIsIpfsModalOpen(false)}
      />
    </header>
  );
}
