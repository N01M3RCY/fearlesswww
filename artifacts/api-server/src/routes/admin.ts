import { Router, type Request, type Response } from "express";
import {
  db, adminUsersTable, adminConfigTable, charactersTable, transactionsTable,
  houseCupTable, finesTable, sortingApplicationsTable, characterIntroTable,
  lessonsTable, examsTable, examResultsTable, spellsTable, characterSpellsTable,
  shopItemsTable, inventoryTable
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { CONFIG } from "../bot/config";
import { createEmbed, COLORS, houseEmoji, houseColor } from "../bot/embed";
import { TextChannel } from "discord.js";

const router = Router();

// ─── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const requireAuth = (minRole?: string) => (req: any, res: Response, next: any): void => {
  const user = req.session?.adminUser;
  if (!user) {
    res.status(401).json({ error: "Giriş yapmalısın" });
    return;
  }
  const ROLE_LEVELS: Record<string, number> = { admin: 100, mod: 50, professor: 30, guide: 20, student: 10 };
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
  const VALID_ROLES = ["admin", "mod", "professor", "guide", "student"];
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
router.get("/applications", requireAuth("guide"), async (req: any, res: Response): Promise<void> => {
  const user = req.session?.adminUser;
  const apps = await db.select().from(sortingApplicationsTable).orderBy(desc(sortingApplicationsTable.createdAt)).limit(50);
  
  if (user.role === "guide") {
    res.json({ applications: apps, intros: [] });
    return;
  }
  
  const intros = await db.select().from(characterIntroTable).orderBy(desc(characterIntroTable.createdAt)).limit(50);
  res.json({ applications: apps, intros });
});

router.post("/applications/sorting/:id/approve", requireAuth("guide"), async (req: any, res: Response): Promise<void> => {
  const appId = parseInt(req.params.id);
  const { house: assignedHouse } = req.body as { house: string };
  const user = req.session.adminUser;

  const [app] = await db.select().from(sortingApplicationsTable).where(eq(sortingApplicationsTable.id, appId));
  if (!app || app.status !== "beklemede") {
    res.status(404).json({ error: "Başvuru bulunamadı veya beklemede değil." });
    return;
  }

  const [existingChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, app.discordId));
  if (existingChar) {
    await db.update(charactersTable).set({ house: assignedHouse, bloodStatus: app.bloodStatus, gender: app.gender, oocName: app.oocName, oocAge: app.oocAge }).where(eq(charactersTable.discordId, app.discordId));
  } else {
    await db.insert(charactersTable).values({
      discordId: app.discordId,
      discordUsername: app.discordUsername,
      oocName: app.oocName,
      oocAge: app.oocAge,
      bloodStatus: app.bloodStatus,
      gender: app.gender,
      house: assignedHouse,
      classYear: 1,
      walletGalleons: 50,
      bankGalleons: 0,
    });
  }

  await db.update(sortingApplicationsTable).set({ status: "onaylandi", reviewedBy: user.username, reviewedAt: new Date() }).where(eq(sortingApplicationsTable.id, appId));

  const botClient = (global as any).__discordClient;
  if (botClient) {
    const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
    if (guild) {
      const member = await guild.members.fetch(app.discordId).catch(() => null);
      if (member) {
        const houseRole = guild.roles.cache.find((r: any) => r.name === assignedHouse);
        if (houseRole) await member.roles.add(houseRole).catch(() => {});

        const bloodRoleMap: Record<string, string> = {
          "Safkan": CONFIG.roles.safkan,
          "Melez": CONFIG.roles.melez,
          "Muggle Doğumlu": CONFIG.roles.muggleDogu,
        };
        const bloodRole = guild.roles.cache.find((r: any) => r.name === bloodRoleMap[app.bloodStatus] || r.id === bloodRoleMap[app.bloodStatus]);
        if (bloodRole) await member.roles.add(bloodRole).catch(() => {});

        const genderRoleName = app.gender === "Cadı" ? CONFIG.roles.cadi : CONFIG.roles.buyucu;
        const genderRole = guild.roles.cache.find((r: any) => r.name === genderRoleName || r.id === genderRoleName);
        if (genderRole) await member.roles.add(genderRole).catch(() => {});

        const yearRole = guild.roles.cache.find((r: any) => r.name === CONFIG.roles.firstYear || r.id === CONFIG.roles.firstYear);
        if (yearRole) await member.roles.add(yearRole).catch(() => {});

        if (CONFIG.roles.unregistered) {
          const unregRole = guild.roles.cache.find((r: any) => r.name === CONFIG.roles.unregistered || r.id === CONFIG.roles.unregistered);
          if (unregRole) await member.roles.remove(unregRole).catch(() => {});
        }
        if (CONFIG.roles.introNotWritten) {
          const introNotWrittenRole = guild.roles.cache.find((r: any) => r.name === CONFIG.roles.introNotWritten || r.id === CONFIG.roles.introNotWritten);
          if (introNotWrittenRole) await member.roles.add(introNotWrittenRole).catch(() => {});
        }

        await member.setNickname(`${app.oocName} | ${app.oocAge}`).catch(() => {});
      }
    }
  }

  res.json({ ok: true });
});

