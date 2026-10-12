import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import {
  SUPPORTED_NETWORKS,
  getExplorerAddressUrl
} from '../contracts/contractAbi';
import { truncateAddress } from '../utils/crypto';
import {
  Rocket,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Wallet,
  Fuel,
  Link as LinkIcon
} from 'lucide-react';
import { Button, StatusPill } from './ui';

const NETWORKS = [
  { id: 84532, label: 'Base Sepolia' },
  { id: 11155111, label: 'Eth Sepolia' },
  { id: 80002, label: 'Polygon Amoy' },
  { id: 31337, label: 'Localhost' }
];

export function Web3ControlBar() {
  const {
    mode,
    web3Account,
    web3ChainId,
    web3Balance,
    connectMetaMask,
    switchNetwork,
    deployedContractAddress,
    deployContractOnChain,
    attachContract,
    syncContractData,
    contractOwner,
    isOwner,
    isSyncing
  } = useTender();

  const [inputAddress, setInputAddress] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [attachError, setAttachError] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);

  if (mode !== 'web3') return null;

  const currentNetworkConfig = SUPPORTED_NETWORKS[web3ChainId] || {
    chainName: `Chain ID: ${web3ChainId || 'Unknown'}`,
    shortName: 'Custom Network',
    nativeCurrency: { symbol: 'ETH' },
    blockExplorerUrls: ['#'],
    faucetUrl: null
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      await deployContractOnChain();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAttach = async (e) => {
    e.preventDefault();
    setAttachError(null);
    try {
      if (!inputAddress.trim()) throw new Error('Masukkan alamat smart contract!');
      await attachContract(inputAddress.trim());
      setShowAttachInput(false);
      setInputAddress('');
    } catch (err) {
      setAttachError(err.message);
    }
  };

  const recentContracts = (() => {
    try {
      const raw = localStorage.getItem('transpatender_recent_contracts');
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  })();

  return (
    <div className="mb-6 space-y-3">
      {!web3Account ? (
        <div className="bg-white border border-slate-200 rounded-card shadow-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 shrink-0">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Mode Web3 aktif — dompet belum terhubung
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hubungkan MetaMask untuk berinteraksi langsung dengan smart contract TranspaTender di Base Sepolia Testnet (L2).
              </p>
            </div>
          </div>
          <Button size="md" onClick={() => connectMetaMask(84532)} className="gap-2 shrink-0">
            <Wallet className="w-4 h-4" />
            <span>Hubungkan MetaMask</span>
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-card shadow-card">
          {/* Network summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-done-dot" />
                <span className="font-semibold text-slate-800">{currentNetworkConfig.shortName}</span>
                <span className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  ID {web3ChainId}
                </span>
              </span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="text-slate-600">
                Saldo <span className="font-semibold text-slate-900 font-mono">{web3Balance} {currentNetworkConfig.nativeCurrency.symbol}</span>
              </span>
              {currentNetworkConfig.faucetUrl && (
                <a
                  href={currentNetworkConfig.faucetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 font-medium"
                  title="Dapatkan gas faucet gratis"
                >
                  <Fuel className="w-3 h-3" />
                  <span>Faucet gratis</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px]">Jaringan</span>
              {NETWORKS.map(n => (
                <Button
                  key={n.id}
                  size="sm"
                  variant={web3ChainId === n.id ? 'primary' : 'secondary'}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => switchNetwork(n.id)}
                >
                  {n.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Contract connection status */}
          <div className="p-4 space-y-3">
            {deployedContractAddress ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill tone="done">Smart Contract Aktif</StatusPill>
                  <span className="font-mono font-semibold text-slate-900">
                    {truncateAddress(deployedContractAddress)}
                  </span>
                  <button
                    onClick={() => handleCopy(deployedContractAddress)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    title="Salin alamat kontrak"
                  >
                    {copiedAddr ? <Check className="w-3.5 h-3.5 text-status-done-dot" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {getExplorerAddressUrl(deployedContractAddress, web3ChainId) && (
                    <a
                      href={getExplorerAddressUrl(deployedContractAddress, web3ChainId)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                      title="Lihat di block explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <StatusPill tone={isOwner ? 'pending' : 'neutral'}>
                    {isOwner ? 'Anda: Panitia Pemerintah (Owner)' : 'Anda: Peserta Vendor'}
                  </StatusPill>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => syncContractData()}
                    disabled={isSyncing}
                    className="gap-1.5"
                    title="Tarik ulang data terkini dari blockchain"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAttachInput(!showAttachInput)}
                    className="gap-1.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Ganti / Hubungkan Kontrak</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="gap-1.5"
                    title="Deploy instance smart contract baru"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{isDeploying ? 'Mendeploy...' : 'Deploy Baru'}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-status-reveal-bg border border-status-reveal-border rounded-control p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-status-reveal-dot mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-status-reveal-text">
                      Smart contract belum terhubung
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Daftar lelang diambil dari alamat kontrak yang terpasang. Deploy kontrak baru dengan 1-klik,
                      atau tempelkan alamat kontrak yang sudah dipakai panitia agar katalog lelang tampil.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => setShowAttachInput(true)} className="gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Hubungkan Alamat Kontrak</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleDeploy} disabled={isDeploying} className="gap-1.5">
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{isDeploying ? 'Mendeploy...' : 'Deploy Kontrak Baru (1-Klik)'}</span>
                  </Button>
                </div>
              </div>
            )}

            {showAttachInput && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <form onSubmit={handleAttach} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan alamat smart contract pemerintah (0x...)"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    className="form-input flex-1 font-mono"
                  />
                  <Button type="submit" size="sm">
                    Hubungkan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAttachInput(false)}
                  >
                    Batal
                  </Button>
                </form>
                {attachError && (
                  <div className="text-status-danger-text text-[11px]">{attachError}</div>
                )}
                {recentContracts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                    <span>Riwayat kontrak di browser:</span>
                    {recentContracts.map(addr => (
                      <button
                        key={addr}
                        type="button"
                        onClick={async () => {
                          setInputAddress(addr);
                          try {
                            await attachContract(addr);
                            setShowAttachInput(false);
                          } catch (err) {
                            setAttachError(err.message);
                          }
                        }}
                        className={`font-mono px-2 py-0.5 rounded border text-[10px] transition ${
                          addr.toLowerCase() === deployedContractAddress?.toLowerCase()
                            ? 'bg-brand-50 text-brand-700 border-brand-200 font-semibold'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Klik untuk langsung hubungkan ke kontrak ini"
                      >
                        {truncateAddress(addr)} {addr.toLowerCase() === deployedContractAddress?.toLowerCase() ? '(Aktif)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
