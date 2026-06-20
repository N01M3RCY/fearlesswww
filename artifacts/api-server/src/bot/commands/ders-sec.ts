import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, lessonsTable, lessonEnrollmentsTable, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("ders-sec")
  .setDescription("Derse kayıt ol")
  .addIntegerOption(opt => opt.setName("ders_id").setDescription("Ders ID'si (/akademi ile görebilirsin)").setRequired(true).setMinValue(1));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const lessonId = interaction.options.getInteger("ders_id", true);
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Ders bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  if (lesson.classYear > char.classYear) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Seviye", `Bu ders **${lesson.classYear}. Yıl** için. Sen şu an **${char.classYear}. Yıl**sın.`, COLORS.error)], ephemeral: true });
    return;
  }

  const [existing] = await db.select().from(lessonEnrollmentsTable).where(
    and(eq(lessonEnrollmentsTable.discordId, interaction.user.id), eq(lessonEnrollmentsTable.lessonId, lessonId))
  );

  if (existing) {
    await interaction.reply({ embeds: [createEmbed("ℹ️ Zaten Kayıtlı", `**${lesson.subject}** dersine zaten kayıtlısın.`, COLORS.warning)], ephemeral: true });
    return;
  }

  await db.insert(lessonEnrollmentsTable).values({ discordId: interaction.user.id, lessonId });

  await interaction.reply({
    embeds: [createEmbed("✅ Ders Kaydı Başarılı", `**${lesson.subject}** (${lesson.classYear}. Yıl) dersine başarıyla kayıt oldun!`, COLORS.success)],
    ephemeral: true
  });
}
