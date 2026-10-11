import React from 'react';
import { useTender } from '../context/TenderContext';
import { getExplorerTxUrl } from '../contracts/contractAbi';
import { Loader2, CheckCircle2, AlertOctagon, ExternalLink, X } from 'lucide-react';

export function TransactionToast() {
  const { txStatus, setTxStatus, web3ChainId } = useTender();

  if (txStatus.state === 'idle') return null;

  const explorerUrl = txStatus.txHash ? getExplorerTxUrl(txStatus.txHash, web3ChainId) : null;

  const handleClose = () => {
    setTxStatus({ state: 'idle', message: '', txHash: null, error: null });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-200">
      <div className={`p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
        txStatus.state === 'pending'
          ? 'bg-slate-900/95 border-indigo-500/50 text-white'
          : txStatus.state === 'success'
          ? 'bg-emerald-950/95 border-emerald-500/50 text-white'
          : 'bg-rose-950/95 border-rose-500/50 text-white'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {txStatus.state === 'pending' && (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0 mt-0.5" />
            )}
            {txStatus.state === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {txStatus.state === 'error' && (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-100 flex items-center gap-2">
                {txStatus.state === 'pending' && "Transaksi Blockchain Sedang Diproses..."}
                {txStatus.state === 'success' && "Transaksi Sukses Dikonfirmasi On-Chain!"}
                {txStatus.state === 'error' && "Transaksi Gagal / Ditolak"}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {txStatus.message}
              </p>

              {txStatus.txHash && (
                <div className="pt-1 flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-slate-400">
                    Tx: {txStatus.txHash.slice(0, 10)}...{txStatus.txHash.slice(-8)}
                  </span>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 hover:text-indigo-100 flex items-center gap-1 font-medium underline"
                    >
                      <span>{web3ChainId === 84532 ? "Basescan" : "Block Explorer"}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
