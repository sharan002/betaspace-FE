import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Lead } from '../types';
import { apiService } from '../services/api';
import { Icons } from './Icons';

interface LeadAssistantChatbotProps {
  leads: Lead[];
  openLeadId?: string | null;
  onClose?: () => void;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const LeadAssistantChatbot: React.FC<LeadAssistantChatbotProps> = ({ leads, openLeadId, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ startX: 0, startLeft: 0, moved: false, dragging: false });
  const [positionX, setPositionX] = useState<number | null>(null);

  const clampX = (nextX: number) => {
    const width = assistantRef.current?.offsetWidth ?? 0;
    const maxX = Math.max(24, window.innerWidth - width - 24);
    return Math.min(Math.max(nextX, 24), maxX);
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const syncPosition = () => {
      if (!assistantRef.current) return;

      setPositionX(prev => {
        if (prev === null) {
          return clampX(window.innerWidth - assistantRef.current!.offsetWidth - 24);
        }
        return clampX(prev);
      });
    };

    syncPosition();
    window.addEventListener('resize', syncPosition);

    return () => window.removeEventListener('resize', syncPosition);
  }, [isOpen]);

  useEffect(() => {
    if (!assistantRef.current) return;
    setPositionX(clampX(window.innerWidth - assistantRef.current.offsetWidth - 24));
  }, [isOpen]);

  // Filter leads based on search
  const suggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter(l => (l.userName || '').toLowerCase().includes(q) || String(l.userNumber ?? '').includes(q))
      .slice(0, 6);
  }, [leads, searchTerm]);

  // Select a lead
  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSearchTerm(`${lead.userName} (${lead.userNumber})`);
  };

  // Open assistant when parent requests a lead to be opened
  useEffect(() => {
    if (openLeadId) {
      const target = leads.find(l => l._id === openLeadId) || null;
      if (target) {
        selectLead(target);
        setIsOpen(true);
      }
    }
  }, [openLeadId, leads]);

  // Clear selected lead
  const clearSelectedLead = () => {
    setSelectedLead(null);
    setSearchTerm('');
  };

  // Predefined questions for quick access
  const quickQuestions = [
    'Summarize this lead',
    'How should I approach this lead?',
    'Suggest a follow-up message',
    'What are the next steps?',
  ];

  // Handle sending a question
  const handleAsk = async (customQuestion?: string) => {
    const userMessage = customQuestion || question.trim();
    if (!selectedLead || !userMessage) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuestion('');
    setLoading(true);

    try {
      const userChatMessage: ChatMessage = { role: 'user', content: userMessage };
      const lastMessages: ChatMessage[] = [...messages, userChatMessage].slice(-6);
      const res = await apiService.askLeadAssistant({
  lead: selectedLead,
  question: userMessage,
  history: lastMessages
});
      if (res.success && res.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not get a response. Please try again.' }]);
      }
    } catch (error) {
      console.error('Assistant error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Copy assistant message to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: add a small toast notification
  };

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!assistantRef.current) return;

    e.preventDefault();

    dragStateRef.current = {
      startX: e.clientX,
      startLeft: positionX ?? clampX(window.innerWidth - assistantRef.current.offsetWidth - 24),
      moved: false,
      dragging: true,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!assistantRef.current || !dragStateRef.current.dragging) return;

      const deltaX = e.clientX - dragStateRef.current.startX;
      if (Math.abs(deltaX) > 3) {
        dragStateRef.current.moved = true;
      }

      setPositionX(clampX(dragStateRef.current.startLeft + deltaX));
    };

    const handlePointerUp = () => {
      dragStateRef.current.dragging = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop — closes chatbot when clicking anywhere outside the panel */}
      <div className="fixed inset-0 z-[9998]" onClick={handleClose} />

    <div
      ref={assistantRef}
      className="fixed bottom-6 z-[9999]"
      style={positionX === null ? { right: '1.5rem' } : { left: `${positionX}px` }}
    >
      {/* Chat window - fully responsive */}
      <div className="w-[400px] max-w-[95vw] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div
            onPointerDown={handleDragStart}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icons.Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Minmini Assistant AI</h3>
                <p className="text-xs opacity-80">Ask anything about your leads</p>
              </div>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              aria-label="Close"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Lead selector */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Select Lead
              </label>
              <div className="relative">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedLead) setSelectedLead(null);
                  }}
                  placeholder="Type name or phone..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                {selectedLead && (
                  <button
                    onClick={clearSelectedLead}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && !selectedLead && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map(lead => (
                    <button
                      key={lead._id}
                      onClick={() => selectLead(lead)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition flex items-center gap-2"
                    >
                      <Icons.User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-sm">{lead.userName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{lead.userNumber}</span>
                          <span
                            role="button"
                            title="Open in WhatsApp"
                            onClick={(e) => { e.stopPropagation(); const num = (lead.userNumber || '').replace(/\D/g, ''); if (num) window.open(`https://wa.me/${num}`, '_blank', 'noopener'); }}
                            className="text-green-500 hover:text-green-600 cursor-pointer"
                          >
                            <Icons.WhatsApp className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedLead && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 text-blue-700 p-2 rounded-lg">
                <Icons.CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Active lead: <strong>{selectedLead.userName}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Messages area - flex-1 to fill remaining height, with auto scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <Icons.Bot className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Select a lead and ask a question</p>
                <p className="text-xs mt-1">e.g., "How should I approach this lead?"</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="relative group max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition hover:bg-gray-100"
                        title="Copy to clipboard"
                      >
                        <Icons.Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions (only if lead selected) */}
          {/* {selectedLead && !loading && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(q)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )} */}

          {/* Input area */}
          <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={selectedLead ? 'Type your question...' : 'Select a lead first'}
                className="flex-1 max-h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedLead || loading}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
              />
              <button
                onClick={() => handleAsk()}
                disabled={!selectedLead || !question.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition"
                aria-label="Send message"
              >
                <Icons.Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Powered by AI • Answers are generated based on lead data
            </p>
          </div>
        </div>
    </div>
    </>
  );
};

export default LeadAssistantChatbot;
