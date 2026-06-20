import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { db, lessonsTable } from "@workspace/db";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

export const data = new SlashCommandBuilder()
  .setName("ders-ac")
  .setDescription("Canlı ders aç (Profesör yetkisi gerekli)")
  .addStringOption(opt => opt.setName("ders").setDescription("Dersin adı").setRequired(true))
  .addIntegerOption(opt =>
    opt.setName("yil").setDescription("Hedef sınıf yılı").setRequired(true)
      .addChoices(
        { name: "1. Yıl", value: 1 }, { name: "2. Yıl", value: 2 },
        { name: "3. Yıl", value: 3 }, { name: "4. Yıl", value: 4 },
        { name: "5. Yıl", value: 5 }, { name: "6. Yıl", value: 6 },
        { name: "7. Yıl", value: 7 },
      )
  )
  .addStringOption(opt => opt.setName("aciklama").setDescription("Ders açıklaması").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasProfRole = member?.roles.cache.some(r => r.name === CONFIG.roles.professor);

  if (!hasProfRole) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Profesör** rolüne ihtiyacın var.", COLORS.error)], ephemeral: true });
    return;
  }

  const subject = interaction.options.getString("ders", true);
  const classYear = interaction.options.getInteger("yil", true);
  const description = interaction.options.getString("aciklama");

  const [lesson] = await db.insert(lessonsTable).values({
    professorDiscordId: interaction.user.id,
    subject,
    classYear,
    description,
    isLive: true,
    channelId: interaction.channelId,
  }).returning();

  const embed = createEmbed(
    "📣 Canlı Ders Açıldı!",
    [
      `**Ders:** ${subject}`,
      `**Hedef Sınıf:** ${classYear}. Yıl`,
      `**Profesör:** ${interaction.user.displayName}`,
      description ? `**Açıklama:** ${description}` : "",
      "",
      `*Ders ID: ${lesson.id} — /ders-sec [${lesson.id}] ile kayıt olabilirsin*`,
    ].filter(Boolean).join("\n"),
    COLORS.info
  );

  await interaction.reply({ embeds: [embed] });

  // Duyuru kanalına bildir
  if (CONFIG.channels.announcements) {
    const ch = interaction.guild?.channels.cache.get(CONFIG.channels.announcements);
    if (ch?.isTextBased()) {
      await (ch as any).send({ embeds: [embed] });
    }
  }
}
