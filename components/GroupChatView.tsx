import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User } from '../types';
import { Icons } from './Icons';

interface ChatMessage {
  _id?: string;
  sender: string;
  message: string;
  timestamp: string;
}

interface Props {
  currentUser: User | null;
}

// Production: socket server sits at the root domain; nginx proxies /crmapi/* to the backend.
// For local dev, set both to http://localhost:4000 and '' respectively.
const SOCKET_URL = 'https://ask4people.in';
const SOCKET_PATH = '/crmapi/socket.io';
const API_BASE = 'https://ask4people.in/crmapi';

// Dev overrides (uncomment when running locally):
// const SOCKET_URL = 'http://localhost:4000';
// const SOCKET_PATH = '/socket.io';
// const API_BASE = 'http://localhost:4000';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const avatarColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const GroupChatView: React.FC<Props> = ({ currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token || !currentUser) return;

    // Load history
    fetch(`${API_BASE}/group-chat/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Connect socket
    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || !socketRef.current || !connected) return;
    socketRef.current.emit('send_message', { message: trimmed });
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Icons.Chat className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Team Group Chat</h3>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            {connected ? 'Live — messages appear instantly' : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Icons.Chat className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs opacity-70">Say hi to your team!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender === currentUser?.username;
            const prevMsg = messages[i - 1];
            const showDateDivider = i === 0 || formatDay(prevMsg.timestamp) !== formatDay(msg.timestamp);
            const isSameSenderAsPrev = prevMsg && prevMsg.sender === msg.sender && !showDateDivider;

            return (
              <div key={msg._id || i}>
                {showDateDivider && (
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium border border-slate-200 dark:border-slate-700">
                      {formatDay(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-3'}`}>
                  {/* Avatar — only show for others, hide when same sender continues */}
                  {!isMe && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 uppercase transition-opacity ${isSameSenderAsPrev ? 'opacity-0' : ''} ${avatarColor(msg.sender)}`}>
                      {msg.sender.charAt(0)}
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && !isSameSenderAsPrev && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-wide">
                        {msg.sender}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 text-sm leading-relaxed break-words ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl rounded-bl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-slate-400 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Type a message…' : 'Connecting…'}
          disabled={!connected}
          className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          title="Send (Enter)"
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
        >
          <Icons.Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GroupChatView;
