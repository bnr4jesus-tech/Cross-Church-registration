
import React, { useState, useEffect, useRef } from 'react';
import { RegistrationConfig, TemplateType, PriceOption, FormField } from '../types';
import { TEMPLATE_STYLES, CARD_STYLES, BUTTON_STYLES } from '../constants';
import { generateConfirmationEmails } from '../services/geminiService';

interface RegistrationFormProps {
  config: RegistrationConfig;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ config }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedEntry, setSelectedEntry] = useState<PriceOption | null>(null);
  const [selectedFood, setSelectedFood] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailContent, setEmailContent] = useState<{ registrantEmail?: string; adminEmail?: string }>({});

  const statusRef = useRef<HTMLDivElement>(null);

  // Set default entry type if options exist
  useEffect(() => {
    if (config.priceOptions?.length > 0) {
      setSelectedEntry(config.priceOptions[0]);
    }
  }, [config.priceOptions]);

  // Focus management on submission
  useEffect(() => {
    if (submitted && statusRef.current) {
      statusRef.current.focus();
    }
  }, [submitted]);

  const currentTotalPrice = selectedEntry ? selectedEntry.price : config.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setIsSendingEmails(true);

    const nameKey = config.fields.find(f => f.label.toLowerCase().includes('name'))?.label || 'Full Name';
    const emailKey = config.fields.find(f => f.label.toLowerCase().includes('email'))?.label || 'Email Address';
    const registrantName = formData[nameKey] || 'Guest';
    const registrantEmail = formData[emailKey] || 'No Email';

    const details = `Entry: ${selectedEntry?.label || 'General'}, Food: ${selectedFood || 'None'}, Allergies: ${allergies || 'None'}, Total: $${currentTotalPrice}. Form Data: ${JSON.stringify(formData)}`;

    const submissions = JSON.parse(localStorage.getItem('grace_reg_submissions') || '[]');
    submissions.push({
      id: Math.random().toString(36).substr(2, 9),
      configId: config.id,
      data: formData,
      selectedEntryType: selectedEntry?.label || 'General Entry',
      selectedFood: selectedFood,
      allergies: allergies,
      totalPaid: currentTotalPrice,
      timestamp: Date.now(),
      paid: false
    });
    localStorage.setItem('grace_reg_submissions', JSON.stringify(submissions));

    // Simulation of emails using Gemini
    const content = await generateConfirmationEmails(config.title, registrantName, details);
    setEmailContent(content);
    setIsSendingEmails(false);
  };

  const handlePayment = () => {
    const amount = currentTotalPrice;
    const tag = config.cashAppTag.startsWith('$') ? config.cashAppTag.slice(1) : config.cashAppTag;
    const url = `https://cash.app/$${tag}/${amount}`;
    window.open(url, '_blank');
    setPaymentInitiated(true);
  };

  const renderField = (field: FormField) => {
    const isBiblical = config.template === TemplateType.BIBLICAL_SPIRITUAL;
    const labelClasses = `block text-[10px] md:text-[11px] font-black uppercase text-slate-600 mb-1 ml-1 tracking-wider ${isBiblical ? 'font-serif normal-case italic !text-[#5d4037]' : ''}`;
    const inputClasses = `w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-300 bg-white/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400 ${isBiblical ? 'font-serif border-[#d7ccc8] focus:border-[#8d6e63] focus:ring-[#8d6e63]/5 rounded-none' : ''}`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="col-span-1 md:col-span-2 space-y-1">
            <label className={labelClasses} htmlFor={field.id}>{field.label} {field.required && <span aria-hidden="true">*</span>}</label>
            <textarea
              id={field.id}
              required={field.required}
              aria-required={field.required}
              rows={4}
              onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
              className={inputClasses}
              placeholder={`Enter details...`}
            />
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id} className={`flex items-center gap-4 p-4 bg-white/30 rounded-xl md:rounded-2xl border border-slate-200 ${isBiblical ? 'rounded-none border-[#d7ccc8]' : ''}`}>
             <input
              id={field.id}
              type="checkbox"
              required={field.required}
              aria-required={field.required}
              onChange={(e) => setFormData({ ...formData, [field.label]: e.target.checked })}
              className="w-5 h-5 md:w-6 md:h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-xs md:text-sm font-bold text-slate-700 cursor-pointer" htmlFor={field.id}>{field.label}</label>
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className="space-y-1">
            <label className={labelClasses} htmlFor={field.id}>{field.label} {field.required && <span aria-hidden="true">*</span>}</label>
            <input
              id={field.id}
              type="date"
              required={field.required}
              aria-required={field.required}
              onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
              className={inputClasses}
            />
          </div>
        );
      default:
        return (
          <div key={field.id} className="space-y-1">
            <label className={labelClasses} htmlFor={field.id}>{field.label} {field.required && <span aria-hidden="true">*</span>}</label>
            <input
              id={field.id}
              type={field.type}
              required={field.required}
              aria-required={field.required}
              placeholder={`Your ${field.label.toLowerCase()}`}
              onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
              className={inputClasses}
            />
          </div>
        );
    }
  };

  if (submitted) {
    const isBiblical = config.template === TemplateType.BIBLICAL_SPIRITUAL;
    return (
      <div className={`${TEMPLATE_STYLES[config.template]} flex items-center justify-center p-4 py-8 md:py-20`}>
        <div 
          ref={statusRef} 
          tabIndex={-1} 
          role="status" 
          aria-live="polite"
          className={`${CARD_STYLES[config.template]} max-w-xl w-full space-y-6 md:space-y-8 animate-in zoom-in-95 duration-700 p-6 md:p-12 focus:outline-none`}
        >
          <div className="text-center space-y-4 md:space-y-6">
            {config.logoUrl && (
              <img key={`success-${config.logoUrl.slice(-10)}`} src={config.logoUrl} alt="Ministry Logo" className="w-20 h-20 md:w-28 md:h-28 mx-auto object-contain rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-4 border-white mb-2 md:mb-4" />
            )}
            <div className="flex justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                <svg className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
            <h2 className={`text-3xl md:text-4xl font-black tracking-tighter ${isBiblical ? 'font-serif !tracking-normal' : ''}`}>Blessings!</h2>
            <p className="text-xs md:text-sm opacity-90 leading-relaxed font-medium">Your registration for "{config.title}" is being processed. We look forward to seeing you!</p>
          </div>
          
          <div className={`p-6 md:p-10 bg-slate-50 border border-slate-200 text-center shadow-inner space-y-4 md:space-y-6 ${isBiblical ? 'bg-[#fdfbf7] border-[#d7ccc8] rounded-none' : 'rounded-[2rem] md:rounded-[2.5rem]'}`}>
            <div className="space-y-1">
               <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Amount Due</div>
               <div className={`text-4xl md:text-6xl font-black text-indigo-600 tracking-tighter ${isBiblical ? 'text-[#8d6e63]' : ''}`}>${currentTotalPrice}</div>
            </div>
            
            {!paymentInitiated ? (
              <button 
                onClick={handlePayment}
                className={`${BUTTON_STYLES[config.template]} w-full flex items-center justify-center gap-3 md:gap-4 py-4 md:py-5 text-lg md:text-xl shadow-2xl active:scale-95`}
                aria-label={`Pay ${currentTotalPrice} dollars with Cash App`}
              >
                PAY WITH CASH APP
              </button>
            ) : (
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-indigo-100 text-left animate-in slide-in-from-bottom-4" role="alert">
                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-indigo-500 rounded-full animate-ping" aria-hidden="true"></div>
                    <div>
                       <div className="font-black text-slate-800 text-xs md:text-sm">Awaiting Confirmation</div>
                       <p className="text-slate-500 text-[10px] md:text-xs mt-1">Our director is verifying your Cash App transaction. You'll receive a copy once confirmed.</p>
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-4 md:space-y-6 border-t border-dashed pt-6 md:pt-8 border-slate-300">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Communications Preview</h3>
            
            {isSendingEmails ? (
              <div className="flex flex-col items-center gap-3 py-4 md:py-6" aria-label="Processing confirmations">
                <div className={`w-6 h-6 md:w-8 md:h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin ${isBiblical ? 'border-[#8d6e63]' : ''}`}></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Personalizing Confirmations...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <div className={`p-4 md:p-5 bg-white border border-slate-200 shadow-sm ${isBiblical ? 'rounded-none border-[#d7ccc8]' : 'rounded-xl md:rounded-2xl'}`}>
                  <div className={`text-[9px] font-black text-indigo-600 mb-1 md:mb-2 uppercase tracking-[0.2em] flex items-center gap-2 ${isBiblical ? 'text-[#8d6e63]' : ''}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                    Simulated Admin Notice
                  </div>
                  <div className="text-[11px] md:text-[12px] italic text-slate-700 leading-relaxed font-serif border-l-2 border-indigo-100 pl-3 md:pl-4 py-1">
                    "{emailContent.adminEmail}"
                  </div>
                </div>
                
                <div className={`p-4 md:p-5 bg-white border border-slate-200 shadow-sm ${isBiblical ? 'rounded-none border-[#d7ccc8]' : 'rounded-xl md:rounded-2xl'}`}>
                  <div className={`text-[9px] font-black text-green-700 mb-1 md:mb-2 uppercase tracking-[0.2em] flex items-center gap-2 ${isBiblical ? 'text-[#8d6e63]' : ''}`}>
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                     Your Receipt Preview
                  </div>
                  <div className="text-[11px] md:text-[12px] italic text-slate-700 leading-relaxed font-serif border-l-2 border-green-100 pl-3 md:pl-4 py-1">
                    "{emailContent.registrantEmail}"
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {config.biblicalScript && (
            <div className="text-center pt-4 md:pt-6 opacity-60 text-[10px] md:text-[11px] font-serif italic uppercase tracking-[0.2em] text-slate-700">
              "{config.biblicalScript}"
            </div>
          )}
        </div>
      </div>
    );
  }

  const isBiblical = config.template === TemplateType.BIBLICAL_SPIRITUAL;

  return (
    <div className={`${TEMPLATE_STYLES[config.template]} py-8 md:py-20 px-4`}>
      <div className={`${CARD_STYLES[config.template]} max-w-2xl mx-auto overflow-hidden p-6 md:p-12 shadow-2xl`}>
        
        {isBiblical && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#d7ccc8]/20 to-transparent pointer-events-none" aria-hidden="true"></div>
        )}

        <div className="text-center mb-10 md:mb-16 space-y-4 md:space-y-6 relative">
          {config.logoUrl && (
            <div className="mb-4 md:mb-8 animate-in slide-in-from-top-10 duration-1000">
              <img 
                key={`form-logo-${config.logoUrl.slice(-10)}`}
                src={config.logoUrl} 
                alt="Branding Logo" 
                className={`w-24 h-24 md:w-36 md:h-36 mx-auto object-contain rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border-4 border-white ${isBiblical ? 'rounded-none border-[#d7ccc8]' : ''}`}
              />
            </div>
          )}
          <div className="space-y-2 md:space-y-4">
            <h1 className={`text-3xl md:text-6xl font-black tracking-tighter leading-tight md:leading-none ${isBiblical ? 'font-serif !tracking-normal italic' : ''}`}>{config.title}</h1>
            <p className="text-base md:text-xl opacity-90 max-w-lg mx-auto leading-relaxed font-medium text-slate-800">{config.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10 relative">
          
          <div className="space-y-4 md:space-y-6">
            <h3 className={`text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-200 pb-2 md:pb-3 ${isBiblical ? 'font-serif border-[#d7ccc8] !text-[#5d4037] italic normal-case !tracking-[0.1em]' : ''}`}>Registration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {config.fields.map(renderField)}
            </div>
          </div>

          {config.priceOptions?.length > 0 && (
            <fieldset className="space-y-3 md:space-y-4 border-none p-0 m-0">
              <legend className={`text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-200 pb-2 md:pb-3 w-full ${isBiblical ? 'font-serif border-[#d7ccc8] !text-[#5d4037] italic normal-case !tracking-[0.1em]' : ''}`}>Entry Category</legend>
              <div className="grid grid-cols-1 gap-2 md:gap-3 mt-4">
                {config.priceOptions.map(opt => (
                  <label key={opt.id} className={`flex items-center justify-between p-4 md:p-6 border-2 cursor-pointer transition-all ${selectedEntry?.id === opt.id ? (isBiblical ? 'border-[#8d6e63] bg-[#fdfbf7] shadow-lg' : 'border-indigo-600 bg-indigo-50 shadow-lg') : 'border-slate-200 bg-white/40 hover:border-slate-300'} ${isBiblical ? 'rounded-none' : 'rounded-2xl md:rounded-3xl'}`}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedEntry?.id === opt.id ? (isBiblical ? 'border-[#8d6e63]' : 'border-indigo-600') : 'border-slate-400'}`}>
                        {selectedEntry?.id === opt.id && <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full animate-in zoom-in ${isBiblical ? 'bg-[#8d6e63]' : 'bg-indigo-600'}`}></div>}
                      </div>
                      <input 
                        type="radio" 
                        name="entry" 
                        checked={selectedEntry?.id === opt.id} 
                        onChange={() => setSelectedEntry(opt)} 
                        className="sr-only" 
                        aria-label={`${opt.label} for ${opt.price} dollars`}
                      />
                      <span className="font-black text-slate-800 text-base md:text-lg">{opt.label}</span>
                    </div>
                    <span className={`font-black text-indigo-700 text-xl md:text-2xl tracking-tighter ${isBiblical ? 'text-[#8d6e63]' : ''}`}>${opt.price}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {config.foodOptions?.length > 0 && (
            <fieldset className="space-y-3 md:space-y-4 border-none p-0 m-0">
              <legend className={`text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-200 pb-2 md:pb-3 w-full ${isBiblical ? 'font-serif border-[#d7ccc8] !text-[#5d4037] italic normal-case !tracking-[0.1em]' : ''}`}>Menu Selection</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mt-4">
                {config.foodOptions.map((food, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    onClick={() => setSelectedFood(food)}
                    aria-pressed={selectedFood === food}
                    className={`px-4 md:px-6 py-4 md:py-5 border-2 text-xs md:text-sm font-black transition-all text-left relative overflow-hidden ${selectedFood === food ? (isBiblical ? 'border-[#8d6e63] bg-[#fdfbf7] text-[#3e2723] shadow-md' : 'border-orange-500 bg-orange-50 text-orange-900 shadow-md') : 'border-slate-200 bg-white/40 hover:border-slate-300 text-slate-700'} ${isBiblical ? 'rounded-none' : 'rounded-xl md:rounded-[2rem]'}`}
                  >
                    {food}
                    {selectedFood === food && (
                      <div className={`absolute top-2 right-2 ${isBiblical ? 'text-[#8d6e63]' : 'text-orange-600'}`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {config.includeAllergies && (
            <div className="space-y-2">
              <label className={`block text-[10px] md:text-[11px] font-black uppercase text-slate-600 ml-1 tracking-widest ${isBiblical ? 'font-serif normal-case italic !text-[#5d4037]' : ''}`} htmlFor="allergy-notes">Dietary Notes</label>
              <textarea 
                id="allergy-notes"
                value={allergies}
                onChange={e => setAllergies(e.target.value)}
                placeholder="Any allergies or restrictions..."
                rows={3}
                className={`w-full px-4 md:px-6 py-3 md:py-5 rounded-xl md:rounded-3xl border border-slate-300 bg-white/50 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400 ${isBiblical ? 'font-serif border-[#d7ccc8] focus:border-[#8d6e63] focus:ring-[#8d6e63]/5 rounded-none' : ''}`}
              />
            </div>
          )}

          <div className="pt-8 md:pt-12 border-t border-slate-200 mt-8 md:mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 md:gap-8 mb-8 md:mb-10">
              <div className="text-center sm:text-left">
                <div className={`text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1 ${isBiblical ? 'font-serif normal-case italic !text-[#5d4037] !tracking-[0.1em]' : ''}`}>Registration Summary</div>
                <div className="text-lg md:text-xl font-black text-slate-800 tracking-tighter">{selectedEntry?.label || 'Admission Ticket'}</div>
              </div>
              <div className="text-center sm:text-right">
                <div className={`text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1 ${isBiblical ? 'font-serif normal-case italic !text-[#5d4037] !tracking-[0.1em]' : ''}`}>Total Due</div>
                <div className={`text-4xl md:text-5xl font-black text-indigo-700 tracking-tighter ${isBiblical ? 'text-[#8d6e63]' : ''}`}>${currentTotalPrice}</div>
              </div>
            </div>
            
            <button 
              type="submit"
              className={`${BUTTON_STYLES[config.template]} w-full py-4 md:py-6 text-xl md:text-2xl font-black uppercase tracking-widest shadow-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-3 md:gap-4`}
              aria-label="Submit registration"
            >
              REGISTER NOW
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
            <div className="text-center mt-6 md:mt-8 space-y-2">
               <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                 Confirmation details will follow via simulated notification
               </p>
               <div className="flex items-center justify-center gap-2 opacity-40" aria-hidden="true">
                  <div className="h-px w-6 md:w-8 bg-slate-400"></div>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-tighter">BNR Ministry • Secure Registration</span>
                  <div className="h-px w-6 md:w-8 bg-slate-400"></div>
               </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
