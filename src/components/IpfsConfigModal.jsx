import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  getPinataJwt,
  savePinataJwt,
  testPinataAuth,
  getUseLocalNode,
  setUseLocalNode,
  IPFS_STORAGE_KEYS
} from '../utils/ipfsService';
import { Button, cn } from './ui';
import {
  Cloud,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Loader2,
  HardDrive,
  ShieldCheck,
  Trash2,
  HelpCircle,
  Edit3,
  Check
} from 'lucide-react';

const STATUS_TONES = {
  success: 'bg-status-done-bg border-status-done-border text-status-done-text',
  error: 'bg-status-danger-bg border-status-danger-border text-status-danger-text',
  info: 'bg-status-commit-bg border-status-commit-border text-status-commit-text'
};

export function IpfsConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [savedJwt, setSavedJwt] = useState('');
  const [jwtInput, setJwtInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [localUrl, setLocalUrl] = useState('http://127.0.0.1:5001/api/v0/add');
  const [customGateway, setCustomGateway] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getPinataJwt() || '';
      setSavedJwt(current);
      setJwtInput(current);
      setIsEditing(!current); // If no key saved yet, open directly in edit/input mode
      setUseLocal(getUseLocalNode());
      setLocalUrl(localStorage.getItem(IPFS_STORAGE_KEYS.LOCAL_NODE_URL) || 'http://127.0.0.1:5001/api/v0/add');
      setCustomGateway(localStorage.getItem(IPFS_STORAGE_KEYS.GATEWAY_URL) || '');
      setStatus({ type: null, message: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mask long JWT token for display (e.g. eyJhbGci...••••••...3c6bfe2)
  const maskToken = (token) => {
    if (!token) return '';
    if (token.length < 24) return token;
    return `${token.slice(0, 14)}••••••••••••••••••••••••••••${token.slice(-10)}`;
  };

  const notifyChange = () => {
    window.dispatchEvent(new CustomEvent('ipfs-config-changed'));
    if (onConfigSaved) onConfigSaved();
  };

  const handleTest = async (tokenToTest) => {
    const token = (tokenToTest || jwtInput || savedJwt).trim();
    if (!token) {
      setStatus({ type: 'error', message: 'Masukkan JWT Pinata terlebih dahulu!' });
      return;
    }

    setIsTesting(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await testPinataAuth(token);
      setStatus({
        type: 'success',
        message: `Koneksi Berhasil! Akun Pinata aktif (${res.message || 'Authenticated'}). Dokumen Anda akan otomatis tersimpan permanen di jaringan IPFS global.`
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: `Koneksi Gagal: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const cleaned = jwtInput.trim();
    savePinataJwt(cleaned);
    setSavedJwt(cleaned);
    setUseLocalNode(useLocal);

    if (localUrl.trim()) {
      localStorage.setItem(IPFS_STORAGE_KEYS.LOCAL_NODE_URL, localUrl.trim());
    }
    if (customGateway.trim()) {
      localStorage.setItem(IPFS_STORAGE_KEYS.GATEWAY_URL, customGateway.trim());
    } else {
      localStorage.removeItem(IPFS_STORAGE_KEYS.GATEWAY_URL);
    }

    setIsEditing(false);
    setStatus({
      type: 'success',
      message: cleaned ? 'Kunci Pinata berhasil disimpan secara permanen di browser!' : 'Pengaturan berhasil diperbarui!'
    });

    notifyChange();

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleClear = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    savePinataJwt('');
    setSavedJwt('');
    setJwtInput('');
    setIsEditing(true);
    setStatus({ type: 'info', message: 'Kunci Pinata telah dihapus dari browser.' });
    notifyChange();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-modal shadow-modal max-w-lg w-full border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Konfigurasi Penyimpanan IPFS</h3>
              <p className="text-xs text-brand-200">Penyimpanan Terdesentralisasi Permanen (Pinata Cloud)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Using DIV instead of FORM to prevent browser reload */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Status Alert */}
          {status.type && (
            <div className={cn('p-3 rounded-control border flex items-start gap-2.5', STATUS_TONES[status.type] || STATUS_TONES.info)}>
              {status.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-status-done-dot" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-status-danger-dot" />}
              <span className="leading-relaxed font-medium">{status.message}</span>
            </div>
          )}

          {/* Quick Guide Card */}
          <div className="p-3.5 bg-slate-50 rounded-control border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                Dapatkan Kunci Pinata Gratis (1 GB Selamanya):
              </span>
              <a
                href="https://app.pinata.cloud/developers/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1 text-2xs shrink-0"
              >
                <span>Buka Pinata Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-2xs text-slate-600 leading-normal pl-1">
              <li>Daftar gratis di <strong className="text-slate-800">app.pinata.cloud</strong>.</li>
              <li>Buka menu <strong className="text-slate-800">API Keys</strong> &gt; klik <strong className="text-slate-800">"New Key"</strong>.</li>
              <li>Centang <strong className="text-slate-800">Admin</strong> (atau <em>pinFileToIPFS</em>) lalu buat key.</li>
              <li>Salin token <strong className="text-slate-800">JWT</strong> dan simpan di kotak bawah ini.</li>
            </ol>
          </div>

          {/* Stored Key View VS Edit Mode */}
          {savedJwt && !isEditing ? (
            /* VIEW MODE: Key already saved! */
            <div className="p-4 bg-status-done-bg/60 rounded-control border border-status-done-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-done-dot animate-pulse"></span>
                  <span className="font-bold text-xs text-status-done-text">
                    Kunci Pinata Tersimpan &amp; Aktif
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Ubah Kunci</span>
                  </Button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-slate-400 hover:text-status-danger-dot rounded-lg transition"
                    title="Hapus Kunci dari Browser"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-3 py-2 rounded-control border border-slate-200 font-mono text-2xs text-slate-600 break-all select-all">
                {maskToken(savedJwt)}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-2xs text-status-done-text flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Tersimpan permanen di browser ini. Anda tidak perlu memasukkannya lagi.
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTest(savedJwt)}
                  disabled={isTesting}
                  className="gap-1.5 shrink-0"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Uji Koneksi</span>
                </Button>
              </div>
            </div>
          ) : (
            /* EDIT / INPUT MODE */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-600" />
                  <span>Masukkan Pinata JWT Token:</span>
                </label>
                {savedJwt && (
                  <button
                    type="button"
                    onClick={() => {
                      setJwtInput(savedJwt);
                      setIsEditing(false);
                    }}
                    className="text-slate-500 hover:text-slate-800 text-2xs underline"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                className="w-full form-input font-mono text-2xs resize-none"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mbyI6..."
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                autoFocus
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-2xs text-slate-400">
                  Disimpan permanen di memori lokal peramban (localStorage).
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTest(jwtInput)}
                  disabled={isTesting || !jwtInput.trim()}
                  className="gap-1.5"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-brand-600" />}
                  <span>Uji Key</span>
                </Button>
              </div>
            </div>
          )}

          {/* Local IPFS Node Toggle */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useLocal}
                onChange={(e) => setUseLocal(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                Gunakan Node IPFS Desktop / Kubo Lokal (Port 5001)
              </span>
            </label>
            {useLocal && (
              <input
                type="text"
                className="w-full form-input font-mono text-xs"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://127.0.0.1:5001/api/v0/add"
              />
            )}
          </div>

          {/* Modal Action Buttons - All strictly type="button" to prevent form submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Tutup
            </Button>

            {(isEditing || !savedJwt) ? (
              <Button
                type="button"
                onClick={handleSave}
                disabled={!jwtInput.trim() && !useLocal}
                className="gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Kunci Pinata</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onClose}
              >
                Selesai
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