router.post("/applications/sorting/:id/reject", requireAuth("guide"), async (req: any, res: Response): Promise<void> => {
  const appId = parseInt(req.params.id);
  const user = req.session.adminUser;

  const [app] = await db.select().from(sortingApplicationsTable).where(eq(sortingApplicationsTable.id, appId));
  if (!app || app.status !== "beklemede") {
    res.status(404).json({ error: "Başvuru bulunamadı veya beklemede değil." });
    return;
  }

  await db.update(sortingApplicationsTable).set({ status: "reddedildi", reviewedBy: user.username, reviewedAt: new Date() }).where(eq(sortingApplicationsTable.id, appId));

  const botClient = (global as any).__discordClient;
  if (botClient) {
    try {
      const dUser = await botClient.users.fetch(app.discordId);
      await dUser.send({ embeds: [createEmbed("❌ Başvurun Reddedildi", "Seçmen Şapkası başvurun reddedildi.", COLORS.error)] });
    } catch {}
  }

  res.json({ ok: true });
});

router.post("/applications/intro/:id/approve", requireAuth("mod"), async (req: any, res: Response): Promise<void> => {
  const introId = parseInt(req.params.id);
  const user = req.session.adminUser;

  const [intro] = await db.select().from(characterIntroTable).where(eq(characterIntroTable.id, introId));
  if (!intro || intro.status !== "beklemede") {
    res.status(404).json({ error: "Başvuru bulunamadı veya beklemede değil." });
    return;
  }

  await db.update(characterIntroTable).set({ status: "onaylandi", reviewedBy: user.username, reviewedAt: new Date() }).where(eq(characterIntroTable.id, introId));
  await db.update(charactersTable).set({ icName: intro.icName, icAge: intro.icAge, icStory: intro.icStory, icStoryApproved: true }).where(eq(charactersTable.discordId, intro.discordId));

  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, intro.discordId));

  const botClient = (global as any).__discordClient;
  if (botClient) {
    const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
    if (guild) {
      const member = await guild.members.fetch(intro.discordId).catch(() => null);
      if (member && CONFIG.roles.introNotWritten) {
        const introNotWrittenRole = guild.roles.cache.find((r: any) => r.name === CONFIG.roles.introNotWritten || r.id === CONFIG.roles.introNotWritten);
        if (introNotWrittenRole) await member.roles.remove(introNotWrittenRole).catch(() => {});
      }
    }
    
    if (CONFIG.channels.characterIntro && guild) {
      const ch = guild.channels.cache.get(CONFIG.channels.characterIntro) as TextChannel | undefined;
      if (ch?.isTextBased()) {
        await ch.send({
          embeds: [createEmbed(
            `📜 Yeni Karakter Tanıtımı — ${intro.icName}`,
            [
              `**Oyuncu:** <@${intro.discordId}>`,
              `**Bina:** ${char?.house ? `${houseEmoji(char.house)} ${char.house}` : "Belirsiz"}`,
              `**IC İsim:** ${intro.icName} | ${intro.icAge} Yaşında`,
              "",
              `**Hikaye:**\n${intro.icStory}`,
            ].join("\n"),
            houseColor(char?.house),
            "Fearless Wizarding World — Karakter Tanıtım"
          )]
        }).catch(() => {});
      }
    }

    try {
      const dUser = await botClient.users.fetch(intro.discordId);
      await dUser.send({
        embeds: [createEmbed(
          "✅ Karakter Tanıtımın Onaylandı!",
          `**IC Adın:** ${intro.icName} | **IC Yaşın:** ${intro.icAge}\n\nKarakter tanıtımın onaylandı! 🪄`,
          COLORS.success
        )]
      });
    } catch {}
  }

  res.json({ ok: true });
});

