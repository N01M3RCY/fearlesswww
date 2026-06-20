import { useState } from "react";
import { useLocation } from "wouter";

const BASE = "/api/admin";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Giriş hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(120,80,255,0.15) 0%, transparent 60%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-wider" style={{ fontFamily: "Georgia, serif" }}>
            Fearless
          </h1>
          <p className="text-purple-300 text-sm mt-1 tracking-widest uppercase">Wizarding World — Yönetim Paneli</p>
        </div>

        {/* Card */}
        <div className="bg-[#13111a] border border-purple-900/40 rounded-2xl p-8 shadow-2xl shadow-purple-900/20">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-purple-300 text-sm mb-1.5 tracking-wide">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#1c1928] border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-700 focus:outline-none focus:border-amber-400 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-purple-300 text-sm mb-1.5 tracking-wide">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-[#1c1928] border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-700 focus:outline-none focus:border-amber-400 transition-colors"
                required
              />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2 text-red-300 text-sm">
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Giriş yapılıyor..." : "🔮 Giriş Yap"}
            </button>
          </form>
        </div>
        <p className="text-center text-purple-800 text-xs mt-6">Fearless Wizarding World © 2024</p>
      </div>
    </div>
  );
}
