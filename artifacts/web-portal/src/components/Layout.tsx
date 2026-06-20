import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "../lib/api";

type Tab = "stats" | "users" | "salary" | "house-cup" | "config" | "panel-users" | "applications";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  userRole?: string;
  userName?: string;
}

const NAV: { id: Tab; label: string; icon: string; minRole?: string }[] = [
  { id: "stats", label: "Genel Bakış", icon: "📊" },
  { id: "users", label: "Karakterler", icon: "🧙" },
  { id: "salary", label: "Maaş Sistemi", icon: "💰", minRole: "admin" },
  { id: "house-cup", label: "Bina Kupası", icon: "🏆" },
  { id: "applications", label: "Başvurular", icon: "📜", minRole: "mod" },
  { id: "config", label: "Bot Ayarları", icon: "⚙️", minRole: "admin" },
  { id: "panel-users", label: "Panel Kullanıcıları", icon: "🔑", minRole: "admin" },
];

const ROLE_LEVELS: Record<string, number> = { admin: 100, mod: 50, professor: 30, guide: 20 };

export default function Layout({ children, activeTab, userRole = "guide", userName = "" }: LayoutProps) {
  const [, setLocation] = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const userLevel = ROLE_LEVELS[userRole] ?? 0;

  async function logout() {
    setLoggingOut(true);
    await api.post("/logout", {}).catch(() => {});
    setLocation("/");
  }

  const visibleNav = NAV.filter(n => {
    if (!n.minRole) return true;
    return userLevel >= (ROLE_LEVELS[n.minRole] ?? 0);
  });

  const ROLE_LABELS: Record<string, string> = { admin: "Baş Büyücü", mod: "Moderatör", professor: "Profesör", guide: "Kılavuz" };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex"
      style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(80,40,180,0.10) 0%, transparent 60%)" }}>
      {/* Sidebar */}
      <aside className="w-64 bg-[#0e0c16] border-r border-purple-900/30 flex flex-col min-h-screen fixed left-0 top-0 bottom-0 z-10">
        {/* Logo */}
        <div className="p-6 border-b border-purple-900/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-amber-400 font-bold text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>Fearless</h1>
              <p className="text-purple-500 text-xs">Wizarding World</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => setLocation(`/dashboard/${item.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-purple-900/40 text-amber-400 border border-purple-700/40"
                  : "text-purple-300 hover:bg-purple-900/20 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-purple-900/30">
          <div className="bg-[#1c1928] rounded-xl p-3 mb-3">
            <p className="text-amber-400 text-sm font-semibold">{userName}</p>
            <p className="text-purple-500 text-xs mt-0.5">{ROLE_LABELS[userRole] ?? userRole}</p>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="w-full text-xs text-purple-500 hover:text-red-400 transition-colors py-1"
          >
            {loggingOut ? "Çıkış..." : "🚪 Çıkış Yap"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}
