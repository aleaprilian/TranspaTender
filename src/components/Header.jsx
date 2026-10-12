import React, { useState, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import {
  SIMULATED_ACCOUNTS,
  truncateAddress
} from '../utils/crypto';
import { SUPPORTED_NETWORKS } from '../contracts/contractAbi';
import {
  Briefcase,
  Clock,
  RotateCcw,
  Wallet,
  PlusCircle,
  ChevronDown,
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
import { Button } from './ui';

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
  const portalAccounts = SIMULATED_ACCOUNTS.filter(a => a.portal === activePortal);
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigChange = () => setConfigVersion(v => v + 1);
    window.addEventListener('ipfs-config-changed', handleConfigChange);
    return () => window.removeEventListener('ipfs-config-changed', handleConfigChange);
  }, []);

  const hasPinata = Boolean(getPinataJwt());
  const useLocal = getUseLocalNode();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Utility strip: environment, IPFS, mode, explorer */}
      <div className="bg-slate-950 text-white px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-2xs min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-status-done-dot animate-pulse shrink-0" />
          <span className="font-semibold text-slate-200 truncate">
            {mode === 'web3'
              ? (SUPPORTED_NETWORKS[web3ChainId]?.chainName || 'Base Sepolia Testnet (Chain ID: 84532)')
              : 'Simulasi Sandbox E-Procurement'}
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400 hidden md:inline">Zero Insider Trading Protocol</span>
        </div>

        <div className="flex items-center gap-2 text-2xs">
          <button
            onClick={() => setIsIpfsModalOpen(true)}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium border transition ${
              hasPinata || useLocal
                ? 'bg-brand-700 text-white border-brand-600 hover:bg-brand-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Kelola kunci akses IPFS Pinata / node lokal"
          >
            <Cloud className={`w-3 h-3 ${hasPinata || useLocal ? 'text-white' : 'text-slate-400'}`} />
            <span>{hasPinata ? 'IPFS: Pinata Aktif' : useLocal ? 'IPFS: Node Lokal' : 'IPFS Settings'}</span>
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-control p-0.5">
            <button
              onClick={() => setMode('web3')}
              className={`px-2.5 py-1 rounded-[6px] transition inline-flex items-center gap-1.5 ${
                mode === 'web3' ? 'bg-brand-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Gunakan dompet blockchain asli (MetaMask)"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mode Web3</span>
              <span className="sm:hidden">Web3</span>
            </button>
            <button
              onClick={() => setMode('simulation')}
              className={`px-2.5 py-1 rounded-[6px] transition inline-flex items-center gap-1.5 ${
                mode === 'simulation' ? 'bg-brand-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Mode simulasi cepat (bebas gas, kendali waktu)"
            >
              <span>Sandbox</span>
            </button>
          </div>

          <a
            href={SUPPORTED_NETWORKS[web3ChainId]?.blockExplorerUrls?.[0] || 'https://sepolia.basescan.org/'}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
          >
            <span className="hidden sm:inline">Basescan</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Brand + portal switcher */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-900 text-white shrink-0">
              {isGov ? <Building className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm tracking-tight">
                TranspaTender ID
              </div>
              <div className="text-2xs text-slate-500">
                {isGov ? 'Portal Pemerintah — LPSE / PPK' : 'Portal Rekanan — Vendor Penyedia'}
              </div>
            </div>
          </div>

          {/* Portal segmented control — hanya di Sandbox; di Web3 portal ditentukan oleh URL (?portal=) */}
          {mode === 'simulation' && (
            <div className="flex items-center rounded-control border border-slate-200 bg-slate-100 p-0.5">
              <button
                onClick={() => setActivePortal('pemerintah')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-2xs font-medium transition ${
                  isGov ? 'bg-white text-slate-900 shadow-card font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portal Pemerintah</span>
                <span className="sm:hidden">Gov</span>
              </button>
              <button
                onClick={() => setActivePortal('vendor')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-2xs font-medium transition ${
                  !isGov ? 'bg-white text-slate-900 shadow-card font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portal Vendor</span>
                <span className="sm:hidden">Vendor</span>
              </button>
            </div>
          )}
        </div>

        {/* Right cluster: time, wallet, primary action */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'simulation' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-control px-2.5 py-1 text-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono font-medium text-slate-800 tabular-nums">
                {formatSimTime(currentTime)}
              </span>
              <div className="flex items-center border-l border-slate-200 pl-1 sm:pl-1.5 gap-0.5 sm:gap-1">
                <button
                  onClick={() => fastForwardTime(60)}
                  className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                  title="Maju 1 menit"
                >
                  +1m
                </button>
                <button
                  onClick={() => fastForwardTime(180)}
                  className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                  title="Maju 3 menit (ganti fase commit / reveal)"
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
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-control px-2.5 py-1 text-2xs">
              <Clock className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-medium text-slate-700">Waktu Base</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatSimTime(currentTime)}
              </span>
            </div>
          )}

          {mode === 'web3' ? (
            web3Account ? (
              <div className="relative">
                <button
                  onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                  className="flex items-center gap-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 px-2.5 py-1.5 text-2xs text-left transition"
                >
                  <span className="w-2 h-2 rounded-full bg-status-done-dot" />
                  <span className="leading-tight">
                    <span className="block font-semibold text-slate-900 font-mono">
                      {truncateAddress(web3Account)}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-mono">
                      {web3Balance} {currentNetworkConfig.nativeCurrency?.symbol || 'ETH'}
                    </span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isWalletMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsWalletMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-card shadow-popover z-40 p-3 text-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-900">Dompet Terhubung</span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-status-done-bg text-status-done-text border border-status-done-border">
                          {currentNetworkConfig.shortName}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-400">Alamat Wallet</div>
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-control font-mono text-slate-800">
                          <span>{truncateAddress(web3Account)}</span>
                          <button
                            onClick={() => handleCopy(web3Account)}
                            className="text-slate-500 hover:text-slate-800 p-1"
                            title="Salin alamat"
                          >
                            {copiedAddr ? <Check className="w-3.5 h-3.5 text-status-done-dot" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Saldo Gas</span>
                        <span className="font-bold font-mono text-slate-900">
                          {web3Balance} {currentNetworkConfig.nativeCurrency?.symbol || 'ETH'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Peran Kontrak</span>
                        <span className="font-semibold text-brand-700">{currentAccount.institution}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={disconnectWallet}
                          className="text-status-danger-text hover:opacity-80 font-medium flex items-center gap-1"
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
              <Button
                size="sm"
                onClick={() => connectMetaMask(84532)}
                disabled={isWeb3Loading}
                className="gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isWeb3Loading ? 'Menghubungkan...' : 'Hubungkan MetaMask'}</span>
              </Button>
            )
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 rounded-control border border-slate-200 bg-white hover:border-slate-300 px-2.5 py-1.5 text-2xs text-left transition"
              >
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                <span className="leading-tight">
                  <span className="block font-medium text-slate-900">{currentAccount.name}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">{truncateAddress(currentAccount.address)}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isAccountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsAccountMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-card shadow-popover z-40 py-1 text-2xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Entitas Portal {isGov ? 'Pemerintah' : 'Rekanan'}
                    </div>
                    {portalAccounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsAccountMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-start justify-between hover:bg-slate-50 transition ${
                          selectedAccountId === acc.id ? 'bg-slate-50 font-medium' : ''
                        }`}
                      >
                        <span>
                          <span className="block text-slate-900 font-medium">{acc.name}</span>
                          <span className="block text-[11px] text-slate-500">{acc.institution}</span>
                          <span className="block text-[11px] text-slate-400 font-mono">{truncateAddress(acc.address)}</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {isGov && currentAccount.role === 'PANITIA' && (
            <Button
              size="sm"
              onClick={onOpenCreateModal}
              className="gap-1.5"
              title="Panitia pemerintah menerbitkan proyek lelang baru"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Buat Tender</span>
            </Button>
          )}
        </div>
      </div>

      <IpfsConfigModal
        isOpen={isIpfsModalOpen}
        onClose={() => setIsIpfsModalOpen(false)}
      />
    </header>
  );
}
