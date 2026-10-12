import React, { useState, useEffect, useRef } from 'react';
import {
  uploadFileToIpfs,
  getPinataJwt,
  getUseLocalNode
} from '../utils/ipfsService';
import { IpfsConfigModal } from './IpfsConfigModal';
import { cn } from './ui';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  ExternalLink,
  Loader2,
  Settings,
  Copy,
  Check,
  FileCheck2
} from 'lucide-react';

const URI_INPUT_CLASS =
  'w-full pr-20 pl-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-control text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

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
          <FileText className="w-3.5 h-3.5 text-brand-600" />
          <span>{label}</span>
          {required && <span className="text-status-danger-dot">*</span>}
        </label>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border transition',
            hasPinataKey || useLocal
              ? 'bg-status-done-bg text-status-done-text border-status-done-border hover:brightness-[0.97]'
              : 'bg-status-reveal-bg text-status-reveal-text border-status-reveal-border hover:brightness-[0.97]'
          )}
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
        className={cn(
          'relative rounded-control border-2 border-dashed p-4 text-center cursor-pointer transition',
          dragActive
            ? 'border-brand-500 bg-brand-50/60'
            : 'border-slate-200 bg-white hover:border-brand-400 hover:bg-slate-50/70'
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            <div className="text-xs font-semibold text-slate-800">
              Mengunggah &amp; Pinning Dokumen ke IPFS...
            </div>
            <p className="text-2xs text-slate-400">
              Menghitung sidik jari kriptografi (CID) dan menyebarkan ke jaringan
            </p>
          </div>
        ) : uploadedMeta ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-left gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    uploadedMeta.isLocalOnly
                      ? 'bg-status-reveal-bg text-status-reveal-text'
                      : 'bg-status-done-bg text-status-done-text'
                  )}
                >
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {uploadedMeta.name}
                  </p>
                  <div className="flex items-center gap-2 text-2xs text-slate-500">
                    <span>{uploadedMeta.size}</span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={cn(
                        'font-medium',
                        uploadedMeta.isLocalOnly ? 'text-status-reveal-text' : 'text-status-done-text'
                      )}
                    >
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
                  className="text-xs text-brand-700 hover:underline font-medium"
                >
                  Ganti File
                </button>
              </div>
            </div>

            {uploadedMeta.isLocalOnly && (
              <div className="p-2.5 rounded-control bg-status-reveal-bg border border-status-reveal-border text-status-reveal-text text-2xs text-left flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-status-reveal-dot" />
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
                  className="px-2.5 py-1.5 bg-status-reveal-dot hover:brightness-95 text-white rounded-control text-2xs font-bold shrink-0 transition"
                >
                  Pasang Pinata
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-brand-700">Pilih dokumen fisik</span> atau drag &amp; drop ke sini
            </div>
            <p className="text-2xs text-slate-400">
              Mendukung PDF, DOCX, XLSX, ZIP (Dokumen KAK, Spesifikasi, RKS, Proposal Teknis)
            </p>
          </div>
        )}
      </div>

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="p-2.5 rounded-control bg-status-danger-bg border border-status-danger-border text-status-danger-text text-2xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-status-danger-dot" />
          <div className="space-y-1">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="block font-semibold underline hover:opacity-80"
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
          className={URI_INPUT_CLASS}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
              title="Salin URI IPFS"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-status-done-dot" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {gatewayUrl && (
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded transition flex items-center gap-0.5"
              title="Buka File di Gateway IPFS Publik"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-2xs text-slate-500">
        <span>{helpText}</span>
        {cleanCid && (
          <a
            href={`https://ipfs.io/ipfs/${cleanCid}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline font-mono shrink-0 inline-flex items-center gap-0.5"
          >
            <span>ipfs.io gateway</span>
            <ExternalLink className="w-2.5 h-2.5" />
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
