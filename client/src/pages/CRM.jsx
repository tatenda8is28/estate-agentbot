import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Search, MapPin, DollarSign, Home, Phone, ChevronLeft, Info } from 'lucide-react';

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('list'); // mobile: list, chat, intel

  useEffect(() => {
    fetchLeads();
    const sub = supabase.channel('crm').on('postgres_changes', { event: '*', table: 're_prospect_leads' }, () => fetchLeads()).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    if (selectedLead) {
      fetchMessages(selectedLead.id);
      const sub = supabase.channel(`log_${selectedLead.id}`).on('postgres_changes', { event: '*', table: 're_interaction_logs', filter: `prospect_id=eq.${selectedLead.id}` }, (p) => {
        setMessages(p.new.conversation || []);
      }).subscribe();
      if (window.innerWidth < 768) setView('chat');
      return () => supabase.removeChannel(sub);
    }
  }, [selectedLead]);

  const fetchLeads = async () => {
    const { data } = await supabase.from('re_prospect_leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
  };

  const fetchMessages = async (id) => {
    const { data } = await supabase.from('re_interaction_logs').select('conversation').eq('prospect_id', id).single();
    setMessages(data?.conversation || []);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden relative">
      
      {/* 1. PIPELINE */}
      <aside className={`${view === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex-col`}>
        <div className="p-6 md:p-8"><h2 className="text-2xl font-black text-slate-800 tracking-tight">Pipeline</h2></div>
        <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-4 space-y-2">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => setSelectedLead(lead)} className={`p-5 rounded-[2rem] cursor-pointer transition-all border ${selectedLead?.id === lead.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'}`}>
              <div className="font-bold text-sm mb-1 truncate">{lead.prospect_name || 'New Lead'}</div>
              <div className={`text-[11px] flex gap-3 font-bold ${selectedLead?.id === lead.id ? 'text-blue-100' : 'text-slate-400'}`}>
                <span className="flex items-center gap-1 font-bold"><DollarSign size={12}/> {lead.target_budget || '---'}</span>
                <span className="flex items-center gap-1 font-bold"><MapPin size={12}/> {lead.preferred_area || '---'}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. CHAT */}
      <main className={`${view === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white h-full relative`}>
        {selectedLead ? (
          <>
            <header className="px-6 py-4 md:px-10 md:py-8 border-b flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('list')} className="md:hidden text-slate-400"><ChevronLeft size={24} /></button>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black">{selectedLead.prospect_name?.[0] || 'P'}</div>
                <h3 className="font-black text-slate-800 truncate max-w-[150px]">{selectedLead.prospect_name || 'Prospect'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setView('intel')} className="md:hidden p-2 text-blue-600 bg-blue-50 rounded-lg"><Info size={20}/></button>
                <button className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-blue-600"><Phone size={14}/></button>
              </div>
            </header>
            <div className="flex-1 p-6 md:p-10 overflow-y-auto space-y-6 bg-slate-50/40 pb-32">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[65%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${m.role === 'assistant' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-600/20 shadow-md' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-200 uppercase font-black tracking-widest text-xs italic"><Home size={60} className="mb-4 opacity-10" />Select a lead to begin</div>
        )}
      </main>

      {/* 3. INTEL */}
      {selectedLead && (
        <aside className={`${view === 'intel' ? 'flex' : 'hidden'} lg:flex w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 p-8 md:p-10 flex-col shadow-2xl z-30`}>
          <button onClick={() => setView('chat')} className="md:hidden text-slate-400 mb-8 flex items-center gap-2 font-bold text-xs"><ChevronLeft size={20}/> Back to Chat</button>
          <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-10">Lead Intelligence</h4>
          <div className="space-y-8 flex-1">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Budget</p><p className="text-2xl font-black text-slate-800 leading-none">{selectedLead.target_budget || '---'}</p></div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Location</p><p className="text-2xl font-black text-slate-800 leading-none">{selectedLead.preferred_area || '---'}</p></div>
            <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100"><p className="text-[10px] font-black text-orange-400 uppercase mb-2">Score</p><p className="text-2xl font-black text-orange-500 leading-none">{selectedLead.lead_score || '0'}/10</p></div>
          </div>
          <button className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 mb-20 md:mb-0 hover:bg-blue-500 transition-all">Schedule Viewing</button>
        </aside>
      )}
    </div>
  );
}