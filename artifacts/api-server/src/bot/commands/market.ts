import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, shopItemsTable, inventoryTable, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("market")
  .setDescription("Mağaza ve envanter işlemleri")
  .addSubcommand(sub =>
    sub.setName("listele").setDescription("Dükkan ürünlerini listele")
      .addStringOption(opt =>
        opt.setName("konum").setDescription("Konum seçin")
          .addChoices({ name: "Hogsmeade", value: "hogsmeade" }, { name: "Diagon Yolu", value: "diagon" })
          .setRequired(false)
      )
  )
  .addSubcommand(sub => sub.setName("envanter").setDescription("Envanterini görüntüle"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "listele") {
    const konum = interaction.options.getString("konum") ?? "hogsmeade";
    const items = await db.select().from(shopItemsTable).where(and(eq(shopItemsTable.location, konum), eq(shopItemsTable.isAvailable, true)));

    if (!items.length) {
      await interaction.reply({ embeds: [createEmbed("🏪 Market", "Şu an satışta ürün bulunmuyor.", COLORS.info)], ephemeral: true });
      return;
    }

    const locationName = konum === "hogsmeade" ? "🏘️ Hogsmeade" : "⚗️ Diagon Yolu";
    const lines = items.map(i =>
      `**${i.name}** — ${i.price} Galleon\n*${i.description ?? ""}*${i.minClassYear > 1 ? ` _(Min. ${i.minClassYear}. Yıl)_` : ""}`
    );
    await interaction.reply({
      embeds: [createEmbed(`🏪 ${locationName} Dükkanları`, lines.join("\n\n"), COLORS.gold, "/satin-al komutuyla satın alabilirsin")],
    });
    return;
  }

  if (sub === "envanter") {
    const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
    if (!char) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }

    const inv = await db.select().from(inventoryTable).where(eq(inventoryTable.discordId, interaction.user.id));
    if (!inv.length) {
      await interaction.reply({ embeds: [createEmbed("🎒 Envanter", "Envanterin boş.", COLORS.info)], ephemeral: true });
      return;
    }

    const itemIds = inv.map(i => i.itemId);
    const allItems = await db.select().from(shopItemsTable);
    const itemMap = new Map(allItems.map(i => [i.id, i]));

    const wandInfo = char.wandWood
      ? `\n**🪄 Asa:** ${char.wandWood}, ${char.wandCore} (Dayanıklılık: ${char.wandDurability}/100)`
      : "";

    const lines = inv.map(entry => {
      const item = itemMap.get(entry.itemId);
      return item ? `• **${item.name}** x${entry.quantity}` : `• Bilinmeyen ürün x${entry.quantity}`;
    });

    await interaction.reply({
      embeds: [createEmbed("🎒 Envanter", lines.join("\n") + wandInfo, COLORS.info)],
      ephemeral: true
    });
  }
}
