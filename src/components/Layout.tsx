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
import { PwaInstallPrompt } from "./PwaInstallPrompt.tsx";
import { useAppSettings } from "../context/AppSettingsContext";
import { CommandCenter } from "./CommandCenter";
import { useAuth } from "../context/AuthContext";

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
  const { settings } = useAppSettings();
  const { userData } = useAuth();
  const displayName = userData?.name?.trim() || "User";
  const profileInitial = displayName.charAt(0).toUpperCase();

  const linkClasses = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 px-4 rounded-xl transition-all duration-200 group",
      settings.compactLayout ? "py-2.5" : "py-3",
      isActive ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  const iconClasses = (isActive: boolean) =>
    cn(
      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  return (
    <div className="min-h-dvh md:h-screen bg-background flex flex-col md:flex-row relative overflow-x-hidden md:overflow-hidden">
      {/* Mobile Header */}
      <header
        className={cn(
          "md:hidden z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border px-4 flex items-center justify-between",
          settings.mobileNavbarFixed ? "sticky top-0 py-4 safe-top" : "relative py-3 safe-top",
        )}
      >
        <h1 className="text-xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          SpendWise
        </h1>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-accent/40 border border-border rounded-full px-2.5 py-1.5 max-w-[52vw]">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/15 ring-1 ring-border flex items-center justify-center text-[11px] font-black text-primary">
              {userData?.photoUrl ? (
                <img
                  src={userData.photoUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                profileInitial
              )}
            </div>
            <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn(settings.compactLayout ? "p-4" : "p-6")}>
            <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
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
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/15 ring-1 ring-border flex items-center justify-center text-sm font-black text-primary">
                {userData?.photoUrl ? (
                  <img
                    src={userData.photoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profileInitial
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userData?.email ?? "Signed in"}</p>
              </div>
            </div>

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

            {settings.showSidebarTipCard && (
              <div className="bg-accent/50 rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pro Tip</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                  Track your fuel expenses to see monthly trends and optimize savings.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:pl-64">
        <div className="flex-1 md:overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className={cn("max-w-6xl mx-auto px-4 sm:px-6 lg:px-8", settings.compactLayout ? "py-5" : "py-8")}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Floating Add Button */}
      {settings.showFloatingAddButton && (
        <button
          onClick={() => showTransactionModal()}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 md:bottom-8 md:right-8 bg-primary text-primary-foreground p-5 rounded-3xl shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-40"
          aria-label="Add transaction"
        >
          <Plus className="h-8 w-8 stroke-3" />
        </button>
      )}

      {settings.showPwaInstallPrompt && <PwaInstallPrompt />}
      <CommandCenter />

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
