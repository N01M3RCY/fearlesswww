import { GuildMember, PartialGuildMember } from "discord.js";
import { db, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

export async function handleMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
): Promise<void> {
  const hadWarn3 = oldMember.roles.cache?.some(r => r.name === CONFIG.roles.warn3);
  const hasWarn3 = newMember.roles.cache.some(r => r.name === CONFIG.roles.warn3);

  if (!hadWarn3 && hasWarn3) {
    await activateAzkaban(newMember);
  }
}

async function activateAzkaban(member: GuildMember): Promise<void> {
  const guild = member.guild;
  const azkabanRoleName = CONFIG.roles.azkaban;

  // Mevcut rolleri kaydet (Azkaban ve warn3 hariç)
  const rolesToSave = member.roles.cache
    .filter(r => r.name !== azkabanRoleName && r.name !== "@everyone" && r.name !== CONFIG.roles.warn3)
    .map(r => r.id);

  // DB'de karakteri güncelle
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, member.id));
  const azkabanUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

  await db.update(charactersTable).set({
    isAzkaban: true,
    azkabanUntil,
    savedRoles: rolesToSave,
    warnCount: (char?.warnCount ?? 0) + 1,
  }).where(eq(charactersTable.discordId, member.id));

  // Tüm önemli rolleri al
  const rolesToRemove = member.roles.cache.filter(r =>
    r.name !== "@everyone" && r.name !== CONFIG.roles.warn3
  );

  for (const [, role] of rolesToRemove) {
    await member.roles.remove(role).catch(() => {});
  }

  // Azkaban rolü ver
  const azkabanRole = guild.roles.cache.find(r => r.name === azkabanRoleName);
  if (azkabanRole) await member.roles.add(azkabanRole).catch(() => {});

  // Takma adı güncelle
  await member.setNickname("⛓️ Azkaban Mahkumu").catch(() => {});

  // DM gönder
  try {
    await member.user.send({
      embeds: [createEmbed(
        "⛓️ Azkaban'a Gönderildin!",
        [
          "3 uyarı sınırını aştığın için **Azkaban**'a gönderildin.",
          "",
          `⏰ **Tahliye Zamanı:** <t:${Math.floor(azkabanUntil.getTime() / 1000)}:R>`,
          "",
          "24 saat sonra otomatik olarak tahliye edileceksin.",
        ].join("\n"),
        COLORS.azkaban
      )]
    });
  } catch {}

  // 24 saat sonra otomatik tahliye
  setTimeout(async () => {
    await releaseAzkaban(member, guild);
  }, 24 * 60 * 60 * 1000);
}

async function releaseAzkaban(member: GuildMember, guild: any): Promise<void> {
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, member.id));
  if (!char?.isAzkaban) return;

  // Azkaban rolünü kaldır
  const azkabanRole = guild.roles.cache.find((r: any) => r.name === CONFIG.roles.azkaban);
  if (azkabanRole) await member.roles.remove(azkabanRole).catch(() => {});

  // Kayıtlı rolleri geri ver
  if (char.savedRoles) {
    for (const roleId of char.savedRoles) {
      const role = guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }
  }

  await db.update(charactersTable).set({
    isAzkaban: false,
    azkabanUntil: null,
    savedRoles: null,
  }).where(eq(charactersTable.discordId, member.id));

  // Takma adı geri yükle
  await member.setNickname(`${char.oocName} | ${char.oocAge}`).catch(() => {});

  try {
    await member.user.send({
      embeds: [createEmbed(
        "🕊️ Azkaban'dan Tahliye Edildin",
        "Azkaban ceza süren sona erdi. Özgürsün! Bir daha bu hatayı yapmaman dileğiyle... 👁️",
        COLORS.success
      )]
    });
  } catch {}
}
