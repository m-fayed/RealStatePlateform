import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import ListingDetail from './pages/ListingDetail';
import BrokerProfile from './pages/BrokerProfile';
import BrokerDashboard from './pages/BrokerDashboard';
import AdminPanel from './pages/AdminPanel';
import BuyCredits from './pages/BuyCredits';
import ChatPage from './pages/ChatPage';
import Inbox from './pages/Inbox';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="page-container py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                  <path d="M10 21v-6h4v6" />
                </svg>
              </span>
              <span className="text-lg font-extrabold text-slate-900">عقاري</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              منصة التسويق العقاري الموثوق في مصر — مسوقون مرخصون رسمياً وكل إعلان مربوط برخصة.
            </p>
          </div>

          {/* For seekers */}
          <div>
            <h3 className="eyebrow">للباحثين</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/" className="text-slate-600 transition hover:text-slate-900">تصفح الإعلانات</Link></li>
              <li><Link to="/auth" className="text-slate-600 transition hover:text-slate-900">إنشاء حساب باحث</Link></li>
            </ul>
          </div>

          {/* For brokers */}
          <div>
            <h3 className="eyebrow">للمسوقين</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/auth" className="text-slate-600 transition hover:text-slate-900">سجّل كمسوق</Link></li>
              <li><Link to="/dashboard" className="text-slate-600 transition hover:text-slate-900">لوحة التحكم</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="eyebrow">عن المنصة</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><span className="text-slate-600">الشروط والاتفاقية</span></li>
              <li><span className="text-slate-600">سياسة الخصوصية</span></li>
              <li><span className="text-slate-600">تواصل معنا</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} عقاري — جميع الحقوق محفوظة
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            صُنع بإتقان في مصر
          </p>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/credits"
            element={
              <ProtectedRoute requiredRole="broker">
                <BuyCredits />
              </ProtectedRoute>
            }
          />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/brokers/:id" element={<BrokerProfile />} />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <Inbox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auth"
            element={isAuthenticated ? <Navigate to="/" /> : <Auth />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="broker">
                <BrokerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