router.post("/applications/intro/:id/reject", requireAuth("mod"), async (req: any, res: Response): Promise<void> => {
  const introId = parseInt(req.params.id);
  const user = req.session.adminUser;

  const [intro] = await db.select().from(characterIntroTable).where(eq(characterIntroTable.id, introId));
  if (!intro || intro.status !== "beklemede") {
    res.status(404).json({ error: "Başvuru bulunamadı veya beklemede değil." });
    return;
  }

  await db.update(characterIntroTable).set({ status: "reddedildi", reviewedBy: user.username, reviewedAt: new Date() }).where(eq(characterIntroTable.id, introId));

  const botClient = (global as any).__discordClient;
  if (botClient) {
    try {
      const dUser = await botClient.users.fetch(intro.discordId);
      await dUser.send({ embeds: [createEmbed("❌ Karakter Tanıtımın Reddedildi", "Karakter tanıtım başvurun reddedildi.", COLORS.error)] });
    } catch {}
  }

  res.json({ ok: true });
});

// ─── EXAMS API ─────────────────────────────────────────────────────────────────
router.get("/exams", requireAuth("student"), async (req: any, res: Response): Promise<void> => {
  const user = req.session.adminUser;

  if (user.role === "student") {
    if (!user.discordId) {
      res.json({ exams: [], results: [] });
      return;
    }
    const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, user.discordId));
    if (!char) {
      res.json({ exams: [], results: [] });
      return;
    }

    const activeExams = await db.select().from(examsTable).where(
      and(eq(examsTable.isActive, true), eq(examsTable.classYear, char.classYear))
    );
    const myResults = await db.select().from(examResultsTable).where(eq(examResultsTable.discordId, user.discordId));
    res.json({ exams: activeExams, results: myResults });
    return;
  }

  const allExams = await db.select().from(examsTable).orderBy(desc(examsTable.createdAt));
  res.json({ exams: allExams });
});

router.post("/exams", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const { subject, classYear, type, examCode, examLink } = req.body as { subject: string; classYear: number; type: string; examCode: string; examLink: string };
  const user = req.session.adminUser;

  // Professor subject check
  if (user.role === "professor") {
    if (!user.discordId) {
      res.status(403).json({ error: "Panel hesabınız bir Discord ID'sine bağlı değil!" });
      return;
    }
    const requiredRoleId = CONFIG.subjects[subject];
    const botClient = (global as any).__discordClient;
    if (requiredRoleId && botClient) {
      const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
      if (guild) {
        const member = await guild.members.fetch(user.discordId).catch(() => null);
        if (!member || !member.roles.cache.has(requiredRoleId)) {
          res.status(403).json({ error: `Bu dersin (${subject}) sınavını açmak için ilgili ders rolüne sahip olmalısınız!` });
          return;
        }
      }
    }
  }

  const [exam] = await db.insert(examsTable).values({
    professorDiscordId: user.discordId ?? "PANEL",
    subject,
    classYear,
    type,
    examCode,
    examLink,
    isActive: true,
    startedAt: new Date(),
  }).returning();

  res.json({ ok: true, exam });
});

