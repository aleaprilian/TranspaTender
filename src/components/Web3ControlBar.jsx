import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { 
  SUPPORTED_NETWORKS, 
  getExplorerAddressUrl, 
  getExplorerTxUrl 
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
  Network, 
  Fuel, 
  Plus, 
  Link as LinkIcon,
  ChevronDown,
  Sparkles
} from 'lucide-react';

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
    isSyncing,
    txStatus
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
      if (!inputAddress.trim()) throw new Error("Masukkan alamat smart contract!");
      await attachContract(inputAddress.trim());
      setShowAttachInput(false);
      setInputAddress('');
    } catch (err) {
      setAttachError(err.message);
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {/* If wallet is not connected */}
      {!web3Account ? (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-indigo-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Mode Web3 Aktif: Dompet Belum Terhubung
              </h3>
            </div>
            <p className="text-xs text-indigo-200">
              Hubungkan MetaMask untuk berinteraksi langsung dengan Smart Contract TranspaTender di Base Sepolia Testnet (L2).
            </p>
          </div>
          <button
            onClick={() => connectMetaMask(84532)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-2 shrink-0"
          >
            <Wallet className="w-4 h-4" />
            <span>Hubungkan MetaMask (Base Sepolia)</span>
          </button>
        </div>
      ) : (
        /* Connected Web3 Dashboard Bar */
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          {/* Top row: Account & Network Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="font-semibold text-slate-800">
                  {currentNetworkConfig.shortName}
                </span>
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  ID: {web3ChainId}
                </span>
              </div>

              <div className="h-3 w-px bg-slate-200 hidden sm:block"></div>

              <div className="text-slate-600 flex items-center gap-1.5">
                <span>Saldo:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {web3Balance} {currentNetworkConfig.nativeCurrency.symbol}
                </span>
              </div>

              {currentNetworkConfig.faucetUrl && (
                <a
                  href={currentNetworkConfig.faucetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium text-[11px]"
                  title="Dapatkan Gas Faucet Gratis"
                >
                  <Fuel className="w-3 h-3" />
                  <span>Kran Faucet (Gratis)</span>
                </a>
              )}
            </div>

            {/* Network Badge: Exclusive Base Sepolia */}
            <div className="flex items-center gap-1.5 pt-1 md:pt-0">
              {web3ChainId !== 84532 ? (
                <button
                  onClick={() => switchNetwork(84532)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-2xs"
                  title="Beralih ke jaringan resmi TranspaTender: Base Sepolia Testnet"
                >
                  <span>Beralih ke Base Sepolia</span>
                </button>
              ) : (
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Jaringan Resmi: Base Sepolia Testnet</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom row: Smart Contract Status */}
          {deployedContractAddress ? (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-500 font-medium hidden xs:inline">Smart Contract:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {truncateAddress(deployedContractAddress)}
                  </span>
                  <button
                    onClick={() => handleCopy(deployedContractAddress)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                    title="Salin Alamat Kontrak"
                  >
                    {copiedAddr ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {getExplorerAddressUrl(deployedContractAddress, web3ChainId) && (
                    <a
                      href={getExplorerAddressUrl(deployedContractAddress, web3ChainId)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                      title="Lihat di Block Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${isOwner ? 'bg-slate-900 text-white border-slate-900' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                  {isOwner ? "👑 Panitia (Owner)" : "🏢 Vendor Rekanan"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={() => syncContractData()}
                  disabled={isSyncing}
                  className="flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  title="Tarik ulang data terkini dari blockchain"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan"}</span>
                </button>

                <button
                  onClick={() => setShowAttachInput(!showAttachInput)}
                  className="flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium text-xs transition text-center justify-center"
                >
                  Ganti Kontrak
                </button>

                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="w-full sm:w-auto px-2.5 py-1.5 sm:py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1 transition shadow-sm disabled:opacity-50"
                  title="Deploy instance smart contract baru"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{isDeploying ? "Mendeploy..." : "Deploy Kontrak Baru"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* No Smart Contract Attached Alert */
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900">
                    Smart Contract Belum Terhubung
                  </h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Untuk mulai menggunakan lelang publik di jaringan blockchain sungguhan, deploy smart contract baru langsung dengan 1-klik melalui MetaMask, atau sambungkan ke alamat kontrak yang sudah ada.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-1">
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Rocket className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isDeploying ? "Mendeploy ke Blockchain..." : "Deploy Kontrak Baru (1-Klik)"}</span>
                </button>

                <button
                  onClick={() => setShowAttachInput(!showAttachInput)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hubungkan Alamat Kontrak yang Ada</span>
                </button>
              </div>
            </div>
          )}

          {/* Form to attach an existing contract address */}
          {showAttachInput && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <form onSubmit={handleAttach} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Masukkan alamat smart contract pemerintah (0x...)"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition"
                >
                  Hubungkan
                </button>
                <button
                  type="button"
                  onClick={() => setShowAttachInput(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-lg transition"
                >
                  Batal
                </button>
              </form>
              {attachError && (
                <div className="w-full text-rose-600 text-[11px]">{attachError}</div>
              )}
              {(() => {
                try {
                  const raw = localStorage.getItem('transpatender_recent_contracts');
                  const list = raw ? JSON.parse(raw) : [];
                  if (Array.isArray(list) && list.length > 0) {
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <span>Riwayat Kontrak di Browser:</span>
                        {list.map(addr => (
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
                            className={`font-mono px-2 py-0.5 rounded border text-[10px] transition ${addr.toLowerCase() === deployedContractAddress?.toLowerCase() ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                            title="Klik untuk langsung hubungkan ke kontrak ini"
                          >
                            {truncateAddress(addr)} {addr.toLowerCase() === deployedContractAddress?.toLowerCase() ? '(Aktif)' : ''}
                          </button>
                        ))}
                      </div>
                    );
                  }
                } catch (e) {}
                return null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
