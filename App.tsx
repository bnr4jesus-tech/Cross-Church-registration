
import React, { useState, useEffect, useMemo } from 'react';
import { TemplateType, RegistrationConfig } from './types';
import AdminDashboard from './components/AdminDashboard';
import RegistrationForm from './components/RegistrationForm';

const fromBase64 = (base64: string) => {
  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Base64 decoding failed", e);
    return null;
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<'admin' | 'public'>('admin');
  const [configs, setConfigs] = useState<RegistrationConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [hydrationMessage, setHydrationMessage] = useState<string | null>(null);
  
  // Strict Guest Mode: No nav, no dashboard if data or event is in URL
  const isGuestMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('data') || params.has('event');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('grace_reg_configs');
    let currentConfigs: RegistrationConfig[] = [];

    if (saved) {
      try {
        currentConfigs = JSON.parse(saved);
      } catch (e) {
        currentConfigs = [];
      }
    }

    const params = new URLSearchParams(window.location.search);
    const portableData = params.get('data');
    const eventId = params.get('event');

    if (portableData) {
      const decodedStr = fromBase64(decodeURIComponent(portableData));
      if (decodedStr) {
        try {
          const decoded = JSON.parse(decodedStr);
          if (decoded && decoded.id) {
            const existsIdx = currentConfigs.findIndex(c => c.id === decoded.id);
            if (existsIdx === -1) {
              currentConfigs = [...currentConfigs, decoded];
              try {
                localStorage.setItem('grace_reg_configs', JSON.stringify(currentConfigs));
              } catch(e) {}
              setHydrationMessage(`Event "${decoded.title}" loaded!`);
            } else {
              currentConfigs[existsIdx] = decoded;
              try {
                localStorage.setItem('grace_reg_configs', JSON.stringify(currentConfigs));
              } catch(e) {}
            }
            setSelectedConfigId(decoded.id);
            setView('public');
          }
        } catch (e) {
          console.error("Malformed link", e);
        }
      }
    } else if (eventId) {
      const found = currentConfigs.find(c => c.id === eventId);
      if (found) {
        setSelectedConfigId(eventId);
        setView('public');
      }
    }

    setConfigs(currentConfigs);
    
    if (currentConfigs.length === 0) {
      const initial: RegistrationConfig = {
        id: 'default-1',
        title: 'Grace & Fellowship Gathering',
        description: 'Join us for a meaningful time of worship and connection.',
        price: 0,
        priceOptions: [],
        foodOptions: [],
        includeAllergies: true,
        cashAppTag: 'BNRMinistry',
        template: TemplateType.BIBLICAL_SPIRITUAL,
        fields: [
          { id: '1', label: 'Full Name', type: 'text', required: true },
          { id: '2', label: 'Email Address', type: 'email', required: true }
        ],
        biblicalScript: "Iron sharpens iron, and one person sharpens another. Join our fellowship as we grow together in His grace."
      };
      setConfigs([initial]);
      try {
        localStorage.setItem('grace_reg_configs', JSON.stringify([initial]));
      } catch(e) {}
      if (!selectedConfigId) setSelectedConfigId(initial.id);
    } else if (!selectedConfigId && !isGuestMode) {
      setSelectedConfigId(currentConfigs[0].id);
    }
  }, [isGuestMode]);

  const saveConfig = (updated: RegistrationConfig) => {
    const exists = configs.find(c => c.id === updated.id);
    const newConfigs = exists 
      ? configs.map(c => c.id === updated.id ? updated : c)
      : [...configs, updated];
    
    setConfigs(newConfigs);
    localStorage.setItem('grace_reg_configs', JSON.stringify(newConfigs));
  };

  const deleteConfig = (id: string) => {
    const newConfigs = configs.filter(c => c.id !== id);
    setConfigs(newConfigs);
    localStorage.setItem('grace_reg_configs', JSON.stringify(newConfigs));
    if (selectedConfigId === id) setSelectedConfigId(newConfigs[0]?.id || null);
  };

  // The navigation is only rendered if we are NOT in Guest Mode.
  const showNav = !isGuestMode;

  return (
    <div className="min-h-screen bg-slate-50">
      {showNav && (
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b z-50 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">B</div>
            <span className="font-black text-slate-800 tracking-tighter uppercase">BNR MINISTRY</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('admin')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              DASHBOARD
            </button>
            {selectedConfigId && (
              <button 
                onClick={() => setView('public')}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${view === 'public' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                LIVE FORM
              </button>
            )}
          </div>
        </nav>
      )}

      {hydrationMessage && view === 'admin' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
           <span>✨ {hydrationMessage}</span>
           <button onClick={() => setHydrationMessage(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      <main className={showNav ? "pt-16" : ""}>
        {view === 'admin' && !isGuestMode ? (
          <AdminDashboard 
            configs={configs} 
            activeId={selectedConfigId} 
            onSelect={setSelectedConfigId} 
            onSave={saveConfig}
            onDelete={deleteConfig}
          />
        ) : (
          <div className="w-full min-h-screen">
            {configs.find(c => c.id === selectedConfigId) ? (
              <RegistrationForm config={configs.find(c => c.id === selectedConfigId)!} />
            ) : (
              <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center p-8 max-w-sm">
                  <div className="text-4xl mb-4">🕊️</div>
                  <p className="text-slate-800 font-bold mb-2">Registration Unavailable</p>
                  <p className="text-slate-400 text-xs mb-6">This registration link is currently inactive.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
