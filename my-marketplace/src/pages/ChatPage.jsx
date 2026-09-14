import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services';
import { formatCurrency } from '../utils/formatters';

const POLL_INTERVAL_MS = 3000;

function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isMine
            ? 'bg-brand-600 text-white'
            : 'bg-white text-slate-800 ring-1 ring-slate-200'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Initial load — conversation metadata + messages.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [convRes, msgRes] = await Promise.all([
          chatService.getConversation(id),
          chatService.listMessages(id),
        ]);
        if (cancelled) return;
        if (convRes.data.success) setConversation(convRes.data.conversation);
        if (msgRes.data.success) setMessages(msgRes.data.messages);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 403 || status === 404) {
          setError('هذه المحادثة غير متاحة لك.');
        } else {
          setError('تعذّر تحميل المحادثة.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Polling — refetch messages every few seconds while the page is open.
  useEffect(() => {
    if (!conversation) return undefined;
    const tick = async () => {
      try {
        const res = await chatService.listMessages(id);
        if (res.data.success) setMessages(res.data.messages);
      } catch {
        // Swallow transient errors; the next tick will retry.
      }
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id, conversation]);

  // Auto-scroll to bottom when a new message arrives.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (lastMessageIdRef.current === last.id) return;
    lastMessageIdRef.current = last.id;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    try {
      setSending(true);
      const res = await chatService.sendMessage(id, body);
      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.message]);
        setInput('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذّر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container page-section">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container page-section text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">💬</div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{error}</h2>
        <button onClick={() => navigate('/')} className="btn-brand mt-6">العودة للرئيسية</button>
      </div>
    );
  }

  if (!conversation) return null;

  const counterparty = conversation.counterparty;
  const listing = conversation.listing;
  const initials = (counterparty?.name || '؟')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="page-container py-6">
      <div className="mx-auto flex max-w-3xl flex-col">
        <Link
          to="/inbox"
          className="mb-3 inline-flex items-center gap-1 self-start text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          العودة للمحادثات
        </Link>

        {/* Header */}
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-slate-900">{counterparty?.name || 'مستخدم'}</p>
            {listing && (
              <Link
                to={`/listings/${listing.id}`}
                className="mt-0.5 inline-flex items-center gap-1.5 truncate text-xs text-slate-500 hover:text-brand-700"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.5-3.5L10 19" />
                </svg>
                <span className="truncate">{listing.title}</span>
                <span className="shrink-0 text-slate-400">•</span>
                <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(listing.price)}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="mt-4 h-[60vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">👋</div>
                <p className="mt-3 text-sm text-slate-600">ابدأ المحادثة بإرسال رسالة.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} isMine={m.sender_id === user?.id} />
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={2}
            placeholder="اكتب رسالتك..."
            className="input-base resize-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-brand shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            إرسال
          </button>
        </form>
      </div>
    </div>
  );
}
