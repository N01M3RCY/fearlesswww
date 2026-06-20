import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, charactersTable, skillsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, houseColor, houseEmoji, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("profil")
  .setDescription("Karakter profilini görüntüle")
  .addUserOption(opt => opt.setName("kullanici").setDescription("Başkasının profilini gör").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("kullanici") ?? interaction.user;
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, target.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakter bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  let [skills] = await db.select().from(skillsTable).where(eq(skillsTable.discordId, target.id));

  const xpForNext = char.level * 100;
  const xpBar = Math.round((char.xp / xpForNext) * 10);
  const progressBar = "█".repeat(xpBar) + "░".repeat(Math.max(0, 10 - xpBar));

  const skillLines = skills ? [
    `✨ Tılsım: ${skills["tılsım"]}/10`,
    `🦊 Biçim Değ.: ${skills.bicimDegistirme}/10`,
    `🛡️ KSKS: ${skills.ksks}/10`,
    `⚗️ İksir: ${skills.iksir}/10`,
    `🧹 Quidditch: ${skills.quidditch}/10`,
    `🧠 Zihnefend: ${skills.zihnefend}/10`,
    `💜 Zihnebend: ${skills.zihnebend}/10`,
  ].join(" | ") : "Henüz yetenek puanı harcanmamış";

  const embed = createEmbed(
    `${houseEmoji(char.house)} ${char.icName ?? char.oocName} — Profil`,
    [
      `**OOC İsim:** ${char.oocName} | ${char.oocAge}`,
      char.icName ? `**IC İsim:** ${char.icName} | ${char.icAge ?? "?"}` : "",
      `**Bina:** ${char.house ? `${houseEmoji(char.house)} ${char.house}` : "Belirlenmemiş"}`,
      `**Kan Durumu:** ${char.bloodStatus} | ${char.gender}`,
      `**Sınıf Yılı:** ${char.classYear}. Yıl`,
      "",
      `**⭐ Seviye:** ${char.level} | **XP:** ${char.xp}/${xpForNext}`,
      `\`${progressBar}\``,
      `💡 Yetenek Puanı: ${char.skillPoints}`,
      "",
      `**💰 Cüzdan:** ${char.walletGalleons} Galleon | **🏦 Kasa:** ${char.bankGalleons} Galleon`,
      char.wandWood ? `**🪄 Asa:** ${char.wandWood}, ${char.wandCore}` : "",
      char.isWanted ? "\n**🚨 ARANMAKTADIR**" : "",
      char.isAzkaban ? "\n**⛓️ AZKABAN'DA**" : "",
      char.icStory && char.icStoryApproved ? `\n**Hikaye:** ${char.icStory.substring(0, 200)}${char.icStory.length > 200 ? "..." : ""}` : "",
    ].filter(Boolean).join("\n"),
    houseColor(char.house),
    "Fearless Wizarding World"
  );

  embed.setThumbnail(target.displayAvatarURL());
  await interaction.reply({ embeds: [embed] });
}
