import { FileText, LayoutDashboard, LifeBuoy, LogOut, MessagesSquare, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/tickets", label: "Tickets", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-signal ${
    isActive ? "bg-paper/15 font-medium text-paper" : "text-paper/70 hover:bg-paper/10 hover:text-paper"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper text-ink md:flex">
      <aside className="bg-ink text-paper md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">AskDesk</p>
            <p className="mt-0.5 truncate text-sm text-paper/70">{user.business?.name}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-2 text-paper/70 hover:bg-paper/10 hover:text-paper md:hidden"
            aria-label="Log out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-paper/10 px-5 py-4 md:block">
          <p className="truncate text-sm text-paper/70">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex items-center gap-2 text-sm text-paper/80 hover:text-paper focus-visible:outline-2 focus-visible:outline-signal"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}