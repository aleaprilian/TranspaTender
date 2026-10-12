import React, { useState, useEffect } from 'react';
import { useTender } from './context/TenderContext';
import { Header } from './components/Header';
import { PortalSwitcherBar } from './components/PortalSwitcherBar';
import { Web3ControlBar } from './components/Web3ControlBar';
import { TransactionToast } from './components/TransactionToast';
import { GovernmentPortal } from './components/GovernmentPortal';
import { VendorPortal } from './components/VendorPortal';
import { CreateTenderModal } from './components/CreateTenderModal';
import { TenderDetailModal } from './components/TenderDetailModal';
import { ShieldCheck, BookOpen, ExternalLink } from 'lucide-react';

export function App() {
  const { tenders } = useTender();
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

  const handleOpenVendorModal = (tender, action) => {
    setVendorPortalTenderId(tender.id);
    setVendorPortalTab(action === 'commit' ? 'hasher' : action); // Route to Kalkulator Hash first for commit
    setActivePortal('vendor');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFD]">
      {/* Top Multi-Window & Portal Switcher Bar */}
      <PortalSwitcherBar 
        activePortal={activePortal} 
        setActivePortal={setActivePortal} 
      />

      {/* Dynamic Header adapted for Government vs Vendor */}
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
        />
      )}

      {/* Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-5 sm:py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-center sm:text-left">
            <span className="font-semibold text-slate-800">TranspaTender ID</span>
            <span>•</span>
            <span>Sistem E-Procurement Blockchain Terdesentralisasi</span>
            <span className="hidden xs:inline">•</span>
            <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
              Base Sepolia (L2)
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 text-slate-600">
            <button 
              onClick={() => setActivePortal(activePortal === 'pemerintah' ? 'vendor' : 'pemerintah')}
              className="hover:text-slate-900 transition flex items-center gap-1 font-medium"
            >
              <span>Ganti ke {activePortal === 'pemerintah' ? 'Portal Rekanan Vendor' : 'Portal Pemerintah LPSE'}</span>
            </button>
            <a 
              href="https://sepolia.basescan.org/" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-slate-900 transition flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
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
