import { Router, type Request, type Response } from "express";
import { db, adminUsersTable, adminConfigTable, charactersTable, transactionsTable, houseCupTable, finesTable, sortingApplicationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";

const router = Router();

// ─── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const requireAuth = (minRole?: string) => (req: any, res: Response, next: any): void => {
  const user = req.session?.adminUser;
  if (!user) {
    res.status(401).json({ error: "Giriş yapmalısın" });
    return;
  }
  const ROLE_LEVELS: Record<string, number> = { admin: 100, mod: 50, professor: 30, guide: 20 };
  if (minRole) {
    const userLevel = ROLE_LEVELS[user.role] ?? 0;
    const requiredLevel = ROLE_LEVELS[minRole] ?? 0;
    if (userLevel < requiredLevel) {
      res.status(403).json({ error: "Bu işlem için yetkin yok" });
      return;
    }
  }
  next();
};

// ─── İLK KURULUM ──────────────────────────────────────────────────────────────
async function ensureAdminExists(): Promise<void> {
  const [existing] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, "admin"));
  if (!existing) {
    const hash = await bcrypt.hash("1514841514", 10);
    await db.insert(adminUsersTable).values({
      username: "admin",
      passwordHash: hash,
      role: "admin",
      displayName: "Baş Büyücü",
      isActive: true,
    });
    logger.info("Admin kullanıcısı oluşturuldu: admin / 1514841514");
  }
}
ensureAdminExists().catch(err => logger.error({ err }, "Admin init hatası"));

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req: any, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" });
    return;
  }
  const [user] = await db.select().from(adminUsersTable).where(and(eq(adminUsersTable.username, username), eq(adminUsersTable.isActive, true)));
  if (!user) {
    res.status(401).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Şifre hatalı" });
    return;
  }
  req.session.adminUser = { id: user.id, username: user.username, role: user.role, displayName: user.displayName };
  res.json({ ok: true, user: { username: user.username, role: user.role, displayName: user.displayName } });
});

router.post("/logout", (req: any, res: Response): void => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/me", requireAuth(), (req: any, res: Response): void => {
  res.json({ user: req.session.adminUser });
});

// ─── KULLANICI YÖNETİMİ ────────────────────────────────────────────────────────
router.get("/users", requireAuth(), async (_req: Request, res: Response): Promise<void> => {
  const chars = await db.select().from(charactersTable).orderBy(desc(charactersTable.createdAt));
  res.json({ users: chars });
});

router.get("/users/:discordId", requireAuth(), async (req: Request, res: Response): Promise<void> => {
  const discordId = String(req.params.discordId);
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, discordId));
  if (!char) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  const fines = await db.select().from(finesTable).where(eq(finesTable.discordId, discordId));
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.toDiscordId, discordId)).orderBy(desc(transactionsTable.createdAt)).limit(20);
  res.json({ user: char, fines, transactions: txs });
});

router.patch("/users/:discordId", requireAuth("mod"), async (req: Request, res: Response): Promise<void> => {
  const discordId = String(req.params.discordId);
  const { walletGalleons, bankGalleons, classYear, house, xp, level, skillPoints, isWanted, isAzkaban } = req.body;
  const updates: any = {};
  if (walletGalleons !== undefined) updates.walletGalleons = walletGalleons;
  if (bankGalleons !== undefined) updates.bankGalleons = bankGalleons;
  if (classYear !== undefined) updates.classYear = classYear;
  if (house !== undefined) updates.house = house;
  if (xp !== undefined) updates.xp = xp;
  if (level !== undefined) updates.level = level;
  if (skillPoints !== undefined) updates.skillPoints = skillPoints;
  if (isWanted !== undefined) updates.isWanted = isWanted;
  if (isAzkaban !== undefined) updates.isAzkaban = isAzkaban;
  await db.update(charactersTable).set(updates).where(eq(charactersTable.discordId, discordId));
  res.json({ ok: true });
});

