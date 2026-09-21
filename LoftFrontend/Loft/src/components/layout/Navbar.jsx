import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/'); };

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-line-subtle bg-bg-base/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-bg-base text-xs font-bold font-heading">DH</span>
          </span>
          <span className="font-heading font-semibold text-ink text-lg tracking-tight">
            digital.<span className="text-brand">HEROES</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
          <Link to="/charities" className="hover:text-ink transition-colors">Charities</Link>
          <Link to="/pricing"   className="hover:text-ink transition-colors">Pricing</Link>
          {user && (
            <Link to="/draws" className="hover:text-ink transition-colors">Draws</Link>
          )}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}