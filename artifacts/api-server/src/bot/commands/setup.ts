import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel
} from "discord.js";
import { db, houseCupTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, houseEmoji, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Bot kurulum komutları (Yönetici)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName("secmen-sapka")
      .setDescription("Bu kanala Seçmen Şapkası başvuru butonunu gönder")
  )
  .addSubcommand(sub =>
    sub.setName("puan-tablosu")
      .setDescription("Bu kanala canlı bina kupası sıralaması gönder")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const ch = interaction.channel as TextChannel | null;

  if (sub === "secmen-sapka") {
    const embed = createEmbed(
      "🎩 Seçmen Şapkası Töreni",
      [
        "**Hogwarts'a Hoş Geldin, Büyücü!**",
        "",
        "Binana kabul edilmek için Seçmen Şapkası törenine katılmalısın.",
        "Şapka seni sorgulayacak ve ruhuna en uygun binayı belirleyecek.",
        "",
        "**Başvuru Aşamaları:**",
        "1️⃣ OOC bilgilerini gir (isim, yaş)",
        "2️⃣ Şapkanın sorularını yanıtla (12 soru, 3 adımda)",
        "3️⃣ IC bilgilerini belirt (kan durumu, cinsiyet)",
        "4️⃣ Yönetim ekibi başvurunu onaylar",
        "5️⃣ Binana kabul edilirsin! 🎉",
        "",
        "⬇️ **Aşağıdaki butona tıklayarak başlayabilirsin:**",
      ].join("\n"),
      COLORS.gold,
      "Fearless Wizarding World"
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("sorting_hat_start")
        .setLabel("🎩 Seçmen Şapkasını Dene!")
        .setStyle(ButtonStyle.Primary)
    );

    await ch?.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Seçmen Şapkası mesajı gönderildi!", ephemeral: true });
    return;
  }

  if (sub === "puan-tablosu") {
    const HOUSES = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];

    for (const house of HOUSES) {
      const [existing] = await db.select().from(houseCupTable).where(eq(houseCupTable.house, house));
      if (!existing) {
        await db.insert(houseCupTable).values({ house, points: 0 });
      }
    }

    const cups = await db.select().from(houseCupTable);
    cups.sort((a, b) => b.points - a.points);
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];

    const lines = cups.map((c, i) =>
      `${medals[i]} **${houseEmoji(c.house)} ${c.house}** — ${c.points} Puan`
    );

    const embed = createEmbed(
      "🏆 Bina Kupası Sıralaması",
      lines.join("\n"),
      COLORS.gold,
      "Güncelleme: /puan ver veya /puan al komutuyla"
    );

    await ch?.send({ embeds: [embed] });
    await interaction.reply({ content: "✅ Bina kupası tablosu gönderildi!", ephemeral: true });
  }
}
