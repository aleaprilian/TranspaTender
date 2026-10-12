import React, { useState, useEffect } from 'react';
import { useTender } from './context/TenderContext';
import { SIMULATED_ACCOUNTS } from './utils/crypto';
import { Header } from './components/Header';
import { Web3ControlBar } from './components/Web3ControlBar';
import { TransactionToast } from './components/TransactionToast';
import { GovernmentPortal } from './components/GovernmentPortal';
import { VendorPortal } from './components/VendorPortal';
import { CreateTenderModal } from './components/CreateTenderModal';
import { TenderDetailModal } from './components/TenderDetailModal';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export function App() {
  const { tenders, mode, selectedAccountId, setSelectedAccountId } = useTender();
  // Read portal from URL or default to 'pemerintah'
  const getInitialPortal = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('portal');
      if (p === 'vendor' || p === 'pemerintah') return p;
    } catch (e) {
      console.error(e);
    }
    return 'pemerintah';
  };

  const [activePortal, setActivePortalState] = useState(getInitialPortal);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenderDetail, setSelectedTenderDetail] = useState(null);
  
  // Specific navigation state for vendor portal
  const [vendorPortalTenderId, setVendorPortalTenderId] = useState(null);
  const [vendorPortalTab, setVendorPortalTab] = useState('katalog');

  // Change portal and sync URL query params without page reload
  const setActivePortal = (portal) => {
    setActivePortalState(portal);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', portal);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('portal');
        if (p === 'vendor' || p === 'pemerintah') {
          setActivePortalState(p);
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sandbox: entitas aktif terkunci pada peran portal (Pemerintah -> Panitia/Auditor, Vendor -> Vendor A/B)
  useEffect(() => {
    if (mode !== 'simulation') return;
    const defaultEntity = activePortal === 'pemerintah' ? 'panitia' : 'vendor_a';
    const entity = SIMULATED_ACCOUNTS.find(a => a.id === selectedAccountId);
    if (!entity || entity.portal !== activePortal) {
      setSelectedAccountId(defaultEntity);
    }
  }, [mode, activePortal, selectedAccountId, setSelectedAccountId]);

  const handleOpenVendorModal = (tender, action) => {
    setVendorPortalTenderId(tender.id);
    setVendorPortalTab(action === 'commit' ? 'hasher' : action); // Route to Kalkulator Hash first for commit
    setActivePortal('vendor');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFD]">
      {/* Unified app bar: brand, portal switcher, environment, wallet & actions */}
      <Header 
        activePortal={activePortal} 
        setActivePortal={setActivePortal} 
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Web3 Control Bar (Base Sepolia deploy, network status, faucet) */}
        <Web3ControlBar />

        {/* Portal Body: Render either Government Portal or Vendor Portal */}
        {activePortal === 'pemerintah' ? (
          <GovernmentPortal 
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectTender={(tender) => setSelectedTenderDetail(tender)}
          />
        ) : (
          <VendorPortal 
            initialTenderId={vendorPortalTenderId} 
            initialTab={vendorPortalTab}
            onSelectTender={(tender) => setSelectedTenderDetail(tender)}
          />
        )}
      </main>

      {/* Global Transaction Toast */}
      <TransactionToast />

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateTenderModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {selectedTenderDetail && (
        <TenderDetailModal 
          tender={tenders.find(t => t.id === selectedTenderDetail.id) || selectedTenderDetail} 
          onClose={() => setSelectedTenderDetail(null)}
          onOpenVendorModal={handleOpenVendorModal}
          activePortal={activePortal}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-semibold text-slate-800">TranspaTender ID</span>
            <span className="text-slate-300">•</span>
            <span>Sistem E-Procurement Blockchain Terdesentralisasi</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded font-medium">
              Base Sepolia (L2)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <a
              href="https://github.com/aleaprilian/TranspaTender"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition"
            >
              Dokumentasi & Kode Sumber
            </a>
            <a
              href="https://sepolia.basescan.org/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Base Sepolia Basescan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
