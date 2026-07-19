import { useState, useEffect } from 'react';
import { Inbox, MessageSquare, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface Message {
  id: number;
  sender_name?: string;
  sender_role?: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_content_title?: string;
}

export default function StudentMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/messages/inbox');
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="text-emerald-400" size={32} />
            My Inbox
          </h1>
          <p className="text-slate-400 mt-2">Read messages and announcements from your instructors.</p>
        </div>

        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-700 rounded-full flex items-center justify-center mb-4">
                <Inbox className="text-slate-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Your inbox is empty</h3>
              <p className="text-slate-400">
                When your instructor assigns reading or sends a message, it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {messages.map((msg) => (
                <div key={msg.id} className="p-6 hover:bg-white/[0.02] transition-colors relative overflow-hidden group">
                  {!msg.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`text-lg ${msg.is_read ? 'font-medium text-white' : 'font-bold text-emerald-400'}`}>
                      {msg.subject}
                    </h3>
                    <span className="text-xs font-medium text-slate-400 bg-surface-700 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>From: <strong className="text-white">{msg.sender_name}</strong></span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] uppercase tracking-wider">
                      {msg.sender_role}
                    </span>
                  </div>

                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                    {msg.body}
                  </div>
                  
                  {msg.related_content_title && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 w-fit px-4 py-2 rounded-lg border border-indigo-500/20">
                      <AlertCircle size={16} />
                      Assignment Attached: <span className="font-semibold">{msg.related_content_title}</span>
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
