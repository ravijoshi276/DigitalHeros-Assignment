import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Gift, Heart, Users } from 'lucide-react';

const adminNav = [
  { to: '/admin',           icon: BarChart3, label: 'Overview',   end: true },
  { to: '/admin/users',     icon: Users,     label: 'Users'               },
  { to: '/admin/draws',     icon: Gift,      label: 'Draws'               },
  { to: '/admin/charities', icon: Heart,     label: 'Charities'           },
  { to: '/admin/winners',   icon: Gift,      label: 'Winners'             },
];

export default function AdminLayout({ children }) {
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen bg-bg-base">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-line-subtle flex flex-col sticky top-0 h-screen">
        <div className="px-5 h-16 flex items-center justify-between border-b border-line-subtle">
          <span className="font-heading font-semibold text-accent text-sm tracking-wide uppercase">
            Admin
          </span>
          <button
            onClick={() => nav('/dashboard')}
            className="text-ink-faint hover:text-ink transition-colors"
            title="Back to app"
          >
            <ArrowLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                transition-all duration-150
                ${isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-bg-raised'
                }
              `}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
