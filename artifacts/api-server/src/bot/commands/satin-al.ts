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

  const WAND_WOODS = ["Meşe", "Karaağaç", "Akasya", "Kayın", "Çam", "Kavak", "Yew", "Çınar", "Ardıç", "Kestane"];
  const WAND_CORES = ["Anka Kuşu Tüyü", "Ejderha Kalp Teli", "Tek Boynuz Yelesi", "Süstralar Kılı", "Veela Saçı"];
  const WAND_FLEXIBILITIES = ["Katı", "Oldukça Katı", "Orta", "Oldukça Esnek", "Esnek"];

  const isWand = item.category === "wand";
  const updates: any = { walletGalleons: char.walletGalleons - item.price };

  let wandDetails = "";
  if (isWand) {
    const randomWood = WAND_WOODS[Math.floor(Math.random() * WAND_WOODS.length)];
    const randomCore = WAND_CORES[Math.floor(Math.random() * WAND_CORES.length)];
    const randomFlex = WAND_FLEXIBILITIES[Math.floor(Math.random() * WAND_FLEXIBILITIES.length)];
    const randomLength = `${(9 + Math.random() * 5).toFixed(1)} inç`;

    updates.wandWood = randomWood;
    updates.wandCore = randomCore;
    updates.wandFlexibility = randomFlex;
    updates.wandLength = randomLength;
    updates.wandDurability = 100;

    wandDetails = `\n\n**🪄 Yeni Asanın Özellikleri:**\n• **Ağaç:** ${randomWood}\n• **Öz:** ${randomCore}\n• **Boy:** ${randomLength}\n• **Esneklik:** ${randomFlex}\n• **Dayanıklılık:** 100/100 ✨`;
  }

  await db.update(charactersTable).set(updates).where(eq(charactersTable.discordId, interaction.user.id));
  
  if (!isWand) {
    await db.insert(inventoryTable).values({ discordId: interaction.user.id, itemId: item.id, quantity: 1 });
  }

  await db.insert(transactionsTable).values({ fromDiscordId: interaction.user.id, toDiscordId: "SHOP", amount: item.price, type: "purchase", description: `Satın alma: ${item.name}` });

  await interaction.reply({
    embeds: [createEmbed("✅ Satın Alma Başarılı", `**${item.name}** başarıyla satın aldın!${wandDetails}\n\n💰 Kalan bakiyen: **${char.walletGalleons - item.price} Galleon**`, COLORS.success)],
    ephemeral: true
  });
}
