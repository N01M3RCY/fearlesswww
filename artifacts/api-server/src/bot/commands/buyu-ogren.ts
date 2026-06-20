import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, charactersTable, spellsTable, characterSpellsTable, shopItemsTable, inventoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("buyu-ogren")
  .setDescription("Envanterindeki parşömenler ile yeni bir büyü öğren")
  .addStringOption(opt =>
    opt.setName("buyu").setDescription("Öğrenmek istediğin büyünün adı (örn: Alohomora)").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const spellName = interaction.options.getString("buyu", true).trim();

  // Karakter kontrolü
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı. Önce Seçmen Şapkası törenine katıl!", COLORS.error)], ephemeral: true });
    return;
  }

  // Asa kontrolü
  if (!char.wandWood || !char.wandCore) {
    await interaction.reply({ embeds: [createEmbed("❌ Asan Yok", "Bir asan olmadan büyü öğrenemezsin! Marketten bir asa edinmelisin.", COLORS.error)], ephemeral: true });
    return;
  }

  // Büyü sistemde kayıtlı mı?
  const [spell] = await db.select().from(spellsTable).where(eq(spellsTable.name, spellName));
  if (!spell) {
    await interaction.reply({ embeds: [createEmbed("❌ Geçersiz Büyü", `**${spellName}** adında bir büyü sistemde bulunamadı. Büyüler yönetim tarafından eklenmelidir.`, COLORS.error)], ephemeral: true });
    return;
  }

  // Sınıf seviyesi yeterli mi?
  if (char.classYear < spell.level) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Sınıf", `Bu büyüyü öğrenmek için en az **${spell.level}. Sınıf** olman gerekiyor. Sen şu an **${char.classYear}. Sınıf**sın.`, COLORS.error)], ephemeral: true });
    return;
  }

  // Zaten öğrenmiş mi?
  const [learned] = await db.select().from(characterSpellsTable).where(
    and(
      eq(characterSpellsTable.discordId, interaction.user.id),
      eq(characterSpellsTable.spellName, spell.name)
    )
  );
  if (learned) {
    await interaction.reply({ embeds: [createEmbed("ℹ️ Zaten Biliyorsun", `**${spell.name}** büyüsünü zaten öğrenmişsin!`, COLORS.warning)], ephemeral: true });
    return;
  }

  // Parşömen kontrolü
  // Shop item listesinde '[SpellName] Parşömeni' adında bir ürün aramalıyız
  const scrollItemName = `${spell.name} Parşömeni`;
  const [scrollItem] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.name, scrollItemName));
  if (!scrollItem) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", `Bu büyü için gereken **${scrollItemName}** sistem dükkanında bulunamadı. Lütfen yöneticilere bildirin.`, COLORS.error)], ephemeral: true });
    return;
  }

  const [invEntry] = await db.select().from(inventoryTable).where(
    and(
      eq(inventoryTable.discordId, interaction.user.id),
      eq(inventoryTable.itemId, scrollItem.id)
    )
  );

  const currentScrolls = invEntry?.quantity ?? 0;
  if (currentScrolls < spell.scrollsRequired) {
    await interaction.reply({
      embeds: [createEmbed(
        "❌ Yetersiz Parşömen",
        `**${spell.name}** büyüsünü öğrenmek için **${spell.scrollsRequired}** adet **${scrollItemName}** gerekiyor.\nSende şu an **${currentScrolls}** adet var.`,
        COLORS.error
      )],
      ephemeral: true
    });
    return;
  }

  // Parşömenleri tüket
  if (currentScrolls === spell.scrollsRequired) {
    await db.delete(inventoryTable).where(
      and(
        eq(inventoryTable.discordId, interaction.user.id),
        eq(inventoryTable.itemId, scrollItem.id)
      )
    );
  } else {
    await db.update(inventoryTable)
      .set({ quantity: currentScrolls - spell.scrollsRequired })
      .where(
        and(
          eq(inventoryTable.discordId, interaction.user.id),
          eq(inventoryTable.itemId, scrollItem.id)
        )
      );
  }

  // Büyüyü öğrenilenlere ekle
  await db.insert(characterSpellsTable).values({
    discordId: interaction.user.id,
    spellName: spell.name,
  });

  await interaction.reply({
    embeds: [createEmbed(
      "🎉 Büyü Başarıyla Öğrenildi!",
      `Tebrikler! **${spell.scrollsRequired}** adet parşömen kullanarak **${spell.name}** büyüsünü öğrendin.\nArtık asanla bu büyüyü yapabilirsin! 🪄✨`,
      COLORS.success
    )],
    ephemeral: true
  });
}
