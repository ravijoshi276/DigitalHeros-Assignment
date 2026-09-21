import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronRight, Gift, Heart, Home, LogOut, Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: Home,     label: 'Dashboard' },
  { to: '/scores',    icon: BarChart3, label: 'My Scores' },
  { to: '/draws',     icon: Trophy,    label: 'Draws'     },
  { to: '/charities', icon: Heart,     label: 'Charities' },
  { to: '/winnings',  icon: Gift,      label: 'Winnings'  },
];

export default function AppLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/'); };

  return (
    <div className="flex min-h-screen bg-bg-base">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-line-subtle flex flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b border-line-subtle">
          <span className="font-heading font-semibold text-ink text-base tracking-tight">
            digital.<span className="text-brand">HEROES</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                transition-all duration-150 group
                ${isActive
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-bg-raised'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-brand' : 'text-ink-faint group-hover:text-ink-muted'} />
                  {label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-brand/60" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin link — only visible to staff */}
          {isAdmin && (
            <>
              <hr className="divider my-3 mx-1" />
              <NavLink
                to="/admin"
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  transition-all duration-150
                  ${isActive ? 'bg-accent/10 text-accent font-medium' : 'text-ink-muted hover:text-ink hover:bg-bg-raised'}
                `}
              >
                <BarChart3 size={17} />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-line-subtle">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-bg-raised transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
              <span className="text-brand text-xs font-semibold font-heading">
                {user?.first_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-ink-faint text-xs truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-ink-faint hover:text-status-danger transition-colors p-1"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