router.post("/users/:discordId/galleon", requireAuth("mod"), async (req: Request, res: Response): Promise<void> => {
  const discordId = String(req.params.discordId);
  const { amount, type, reason } = req.body as { amount: number; type: "add" | "remove"; reason: string };
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, discordId));
  if (!char) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  const newAmount = type === "add" ? char.walletGalleons + amount : Math.max(0, char.walletGalleons - amount);
  await db.update(charactersTable).set({ walletGalleons: newAmount }).where(eq(charactersTable.discordId, discordId));
  await db.insert(transactionsTable).values({
    fromDiscordId: type === "add" ? "ADMIN" : discordId,
    toDiscordId: type === "add" ? discordId : "ADMIN",
    amount,
    type: "admin_adjustment",
    description: reason ?? "Admin düzenlemesi",
  });
  res.json({ ok: true, newAmount });
});

// ─── MAAŞ SİSTEMİ ──────────────────────────────────────────────────────────────
router.get("/salaries", requireAuth(), async (_req: Request, res: Response): Promise<void> => {
  const configs = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "salary_config")).limit(1);
  const raw = configs[0]?.value ?? "[]";
  res.json({ salaries: JSON.parse(raw) });
});

router.post("/salaries", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const salaries = req.body as { roleName: string; amount: number; roleId: string }[];
  const [existing] = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "salary_config"));
  if (existing) {
    await db.update(adminConfigTable).set({ value: JSON.stringify(salaries) }).where(eq(adminConfigTable.key, "salary_config"));
  } else {
    await db.insert(adminConfigTable).values({ key: "salary_config", value: JSON.stringify(salaries), description: "Maaş rolleri ve miktarları" });
  }
  res.json({ ok: true });
});

router.post("/salaries/pay-all", requireAuth("admin"), async (_req: Request, res: Response): Promise<void> => {
  const configs = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, "salary_config")).limit(1);
  const salaries: { roleName: string; amount: number; roleId: string }[] = JSON.parse(configs[0]?.value ?? "[]");

  const botClient = (global as any).__discordClient;
  if (!botClient) {
    res.status(503).json({ error: "Bot bağlı değil" });
    return;
  }
  const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID);
  if (!guild) {
    res.status(503).json({ error: "Sunucu bulunamadı" });
    return;
  }

  let paid = 0;
  const allChars = await db.select().from(charactersTable);
  await guild.members.fetch();

  for (const char of allChars) {
    const member = guild.members.cache.get(char.discordId);
    if (!member) continue;
    for (const salary of salaries) {
      const hasRole = salary.roleId
        ? member.roles.cache.has(salary.roleId)
        : member.roles.cache.some((r: any) => r.name === salary.roleName);
      if (!hasRole) continue;
      await db.update(charactersTable).set({ walletGalleons: char.walletGalleons + salary.amount }).where(eq(charactersTable.discordId, char.discordId));
      await db.insert(transactionsTable).values({
        fromDiscordId: "MINISTRY",
        toDiscordId: char.discordId,
        amount: salary.amount,
        type: "salary",
        description: `Manuel maaş: ${salary.roleName}`,
      });
      paid++;
      break;
    }
  }
  res.json({ ok: true, paid });
});

// ─── BOT KONFİGÜRASYONU ───────────────────────────────────────────────────────
router.get("/config", requireAuth(), async (_req: Request, res: Response): Promise<void> => {
  const configs = await db.select().from(adminConfigTable);
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;
  res.json({ config: map });
});

router.post("/config", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const entries = req.body as { key: string; value: string; description?: string }[];
  for (const entry of entries) {
    const [existing] = await db.select().from(adminConfigTable).where(eq(adminConfigTable.key, entry.key));
    if (existing) {
      await db.update(adminConfigTable).set({ value: entry.value }).where(eq(adminConfigTable.key, entry.key));
    } else {
      await db.insert(adminConfigTable).values(entry);
    }
  }
  res.json({ ok: true });
});

