import { useState, useEffect } from 'react';
import { Mail, Send, Inbox, MessageSquare, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface Message {
  id: number;
  sender_name?: string;
  sender_role?: string;
  receiver_name?: string;
  receiver_email?: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_content_title?: string;
}

export default function InstructorMessages() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [activeTab]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'inbox' ? '/api/messages/inbox' : '/api/messages/sent';
      const response = await api.get(endpoint);
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="text-indigo-400" size={32} />
              Messages
            </h1>
            <p className="text-slate-400 mt-2">Communicate with your students and track announcements.</p>
          </div>
          
          <div className="flex bg-surface-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'inbox' 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Inbox size={18} />
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'sent' 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Send size={18} />
              Sent
            </button>
          </div>
        </div>

        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-700 rounded-full flex items-center justify-center mb-4">
                <Mail className="text-slate-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No messages found</h3>
              <p className="text-slate-400">
                {activeTab === 'inbox' 
                  ? "You don't have any messages in your inbox." 
                  : "You haven't sent any messages yet. Use the AI Analytics page to message struggling students."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {messages.map((msg) => (
                <div key={msg.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{msg.subject}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-surface-700 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-indigo-400 mb-4">
                    {activeTab === 'inbox' ? (
                      <span>From: {msg.sender_name}</span>
                    ) : (
                      <span>To: {msg.receiver_name} ({msg.receiver_email})</span>
                    )}
                  </div>

                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm border-l-2 border-indigo-500/30 pl-4 py-1">
                    {msg.body}
                  </div>
                  
                  {msg.related_content_title && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 w-fit px-4 py-2 rounded-lg border border-emerald-400/20">
                      <AlertCircle size={16} />
                      Includes Assignment: <span className="font-semibold">{msg.related_content_title}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
