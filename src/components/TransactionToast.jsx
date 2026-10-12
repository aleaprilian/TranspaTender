import React from 'react';
import { useTender } from '../context/TenderContext';
import { getExplorerTxUrl } from '../contracts/contractAbi';
import { cn } from './ui';
import { Loader2, CheckCircle2, AlertOctagon, ExternalLink, X } from 'lucide-react';

const TONES = {
  pending: {
    accent: 'bg-status-commit-dot',
    iconWrap: 'bg-status-commit-bg text-status-commit-text',
    title: 'Transaksi Blockchain Sedang Diproses...'
  },
  success: {
    accent: 'bg-status-done-dot',
    iconWrap: 'bg-status-done-bg text-status-done-text',
    title: 'Transaksi Sukses Dikonfirmasi On-Chain!'
  },
  error: {
    accent: 'bg-status-danger-dot',
    iconWrap: 'bg-status-danger-bg text-status-danger-text',
    title: 'Transaksi Gagal / Ditolak'
  }
};

export function TransactionToast() {
  const { txStatus, setTxStatus, web3ChainId } = useTender();

  if (txStatus.state === 'idle') return null;

  const explorerUrl = txStatus.txHash ? getExplorerTxUrl(txStatus.txHash, web3ChainId) : null;
  const tone = TONES[txStatus.state] || TONES.pending;

  const handleClose = () => {
    setTxStatus({ state: 'idle', message: '', txHash: null, error: null });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
      <div className="bg-white border border-slate-200 rounded-card shadow-popover overflow-hidden">
        {/* Semantic accent bar: colour communicates the transaction state */}
        <div className={cn('h-1', tone.accent)} />

        <div className="flex items-start gap-3 p-4">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', tone.iconWrap)}>
            {txStatus.state === 'pending' && <Loader2 className="w-5 h-5 animate-spin" />}
            {txStatus.state === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {txStatus.state === 'error' && <AlertOctagon className="w-5 h-5" />}
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-xs font-semibold text-slate-900">{tone.title}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{txStatus.message}</p>

            {txStatus.txHash && (
              <div className="pt-1 flex flex-wrap items-center gap-2 text-2xs">
                <span className="font-mono text-slate-400">
                  Tx: {txStatus.txHash.slice(0, 10)}...{txStatus.txHash.slice(-8)}
                </span>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:text-brand-900 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>{web3ChainId === 84532 ? "Basescan" : "Block Explorer"}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-control transition shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
