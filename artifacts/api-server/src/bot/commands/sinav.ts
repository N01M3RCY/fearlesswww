import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, examsTable, examResultsTable, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

export const data = new SlashCommandBuilder()
  .setName("sinav")
  .setDescription("Sınav yönetimi")
  .addSubcommand(sub =>
    sub.setName("baslat").setDescription("Sınav başlat (Profesör)")
      .addStringOption(opt => opt.setName("ders").setDescription("Ders adı").setRequired(true))
      .addIntegerOption(opt =>
        opt.setName("yil").setDescription("Sınıf yılı").setRequired(true)
          .addChoices(
            { name: "1. Yıl", value: 1 }, { name: "2. Yıl", value: 2 },
            { name: "3. Yıl", value: 3 }, { name: "4. Yıl", value: 4 },
            { name: "5. Yıl", value: 5 }, { name: "6. Yıl", value: 6 },
            { name: "7. Yıl", value: 7 },
          )
      )
      .addStringOption(opt =>
        opt.setName("tur").setDescription("Sınav türü").setRequired(true)
          .addChoices({ name: "Vize", value: "vize" }, { name: "Final", value: "final" })
      )
  )
  .addSubcommand(sub =>
    sub.setName("bitir").setDescription("Sınav bitir (Profesör)")
      .addIntegerOption(opt => opt.setName("sinav_id").setDescription("Sınav ID'si").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("notlandir").setDescription("Öğrenci notlandır (Profesör)")
      .addIntegerOption(opt => opt.setName("sinav_id").setDescription("Sınav ID'si").setRequired(true))
      .addUserOption(opt => opt.setName("ogrenci").setDescription("Notlandırılacak öğrenci").setRequired(true))
      .addIntegerOption(opt => opt.setName("puan").setDescription("Puan (0-100)").setRequired(true).setMinValue(0).setMaxValue(100))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasProfRole = member?.roles.cache.some(r => r.name === CONFIG.roles.professor);

  if (!hasProfRole) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Profesör** rolü gerekli.", COLORS.error)], ephemeral: true });
    return;
  }

  if (sub === "baslat") {
    const subject = interaction.options.getString("ders", true);
    const classYear = interaction.options.getInteger("yil", true);
    const type = interaction.options.getString("tur", true);

    const [exam] = await db.insert(examsTable).values({
      professorDiscordId: interaction.user.id,
      subject,
      classYear,
      type,
      isActive: true,
      startedAt: new Date(),
    }).returning();

    await interaction.reply({
      embeds: [createEmbed(
        "📝 Sınav Başlatıldı!",
        `**${subject}** (${type.toUpperCase()}) sınavı **${classYear}. Yıl** öğrencileri için başlatıldı!\n*Sınav ID: ${exam.id}*`,
        COLORS.error
      )]
    });
    return;
  }

  if (sub === "bitir") {
    const examId = interaction.options.getInteger("sinav_id", true);
    const [exam] = await db.select().from(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.isActive, true)));

    if (!exam) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Aktif sınav bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }

    await db.update(examsTable).set({ isActive: false, endedAt: new Date() }).where(eq(examsTable.id, examId));
    await interaction.reply({ embeds: [createEmbed("✅ Sınav Bitirildi", `**${exam.subject}** sınavı sona erdirildi.`, COLORS.success)] });
    return;
  }

  if (sub === "notlandir") {
    const examId = interaction.options.getInteger("sinav_id", true);
    const student = interaction.options.getUser("ogrenci", true);
    const score = interaction.options.getInteger("puan", true);
    const isPassed = score >= 50;

    const existing = await db.select().from(examResultsTable).where(
      and(eq(examResultsTable.examId, examId), eq(examResultsTable.discordId, student.id))
    );

    if (existing.length) {
      await db.update(examResultsTable).set({ score, isPassed, gradedAt: new Date() }).where(
        and(eq(examResultsTable.examId, examId), eq(examResultsTable.discordId, student.id))
      );
    } else {
      await db.insert(examResultsTable).values({ discordId: student.id, examId, score, isPassed, gradedAt: new Date() });
    }

    const status = isPassed ? "✅ Geçti" : "❌ Kaldı";
    await interaction.reply({
      embeds: [createEmbed("📊 Not Girildi", `**${student.displayName}** — Puan: **${score}/100** — ${status}`, COLORS.info)],
      ephemeral: true
    });

    try {
      const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
      await student.send({
        embeds: [createEmbed(
          `📊 Sınav Sonucun — ${exam?.subject ?? "?"}`,
          `Puanın: **${score}/100**\nSonuç: ${status}`,
          isPassed ? COLORS.success : COLORS.error,
          "Hogwarts Akademi Kayıt Ofisi"
        )]
      });
    } catch {}
  }
}