router.patch("/exams/:id", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const examId = parseInt(req.params.id);
  const { isActive } = req.body as { isActive: boolean };

  const updates: any = { isActive };
  if (!isActive) updates.endedAt = new Date();

  await db.update(examsTable).set(updates).where(eq(examsTable.id, examId));
  res.json({ ok: true });
});

router.get("/exams/:id/results", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const examId = parseInt(req.params.id);
  const results = await db.select().from(examResultsTable).where(eq(examResultsTable.examId, examId));
  
  const chars = await db.select().from(charactersTable);
  const charMap = new Map(chars.map(c => [c.discordId, c]));

  const formatted = results.map(r => {
    const char = charMap.get(r.discordId);
    return {
      ...r,
      studentName: char ? `${char.oocName} (${char.icName ?? "Bilinmiyor"})` : r.discordId
    };
  });

  res.json({ results: formatted });
});

router.post("/exams/:id/grade", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const examId = parseInt(req.params.id);
  const { discordId: studentDiscordId, score } = req.body as { discordId: string; score: number };
  const isPassed = score >= 50;

  const [existing] = await db.select().from(examResultsTable).where(
    and(eq(examResultsTable.examId, examId), eq(examResultsTable.discordId, studentDiscordId))
  );

  if (existing) {
    await db.update(examResultsTable).set({ score, isPassed, gradedAt: new Date() }).where(
      and(eq(examResultsTable.examId, examId), eq(examResultsTable.discordId, studentDiscordId))
    );
  } else {
    await db.insert(examResultsTable).values({
      discordId: studentDiscordId,
      examId,
      score,
      isPassed,
      gradedAt: new Date()
    });
  }

  // Notify student via DM
  const botClient = (global as any).__discordClient;
  if (botClient) {
    try {
      const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
      const studentUser = await botClient.users.fetch(studentDiscordId);
      await studentUser.send({
        embeds: [createEmbed(
          `📊 Sınav Sonucun Açıklandı — ${exam?.subject ?? "?"}`,
          `Puanın: **${score}/100**\nSonuç: ${isPassed ? "✅ Geçti" : "❌ Kaldı"}`,
          isPassed ? COLORS.success : COLORS.error,
          "Hogwarts Akademi Kayıt Ofisi"
        )]
      });
    } catch {}
  }

  res.json({ ok: true });
});

