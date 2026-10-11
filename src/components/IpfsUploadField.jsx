import React, { useState, useEffect, useRef } from 'react';
import { 
  uploadFileToIpfs, 
  getPinataJwt, 
  getUseLocalNode 
} from '../utils/ipfsService';
import { IpfsConfigModal } from './IpfsConfigModal';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  Settings, 
  Copy, 
  Check, 
  X,
  FileCheck2,
  HardDrive
} from 'lucide-react';

export function IpfsUploadField({
  label = "Dokumen IPFS",
  value = "",
  onChange,
  placeholder = "ipfs://Qm...",
  helpText = "Dokumen disimpan secara terdesentralisasi di jaringan IPFS, dan CID dicatat di Smart Contract.",
  required = false
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedMeta, setUploadedMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleConfigChange = () => setConfigVersion(v => v + 1);
    window.addEventListener('ipfs-config-changed', handleConfigChange);
    return () => window.removeEventListener('ipfs-config-changed', handleConfigChange);
  }, []);

  const hasPinataKey = Boolean(getPinataJwt());
  const useLocal = getUseLocalNode();

  const handleFile = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadFileToIpfs(file, {
        customName: file.name
      });

      setUploadedMeta({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        provider: res.provider,
        gatewayUrl: res.gatewayUrl,
        isLocalOnly: res.isLocalOnly
      });

      if (onChange) {
        onChange(res.ipfsUri);
      }
    } catch (err) {
      console.error("IPFS Upload Failed:", err);
      setUploadError(err.message || "Gagal mengunggah file ke IPFS.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanCid = value ? value.replace(/^ipfs:\/\//, '') : '';
  const gatewayUrl = cleanCid ? `https://gateway.pinata.cloud/ipfs/${cleanCid}` : null;

  return (
    <div className="space-y-2">
      {/* Field Label and IPFS Config Button */}
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
            hasPinataKey || useLocal
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
          }`}
          title="Atur Kunci Pinata / Node IPFS"
        >
          <Settings className="w-3 h-3" />
          <span>{hasPinataKey ? "Pinata Aktif" : useLocal ? "Node Lokal Aktif" : "Konfigurasi IPFS"}</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Upload Zone / Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/70 bg-white'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <div className="text-xs font-semibold text-slate-800">
              Mengunggah & Pinning Dokumen ke IPFS...
            </div>
            <p className="text-[10px] text-slate-400">
              Menghitung sidik jari kriptografi (CID) dan menyebarkan ke jaringan
            </p>
          </div>
        ) : uploadedMeta ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-left gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  uploadedMeta.isLocalOnly ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {uploadedMeta.name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{uploadedMeta.size}</span>
                    <span>•</span>
                    <span className={uploadedMeta.isLocalOnly ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
                      {uploadedMeta.provider}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Ganti File
                </button>
              </div>
            </div>

            {uploadedMeta.isLocalOnly && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] text-left flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    File Belum Di-Pin ke IPFS Global (Kunci Pinata Belum Terpasang)
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Hash dihitung lokal di browser. Gateway publik seperti <code>ipfs.io</code> akan <strong>Connection timed out (Error 522)</strong> karena file belum dikirim ke server node IPFS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfigOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 shadow-sm transition"
                >
                  Pasang Pinata
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-indigo-600 hover:underline">Pilih dokumen fisik</span> atau drag & drop ke sini
            </div>
            <p className="text-[10px] text-slate-400">
              Mendukung PDF, DOCX, XLSX, ZIP (Dokumen KAK, Spesifikasi, RKS, Proposal Teknis)
            </p>
          </div>
        )}
      </div>

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="block font-semibold underline text-rose-900 hover:text-rose-950"
            >
              Klik di sini untuk memasukkan Kunci Pinata gratis.
            </button>
          </div>
        </div>
      )}

      {/* IPFS URI Input & Action Bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="form-input text-xs font-mono pr-20"
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
              title="Salin URI IPFS"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {gatewayUrl && (
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition flex items-center gap-0.5"
              title="Buka File di Gateway IPFS Publik"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{helpText}</span>
        {cleanCid && (
          <a
            href={`https://ipfs.io/ipfs/${cleanCid}`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline font-mono text-[10px] shrink-0"
          >
            ipfs.io gateway ↗
          </a>
        )}
      </div>

      {/* IPFS Config Modal */}
      <IpfsConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={() => {}}
      />
    </div>
  );
}
