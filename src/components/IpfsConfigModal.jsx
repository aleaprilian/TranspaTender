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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto" 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Konfigurasi Penyimpanan IPFS</h3>
              <p className="text-[11px] sm:text-xs text-indigo-200">Penyimpanan Terdesentralisasi Permanen (Pinata Cloud)</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Using DIV instead of FORM to prevent browser reload */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-700 overflow-y-auto">
          {/* Status Alert */}
          {status.type && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
              <span className="leading-relaxed font-medium">{status.message}</span>
            </div>
          )}

          {/* Quick Guide Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                Dapatkan Kunci Pinata Gratis (1 GB Selamanya):
              </span>
              <a 
                href="https://app.pinata.cloud/developers/api-keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 text-[11px]"
              >
                <span>Buka Pinata Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-normal pl-1">
              <li>Daftar gratis di <strong className="text-slate-800">app.pinata.cloud</strong>.</li>
              <li>Buka menu <strong className="text-slate-800">API Keys</strong> &gt; klik <strong className="text-slate-800">"New Key"</strong>.</li>
              <li>Centang <strong className="text-slate-800">Admin</strong> (atau <em>pinFileToIPFS</em>) lalu buat key.</li>
              <li>Salin token <strong className="text-slate-800">JWT</strong> dan simpan di kotak bawah ini.</li>
            </ol>
          </div>

          {/* Stored Key View VS Edit Mode */}
          {savedJwt && !isEditing ? (
            /* VIEW MODE: Key already saved! */
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-xs text-emerald-950">
                    Kunci Pinata Tersimpan & Aktif
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 font-semibold rounded-lg text-xs transition flex items-center gap-1 shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Ubah Kunci</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Hapus Kunci dari Browser"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 break-all select-all">
                {maskToken(savedJwt)}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-emerald-700">
                  ✓ Tersimpan permanen di browser ini. Anda tidak perlu memasukkannya lagi.
                </span>
                <button
                  type="button"
                  onClick={() => handleTest(savedJwt)}
                  disabled={isTesting}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Uji Koneksi</span>
                </button>
              </div>
            </div>
          ) : (
            /* EDIT / INPUT MODE */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Masukkan Pinata JWT Token:</span>
                </label>
                {savedJwt && (
                  <button
                    type="button"
                    onClick={() => {
                      setJwtInput(savedJwt);
                      setIsEditing(false);
                    }}
                    className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                className="w-full form-input font-mono text-[11px] resize-none"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mbyI6..."
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                autoFocus
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Disimpan permanen di memori lokal peramban (localStorage).
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTest(jwtInput)}
                    disabled={isTesting || !jwtInput.trim()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                    <span>Uji Key</span>
                  </button>
                </div>
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
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
          <div className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition text-center"
            >
              Tutup
            </button>
            
            {(isEditing || !savedJwt) ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={!jwtInput.trim() && !useLocal}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Kunci Pinata</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-sm transition text-center justify-center"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