router.post("/exams/:id/submit-code", requireAuth("student"), async (req: any, res: Response): Promise<void> => {
  const examId = parseInt(req.params.id);
  const { code } = req.body as { code: string };
  const user = req.session.adminUser;

  if (!user.discordId) {
    res.status(400).json({ error: "Panel hesabınız bir Discord ID'sine bağlı değil!" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam || !exam.isActive) {
    res.status(404).json({ error: "Aktif sınav bulunamadı." });
    return;
  }

  if (exam.examCode !== code) {
    res.status(400).json({ error: "Girdiğiniz sınav kodu hatalı!" });
    return;
  }

  // Record that the student started/entered the exam
  const [existing] = await db.select().from(examResultsTable).where(
    and(eq(examResultsTable.examId, examId), eq(examResultsTable.discordId, user.discordId))
  );

  if (!existing) {
    await db.insert(examResultsTable).values({
      discordId: user.discordId,
      examId,
      score: null,
      isPassed: null
    });
  }

  res.json({ ok: true, examLink: exam.examLink });
});

// ─── LESSONS API ───────────────────────────────────────────────────────────────
router.get("/lessons", requireAuth("student"), async (_req: Request, res: Response): Promise<void> => {
  const lessons = await db.select().from(lessonsTable).orderBy(desc(lessonsTable.createdAt));
  res.json({ lessons });
});

router.post("/lessons", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const { subject, classYear, description } = req.body as { subject: string; classYear: number; description?: string };
  const user = req.session.adminUser;

  // Professor subject check
  if (user.role === "professor") {
    if (!user.discordId) {
      res.status(403).json({ error: "Panel hesabınız bir Discord ID'sine bağlı değil!" });
      return;
    }
    const requiredRoleId = CONFIG.subjects[subject];
    const botClient = (global as any).__discordClient;
    if (requiredRoleId && botClient) {
      const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
      if (guild) {
        const member = await guild.members.fetch(user.discordId).catch(() => null);
        if (!member || !member.roles.cache.has(requiredRoleId)) {
          res.status(403).json({ error: `Bu dersi (${subject}) açmak için ilgili ders rolüne sahip olmalısınız!` });
          return;
        }
      }
    }
  }

  const [lesson] = await db.insert(lessonsTable).values({
    professorDiscordId: user.discordId ?? "PANEL",
    subject,
    classYear,
    description,
    isLive: true,
    scheduledAt: new Date()
  }).returning();

  // Send announcement on Discord
  const botClient = (global as any).__discordClient;
  if (botClient && CONFIG.channels.announcements) {
    const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
    if (guild) {
      const annCh = guild.channels.cache.get(CONFIG.channels.announcements) as TextChannel | undefined;
      if (annCh?.isTextBased()) {
        const embed = createEmbed(
          "📣 Canlı Ders Başladı (Panel)",
          [
            `**Ders:** ${subject}`,
            `**Hedef Sınıf:** ${classYear}. Yıl`,
            `**Profesör:** <@${user.discordId}>`,
            description ? `**Açıklama:** ${description}` : "",
          ].filter(Boolean).join("\n"),
          COLORS.info
        );
        await annCh.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  res.json({ ok: true, lesson });
});

router.post("/lessons/:id/end", requireAuth("professor"), async (req: any, res: Response): Promise<void> => {
  const lessonId = parseInt(req.params.id);
  const { amount = 1, spellName } = req.body as { amount: number; spellName: string };
  const user = req.session.adminUser;

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) {
    res.status(404).json({ error: "Ders bulunamadı" });
    return;
  }
  if (!lesson.isLive) {
    res.status(400).json({ error: "Bu ders zaten kapalı" });
    return;
  }

  const botClient = (global as any).__discordClient;
  let voiceChannel: any = null;
  let voiceMembers: any[] = [];

  if (botClient && user.discordId) {
    const guild = botClient.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
    if (guild) {
      const member = await guild.members.fetch(user.discordId).catch(() => null);
      if (member && member.voice?.channel) {
        voiceChannel = member.voice.channel;
        voiceMembers = Array.from(voiceChannel.members.values()).filter((m: any) => !m.user.bot);
      }
    }
  }

  if (!voiceChannel) {
    res.status(400).json({ error: "Derse katılanları tespit etmek için önce ders verdiğiniz ses kanalına girin." });
    return;
  }

  // Find or create scroll item
  const scrollItemName = `${spellName} Parşömeni`;
  let [scrollItem] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.name, scrollItemName));
  if (!scrollItem) {
    [scrollItem] = await db.insert(shopItemsTable).values({
      name: scrollItemName,
      description: `${spellName} büyüsünü öğrenmek için ders parşömeni.`,
      price: 0,
      category: "scroll",
      location: "diagon",
      minClassYear: lesson.classYear,
      isAvailable: false
    }).returning();
  }

  const rewardedMentions: string[] = [];
  for (const m of voiceMembers) {
    const memberId = m.id;
    const [studentChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, memberId));
    if (!studentChar) continue;

    const [invEntry] = await db.select().from(inventoryTable).where(
      and(eq(inventoryTable.discordId, memberId), eq(inventoryTable.itemId, scrollItem.id))
    );

    if (invEntry) {
      await db.update(inventoryTable).set({ quantity: invEntry.quantity + amount }).where(
        and(eq(inventoryTable.discordId, memberId), eq(inventoryTable.itemId, scrollItem.id))
      );
    } else {
      await db.insert(inventoryTable).values({ discordId: memberId, itemId: scrollItem.id, quantity: amount });
    }
    rewardedMentions.push(`<@${memberId}>`);
  }

  await db.update(lessonsTable).set({ isLive: false }).where(eq(lessonsTable.id, lessonId));

  // Log message to CONFIG.channels.lessonLog
  const logEmbed = createEmbed(
    "📚 Ders Tamamlandı & Parşömenler Dağıtıldı! (Panel)",
    [
      `**Ders Konusu:** ${lesson.subject}`,
      `**Profesör:** <@${lesson.professorDiscordId}>`,
      `**Dağıtılan:** **${amount}** adet **${scrollItemName}**`,
      `**Katılımcı Sayısı:** ${voiceMembers.length}`,
      `**Ses Kanalı:** ${voiceChannel.name}`,
      "",
      "**── Ödül Alan Öğrenciler ──**",
      rewardedMentions.length > 0 ? rewardedMentions.join(", ") : "_Kayıtlı karakter sahibi öğrenci bulunamadı._"
    ].join("\n"),
    COLORS.success
  );

  const guild = botClient?.guilds?.cache?.get(process.env.DISCORD_GUILD_ID ?? "");
  if (CONFIG.channels.lessonLog && guild) {
    const logCh = guild.channels.cache.get(CONFIG.channels.lessonLog);
    if (logCh?.isTextBased()) {
      await (logCh as any).send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  res.json({ ok: true, participantsCount: voiceMembers.length, rewardedCount: rewardedMentions.length });
});

// ─── SPELLS API ────────────────────────────────────────────────────────────────
router.get("/spells", requireAuth("student"), async (_req: Request, res: Response): Promise<void> => {
  const list = await db.select().from(spellsTable).orderBy(spellsTable.level);
  res.json({ spells: list });
});

router.post("/spells", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const { name, level, scrollsRequired, difficulty, description } = req.body as { name: string; level: number; scrollsRequired: number; difficulty: string; description?: string };
  const [spell] = await db.insert(spellsTable).values({ name, level, scrollsRequired, difficulty, description }).returning();
  res.json({ ok: true, spell });
});

router.delete("/spells/:id", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const spellId = parseInt(req.params.id);
  await db.delete(spellsTable).where(eq(spellsTable.id, spellId));
  res.json({ ok: true });
});

