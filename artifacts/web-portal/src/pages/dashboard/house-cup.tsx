import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface HouseCup { house: string; points: number }

const HOUSES = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];
const HOUSE_ICONS: Record<string, string> = { Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" };
const HOUSE_COLORS: Record<string, string> = { Gryffindor: "#ae0001", Slytherin: "#1a472a", Ravenclaw: "#0e1a40", Hufflepuff: "#ecb939" };

export default function HouseCupPage({ userRole }: { userRole: string }) {
  const [cups, setCups] = useState<HouseCup[]>([]);
  const [loading, setLoading] = useState(true);
  const [op, setOp] = useState<{ house: string; type: "add" | "remove"; amount: number }>({ house: "Gryffindor", type: "add", amount: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const canEdit = ["admin", "mod"].includes(userRole);

  function load() {
    api.get<{ cups: HouseCup[] }>("/house-cup").then(d => setCups(d.cups)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const sorted = [...cups].sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(...cups.map(c => c.points), 1);

  async function applyOp() {
    setSaving(true); setMsg("");
    try {
      await api.post(`/house-cup/${op.house}/points`, { amount: op.amount, type: op.type });
      load();
      setMsg(`✅ ${op.house} — ${op.type === "add" ? "+" : "-"}${op.amount} puan`);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>🏆 Bina Kupası</h2>

      {/* Scoreboard */}
      <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-8 mb-6">
        <div className="space-y-5">
          {sorted.map((cup, i) => (
            <div key={cup.house} className="flex items-center gap-4">
              <div className="w-8 text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"}</div>
              <div className="text-2xl">{HOUSE_ICONS[cup.house] ?? "🏠"}</div>
              <div className="w-28 text-white font-medium">{cup.house}</div>
              <div className="flex-1 bg-purple-900/20 rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-3 text-white text-xs font-bold transition-all"
                  style={{ width: `${(cup.points / maxPoints) * 100}%`, backgroundColor: HOUSE_COLORS[cup.house] ?? "#6b21a8", minWidth: cup.points > 0 ? "60px" : "0" }}
                >
                  {cup.points > 0 && `${cup.points} P`}
                </div>
              </div>
              <div className="w-20 text-right text-amber-400 font-bold text-lg">{cup.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Puan ver/al */}
      {canEdit && (
        <div className="bg-[#13111a] border border-purple-900/30 rounded-2xl p-6">
          <h3 className="text-amber-400 font-semibold mb-4">⚡ Puan İşlemi</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Bina</label>
              <select
                value={op.house}
                onChange={e => setOp(p => ({ ...p, house: e.target.value }))}
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                {HOUSES.map(h => <option key={h} value={h}>{HOUSE_ICONS[h]} {h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-purple-400 text-xs mb-1 block">İşlem</label>
              <select
                value={op.type}
                onChange={e => setOp(p => ({ ...p, type: e.target.value as "add" | "remove" }))}
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="add">+ Puan Ver</option>
                <option value="remove">- Puan Al</option>
              </select>
            </div>
            <div>
              <label className="text-purple-400 text-xs mb-1 block">Puan Miktarı</label>
              <input
                type="number"
                value={op.amount || ""}
                onChange={e => setOp(p => ({ ...p, amount: Number(e.target.value) }))}
                placeholder="10"
                className="w-full bg-[#1c1928] border border-purple-800/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <button
            onClick={applyOp}
            disabled={saving || !op.amount}
            className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Uygulanıyor..." : "⚡ Uygula"}
          </button>
          {msg && <p className={`mt-3 text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
        </div>
      )}
    </div>
  );
}
