import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder
} from "discord.js";
import { db, characterIntroTable, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, houseEmoji, houseColor, COLORS } from "../embed";
import { CONFIG } from "../config";

export const data = new SlashCommandBuilder()
  .setName("karakter-tanitim")
  .setDescription("IC karakter tanıtım başvurusu yap");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Önce Seçmen Şapkası töreniyle karakterini oluşturman gerekiyor.", COLORS.error)], ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("karakter_tanitim_modal")
    .setTitle("Karakter Tanıtım Başvurusu");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("ic_name")
        .setLabel("IC Karakterin Adı")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("ic_age")
        .setLabel("IC Karakterin Yaşı")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3)
        .setPlaceholder("Örn: 14")
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("ic_story")
        .setLabel("Karakter Hikayesi")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(100)
        .setMaxLength(2000)
        .setPlaceholder("Karakterinin geçmişi, kişiliği ve Hogwarts macerasının başlangıcı...")
    )
  );

  await interaction.showModal(modal);
}

export async function handleModal(interaction: any): Promise<void> {
  if (interaction.customId !== "karakter_tanitim_modal") return;

  const icName = interaction.fields.getTextInputValue("ic_name");
  const icAgeStr = interaction.fields.getTextInputValue("ic_age");
  const icStory = interaction.fields.getTextInputValue("ic_story");

  const icAge = parseInt(icAgeStr, 10);
  if (isNaN(icAge) || icAge < 1 || icAge > 120) {
    await interaction.reply({ content: "❌ Geçersiz yaş değeri. 1-120 arasında bir sayı girin.", ephemeral: true });
    return;
  }

  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
  if (!char) {
    await interaction.reply({ content: "❌ Kayıtlı karakterin bulunamadı.", ephemeral: true });
    return;
  }

  const [intro] = await db.insert(characterIntroTable).values({
    discordId: interaction.user.id,
    icName,
    icAge,
    icStory,
    status: "beklemede",
  }).returning();

  // Onay kanalına gönder
  const guild = interaction.guild;
  const appChannelId = CONFIG.channels.applications;
  if (appChannelId && guild) {
    const ch = guild.channels.cache.get(appChannelId);
    if (ch?.isTextBased()) {
      const reviewEmbed = createEmbed(
        `📜 Karakter Tanıtım Başvurusu #${intro.id}`,
        [
          `**Başvuru Sahibi:** ${interaction.user.displayName} (<@${interaction.user.id}>)`,
          `**OOC:** ${char.oocName} | ${char.oocAge}`,
          `**Bina:** ${char.house ? `${houseEmoji(char.house)} ${char.house}` : "Belirsiz"}`,
          `**Kan Durumu:** ${char.bloodStatus}`,
          "",
          `**IC İsim:** ${icName}`,
          `**IC Yaş:** ${icAge}`,
          "",
          `**Hikaye:**\n${icStory}`,
        ].join("\n"),
        houseColor(char.house),
        `Başvuru ID: ${intro.id}`
      );

      const approveRow = new ActionRowBuilder<any>().addComponents(
        new (await import("discord.js")).ButtonBuilder()
          .setCustomId(`intro_approve_${intro.id}`)
          .setLabel("✅ Onayla")
          .setStyle(2),
        new (await import("discord.js")).ButtonBuilder()
          .setCustomId(`intro_reject_${intro.id}`)
          .setLabel("❌ Reddet")
          .setStyle(4),
      );

      await (ch as any).send({ embeds: [reviewEmbed], components: [approveRow] });
    }
  }

  await interaction.reply({
    embeds: [createEmbed(
      "📬 Başvurun Alındı",
      "Karakter tanıtım başvurun inceleme kuyruğuna alındı! Yönetim ekibi inceledikten sonra sana bilgi verilecek.",
      COLORS.success
    )],
    ephemeral: true
  });
}
