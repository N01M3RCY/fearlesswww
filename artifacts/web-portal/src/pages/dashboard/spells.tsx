import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Spell {
  id: number;
  name: string;
  level: number;
  scrollsRequired: number;
  difficulty: string;
  description: string | null;
  createdAt: string;
}

export default function SpellsPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [scrollsRequired, setScrollsRequired] = useState(1);
  const [difficulty, setDifficulty] = useState("Kolay");
  const [description, setDescription] = useState("");

  async function loadSpells() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ spells: Spell[] }>("/spells");
      setSpells(data.spells ?? []);
    } catch (err: any) {
      setError(err.message ?? "Büyüler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpells();
  }, []);

  async function handleAddSpell(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("Büyü adı boş olamaz!");
      return;
    }
    try {
      await api.post("/spells", {
        name: name.trim(),
        level,
        scrollsRequired,
        difficulty,
        description: description.trim() || null,
      });
      setSuccess("Büyü sisteme başarıyla eklendi.");
      setName("");
      setDescription("");
      loadSpells();
    } catch (err: any) {
      setError(err.message ?? "Büyü eklenirken hata oluştu");
    }
  }

  async function handleDeleteSpell(id: number) {
    if (!confirm("Bu büyüyü sistemden silmek istediğinize emin misiniz?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/spells/${id}`);
      setSuccess("Büyü sistemden silindi.");
      loadSpells();
    } catch (err: any) {
      setError(err.message ?? "Büyü silinirken hata oluştu");
    }
  }

  if (loading) return <div className="text-purple-400 text-center mt-20">🔮 Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-4 text-green-300 text-sm">
          ✨ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Spell Form */}
        <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl h-fit">
          <h2 className="text-lg font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>🪄 Yeni Büyü Ekle</h2>
          <form onSubmit={handleAddSpell} className="space-y-4">
            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Büyü Adı</label>
              <input
                type="text"
                required
                placeholder="Örn: Alohomora"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Gerekli Sınıf Yılı</label>
              <select
                value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              >
                {[1,2,3,4,5,6,7].map(yr => <option key={yr} value={yr}>{yr}. Yıl</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Gerekli Parşömen Sayısı</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={scrollsRequired}
                onChange={e => setScrollsRequired(Number(e.target.value))}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Zorluk Seviyesi</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="Kolay">Kolay</option>
                <option value="Orta">Orta</option>
                <option value="Zor">Zor</option>
                <option value="Çok Zor">Çok Zor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Büyü Açıklaması (Opsiyonel)</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Büyünün etkileri ve kullanımı..."
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
            >
              ✨ Büyüyü Sisteme Ekle
            </button>
          </form>
        </div>

        {/* Spells List */}
        <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold text-purple-300 mb-6" style={{ fontFamily: "Georgia, serif" }}>📖 Kayıtlı Büyüler</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-purple-300 text-sm">
              <thead>
                <tr className="border-b border-purple-950 text-purple-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Büyü Adı</th>
                  <th className="pb-3">Sınıf Yılı</th>
                  <th className="pb-3">Gerekli Parşömen</th>
                  <th className="pb-3">Zorluk</th>
                  <th className="pb-3">Açıklama</th>
                  <th className="pb-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-950/40">
                {spells.map(spell => (
                  <tr key={spell.id} className="hover:bg-purple-950/10">
                    <td className="py-3 font-semibold text-white text-base">{spell.name}</td>
                    <td className="py-3">{spell.level}. Sınıf</td>
                    <td className="py-3 font-mono text-amber-400 font-semibold">{spell.scrollsRequired} Adet</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                        spell.difficulty === "Kolay" ? "bg-green-950/40 text-green-400 border-green-800" :
                        spell.difficulty === "Orta" ? "bg-yellow-950/40 text-yellow-400 border-yellow-800" :
                        "bg-red-950/40 text-red-400 border-red-800"
                      }`}>
                        {spell.difficulty}
                      </span>
                    </td>
                    <td className="py-3 text-purple-400 text-xs truncate max-w-[200px]">{spell.description ?? "-"}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteSpell(spell.id)}
                        className="bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {spells.length === 0 && (
              <p className="text-purple-600 text-center py-10 text-xs">Henüz hiç büyü eklenmemiş.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
