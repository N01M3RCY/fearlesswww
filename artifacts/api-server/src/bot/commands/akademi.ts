import {
  SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from "discord.js";
import { db, lessonsTable, lessonEnrollmentsTable, examsTable, examResultsTable, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("akademi")
  .setDescription("Hogwarts akademi portalı — dersler, sınavlar ve transkript");

function mainRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ak_dersler").setLabel("📚 Ders Seç").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ak_aktif_sinav").setLabel("📝 Aktif Sınavlar").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ak_eski_sinav").setLabel("📋 Eski Sınavlar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ak_transkript").setLabel("🎓 Transkript").setStyle(ButtonStyle.Success),
  );
}

function backRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ak_back").setLabel("← Ana Menü").setStyle(ButtonStyle.Secondary)
  );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({
      embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı. Önce Seçmen Şapkası törenine katıl!", COLORS.error)],
      ephemeral: true
    });
    return;
  }

  const mainEmbed = () => createEmbed(
    "🏫 Hogwarts Akademi Portalı",
    [
      `**Öğrenci:** ${char.oocName}`,
      `**Sınıf Yılı:** ${char.classYear}. Yıl`,
      "",
      "Aşağıdan yapmak istediğin işlemi seç:",
      "📚 **Ders Seç** — Sınıfına uygun dersleri gör, kayıt ol veya bırak",
      "📝 **Aktif Sınavlar** — Şu an açık olan sınavlar",
      "📋 **Eski Sınavlar** — Geçmiş sınav sonuçların",
      "🎓 **Transkript** — Tüm akademik geçmişin",
    ].join("\n"),
    COLORS.info
  );

  const msg = await interaction.reply({
    embeds: [mainEmbed()],
    components: [mainRow()],
    ephemeral: true,
    fetchReply: true
  });

  const collector = msg.createMessageComponentCollector({
    time: 10 * 60 * 1000,
    filter: i => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btnInt) => {
    if (btnInt.customId === "ak_back") {
      await btnInt.update({ embeds: [mainEmbed()], components: [mainRow()] });
      return;
    }

    if (btnInt.customId === "ak_dersler") {
      await btnInt.deferUpdate();

      const allLessons = await db.select().from(lessonsTable);
      const enrollments = await db.select().from(lessonEnrollmentsTable)
        .where(eq(lessonEnrollmentsTable.discordId, interaction.user.id));
      const enrolledIds = new Set(enrollments.map(e => e.lessonId));

      // Yıla göre grupla
      const byYear: Record<number, typeof allLessons> = {};
      for (const l of allLessons) {
        if (!byYear[l.classYear]) byYear[l.classYear] = [];
        byYear[l.classYear].push(l);
      }

      const lines: string[] = [];
      const enrollable: { label: string; value: string }[] = [];
      const unenrollable: { label: string; value: string }[] = [];

      for (let y = 1; y <= 7; y++) {
        const yLessons = byYear[y] ?? [];
        if (!yLessons.length) continue;
        const blocked = y > char.classYear;
        lines.push(`\n**${y}. Yıl${blocked ? " 🔒" : ""}:**`);
        for (const l of yLessons) {
          const enrolled = enrolledIds.has(l.id);
          if (blocked) {
            lines.push(`  • ${l.subject} _(Sınıf yılın yetersiz)_`);
          } else if (enrolled) {
            lines.push(`  • ✅ ${l.subject} _(Kayıtlısın)_`);
            unenrollable.push({ label: `❌ ${l.subject} kaydını bırak`, value: `leave_${l.id}` });
          } else {
            lines.push(`  • ${l.subject}`);
            enrollable.push({ label: `📚 ${l.subject} (${y}. Yıl)`, value: `join_${l.id}` });
          }
        }
      }

      const components: any[] = [backRow()];

      const allOptions = [...enrollable, ...unenrollable];
      if (allOptions.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("ak_ders_sec")
          .setPlaceholder("Kayıt olmak/bırakmak için ders seç...")
          .addOptions(allOptions.slice(0, 25));

        components.unshift(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
      }

      await btnInt.editReply({
        embeds: [createEmbed(
          "📚 Ders Listesi",
          lines.join("\n") || "Henüz hiç ders oluşturulmamış.",
          COLORS.info,
          `Sınıf yılın: ${char.classYear} — Aşağıdan ders seçebilirsin`
        )],
        components,
      });
      return;
    }

    if (btnInt.customId === "ak_ders_sec") {
      const selectInt = btnInt as StringSelectMenuInteraction;
      await selectInt.deferUpdate();
      const value = selectInt.values[0];
      const isLeave = value.startsWith("leave_");
      const lessonId = parseInt(value.replace(/^(join_|leave_)/, ""), 10);
      const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));

      if (!lesson) {
        await selectInt.followUp({ content: "❌ Ders bulunamadı.", ephemeral: true });
        return;
      }

      if (isLeave) {
        await db.delete(lessonEnrollmentsTable).where(
          and(eq(lessonEnrollmentsTable.discordId, interaction.user.id), eq(lessonEnrollmentsTable.lessonId, lessonId))
        );
        await selectInt.followUp({
          embeds: [createEmbed("✅ Ders Bırakıldı", `**${lesson.subject}** dersinden kaydın silindi.`, COLORS.warning)],
          ephemeral: true
        });
      } else {
        const [existing] = await db.select().from(lessonEnrollmentsTable).where(
          and(eq(lessonEnrollmentsTable.discordId, interaction.user.id), eq(lessonEnrollmentsTable.lessonId, lessonId))
        );
        if (existing) {
          await selectInt.followUp({ content: "ℹ️ Bu derse zaten kayıtlısın.", ephemeral: true });
          return;
        }
        await db.insert(lessonEnrollmentsTable).values({ discordId: interaction.user.id, lessonId });
        await selectInt.followUp({
          embeds: [createEmbed("✅ Ders Kaydı Tamam!", `**${lesson.subject}** (${lesson.classYear}. Yıl) dersine başarıyla kayıt oldun!`, COLORS.success)],
          ephemeral: true
        });
      }
      return;
    }

    if (btnInt.customId === "ak_aktif_sinav") {
      await btnInt.deferUpdate();
      const activeExams = await db.select().from(examsTable).where(eq(examsTable.isActive, true));
      const myExams = activeExams.filter(e => e.classYear <= char.classYear);

      if (!myExams.length) {
        await btnInt.editReply({
          embeds: [createEmbed("📝 Aktif Sınavlar", "Şu an sınıfına uygun aktif sınav bulunmuyor.", COLORS.warning)],
          components: [backRow()]
        });
        return;
      }

      const lines = myExams.map(e =>
        `**${e.subject}** — ${e.type.toUpperCase()} | ${e.classYear}. Yıl\n_Başladı: <t:${Math.floor(new Date(e.startedAt!).getTime() / 1000)}:R>_`
      );

      await btnInt.editReply({
        embeds: [createEmbed("📝 Aktif Sınavlar", lines.join("\n\n"), COLORS.error, "Sınava girmek için profesörünle iletişime geç")],
        components: [backRow()]
      });
      return;
    }

    if (btnInt.customId === "ak_eski_sinav") {
      await btnInt.deferUpdate();
      const myResults = await db.select().from(examResultsTable)
        .where(eq(examResultsTable.discordId, interaction.user.id));

      if (!myResults.length) {
        await btnInt.editReply({
          embeds: [createEmbed("📋 Eski Sınavlar", "Henüz tamamlanmış sınav sonucun yok.", COLORS.info)],
          components: [backRow()]
        });
        return;
      }

      const allExams = await db.select().from(examsTable);
      const examMap = new Map(allExams.map(e => [e.id, e]));
      const lines = myResults.map(r => {
        const exam = examMap.get(r.examId);
        const status = r.isPassed === true ? "✅ Geçti" : r.isPassed === false ? "❌ Kaldı" : "⏳ Bekliyor";
        return `**${exam?.subject ?? "?"}** (${exam?.type?.toUpperCase() ?? "?"}) — ${status}${r.score != null ? ` | **${r.score}/100**` : ""}`;
      });

      await btnInt.editReply({
        embeds: [createEmbed("📋 Geçmiş Sınav Sonuçları", lines.join("\n"), COLORS.info)],
        components: [backRow()]
      });
      return;
    }

    if (btnInt.customId === "ak_transkript") {
      await btnInt.deferUpdate();
      const myResults = await db.select().from(examResultsTable)
        .where(eq(examResultsTable.discordId, interaction.user.id));
      const allExams = await db.select().from(examsTable);
      const examMap = new Map(allExams.map(e => [e.id, e]));
      const enrollments = await db.select().from(lessonEnrollmentsTable)
        .where(eq(lessonEnrollmentsTable.discordId, interaction.user.id));

      const passed = myResults.filter(r => r.isPassed === true).length;
      const failed = myResults.filter(r => r.isPassed === false).length;

      const lines: string[] = [
        `**${char.oocName}** — ${char.classYear}. Yıl`,
        `📚 Kayıtlı Ders: **${enrollments.length}** | ✅ Geçilen: **${passed}** | ❌ Kalınan: **${failed}**`,
        "",
        "**── Sınıf Yılı Bazında Sonuçlar ──**",
      ];

      for (let y = 1; y <= char.classYear; y++) {
        const yr = myResults.filter(r => examMap.get(r.examId)?.classYear === y);
        if (!yr.length) continue;
        lines.push(`\n**${y}. Yıl:**`);
        for (const r of yr) {
          const exam = examMap.get(r.examId);
          const icon = r.isPassed === true ? "✅" : r.isPassed === false ? "❌" : "⏳";
          lines.push(`${icon} ${exam?.subject ?? "?"} (${exam?.type?.toUpperCase() ?? "?"})${r.score != null ? ` — ${r.score}/100` : ""}`);
        }
      }

      if (lines.length <= 4) lines.push("Henüz sınav sonucu bulunmuyor.");

      await btnInt.editReply({
        embeds: [createEmbed("🎓 Akademik Transkript", lines.join("\n"), COLORS.success, "Hogwarts Akademik Kayıt Ofisi")],
        components: [backRow()]
      });
    }
  });

  collector.on("end", async () => {
    try {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("ak_dersler").setLabel("📚 Ders Seç").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("ak_aktif_sinav").setLabel("📝 Aktif Sınavlar").setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId("ak_eski_sinav").setLabel("📋 Eski Sınavlar").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("ak_transkript").setLabel("🎓 Transkript").setStyle(ButtonStyle.Success).setDisabled(true),
      );
      await interaction.editReply({ components: [disabledRow] });
    } catch {}
  });
}
