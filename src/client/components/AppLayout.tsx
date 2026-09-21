import { NavLink, Outlet } from 'react-router-dom';
import { BookIcon, CartIcon, BoxIcon, GearIcon } from './icons';
import { cn } from '../lib/cn';

const links = [
  { to: '/libreta', label: 'Libreta', Icon: BookIcon },
  { to: '/pos', label: 'Fiado', Icon: CartIcon },
  { to: '/inventario', label: 'Productos', Icon: BoxIcon },
  { to: '/config', label: 'Ajustes', Icon: GearIcon },
];

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <main className="flex-1 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)]">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-4 px-2">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 py-2">
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-9 w-16 items-center justify-center rounded-2xl transition-colors',
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  <span className={cn('text-[11px] font-semibold', isActive ? 'text-emerald-700' : 'text-slate-400')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
