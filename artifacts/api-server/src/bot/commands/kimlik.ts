import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, charactersTable, finesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, houseColor, houseEmoji, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("kimlik")
  .setDescription("Bakanlık kimlik kartını görüntüle")
  .addUserOption(opt => opt.setName("kullanici").setDescription("Başka bir kullanıcının kimliğini gör").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("kullanici") ?? interaction.user;
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, target.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Bu kullanıcının kayıtlı karakteri bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  const fines = await db.select().from(finesTable).where(and(eq(finesTable.discordId, target.id), eq(finesTable.isPaid, "false")));
  const totalFine = fines.reduce((s, f) => s + f.amount, 0);

  const wandInfo = char.wandWood
    ? `${char.wandWood}, ${char.wandCore}, ${char.wandLength}, ${char.wandFlexibility} (Dayanıklılık: ${char.wandDurability}/100)`
    : "Asa bilgisi yok";

  const embed = createEmbed(
    `🪄 Bakanlık Kimlik Kartı — ${char.oocName}`,
    [
      `**OOC İsim/Yaş:** ${char.oocName} | ${char.oocAge}`,
      `**IC İsim:** ${char.icName ?? "Belirlenmemiş"}`,
      `**Sınıf Yılı:** ${char.classYear}. Yıl`,
      `**Kan Durumu:** ${char.bloodStatus}`,
      `**Cinsiyet:** ${char.gender}`,
      `**Bina:** ${char.house ? `${houseEmoji(char.house)} ${char.house}` : "Belirlenmemiş"}`,
      `**Cüzdan:** ${char.walletGalleons} Galleon 💰`,
      `**Gringotts Kasası:** ${char.bankGalleons} Galleon 🏦`,
      `**Asa:** ${wandInfo}`,
      `**Seviye:** ${char.level} (${char.xp} XP) ⭐`,
      char.isAzkaban ? `**⛓️ AZKABAN'DA**` : "",
      totalFine > 0 ? `**Aktif Ceza:** ${totalFine} Galleon ⚖️` : "",
      char.isWanted ? `**🚨 ARANMAKTADIR**` : "",
    ].filter(Boolean).join("\n"),
    houseColor(char.house),
    "Sihir Bakanlığı Kimlik Sistemi"
  );

  embed.setThumbnail(target.displayAvatarURL());
  await interaction.reply({ embeds: [embed] });
}