// ─── SHOP ITEMS API ────────────────────────────────────────────────────────────
router.get("/shop", requireAuth("student"), async (_req: Request, res: Response): Promise<void> => {
  const items = await db.select().from(shopItemsTable).orderBy(shopItemsTable.price);
  res.json({ items });
});

router.post("/shop", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const { name, description, price, category, location, minClassYear, isAvailable } = req.body as { name: string; description?: string; price: number; category: string; location: string; minClassYear: number; isAvailable: boolean };
  const [item] = await db.insert(shopItemsTable).values({ name, description, price, category, location, minClassYear, isAvailable }).returning();
  res.json({ ok: true, item });
});

router.patch("/shop/:id", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const itemId = parseInt(req.params.id);
  const { name, description, price, category, location, minClassYear, isAvailable } = req.body;
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price;
  if (category !== undefined) updates.category = category;
  if (location !== undefined) updates.location = location;
  if (minClassYear !== undefined) updates.minClassYear = minClassYear;
  if (isAvailable !== undefined) updates.isAvailable = isAvailable;

  await db.update(shopItemsTable).set(updates).where(eq(shopItemsTable.id, itemId));
  res.json({ ok: true });
});

router.delete("/shop/:id", requireAuth("admin"), async (req: Request, res: Response): Promise<void> => {
  const itemId = parseInt(req.params.id);
  await db.delete(shopItemsTable).where(eq(shopItemsTable.id, itemId));
  res.json({ ok: true });
});

// ─── İSTATİSTİKLER ────────────────────────────────────────────────────────────
router.get("/stats", requireAuth("student"), async (_req: Request, res: Response): Promise<void> => {
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
