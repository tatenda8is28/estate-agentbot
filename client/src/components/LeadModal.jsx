import React, { useState, useEffect } from 'react';
import { X, Send, MapPin, TrendingUp, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';

export default function LeadModal({ lead, onClose, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(lead?.lead_stage || 'Discovery');

  useEffect(() => {
    if (lead) {
      fetchMessages();
    }
  }, [lead]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('re_interaction_logs')
        .select('*')
        .eq('prospect_id', lead.id)
        .order('last_updated_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        const conversation = JSON.parse(data[0].conversation || '[]');
        setMessages(conversation);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      // Add user message to UI immediately
      const userMsg = { t: new Date().toISOString(), role: 'user', content: newMessage };
      setMessages([...messages, userMsg]);
      setNewMessage('');

      // TODO: Send to AI/API for response
      // For now, just simulate a response
      setTimeout(() => {
        const assistantMsg = {
          t: new Date().toISOString(),
          role: 'assistant',
          content: 'Thanks for the message. How can I help you further?'
        };
        setMessages(prev => [...prev, assistantMsg]);
      }, 500);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      setStage(newStage);
      const { error } = await supabase
        .from('re_prospect_leads')
        .update({ lead_stage: newStage })
        .eq('id', lead.id);

      if (error) throw error;
      onUpdate({ ...lead, lead_stage: newStage });
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const stages = ['Discovery', 'Interested', 'Negotiating', 'Closed'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {lead.prospect_name || 'Prospect'}
            </h2>
            <p className="text-sm text-gray-600">{lead.wa_number}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          
          {/* Left: Prospect Details & Other Leads */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Lead Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stages.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <TrendingUp size={14} /> Score
                  </label>
                  <p className="mt-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full inline-block">
                    {lead.lead_score || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <MapPin size={14} /> Area
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{lead.preferred_area || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Budget</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.target_budget || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Other Leads in Discovery */}
            <div className="bg-gray-50 rounded-lg p-4 flex-1 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Other {stage} Leads</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 text-xs">Shows other leads in {stage} stage</p>
              </div>
            </div>
          </div>

          {/* Right: Chat */}
          <div className="flex-1 flex flex-col bg-gray-50 rounded-lg overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No messages yet</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg max-w-xs text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
