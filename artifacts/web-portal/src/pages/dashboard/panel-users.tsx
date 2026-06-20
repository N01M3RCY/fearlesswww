import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface PanelUser { id: number; username: string; role: string; displayName: string; discordId: string | null; isActive: boolean; createdAt: string }

const ROLE_LABELS: Record<string, string> = { admin: "Baş Büyücü", mod: "Moderatör", professor: "Profesör", guide: "Kılavuz" };
const ROLE_COLORS: Record<string, string> = { admin: "text-amber-400", mod: "text-purple-300", professor: "text-blue-300", guide: "text-green-300" };

export default function PanelUsersPage() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<PanelUser | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "mod", displayName: "", discordId: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    api.get<{ users: PanelUser[] }>("/panel-users").then(d => setUsers(d.users)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function save() {
    setSaving(true); setMsg("");
    try {
      if (editUser) {
        await api.patch(`/panel-users/${editUser.id}`, { password: form.password || undefined, role: form.role, displayName: form.displayName });
        setMsg("✅ Güncellendi!");
      } else {
        await api.post("/panel-users", form);
        setMsg("✅ Kullanıcı oluşturuldu!");
      }
      load();
      setShowForm(false);
      setEditUser(null);
      setForm({ username: "", password: "", role: "mod", displayName: "", discordId: "" });
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  async function deactivate(id: number) {
    if (!confirm("Bu kullanıcıyı devre dışı bırakmak istiyor musun?")) return;
    try {
      await api.delete(`/panel-users/${id}`);
      load();
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  }

  function openEdit(u: PanelUser) {
    setEditUser(u);
    setForm({ username: u.username, password: "", role: u.role, displayName: u.displayName, discordId: u.discordId ?? "" });
    setShowForm(true);
    setMsg("");
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "Georgia, serif" }}>🔑 Panel Kullanıcıları</h2>
        <button onClick={() => { setShowForm(true); setEditUser(null); setForm({ username: "", password: "", role: "mod", displayName: "", discordId: "" }); }}
          className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Yeni Kullanıcı
        </button>
      </div>

      <p className="text-purple-500 text-sm mb-5">
        Moderatörlere, profesörlere ve kılavuzlara panel erişimi ver. Her rol kendi yetkisine uygun sayfalara erişebilir.
      </p>

      {/* Form */}
      {showForm && (
        <div className="bg-[#13111a] border border-amber-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-amber-400 font-semibold mb-4">{editUser ? `✏️ Düzenle: ${editUser.username}` : "➕ Yeni Panel Kullanıcısı"}</h3>
          <div className="grid grid-cols-2 gap-4">
            {!editUser && (
              <div>
                <label className="text-purple-400 text-xs mb-1 block">Kullanıcı Adı</label>
                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="ahmet_mod"
                  className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" />
              </div>
            )}
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Şifre {editUser && "(boş bırakırsan değişmez)"}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••"
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Görünen Ad</label>
              <input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Ahmet"
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Rol</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400">
                <option value="mod">Moderatör</option>
                <option value="professor">Profesör</option>
                <option value="guide">Kılavuz</option>
                <option value="admin">Baş Büyücü (Admin)</option>
              </select>
            </div>
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Discord ID (opsiyonel)</label>
              <input value={form.discordId} onChange={e => setForm(p => ({ ...p, discordId: e.target.value }))} placeholder="Discord User ID"
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving} className="bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "💾 Kaydet"}
            </button>
            <button onClick={() => { setShowForm(false); setEditUser(null); }} className="text-purple-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors">İptal</button>
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
        </div>
      )}

      {/* User list */}
      <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-900/30">
              {["Kullanıcı", "Rol", "Discord ID", "Durum", ""].map(h => (
                <th key={h} className="text-left text-xs text-purple-500 font-medium uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-purple-900/20 last:border-0 hover:bg-purple-900/10 transition-colors">
                <td className="px-5 py-3">
                  <div className="text-white font-medium text-sm">{u.displayName}</div>
                  <div className="text-purple-500 text-xs font-mono">{u.username}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-sm font-medium ${ROLE_COLORS[u.role] ?? "text-purple-300"}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                </td>
                <td className="px-5 py-3 font-mono text-purple-400 text-xs">{u.discordId ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? "bg-green-900/40 text-green-300" : "bg-red-900/30 text-red-400"}`}>
                    {u.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.username !== "admin" && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="text-purple-400 hover:text-amber-400 text-sm transition-colors">✏️</button>
                      {u.isActive && <button onClick={() => deactivate(u.id)} className="text-purple-400 hover:text-red-400 text-sm transition-colors">🚫</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
