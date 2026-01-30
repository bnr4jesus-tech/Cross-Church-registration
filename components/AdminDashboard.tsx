
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RegistrationConfig, TemplateType, FormField, Submission, PriceOption } from '../types';
import { generateBiblicalEventScript } from '../services/geminiService';
import RegistrationForm from './RegistrationForm';

// UTF-8 safe Base64 encoding for the Universal Link
const toBase64 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

interface AdminDashboardProps {
  configs: RegistrationConfig[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSave: (config: RegistrationConfig) => void;
  onDelete: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ configs, activeId, onSelect, onSave, onDelete }) => {
  // Find the currently selected configuration from the parent's source of truth
  const currentSavedConfig = useMemo(() => {
    return configs.find(c => c.id === activeId);
  }, [configs, activeId]);

  // Local state for the builder to allow smooth typing/editing
  const [localConfig, setLocalConfig] = useState<RegistrationConfig>(currentSavedConfig || {
    id: Math.random().toString(36).substr(2, 9),
    title: 'New Event',
    description: '',
    logoUrl: '',
    price: 0,
    priceOptions: [],
    foodOptions: [],
    includeAllergies: false,
    cashAppTag: '',
    template: TemplateType.CORPORATE,
    fields: [{ id: '1', label: 'Full Name', type: 'text', required: true }],
    biblicalScript: ''
  } as RegistrationConfig);

  // Sync local state when switching events via sidebar or when parent updates
  useEffect(() => {
    if (currentSavedConfig) {
      setLocalConfig(currentSavedConfig);
    }
  }, [activeId, currentSavedConfig]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<'universal' | 'quick' | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'submissions'>('edit');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submissions = useMemo(() => {
    const all = JSON.parse(localStorage.getItem('grace_reg_submissions') || '[]');
    return all.filter((s: Submission) => s.configId === activeId);
  }, [activeId]);

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!localConfig.title.trim() || localConfig.title === 'Untitled Event' || localConfig.title === 'New Gathering') errs.push("Event title is required.");
    if (!localConfig.cashAppTag.trim()) errs.push("Cash App $Tag is required.");
    return errs;
  }, [localConfig]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1MB limit for safety, though base64 bloats it
      if (file.size > 1024 * 1024) {
        alert("This image is too large for web storage. Please use a logo under 500KB for best results.");
        return;
      }
      
      const reader = new FileReader();
      setSaveStatus('saving');
      
      reader.onload = () => {
        const result = reader.result as string;
        try {
          setLocalConfig(prev => {
            const updated = { ...prev, logoUrl: result };
            onSave(updated);
            return updated;
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
          console.error("Save error:", err);
          setSaveStatus('error');
          alert("Storage limit reached. Try removing other events or using a smaller logo.");
        }
      };
      
      reader.onerror = () => {
        alert("Failed to read the image file. Please try another one.");
        setSaveStatus('idle');
      };

      reader.readAsDataURL(file);
    }
  };

  const handleManualSave = () => {
    if (errors.length > 0) {
      alert("Please check your details: " + errors.join(" "));
      return;
    }
    setSaveStatus('saving');
    try {
      onSave(localConfig);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const robustCopy = (text: string, type: 'universal' | 'quick') => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);

    if (success) {
      setCopyFeedback(type);
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      window.prompt("Link generated! Select and copy this:", text);
    }
  };

  const getUniversalLink = (includeLogo: boolean = true) => {
    const portable = { ...localConfig };
    if (!includeLogo) portable.logoUrl = '';
    const dataStr = encodeURIComponent(toBase64(JSON.stringify(portable)));
    return `${window.location.origin}${window.location.pathname}?data=${dataStr}`;
  };

  const getQuickLink = () => {
    return `${window.location.origin}${window.location.pathname}?event=${localConfig.id}`;
  };

  const openPublicView = () => {
    try {
      const dataStr = encodeURIComponent(toBase64(JSON.stringify(localConfig)));
      const universalUrl = `${window.location.origin}${window.location.pathname}?data=${dataStr}`;
      window.open(universalUrl, '_blank');
    } catch (e) {
      alert("Error opening live test view.");
    }
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = localConfig.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
    const next = { ...localConfig, fields: updatedFields };
    setLocalConfig(next);
    onSave(next);
  };

  const addField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'text',
      required: false
    };
    const next = { ...localConfig, fields: [...localConfig.fields, newField] };
    setLocalConfig(next);
    onSave(next);
  };

  const removeField = (id: string) => {
    const next = { ...localConfig, fields: localConfig.fields.filter(f => f.id !== id) };
    setLocalConfig(next);
    onSave(next);
  };

  const clearLogo = () => {
    const next = { ...localConfig, logoUrl: '' };
    setLocalConfig(next);
    onSave(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="lg:w-72 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Ministry Portfolio</h3>
            <div className="space-y-2">
              {configs.map(c => (
                <button
                  key={c.id}
                  onClick={() => { onSelect(c.id); setActiveTab('edit'); }}
                  className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center gap-3 ${activeId === c.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}
                >
                  <span className="font-bold text-sm truncate">{c.title}</span>
                </button>
              ))}
              <button 
                onClick={() => {
                  const newId = Math.random().toString(36).substr(2, 9);
                  const newEvent: RegistrationConfig = {
                    id: newId,
                    title: 'New Gathering',
                    description: '',
                    logoUrl: '',
                    price: 0,
                    priceOptions: [],
                    foodOptions: [],
                    includeAllergies: false,
                    cashAppTag: '',
                    template: TemplateType.CORPORATE,
                    fields: [{ id: '1', label: 'Full Name', type: 'text', required: true }],
                  };
                  onSave(newEvent);
                  onSelect(newId);
                  setActiveTab('edit');
                }}
                className="w-full mt-4 px-5 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all text-xs font-black uppercase tracking-widest"
              >
                + Create Event
              </button>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 space-y-6">
             <div className="text-center">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="font-black text-lg tracking-tighter">Publish Now</h3>
                <p className="text-[10px] opacity-70 mt-1 uppercase font-bold tracking-widest">Share with your congregation</p>
             </div>
             <button 
              onClick={() => { handleManualSave(); setShowPublishModal(true); }}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl text-xs font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
             >
               GET PUBLIC LINK
             </button>
          </div>
        </aside>

        {/* Builder */}
        <main className="flex-1">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[850px]">
            <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-3 flex flex-wrap justify-between items-center">
              <div className="flex gap-2">
                {(['edit', 'preview', 'submissions'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                {saveStatus !== 'idle' && (
                  <span className={`text-[10px] font-black uppercase tracking-widest ${saveStatus === 'saving' ? 'text-indigo-500 animate-pulse' : saveStatus === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'error' ? 'Storage Full!' : 'Changes Saved ✨'}
                  </span>
                )}
                <button onClick={() => onDelete(localConfig.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest px-4">Delete Event</button>
              </div>
            </div>

            <div className="p-10">
              {activeTab === 'edit' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
                  
                  {/* Title & Branding */}
                  <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-44 h-44 shrink-0 rounded-[3rem] bg-slate-50 border-4 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden group shadow-inner relative"
                      >
                        {localConfig.logoUrl ? (
                          <img key={`thumb-${localConfig.logoUrl.slice(-20)}`} src={localConfig.logoUrl} className="w-full h-full object-contain p-4" alt="Branding" />
                        ) : (
                          <div className="text-center p-4">
                            <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Branding</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="bg-white/90 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">Change Image</span>
                        </div>
                        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                      </div>
                      {localConfig.logoUrl && (
                        <button onClick={clearLogo} className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Remove Logo</button>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-6 w-full">
                      <input value={localConfig.title} onChange={e => {
                        const next = {...localConfig, title: e.target.value};
                        setLocalConfig(next);
                        onSave(next);
                      }} className="text-5xl font-black w-full outline-none focus:border-b-4 focus:border-indigo-600 transition-all placeholder:text-slate-100 tracking-tighter" placeholder="Event Name" />
                      <textarea value={localConfig.description} onChange={e => {
                        const next = {...localConfig, description: e.target.value};
                        setLocalConfig(next);
                        onSave(next);
                      }} className="text-slate-400 w-full outline-none text-xl resize-none font-medium leading-relaxed" rows={3} placeholder="Provide details about the gathering..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Payment & Theme */}
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setup Essentials</h4>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cash App $Tag</label>
                          <input value={localConfig.cashAppTag} onChange={e => {
                            const next = {...localConfig, cashAppTag: e.target.value};
                            setLocalConfig(next);
                            onSave(next);
                          }} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm" placeholder="$MinistryTag" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Form Template</label>
                          <select value={localConfig.template} onChange={e => {
                            const next = {...localConfig, template: e.target.value as TemplateType};
                            setLocalConfig(next);
                            onSave(next);
                          }} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none">
                            <option value={TemplateType.CORPORATE}>Clean Professional</option>
                            <option value={TemplateType.VALENTINE}>Romantic Theme</option>
                            <option value={TemplateType.BIBLICAL_SPIRITUAL}>Sacred Parchment</option>
                            <option value={TemplateType.MODERN_EVENT}>Modern & Vibrant</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Entry Selection */}
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Options</h4>
                        <button onClick={() => {
                          const next = { ...localConfig, priceOptions: [...localConfig.priceOptions, { id: Math.random().toString(36).substr(2, 5), label: '', price: 0 }] };
                          setLocalConfig(next);
                          onSave(next);
                        }} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">+ Add Tier</button>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                        {localConfig.priceOptions.map(opt => (
                          <div key={opt.id} className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm items-center">
                            <input value={opt.label} onChange={e => {
                              const next = { ...localConfig, priceOptions: localConfig.priceOptions.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o) };
                              setLocalConfig(next);
                              onSave(next);
                            }} className="flex-1 text-xs font-bold outline-none px-1" placeholder="Label" />
                            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-300">$</span>
                              <input type="number" value={opt.price} onChange={e => {
                                const next = { ...localConfig, priceOptions: localConfig.priceOptions.map(o => o.id === opt.id ? { ...o, price: parseFloat(e.target.value) || 0 } : o) };
                                setLocalConfig(next);
                                onSave(next);
                              }} className="w-10 text-xs font-black outline-none bg-transparent" />
                            </div>
                            <button onClick={() => {
                              const next = { ...localConfig, priceOptions: localConfig.priceOptions.filter(o => o.id !== opt.id) };
                              setLocalConfig(next);
                              onSave(next);
                            }} className="text-red-200 hover:text-red-500 transition-colors px-1">✕</button>
                          </div>
                        ))}
                        {localConfig.priceOptions.length === 0 && (
                          <div className="space-y-2 pt-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Single Price ($)</label>
                             <input type="number" value={localConfig.price} onChange={e => {
                               const next = {...localConfig, price: parseFloat(e.target.value) || 0};
                               setLocalConfig(next);
                               onSave(next);
                             }} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Food Options */}
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu Choices</h4>
                        <button onClick={() => {
                          const next = { ...localConfig, foodOptions: [...localConfig.foodOptions, ''] };
                          setLocalConfig(next);
                          onSave(next);
                        }} className="text-orange-600 text-[10px] font-black uppercase tracking-widest hover:underline">+ Add Choice</button>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                        {localConfig.foodOptions.map((food, idx) => (
                          <div key={idx} className="flex gap-2 bg-white p-3 rounded-2xl border border-orange-50 shadow-sm items-center">
                            <input value={food} onChange={e => {
                              const nextFood = [...localConfig.foodOptions];
                              nextFood[idx] = e.target.value;
                              const next = {...localConfig, foodOptions: nextFood};
                              setLocalConfig(next);
                              onSave(next);
                            }} className="flex-1 text-xs font-bold outline-none" placeholder="Choice Name" />
                            <button onClick={() => {
                              const next = {...localConfig, foodOptions: localConfig.foodOptions.filter((_, i) => i !== idx)};
                              setLocalConfig(next);
                              onSave(next);
                            }} className="text-orange-200 hover:text-orange-500 transition-colors px-1">✕</button>
                          </div>
                        ))}
                        <div className="pt-2 flex items-center gap-3">
                           <input type="checkbox" id="all-chk" checked={localConfig.includeAllergies} onChange={e => {
                             const next = {...localConfig, includeAllergies: e.target.checked};
                             setLocalConfig(next);
                             onSave(next);
                           }} className="w-4 h-4 accent-orange-500 cursor-pointer" />
                           <label htmlFor="all-chk" className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Require allergy details</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registration Questions - Redesigned Section */}
                  <div className="p-10 bg-slate-900 rounded-[3rem] text-white space-y-8 shadow-2xl shadow-indigo-100">
                    <div className="flex justify-between items-center">
                       <div>
                          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Custom Form Fields</h4>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Build your registration questionnaire</p>
                       </div>
                       <button onClick={addField} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-xl shadow-black/20 group">
                         <span className="text-lg group-hover:rotate-90 transition-transform">+</span> 
                         New Question
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {localConfig.fields.map(field => (
                        <div key={field.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 group transition-all hover:bg-white/10 hover:border-indigo-500/50 space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Question Label</label>
                                   <input 
                                     value={field.label} 
                                     onChange={e => updateField(field.id, { label: e.target.value })} 
                                     className="w-full bg-white/5 text-sm font-bold outline-none border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-400 focus:bg-white/10 transition-all" 
                                     placeholder="e.g., Phone Number, Member ID..." 
                                   />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1">
                                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Input Type</label>
                                      <select 
                                        value={field.type} 
                                        onChange={e => updateField(field.id, { type: e.target.value as any })} 
                                        className="w-full bg-black/40 text-[9px] font-black uppercase tracking-widest text-indigo-300 px-3 py-3 rounded-xl border border-white/5 outline-none cursor-pointer"
                                      >
                                        <option value="text">Text Input</option>
                                        <option value="email">Email Address</option>
                                        <option value="tel">Phone (Tel)</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date Selection</option>
                                        <option value="checkbox">Toggle/Checkbox</option>
                                        <option value="textarea">Multi-line Text</option>
                                      </select>
                                   </div>
                                   
                                   <div className="space-y-1">
                                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Required?</label>
                                      <button 
                                        onClick={() => updateField(field.id, { required: !field.required })}
                                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${field.required ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
                                      >
                                        <div className={`w-3 h-3 rounded-full border-2 transition-all ${field.required ? 'bg-indigo-400 border-indigo-400' : 'border-slate-700'}`}></div>
                                        {field.required ? 'Mandatory' : 'Optional'}
                                      </button>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => removeField(field.id)} className="ml-4 text-white/20 hover:text-red-400 transition-all p-2 hover:bg-red-400/10 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                             </button>
                          </div>
                        </div>
                      ))}
                      {localConfig.fields.length === 0 && (
                        <div className="col-span-1 md:col-span-2 py-12 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center gap-4 text-slate-500">
                           <div className="text-3xl">📋</div>
                           <p className="text-xs font-black uppercase tracking-widest">No custom questions added yet</p>
                           <button onClick={addField} className="text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline">Click to start building</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="max-w-4xl mx-auto border-8 border-slate-900 rounded-[4rem] shadow-2xl overflow-hidden scale-90 origin-top transform-gpu">
                  <RegistrationForm config={localConfig} />
                </div>
              )}

              {activeTab === 'submissions' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex justify-between items-end">
                    <h3 className="text-4xl font-black tracking-tighter text-slate-900">Registrants</h3>
                    <div className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-2xl font-black">{submissions.length}</div>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <th className="px-8 py-5">Guest Name</th>
                          <th className="px-8 py-5">Admission</th>
                          <th className="px-8 py-5 text-right">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {submissions.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-8 py-6">
                               <div className="font-bold text-slate-800">{s.data['Full Name'] || 'Guest'}</div>
                               <div className="text-[10px] text-slate-400 font-medium">{s.data['Email Address'] || '—'}</div>
                            </td>
                            <td className="px-8 py-6">
                               <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full uppercase tracking-widest">{s.selectedEntryType}</span>
                            </td>
                            <td className="px-8 py-6 text-right font-black text-slate-900">${s.totalPaid}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {submissions.length === 0 && (
                      <div className="py-32 text-center text-slate-300 font-black uppercase tracking-widest text-sm">No registrations recorded</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Improved Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] max-w-2xl w-full p-12 space-y-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-4">
                 <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                 </div>
                 <h2 className="text-4xl font-black tracking-tighter">Your Event is Live!</h2>
                 <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">Choose how you'd like to share this event. Use the <b>Universal Link</b> to send to guests on any device.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Option 1: Universal Portable Link */}
                 <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4 relative overflow-hidden group">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Public Access</div>
                    <div className="text-2xl">🌍</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">This link contains your entire form configuration.</p>
                    <button 
                      onClick={() => {
                        const link = getUniversalLink(true);
                        if (link.length > 30000) {
                          if (confirm("This link is very long because of your logo. It might be blocked by some messaging apps. Share a link without branding instead?")) {
                            robustCopy(getUniversalLink(false), 'universal');
                            return;
                          }
                        }
                        robustCopy(link, 'universal');
                      }} 
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${copyFeedback === 'universal' ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                    >
                      {copyFeedback === 'universal' ? 'LINK COPIED!' : 'COPY PORTABLE LINK'}
                    </button>
                    {getUniversalLink().length > 25000 && (
                      <div className="absolute top-2 right-2 flex h-5 w-5">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 text-[10px] text-white items-center justify-center font-black">!</span>
                      </div>
                    )}
                 </div>

                 {/* Option 2: Local ID Link */}
                 <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center text-center space-y-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Internal Test</div>
                    <div className="text-2xl">📱</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">A short link for local browser testing only.</p>
                    <button 
                      onClick={() => robustCopy(getQuickLink(), 'quick')} 
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${copyFeedback === 'quick' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black active:scale-95'}`}
                    >
                      {copyFeedback === 'quick' ? 'COPIED QUICK!' : 'COPY QUICK LINK'}
                    </button>
                 </div>
              </div>

              <div className="flex justify-center gap-6">
                 <button onClick={() => setShowPublishModal(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Return to Dashboard</button>
                 <button onClick={openPublicView} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Open Live Preview</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
