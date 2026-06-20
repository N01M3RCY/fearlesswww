import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Character {
  id: number;
  discordId: string;
  characterName: string;
  house: string | null;
  classYear: number | null;
  walletGalleons: number;
  bankGalleons: number;
  xp: number;
  level: number;
  skillPoints: number;
  isWanted: boolean;
  isAzkaban: boolean;
  createdAt: string;
}

const HOUSE_ICONS: Record<string, string> = { Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" };

export default function UsersPage({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Character | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [galleonOp, setGalleonOp] = useState({ type: "add" as "add" | "remove", amount: 0, reason: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const canEdit = ["admin", "mod"].includes(userRole);

  useEffect(() => {
    api.get<{ users: Character[] }>("/users").then(d => setUsers(d.users)).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.characterName?.toLowerCase().includes(search.toLowerCase()) ||
    u.discordId.includes(search)
  );

  function openUser(u: Character) {
    setSelected(u);
    setEditData({ walletGalleons: u.walletGalleons, bankGalleons: u.bankGalleons, xp: u.xp, level: u.level, skillPoints: u.skillPoints, house: u.house, classYear: u.classYear, isWanted: u.isWanted, isAzkaban: u.isAzkaban });
    setMsg("");
  }

  async function saveUser() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/users/${selected.discordId}`, editData);
      setUsers(prev => prev.map(u => u.discordId === selected.discordId ? { ...u, ...editData } : u));
      setMsg("✅ Kaydedildi!");
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  async function doGalleon() {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await api.post<{ newAmount: number }>(`/users/${selected.discordId}/galleon`, galleonOp);
      setUsers(prev => prev.map(u => u.discordId === selected.discordId ? { ...u, walletGalleons: result.newAmount } : u));
      setMsg(`✅ ${galleonOp.type === "add" ? "Eklendi" : "Düşüldü"}: ${galleonOp.amount}G`);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* User list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "Georgia, serif" }}>🧙 Karakterler</h2>
          <span className="text-purple-400 text-sm">{filtered.length} karakter</span>
        </div>
        <input
          type="text"
          placeholder="İsim veya Discord ID ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1c1928] border border-purple-800/50 rounded-xl px-4 py-2.5 text-white placeholder-purple-700 focus:outline-none focus:border-amber-400 mb-4 text-sm"
        />
        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
          {filtered.map(u => (
            <button
              key={u.id}
              onClick={() => openUser(u)}
              className={`w-full text-left bg-[#13111a] border rounded-xl p-4 transition-all hover:border-purple-600 ${selected?.id === u.id ? "border-amber-500/60 bg-[#1c1928]" : "border-purple-900/30"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{HOUSE_ICONS[u.house ?? ""] ?? "🧙"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">{u.characterName || "İsimsiz"}</span>
                    {u.isAzkaban && <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">Azkaban</span>}
                    {u.isWanted && <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">Aranan</span>}
                  </div>
                  <div className="text-purple-500 text-xs mt-0.5">{u.house ?? "Sınıflanmamış"} • Yıl {u.classYear ?? "?"} • Lv.{u.level}</div>
                </div>
                <div className="text-amber-400 text-sm font-mono">{u.walletGalleons}G</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Edit panel */}
      {selected && (
        <div className="w-80 shrink-0 bg-[#13111a] border border-purple-900/30 rounded-2xl p-5 max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-400 font-semibold">{selected.characterName}</h3>
            <button onClick={() => setSelected(null)} className="text-purple-500 hover:text-white text-lg">×</button>
          </div>
          <p className="text-purple-600 text-xs mb-4 font-mono">{selected.discordId}</p>

          {canEdit ? (
            <div className="space-y-3">
              {[
                { key: "walletGalleons", label: "Cüzdan (G)", type: "number" },
                { key: "bankGalleons", label: "Banka (G)", type: "number" },
                { key: "xp", label: "XP", type: "number" },
                { key: "level", label: "Seviye", type: "number" },
                { key: "skillPoints", label: "Yetenek Puanı", type: "number" },
                { key: "classYear", label: "Sınıf Yılı", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-purple-400 text-xs mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={editData[f.key] ?? ""}
                    onChange={e => setEditData((p: any) => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}

              <div>
                <label className="text-purple-400 text-xs mb-1 block">Bina</label>
                <select
                  value={editData.house ?? ""}
                  onChange={e => setEditData((p: any) => ({ ...p, house: e.target.value || null }))}
                  className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="">Seçilmemiş</option>
                  {["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                {[
                  { key: "isAzkaban", label: "Azkaban" },
                  { key: "isWanted", label: "Aranan" },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData[f.key] ?? false}
                      onChange={e => setEditData((p: any) => ({ ...p, [f.key]: e.target.checked }))}
                      className="accent-amber-400"
                    />
                    <span className="text-purple-300 text-xs">{f.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={saveUser}
                disabled={saving}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "💾 Kaydet"}
              </button>

              {/* Galleon op */}
              <div className="border-t border-purple-900/30 pt-3 mt-2">
                <p className="text-purple-400 text-xs mb-2">Galleon İşlemi</p>
                <div className="flex gap-2 mb-2">
                  <select
                    value={galleonOp.type}
                    onChange={e => setGalleonOp(p => ({ ...p, type: e.target.value as "add" | "remove" }))}
                    className="bg-[#1c1928] border border-purple-800/40 rounded-lg px-2 py-1.5 text-white text-xs flex-1 focus:outline-none"
                  >
                    <option value="add">Ekle</option>
                    <option value="remove">Düş</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Miktar"
                    value={galleonOp.amount || ""}
                    onChange={e => setGalleonOp(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="bg-[#1c1928] border border-purple-800/40 rounded-lg px-2 py-1.5 text-white text-xs w-20 focus:outline-none"
                  />
                </div>
                <input
                  placeholder="Neden (açıklama)..."
                  value={galleonOp.reason}
                  onChange={e => setGalleonOp(p => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-[#1c1928] border border-purple-800/40 rounded-lg px-2 py-1.5 text-white text-xs mb-2 focus:outline-none"
                />
                <button
                  onClick={doGalleon}
                  disabled={saving}
                  className="w-full bg-amber-700 hover:bg-amber-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  🪙 Uygula
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {[["Cüzdan", `${selected.walletGalleons}G`], ["Banka", `${selected.bankGalleons}G`], ["XP", selected.xp], ["Seviye", selected.level], ["Bina", selected.house ?? "-"], ["Yıl", selected.classYear ?? "-"]].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between py-1 border-b border-purple-900/20">
                  <span className="text-purple-400">{k}</span>
                  <span className="text-white font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {msg && <p className={`mt-3 text-xs text-center ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
        </div>
      )}
    </div>
  );
}
