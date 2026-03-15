import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ADMIN_LINKS = [
  { to: '/admin/kalender', label: 'Kalender' },
];

const VIKAR_LINKS = [
  { to: '/vikar/lektioner',       label: 'Mine lektioner'     },
  { to: '/vikar/tilgaengelighed', label: 'Min tilgængelighed' },
];

const LAERER_LINKS = [
  { to: '/laerer/lektioner', label: 'Mine lektioner' },
];

export default function AppLayout() {
  const { bruger, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    bruger?.rolle === 'admin'  ? ADMIN_LINKS  :
    bruger?.rolle === 'laerer' ? LAERER_LINKS :
    VIKAR_LINKS;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-full px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-widest uppercase text-slate-800 select-none">
            Vikar<span className="text-blue-600">System</span>
          </span>

          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">
              {bruger?.email} · <span className="capitalize">{bruger?.rolle}</span>
            </span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Log ud
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}