import React, { useState, useEffect } from 'react';
import { X, Send, MapPin, TrendingUp, MessageCircle, Zap, ZapOff, Home, Download, Share2 } from 'lucide-react';
import { supabase } from '../supabase';

export default function LeadModal({ lead, onClose, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [stage, setStage] = useState(lead?.lead_stage || 'Discovery');
  const [otherLeads, setOtherLeads] = useState([]);
  const [recommendedProperties, setRecommendedProperties] = useState([]);
  const [showPropertySuggestions, setShowPropertySuggestions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      fetchMessages();
      fetchOtherLeads();
      fetchRecommendedProperties();
    }
  }, [lead]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('re_interaction_logs')
        .select('*')
        .eq('prospect_id', lead.id);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data && data.length > 0) {
        try {
          const conversation = JSON.parse(data[0].conversation);
          setMessages(Array.isArray(conversation) ? conversation : []);
        } catch (parseErr) {
          console.error('Error parsing messages:', parseErr);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchOtherLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('re_prospect_leads')
        .select('id, prospect_name, wa_number, lead_score')
        .eq('lead_stage', stage)
        .neq('id', lead.id)
        .limit(5);

      if (error) throw error;
      setOtherLeads(data || []);
    } catch (err) {
      console.error('Error fetching other leads:', err);
    }
  };

  const fetchRecommendedProperties = async () => {
    try {
      // Build query based on lead preferences
      let query = supabase.from('re_properties').select('*').limit(6);

      // Filter by area if specified
      if (lead.preferred_area) {
        query = query.ilike('location', `%${lead.preferred_area}%`);
      }

      // Filter by bedrooms if specified
      if (lead.bedrooms) {
        query = query.eq('bedrooms', lead.bedrooms);
      }

      // Filter by budget if specified
      if (lead.target_budget) {
        const budget = parseInt(lead.target_budget.toString().replace(/[^\d]/g, '')) || 0;
        if (budget > 0) {
          query = query.lte('price', budget.toString());
        }
      }

      const { data, error } = await query.order('price', { ascending: true });

      if (error) throw error;
      setRecommendedProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const getAIResponse = async (userText) => {
    try {
      setAiLoading(true);

      const response = await fetch('http://localhost:3001/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userText,
          conversationHistory: messages,
          prospectId: lead.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return data.reply || 'I appreciate your interest. How can I assist further?';
    } catch (err) {
      console.error('AI Error:', err);
      return 'I apologize for the technical difficulty. How else can I help you today?';
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const userMsg = {
        t: new Date().toISOString(),
        role: 'user',
        content: newMessage,
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      const userInput = newMessage;
      setNewMessage('');

      let assistantContent = '';

      if (aiEnabled) {
        assistantContent = await getAIResponse(userInput);
      } else {
        assistantContent = `[AI Disabled] Noted: "${userInput}" - Manual follow-up required.`;
      }

      const assistantMsg = {
        t: new Date().toISOString(),
        role: 'assistant',
        content: assistantContent,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Save to database
      const { error } = await supabase.from('re_interaction_logs').upsert({
        prospect_id: lead.id,
        conversation: JSON.stringify(finalMessages),
        last_updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      setStage(newStage);
      const { error } = await supabase.from('re_prospect_leads').update({ lead_stage: newStage }).eq('id', lead.id);

      if (error) throw error;
      onUpdate({ ...lead, lead_stage: newStage });
      fetchOtherLeads();
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const addPropertyToConversation = (property) => {
    const message = `I'm interested in viewing "${property.title}" in ${property.location}. Can you provide more details?`;
    setNewMessage(message);
  };

  const stages = ['Discovery', 'Interested', 'Negotiating', 'Closed'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{lead.prospect_name || 'Prospect'}</h2>
            <p className="text-sm text-gray-600">{lead.wa_number}</p>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center gap-3 mr-4">
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition ${
                aiEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {aiEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
              <span className="text-xs">{aiEnabled ? 'AI ON' : 'AI OFF'}</span>
            </button>
            <button
              onClick={() => setShowPropertySuggestions(!showPropertySuggestions)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium"
            >
              <Home size={16} />
              <span className="text-xs">Properties</span>
            </button>
          </div>

          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg flex-shrink-0">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Left: Prospect Details & Other Leads */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Lead Details */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Lead Profile</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
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
                    <MapPin size={14} /> Preferred Area
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{lead.preferred_area || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Budget</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{lead.target_budget || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Bedrooms</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{lead.bedrooms || 'Not specified'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition">
                  <Download size={12} />
                  Export
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition">
                  <Share2 size={12} />
                  Share
                </button>
              </div>
            </div>

            {/* Other Leads */}
            <div className="bg-gray-50 rounded-lg p-4 flex-1 overflow-y-auto border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Other {stage} Leads</h3>
              {otherLeads.length === 0 ? (
                <p className="text-gray-600 text-xs">No other leads in {stage}</p>
              ) : (
                <div className="space-y-2">
                  {otherLeads.map((l) => (
                    <div key={l.id} className="p-2 bg-white rounded border border-gray-200 text-xs hover:border-blue-300 cursor-pointer transition">
                      <p className="font-medium text-gray-900 truncate">{l.prospect_name || 'Unnamed'}</p>
                      <p className="text-gray-600 text-xs truncate">{l.wa_number}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {l.lead_score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center/Right: Chat & Properties */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Chat */}
            <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">Start conversation with the prospect</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {aiEnabled ? 'AI-powered responses enabled' : 'Manual mode - responses only'}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`px-4 py-2 rounded-lg max-w-xs text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(msg.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-lg bg-gray-300 text-gray-600 text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={aiEnabled ? 'Type message... (AI will respond)' : 'Type message... (Manual mode)'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading || aiLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || aiLoading || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Property Suggestions */}
            {showPropertySuggestions && (
              <div className="h-48 bg-white rounded-lg border border-gray-200 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 bg-blue-50 sticky top-0">
                  <h4 className="font-semibold text-gray-900 text-sm">Recommended Properties</h4>
                  <p className="text-xs text-gray-600 mt-0.5">Based on {lead.prospect_name}'s preferences</p>
                </div>
                {recommendedProperties.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No matching properties found</div>
                ) : (
                  <div className="divide-y">
                    {recommendedProperties.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition"
                        onClick={() => addPropertyToConversation(prop)}
                      >
                        <div className="flex gap-2">
                          {prop.image_url_1 && (
                            <img src={prop.image_url_1} alt={prop.title} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{prop.title}</p>
                            <p className="text-xs text-gray-600">{prop.address}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-1">R {parseInt(prop.price).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
