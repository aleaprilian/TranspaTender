import buildData from './TranspaTenderBuild.json';

export const TRANSPATENDER_ABI = buildData.abi;
export const TRANSPATENDER_BYTECODE = buildData.bytecode;

export const SUPPORTED_NETWORKS = {
  84532: {
    chainIdHex: "0x14a34",
    chainIdDec: 84532,
    chainName: "Base Sepolia Testnet",
    shortName: "Base Sepolia",
    rpcUrls: [
      "https://sepolia.base.org",
      "https://base-sepolia-rpc.publicnode.com"
    ],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorerUrls: ["https://sepolia.basescan.org/"],
    faucetUrl: "https://faucets.chain.link/base-sepolia"
  },
  11155111: {
    chainIdHex: "0xaa36a7",
    chainIdDec: 11155111,
    chainName: "Ethereum Sepolia Testnet",
    shortName: "Sepolia",
    rpcUrls: ["https://rpc.sepolia.org/"],
    nativeCurrency: {
      name: "Sepolia ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorerUrls: ["https://sepolia.etherscan.io/"],
    faucetUrl: "https://sepoliafaucet.com/"
  },
  80002: {
    chainIdHex: "0x13882",
    chainIdDec: 80002,
    chainName: "Polygon Amoy Testnet",
    shortName: "Polygon Amoy",
    rpcUrls: ["https://rpc-amoy.polygon.technology/"],
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18
    },
    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
    faucetUrl: "https://faucet.polygon.technology/"
  },
  31337: {
    chainIdHex: "0x7a69",
    chainIdDec: 31337,
    chainName: "Localhost / Hardhat",
    shortName: "Localhost",
    rpcUrls: ["http://127.0.0.1:8545/"],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorerUrls: ["#"],
    faucetUrl: null
  }
};

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS[84532];
export const BASE_SEPOLIA_CONFIG = DEFAULT_NETWORK;

export function getExplorerTxUrl(txHash, chainId = 84532) {
  const net = SUPPORTED_NETWORKS[chainId] || DEFAULT_NETWORK;
  const base = net.blockExplorerUrls[0];
  if (!base || base === '#') return null;
  return `${base.replace(/\/$/, '')}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address, chainId = 84532) {
  const net = SUPPORTED_NETWORKS[chainId] || DEFAULT_NETWORK;
  const base = net.blockExplorerUrls[0];
  if (!base || base === '#') return null;
  return `${base.replace(/\/$/, '')}/address/${address}`;
}
