import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/context/auth';
import Auth from '../src/pages/Auth';
import CreateListingForm from '../src/components/CreateListingForm';
import ListingCard from '../src/components/ListingCard';
import ProtectedRoute from '../src/components/ProtectedRoute';

export function renderScreen(screen, auth = {}) {
  const listing = { id: 'listing', broker_id: 'broker', title: 'Smoke Test Apartment', price: 123456, city: 'القاهرة', area: 'وسط البلد', property_type: 'apartment', offer_type: 'sale', images: ['https://example.com/photo.png'], rooms: 2, floor: 0, created_at: '2026-11-16T10:00:00Z' };
  const screens = {
    auth: <Auth />,
    edit: <CreateListingForm listing={listing} onCancel={() => {}} onSuccess={() => {}} />,
    card: <ListingCard listing={listing} onClick={() => {}} />,
    protected: <ProtectedRoute requiredRole="broker"><p>Protected broker content</p></ProtectedRoute>,
  };
  return renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{ isAuthenticated: false, user: null, loading: false, ...auth }}>{screens[screen]}</AuthContext.Provider></MemoryRouter>);
}