// ─── PANEL KULLANICILARI ───────────────────────────────────────────────────────
router.get("/panel-users", requireAuth("admin"), async (_req: Request, res: Response): Promise<void> => {
  const users = await db.select({
    id: adminUsersTable.id,
    username: adminUsersTable.username,
    role: adminUsersTable.role,
    displayName: adminUsersTable.displayName,
    discordId: adminUsersTable.discordId,
    isActive: adminUsersTable.isActive,
    createdAt: adminUsersTable.createdAt,
  }).from(adminUsersTable);
  res.json({ users });
});

router.post("/panel-users", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const { username, password, role, displayName, discordId } = req.body as { username: string; password: string; role: string; displayName: string; discordId?: string };
  const VALID_ROLES = ["admin", "mod", "professor", "guide"];
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "Geçersiz rol" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await db.insert(adminUsersTable).values({ username, passwordHash: hash, role, displayName, discordId, isActive: true });
  res.json({ ok: true });
});

router.patch("/panel-users/:id", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const { password, role, displayName, isActive } = req.body;
  const updates: any = {};
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  if (role) updates.role = role;
  if (displayName) updates.displayName = displayName;
  if (isActive !== undefined) updates.isActive = isActive;
  await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, parseInt(String(req.params.id))));
  res.json({ ok: true });
});

router.delete("/panel-users/:id", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id));
  if (user?.role === "admin" && user.username === "admin") {
    res.status(403).json({ error: "Baş admin silinemez" });
    return;
  }
  await db.update(adminUsersTable).set({ isActive: false }).where(eq(adminUsersTable.id, id));
  res.json({ ok: true });
});

// ─── BINA KUPASI ───────────────────────────────────────────────────────────────
router.get("/house-cup", requireAuth(), async (_req: Request, res: Response): Promise<void> => {
  const cups = await db.select().from(houseCupTable);
  res.json({ cups });
});

router.post("/house-cup/:house/points", requireAuth("mod"), async (req: Request, res: Response): Promise<void> => {
  const house = String(req.params.house);
  const { amount, type } = req.body as { amount: number; type: "add" | "remove" };
  const [cup] = await db.select().from(houseCupTable).where(eq(houseCupTable.house, house));
  const current = cup?.points ?? 0;
  const newPoints = type === "add" ? current + amount : Math.max(0, current - amount);
  if (cup) {
    await db.update(houseCupTable).set({ points: newPoints }).where(eq(houseCupTable.house, house));
  } else {
    await db.insert(houseCupTable).values({ house, points: newPoints });
  }
  res.json({ ok: true, newPoints });
});

// ─── BAŞVURULAR ────────────────────────────────────────────────────────────────
router.get("/applications", requireAuth("mod"), async (_req: Request, res: Response): Promise<void> => {
  const apps = await db.select().from(sortingApplicationsTable).orderBy(desc(sortingApplicationsTable.createdAt)).limit(50);
  res.json({ applications: apps });
});

// ─── İSTATİSTİKLER ────────────────────────────────────────────────────────────
router.get("/stats", requireAuth(), async (_req: Request, res: Response): Promise<void> => {
  const chars = await db.select().from(charactersTable);
  const txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(20);
  const cups = await db.select().from(houseCupTable);
  const fines = await db.select().from(finesTable);

  const byHouse: Record<string, number> = {};
  for (const c of chars) {
    if (c.house) byHouse[c.house] = (byHouse[c.house] ?? 0) + 1;
  }

  res.json({
    totalUsers: chars.length,
    azkabanCount: chars.filter(c => c.isAzkaban).length,
    wantedCount: chars.filter(c => c.isWanted).length,
    byHouse,
    houseCup: cups.sort((a, b) => b.points - a.points),
    recentTransactions: txs,
    unpaidFines: fines.filter(f => f.isPaid === "false").length,
    totalGalleons: chars.reduce((s, c) => s + c.walletGalleons + c.bankGalleons, 0),
  });
});

export default router;
