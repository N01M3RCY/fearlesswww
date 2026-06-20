import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  location: string;
  minClassYear: number;
  isAvailable: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { name: "Asa (Wand)", value: "wand" },
  { name: "İksir (Potion)", value: "potion" },
  { name: "Parşömen (Scroll)", value: "scroll" },
  { name: "Diğer Eşyalar (Item)", value: "item" },
];

const LOCATIONS = [
  { name: "Hogsmeade", value: "hogsmeade" },
  { name: "Diagon Yolu", value: "diagon" },
];

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(10);
  const [category, setCategory] = useState("item");
  const [location, setLocation] = useState("hogsmeade");
  const [minClassYear, setMinClassYear] = useState(1);
  const [isAvailable, setIsAvailable] = useState(true);

  // Edit states
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState(10);
  const [editIsAvailable, setEditIsAvailable] = useState(true);

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ items: ShopItem[] }>("/shop");
      setItems(data.items ?? []);
    } catch (err: any) {
      setError(err.message ?? "Ürünler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("Ürün adı boş olamaz!");
      return;
    }
    try {
      await api.post("/shop", {
        name: name.trim(),
        description: description.trim() || null,
        price,
        category,
        location,
        minClassYear,
        isAvailable,
      });
      setSuccess("Ürün dükkana başarıyla eklendi.");
      setName("");
      setDescription("");
      loadItems();
    } catch (err: any) {
      setError(err.message ?? "Ürün eklenirken hata oluştu");
    }
  }

  async function handleToggleStatus(item: ShopItem) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/shop/${item.id}`, { isAvailable: !item.isAvailable });
      setSuccess(`Ürün durumu güncellendi.`);
      loadItems();
    } catch (err: any) {
      setError(err.message ?? "Ürün durumu güncellenemedi");
    }
  }

  async function handleSaveEdit(id: number) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/shop/${id}`, { price: editPrice, isAvailable: editIsAvailable });
      setSuccess("Ürün başarıyla güncellendi.");
      setEditingItemId(null);
      loadItems();
    } catch (err: any) {
      setError(err.message ?? "Ürün güncellenemedi");
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/shop/${id}`);
      setSuccess("Ürün silindi.");
      loadItems();
    } catch (err: any) {
      setError(err.message ?? "Ürün silinemedi");
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
        {/* Create Shop Item Form */}
        <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl h-fit">
          <h2 className="text-lg font-bold text-amber-400 mb-6" style={{ fontFamily: "Georgia, serif" }}>🏪 Yeni Ürün Ekle</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Ürün Adı</label>
              <input
                type="text"
                required
                placeholder="Örn: Mürver Asa"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Dükkan Konumu</label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Min. Sınıf Yılı</label>
                <select
                  value={minClassYear}
                  onChange={e => setMinClassYear(Number(e.target.value))}
                  className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {[1,2,3,4,5,6,7].map(yr => <option key={yr} value={yr}>{yr}. Yıl</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Fiyat (Galleon)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Satışta mı?</label>
                <select
                  value={String(isAvailable)}
                  onChange={e => setIsAvailable(e.target.value === "true")}
                  className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="true">Evet</option>
                  <option value="false">Hayır</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-purple-400 uppercase font-semibold tracking-wider mb-1.5">Açıklama (Opsiyonel)</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ürünün etkileri ve bilgisi..."
                className="w-full bg-[#1c1928] border border-purple-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all"
            >
              🏪 Ürünü Satışa Çıkar
            </button>
          </form>
        </div>

        {/* Shop Items List */}
        <div className="bg-[#12101a] border border-purple-900/30 rounded-2xl p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold text-purple-300 mb-6" style={{ fontFamily: "Georgia, serif" }}>🏪 Hogwarts Market Ürünleri</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-purple-300 text-sm">
              <thead>
                <tr className="border-b border-purple-950 text-purple-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Ürün ID</th>
                  <th className="pb-3">Ürün Adı</th>
                  <th className="pb-3">Kategori</th>
                  <th className="pb-3">Konum</th>
                  <th className="pb-3">Fiyat</th>
                  <th className="pb-3">Yıl</th>
                  <th className="pb-3">Durum</th>
                  <th className="pb-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-950/40">
                {items.map(item => {
                  const isEditing = editingItemId === item.id;
                  const catLabel = CATEGORIES.find(c => c.value === item.category)?.name ?? item.category;

                  return (
                    <tr key={item.id} className="hover:bg-purple-950/10">
                      <td className="py-3 font-mono text-xs text-purple-500">#{item.id}</td>
                      <td className="py-3">
                        <span className="text-white font-semibold text-sm block">{item.name}</span>
                        {item.description && <span className="text-xs text-purple-500 block truncate max-w-[150px]">{item.description}</span>}
                      </td>
                      <td className="py-3 capitalize text-xs text-purple-400">{catLabel}</td>
                      <td className="py-3 capitalize text-xs text-purple-400">{item.location}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={e => setEditPrice(Number(e.target.value))}
                            className="w-16 bg-[#1c1928] border border-purple-800 text-white rounded px-2 py-0.5 text-center focus:outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-amber-400">{item.price} Galleon</span>
                        )}
                      </td>
                      <td className="py-3 text-xs">{item.minClassYear}. Yıl</td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            value={String(editIsAvailable)}
                            onChange={e => setEditIsAvailable(e.target.value === "true")}
                            className="bg-[#1c1928] border border-purple-800 text-white text-xs rounded px-2 py-0.5"
                          >
                            <option value="true">Aktif</option>
                            <option value="false">Pasif</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                              item.isAvailable
                                ? "bg-green-950/40 text-green-400 border-green-800"
                                : "bg-red-950/40 text-red-400 border-red-800"
                            }`}
                          >
                            {item.isAvailable ? "Satışta" : "Stok Dışı"}
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="bg-green-700 hover:bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                              >
                                Kaydet
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="bg-purple-900/40 text-purple-300 text-[10px] font-bold px-2 py-1 rounded"
                              >
                                İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditPrice(item.price);
                                  setEditIsAvailable(item.isAvailable);
                                }}
                                className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 text-[10px] font-bold px-2 py-1 rounded transition-all"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-[10px] font-bold px-2 py-1 rounded transition-all"
                              >
                                Sil
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="text-purple-600 text-center py-10 text-xs">Henüz hiç market ürünü eklenmemiş.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
