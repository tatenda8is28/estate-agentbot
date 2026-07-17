import React, { useState, useEffect } from 'react';
import { Send, Pause, Play, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

export default function ChatPanel({ prospect }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch conversation history
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('re_interaction_logs')
          .select('conversation')
          .eq('prospect_id', prospect.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data?.conversation) {
          setMessages(data.conversation);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [prospect.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageText = newMessage;
      setNewMessage('');

      // Add message to local state immediately
      const userMessage = {
        role: 'user',
        content: messageText,
        t: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Save to database
      const updatedConversation = [...messages, userMessage];
      
      if (aiEnabled) {
        // If AI is enabled, we would send to backend here
        // For now, just save the user message
        const { error } = await supabase
          .from('re_interaction_logs')
          .upsert({
            prospect_id: prospect.id,
            conversation: updatedConversation,
            last_updated_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        // Manual message - just save without AI processing
        const { error } = await supabase
          .from('re_interaction_logs')
          .upsert({
            prospect_id: prospect.id,
            conversation: updatedConversation,
            last_updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{prospect.prospect_name || 'Chat'}</h3>
          <p className="text-blue-100 text-sm">{prospect.wa_number}</p>
        </div>
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            aiEnabled 
              ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
          title={aiEnabled ? 'AI Assistant Enabled' : 'AI Assistant Disabled'}
        >
          {aiEnabled ? (
            <>
              <Play size={16} />
              <span className="text-sm">AI On</span>
            </>
          ) : (
            <>
              <Pause size={16} />
              <span className="text-sm">AI Off</span>
            </>
          )}
        </button>
      </div>

      {/* AI Status Alert */}
      {!aiEnabled && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-yellow-600" />
          <p className="text-sm text-yellow-800">
            AI Assistant is disabled. You're now sending manual messages.
          </p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <div>
              <p className="font-medium mb-1">No messages yet</p>
              <p className="text-sm">Start a conversation with this prospect</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(msg.t).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={aiEnabled ? "Type message (AI will respond)..." : "Type manual message..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
