import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, owlMailTable, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

function getDeliveryMinutes(fromHouse: string | null | undefined, toHouse: string | null | undefined): number {
  if (!fromHouse || !toHouse || fromHouse === toHouse) return 5;
  return 15;
}

export const data = new SlashCommandBuilder()
  .setName("baykus")
  .setDescription("Baykuş postasıyla mektup gönder")
  .addUserOption(opt => opt.setName("alici").setDescription("Mektubu alacak kişi").setRequired(true))
  .addStringOption(opt => opt.setName("mesaj").setDescription("Mektubun içeriği").setRequired(true).setMaxLength(1000));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("alici", true);
  const message = interaction.options.getString("mesaj", true);

  if (target.id === interaction.user.id) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kendinize mektup gönderemezsiniz!", COLORS.error)], ephemeral: true });
    return;
  }

  const [fromChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
  const [toChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, target.id));

  if (!fromChar) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  const delayMinutes = getDeliveryMinutes(fromChar.house, toChar?.house);
  const deliverAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  await db.insert(owlMailTable).values({
    fromDiscordId: interaction.user.id,
    toDiscordId: target.id,
    message,
    deliverAt,
    isDelivered: false,
  });

  await interaction.reply({
    embeds: [createEmbed(
      "🦉 Mektup Gönderildi!",
      [
        `**Alıcı:** ${target.displayName}`,
        `**Tahmini Teslimat:** ~${delayMinutes} dakika`,
        `**Teslimat Zamanı:** <t:${Math.floor(deliverAt.getTime() / 1000)}:R>`,
        "",
        `Baykuşun yola çıktı! 🦉`,
      ].join("\n"),
      COLORS.info
    )],
    ephemeral: true
  });
}
