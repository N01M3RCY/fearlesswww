import { Client } from "discord.js";
import { db, charactersTable, transactionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";
import { logger } from "../../lib/logger";

const SALARY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 saat

export function startSalaryLoop(client: Client): void {
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.get(CONFIG.guildId);
      if (!guild) return;

      await guild.members.fetch();
      const allChars = await db.select().from(charactersTable);

      for (const char of allChars) {
        const member = guild.members.cache.get(char.discordId);
        if (!member) continue;

        for (const [roleName, amount] of Object.entries(CONFIG.salaryRoles)) {
          const hasRole = member.roles.cache.some(r => r.name === roleName);
          if (!hasRole) continue;

          await db.update(charactersTable)
            .set({ walletGalleons: char.walletGalleons + amount })
            .where(eq(charactersTable.discordId, char.discordId));

          await db.insert(transactionsTable).values({
            fromDiscordId: "MINISTRY",
            toDiscordId: char.discordId,
            amount,
            type: "salary",
            description: `Maaş: ${roleName}`,
          });

          const receipt = createEmbed(
            "💼 Gringotts Maaş Makbuzu",
            [
              `**Rol:** ${roleName}`,
              `**Maaş:** ${amount} Galleon`,
              `💰 Yeni Cüzdan Bakiyesi: ${char.walletGalleons + amount} Galleon`,
            ].join("\n"),
            COLORS.gold,
            "Sihir Bakanlığı Maaş Sistemi"
          );

          try {
            const user = await client.users.fetch(char.discordId);
            await user.send({ embeds: [receipt] });
          } catch {}

          break; // Her karakter için tek maaş
        }
      }

      logger.info("Salary loop completed");
    } catch (err) {
      logger.error({ err }, "Salary loop error");
    }
  }, SALARY_INTERVAL_MS);
}

export function startOwlMailLoop(client: Client): void {
  setInterval(async () => {
    try {
      const { owlMailTable } = await import("@workspace/db");
      const { and, lte } = await import("drizzle-orm");
      const { eq } = await import("drizzle-orm");

      const pendingMails = await db.select().from(owlMailTable).where(
        and(
          eq(owlMailTable.isDelivered, false),
          lte(owlMailTable.deliverAt, new Date()),
        )
      );

      for (const mail of pendingMails) {
        try {
          const [fromChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, mail.fromDiscordId));
          const user = await client.users.fetch(mail.toDiscordId);

          await user.send({
            embeds: [createEmbed(
              "🦉 Yeni Baykuş Postası!",
              [
                `**Gönderen:** ${fromChar?.oocName ?? "Bilinmiyor"}`,
                "",
                `**Mesaj:**\n${mail.message}`,
              ].join("\n"),
              COLORS.info,
              `Gönderildi: <t:${Math.floor(new Date(mail.createdAt).getTime() / 1000)}:R>`
            )]
          });

          await db.update(owlMailTable).set({ isDelivered: true }).where(eq(owlMailTable.id, mail.id));
        } catch {}
      }
    } catch (err) {
      logger.error({ err }, "Owl mail loop error");
    }
  }, 30_000); // Her 30 saniye kontrol et
}
