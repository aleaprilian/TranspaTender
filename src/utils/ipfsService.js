/**
 * IPFS Decentralized Storage Service for TranspaTender
 * Supports:
 * 1. Pinata Cloud IPFS Pinning (Recommended for production & public persistence)
 * 2. Local IPFS Node (Kubo / IPFS Desktop at http://127.0.0.1:5001)
 * 3. Client-side cryptographic multihash generator (fallback when offline)
 */

export const IPFS_STORAGE_KEYS = {
  PINATA_JWT: 'transpatender_pinata_jwt',
  GATEWAY_URL: 'transpatender_ipfs_gateway',
  USE_LOCAL_NODE: 'transpatender_use_local_ipfs',
  LOCAL_NODE_URL: 'transpatender_local_ipfs_url'
};

export const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
export const PUBLIC_IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
export const DEFAULT_LOCAL_NODE = 'http://127.0.0.1:5001/api/v0/add';

/**
 * Get configured Pinata JWT (from localStorage or Vite env)
 */
export function getPinataJwt() {
  const local = localStorage.getItem(IPFS_STORAGE_KEYS.PINATA_JWT);
  if (local && local.trim()) return local.trim();
  const envVal = import.meta.env.VITE_PINATA_JWT;
  if (envVal && envVal.trim()) return envVal.trim();
  return null;
}

export function savePinataJwt(jwt) {
  if (!jwt) {
    localStorage.removeItem(IPFS_STORAGE_KEYS.PINATA_JWT);
  } else {
    localStorage.setItem(IPFS_STORAGE_KEYS.PINATA_JWT, jwt.trim());
  }
}

export function getIpfsGateway() {
  const local = localStorage.getItem(IPFS_STORAGE_KEYS.GATEWAY_URL);
  if (local && local.trim()) return local.trim().replace(/\/$/, '') + '/';
  const envVal = import.meta.env.VITE_PINATA_GATEWAY;
  if (envVal && envVal.trim()) return envVal.trim().replace(/\/$/, '') + '/';
  return DEFAULT_GATEWAY; // 'https://gateway.pinata.cloud/ipfs/' (Super reliable, no QUIC/inbrowser error)
}

export function formatIpfsGatewayUrl(ipfsUriOrCid) {
  if (!ipfsUriOrCid) return '';
  const trimmed = ipfsUriOrCid.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cid = trimmed.replace(/^ipfs:\/\//, '').trim();
  const gateway = getIpfsGateway();
  return `${gateway}${cid}`;
}

export function getUseLocalNode() {
  return localStorage.getItem(IPFS_STORAGE_KEYS.USE_LOCAL_NODE) === 'true';
}

export function setUseLocalNode(enabled) {
  localStorage.setItem(IPFS_STORAGE_KEYS.USE_LOCAL_NODE, enabled ? 'true' : 'false');
}

/**
 * Test Pinata Authentication
 */
export async function testPinataAuth(jwt) {
  const token = jwt || getPinataJwt();
  if (!token) throw new Error("JWT Pinata belum dimasukkan.");

  const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.details || err.message || `Autentikasi Pinata Gagal (${response.status})`);
  }

  const data = await response.json();
  return data;
}

/**
 * Compute SHA-256 multihash in browser (Base58-like hex fallback)
 */
async function computeBrowserHash(file) {
  const buffer = await file.arrayBuffer();
  const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(digestBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Format into pseudo-CIDv0 string Qm...
  const pseudoQm = "Qm" + hex.slice(0, 44);
  return pseudoQm;
}

/**
 * Upload a File object directly to IPFS
 * @param {File} file 
 * @param {Object} options 
 * @returns {Promise<{ cid: string, ipfsUri: string, gatewayUrl: string, provider: string }>}
 */
export async function uploadFileToIpfs(file, options = {}) {
  if (!file) {
    throw new Error("File tidak ditemukan untuk diunggah.");
  }

  const pinataJwt = getPinataJwt();
  const useLocal = getUseLocalNode();
  const customName = options.customName || file.name || `dokumen_${Date.now()}`;

  // 1. Try Local IPFS Node if enabled
  if (useLocal) {
    try {
      const localUrl = localStorage.getItem(IPFS_STORAGE_KEYS.LOCAL_NODE_URL) || DEFAULT_LOCAL_NODE;
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(localUrl, {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        throw new Error(`Node IPFS lokal merespons error ${resp.status}`);
      }

      const resText = await resp.text();
      // Kubo returns JSON or NDJSON
      const data = JSON.parse(resText.trim().split('\n')[0]);
      const cid = data.Hash;

      return {
        success: true,
        cid,
        ipfsUri: `ipfs://${cid}`,
        gatewayUrl: `${getIpfsGateway()}${cid}`,
        provider: 'Local IPFS Node (Kubo)',
        fileName: customName,
        fileSize: file.size
      };
    } catch (localErr) {
      console.warn("Gagal unggah ke Node IPFS Lokal:", localErr);
      if (!pinataJwt) {
        throw new Error(`Koneksi Node IPFS lokal gagal (${localErr.message}). Pastikan IPFS Desktop aktif di port 5001 atau masukkan Kunci Pinata.`);
      }
    }
  }

  // 2. Upload via Pinata Cloud API (Official Persistent IPFS Pinning)
  if (pinataJwt) {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `TranspaTender_${customName}`,
      keyvalues: {
        app: 'TranspaTender',
        uploadedAt: new Date().toISOString(),
        originalName: file.name
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', pinataOptions);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.details || errData.message || `Pinata upload error ${response.status}`;
      throw new Error(`Gagal upload ke Pinata IPFS: ${msg}`);
    }

    const result = await response.json();
    const cid = result.IpfsHash;

    return {
      success: true,
      cid,
      ipfsUri: `ipfs://${cid}`,
      gatewayUrl: `${getIpfsGateway()}${cid}`,
      provider: 'Pinata Cloud (IPFS Pinning)',
      fileName: customName,
      fileSize: file.size
    };
  }

  // 3. Fallback: If no API key is provided, compute cryptographic hash in browser
  // and explain to user that Pinata is needed for global network replication.
  const fallbackCid = await computeBrowserHash(file);
  return {
    success: true,
    isLocalOnly: true,
    cid: fallbackCid,
    ipfsUri: `ipfs://${fallbackCid}`,
    gatewayUrl: `${PUBLIC_IPFS_GATEWAY}${fallbackCid}`,
    provider: 'Simulasi Hash Kriptografi (Kunci Pinata Belum Terpasang)',
    fileName: customName,
    fileSize: file.size
  };
}
