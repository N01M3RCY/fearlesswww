import { VoiceState, Client } from "discord.js";
import { db, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CONFIG } from "../config";
import { createEmbed, COLORS } from "../embed";

// Ses kanalında aktif kullanıcıları takip et
const voiceUsers = new Map<string, NodeJS.Timeout>();

export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
  const userId = newState.member?.id ?? oldState.member?.id;
  if (!userId || newState.member?.user.bot) return;

  // Ses kanalına katıldı
  if (!oldState.channelId && newState.channelId) {
    startVoiceXP(userId);
    return;
  }

  // Ses kanalından ayrıldı
  if (oldState.channelId && !newState.channelId) {
    stopVoiceXP(userId);
    return;
  }
}

function startVoiceXP(userId: string): void {
  if (voiceUsers.has(userId)) return;

  const interval = setInterval(async () => {
    try {
      const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, userId));
      if (!char) return;

      const newXp = char.xp + CONFIG.xpPerMinute;
      const xpNeeded = CONFIG.levelFormula(char.level);

      if (newXp >= xpNeeded) {
        // Seviye atla!
        const newLevel = char.level + 1;
        await db.update(charactersTable).set({
          xp: newXp - xpNeeded,
          level: newLevel,
          skillPoints: char.skillPoints + 5,
        }).where(eq(charactersTable.discordId, userId));

        // DM tebrik
        try {
          const user = await (global as any).__discordClient?.users.fetch(userId);
          if (user) {
            await user.send({
              embeds: [createEmbed(
                "⭐ Seviye Atladın!",
                [
                  `Tebrikler **${char.oocName}**! Seviye **${newLevel}**'e ulaştın!`,
                  `🎁 **+5 Yetenek Puanı** kazandın! (/yetenek-agaci ile kullanabilirsin)`,
                  `💡 Toplam Yetenek Puanı: **${char.skillPoints + 5}**`,
                ].join("\n"),
                COLORS.gold
              )]
            });
          }
        } catch {}
      } else {
        await db.update(charactersTable).set({ xp: newXp }).where(eq(charactersTable.discordId, userId));
      }
    } catch {}
  }, 60_000); // Her dakika

  voiceUsers.set(userId, interval);
}

function stopVoiceXP(userId: string): void {
  const interval = voiceUsers.get(userId);
  if (interval) {
    clearInterval(interval);
    voiceUsers.delete(userId);
  }
}
