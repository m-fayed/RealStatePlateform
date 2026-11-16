import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services';
import { timeAgo } from '../utils/formatters';

function RowSkeleton() {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/3" />
        <div className="skeleton h-3 w-2/3" />
      </div>
      <div className="skeleton h-3 w-12" />
    </div>
  );
}

function initialsOf(name) {
  return (name || '؟')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        setError('');
        const res = await chatService.listConversations();
        if (cancelled) return;
        if (res.data.success) setConversations(res.data.conversations);
      } catch {
        if (!cancelled) setError('تعذّر تحميل المحادثات.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void refresh();
    const interval = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <div className="page-container page-section">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="heading-page">محادثاتي</h1>
          <p className="mt-1.5 text-meta">
            كل محادثاتك مع المسوقين والباحثين في مكان واحد.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">⚠️</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{error}</h3>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">💬</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              لا توجد محادثات بعد
            </h3>
            <p className="mt-1 text-meta">
              ابدأ محادثة بالضغط على زر "محادثة" في أي إعلان.
            </p>
            <Link to="/" className="btn-brand mt-6">تصفّح الإعلانات</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => {
              const isMine = c.last_message?.sender_id === user?.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/chat/${c.id}`)}
                    className="card-hover flex w-full items-center gap-4 p-4 text-right"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
                      {initialsOf(c.counterparty?.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-semibold text-slate-900">
                          {c.counterparty?.name || 'مستخدم'}
                          {c.unread_count > 0 && <span className="badge-brand mr-2" aria-label={`${c.unread_count} رسائل غير مقروءة`}>{c.unread_count}</span>}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {timeAgo(c.updated_at)}
                        </span>
                      </div>

                      {c.listing?.title && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          إعلان: {c.listing.title}
                        </p>
                      )}

                      {c.last_message ? (
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {isMine && <span className="text-slate-400">أنت: </span>}
                          {c.last_message.body}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm italic text-slate-400">
                          لم تُرسل أي رسائل بعد
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
