import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, shopItemsTable, inventoryTable, charactersTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("satin-al")
  .setDescription("Dükkandan ürün satın al")
  .addIntegerOption(opt => opt.setName("urun_id").setDescription("Satın alınacak ürünün ID'si").setRequired(true).setMinValue(1));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const itemId = interaction.options.getInteger("urun_id", true);
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  const [item] = await db.select().from(shopItemsTable).where(and(eq(shopItemsTable.id, itemId), eq(shopItemsTable.isAvailable, true)));
  if (!item) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Ürün bulunamadı veya stokta yok.", COLORS.error)], ephemeral: true });
    return;
  }

  if (char.classYear < item.minClassYear) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Seviye", `Bu ürünü satın alabilmek için en az **${item.minClassYear}. Sınıf** olman gerekiyor. Sen şu an **${char.classYear}. Sınıf**sın.`, COLORS.error)], ephemeral: true });
    return;
  }

  if (char.walletGalleons < item.price) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Galleon", `Bu ürün **${item.price} Galleon**. Cüzdanında **${char.walletGalleons} Galleon** var.`, COLORS.error)], ephemeral: true });
    return;
  }

  await db.update(charactersTable).set({ walletGalleons: char.walletGalleons - item.price }).where(eq(charactersTable.discordId, interaction.user.id));
  await db.insert(inventoryTable).values({ discordId: interaction.user.id, itemId: item.id, quantity: 1 });
  await db.insert(transactionsTable).values({ fromDiscordId: interaction.user.id, toDiscordId: "SHOP", amount: item.price, type: "purchase", description: `Satın alma: ${item.name}` });

  await interaction.reply({
    embeds: [createEmbed("✅ Satın Alma Başarılı", `**${item.name}** başarıyla satın aldın!\n💰 Kalan bakiyen: **${char.walletGalleons - item.price} Galleon**`, COLORS.success)],
    ephemeral: true
  });
}
