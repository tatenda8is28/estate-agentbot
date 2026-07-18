import React, { useState, useEffect } from 'react';
import { X, Send, MapPin, TrendingUp, MessageCircle, Home, ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';

export default function LeadModal({ lead, onClose, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [stage, setStage] = useState(lead?.lead_stage || 'Discovery');
  const [showProperties, setShowProperties] = useState(false);
  const [recommendedProperties, setRecommendedProperties] = useState([]);

  useEffect(() => {
    if (lead) {
      fetchMessages();
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

  const fetchRecommendedProperties = async () => {
    try {
      let query = supabase.from('re_properties').select('*').limit(8);

      if (lead.preferred_area) {
        query = query.ilike('location', `%${lead.preferred_area}%`);
      }

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
      setRecommendedProperties([]);
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
        const errorData = await response.json();
        console.error('API Error:', errorData);
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

      // Get AI response
      const assistantContent = await getAIResponse(userInput);

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
      
      // Update parent component to trigger kanban refresh
      onUpdate({ ...lead, lead_stage: newStage });
      
      console.log(`✅ Lead moved to ${newStage}`);
    } catch (err) {
      console.error('Error updating stage:', err);
      alert('Failed to update lead stage');
    }
  };

  const addPropertyToMessage = (property) => {
    const message = `I'm interested in viewing "${property.title}" in ${property.location} at ${property.address}. Can you help me schedule?`;
    setNewMessage(message);
    setShowProperties(false);
  };

  const stages = ['Discovery', 'Interested', 'Negotiating', 'Closed'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{lead.prospect_name || 'Prospect'}</h2>
            <p className="text-sm text-gray-600">{lead.wa_number}</p>
          </div>

          <button
            onClick={() => setShowProperties(!showProperties)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-3"
          >
            <Home size={16} />
            <span className="text-sm">Properties</span>
          </button>

          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Left Panel - Details */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Lead Details Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Lead Details</h3>

              {/* Stage Selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-700 block mb-1">Current Stage</label>
                <select
                  value={stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Score Badge */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Lead Score</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    lead.lead_score === 'Hot'
                      ? 'bg-red-100 text-red-800'
                      : lead.lead_score === 'Warm'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {lead.lead_score || 'Unknown'}
                </span>
              </div>

              {/* Info Fields */}
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <MapPin size={14} /> Area
                  </p>
                  <p className="text-gray-900 font-medium mt-0.5">{lead.preferred_area || 'Not specified'}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700">Budget</p>
                  <p className="text-gray-900 font-medium mt-0.5">{lead.target_budget || 'Not specified'}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700">Bedrooms</p>
                  <p className="text-gray-900 font-medium mt-0.5">{lead.bedrooms || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Start conversation with prospect</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg max-w-sm text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-600'}`}>
                        {new Date(msg.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-700 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !aiLoading && handleSendMessage()}
                  placeholder="Type message..."
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
        </div>

        {/* Properties Panel */}
        {showProperties && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Matching Properties</h4>
              <button onClick={() => setShowProperties(false)} className="text-gray-500 hover:text-gray-700">
                <ChevronDown size={18} />
              </button>
            </div>

            {recommendedProperties.length === 0 ? (
              <p className="text-gray-600 text-sm">No properties found matching criteria</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recommendedProperties.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => addPropertyToMessage(prop)}
                    className="bg-white p-2 rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer transition"
                  >
                    {prop.image_url_1 && (
                      <img src={prop.image_url_1} alt={prop.title} className="w-full h-20 rounded object-cover mb-2" />
                    )}
                    <p className="text-xs font-medium text-gray-900 truncate">{prop.title}</p>
                    <p className="text-xs text-blue-600 font-bold">R {parseInt(prop.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
