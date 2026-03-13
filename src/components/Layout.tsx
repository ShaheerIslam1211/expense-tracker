import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  CreditCard,
  Fuel,
  TrendingUp,
  Settings,
  Calendar,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Plus,
  Target,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../utils/cn";
import { useTheme } from "../context/ThemeContext";
import { useModal } from "../context/ModalContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/history", label: "History", icon: History },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/fuel", label: "Fuel Tracker", icon: Fuel },
  { to: "/insights", label: "Insights", icon: TrendingUp },
  { to: "/savings", label: "Savings", icon: Target },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { showTransactionModal } = useModal();
  const { theme, setTheme } = useTheme();

  const linkClasses = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      isActive ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  const iconClasses = (isActive: boolean) =>
    cn(
      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          SpendWise
        </h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-accent"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              SpendWise
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Smart Financial Tracking</p>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => linkClasses(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={iconClasses(isActive)} />
                    <span className="font-semibold text-sm">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-border space-y-3">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Theme</span>
              <div className="flex bg-accent/50 rounded-lg p-1">
                {[
                  { value: "light", icon: Sun },
                  { value: "dark", icon: Moon },
                  { value: "system", icon: Monitor },
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value as "light" | "dark" | "system")}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-200",
                      theme === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={`${value.charAt(0).toUpperCase() + value.slice(1)} theme`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-accent/50 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pro Tip</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                Track your fuel expenses to see monthly trends and optimize savings.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => showTransactionModal()}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-primary text-primary-foreground p-5 rounded-3xl shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-[40]"
        aria-label="Add transaction"
      >
        <Plus className="h-8 w-8 stroke-[3]" />
      </button>

      {/* Mobile Bottom Navigation */}
      {/* <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border flex justify-around items-center py-2 z-50">
        {nav.slice(0, 3).map(({ to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "p-3 rounded-xl transition-all duration-200",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
              )
            }
          >
            <Icon className="h-6 w-6" />
          </NavLink>
        ))}
        <NavLink
          to="/cards"
          className={({ isActive }) =>
            cn(
              "p-3 rounded-xl transition-all duration-200",
              isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
            )
          }
        >
          <CreditCard className="h-6 w-6" />
        </NavLink>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-3 text-muted-foreground"
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav> */}
    </div>
  );
}
