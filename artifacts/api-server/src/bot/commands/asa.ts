import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, charactersTable, wandSpellLogTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

const WAND_WOODS = ["Meşe", "Karaağaç", "Akasya", "Kayın", "Çam", "Kavak", "Yew", "Çınar", "Ardıç", "Kestane"];
const WAND_CORES = ["Anka Kuşu Tüyü", "Ejderha Kalp Teli", "Tek Boynuz Yelesi", "Süstralar Kılı", "Veela Saçı"];
const WAND_FLEXIBILITIES = ["Katı", "Oldukça Katı", "Orta", "Oldukça Esnek", "Esnek"];

export const data = new SlashCommandBuilder()
  .setName("asa")
  .setDescription("Asa sistemi")
  .addSubcommand(sub =>
    sub.setName("yap").setDescription("Oyuncuya özel asa yap (Asa Ustası)")
      .addUserOption(opt => opt.setName("sahip").setDescription("Asanın sahibi").setRequired(true))
      .addStringOption(opt =>
        opt.setName("agac").setDescription("Ağaç türü").setRequired(true)
          .addChoices(...WAND_WOODS.map(w => ({ name: w, value: w })))
      )
      .addStringOption(opt =>
        opt.setName("oz").setDescription("Asa özü").setRequired(true)
          .addChoices(...WAND_CORES.map(c => ({ name: c, value: c })))
      )
      .addStringOption(opt =>
        opt.setName("boyut").setDescription("Asa boyu (örn: 12 inç)").setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("esneklik").setDescription("Esneklik").setRequired(true)
          .addChoices(...WAND_FLEXIBILITIES.map(f => ({ name: f, value: f })))
      )
  )
  .addSubcommand(sub =>
    sub.setName("prior-incantato").setDescription("Son 3 büyüyü incele (Seherbaz)")
      .addUserOption(opt => opt.setName("kullanici").setDescription("İncelenecek büyücü").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("bilgi").setDescription("Asanı görüntüle")
      .addUserOption(opt => opt.setName("kullanici").setDescription("Başka birinin asasını gör").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("buyu-kaydet").setDescription("Büyü kaydı ekle (test/rol için)")
      .addStringOption(opt => opt.setName("buyu").setDescription("Büyünün adı").setRequired(true))
      .addUserOption(opt => opt.setName("hedef").setDescription("Büyünün hedefi").setRequired(false))
      .addBooleanOption(opt => opt.setName("karanlik").setDescription("Karanlık büyü mü?").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const member = interaction.guild?.members.cache.get(interaction.user.id);

  if (sub === "yap") {
    const hasAuth = member?.roles.cache.some(r =>
      r.name === "Asa Ustası" || r.name === "Ollivander" || r.permissions.has("Administrator")
    );
    if (!hasAuth) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Asa Ustası** rolü gerekli.", COLORS.error)], ephemeral: true });
      return;
    }

    const owner = interaction.options.getUser("sahip", true);
    const wood = interaction.options.getString("agac", true);
    const core = interaction.options.getString("oz", true);
    const length = interaction.options.getString("boyut", true);
    const flexibility = interaction.options.getString("esneklik", true);

    await db.update(charactersTable).set({
      wandWood: wood,
      wandCore: core,
      wandLength: length,
      wandFlexibility: flexibility,
      wandDurability: 100,
    }).where(eq(charactersTable.discordId, owner.id));

    const embed = createEmbed(
      "🪄 Yeni Asa Yapıldı!",
      [
        `**Sahip:** ${owner.displayName}`,
        `**Ağaç:** ${wood}`,
        `**Öz:** ${core}`,
        `**Boy:** ${length}`,
        `**Esneklik:** ${flexibility}`,
        `**Dayanıklılık:** 100/100 ✨`,
        "",
        `*${wood} ve ${core} kombinasyonu… ilginç.*`,
      ].join("\n"),
      COLORS.gold,
      "Ollivander's — Kaliteli Asaların Yapımcısı"
    );

    await interaction.reply({ embeds: [embed] });
    try { await owner.send({ embeds: [embed] }); } catch {}
    return;
  }

  if (sub === "prior-incantato") {
    const hasAuth = member?.roles.cache.some(r =>
      r.name === CONFIG.roles.auror || r.permissions.has("Administrator")
    );
    if (!hasAuth) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Seherbaz** rolü gerekli.", COLORS.error)], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("kullanici", true);
    const spells = await db.select().from(wandSpellLogTable)
      .where(eq(wandSpellLogTable.discordId, target.id))
      .orderBy(desc(wandSpellLogTable.castAt))
      .limit(3);

    if (!spells.length) {
      await interaction.reply({ embeds: [createEmbed("🔍 Prior Incantato", `**${target.displayName}**'in asasında kayıtlı büyü bulunamadı.`, COLORS.info)], ephemeral: true });
      return;
    }

    const lines = spells.map((s, i) =>
      `**${i + 1}.** ${s.spell}${s.target ? ` → ${s.target}` : ""}${s.isDarkMagic ? " ⚫ *_(Karanlık Büyü)_*" : ""}\n_<t:${Math.floor(new Date(s.castAt).getTime() / 1000)}:R>_`
    );

    await interaction.reply({
      embeds: [createEmbed(
        `🔮 Prior Incantato — ${target.displayName}`,
        `**Son ${spells.length} Büyü:**\n\n${lines.join("\n\n")}`,
        COLORS.ministry
      )],
      ephemeral: true
    });
    return;
  }

  if (sub === "bilgi") {
    const target = interaction.options.getUser("kullanici") ?? interaction.user;
    const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, target.id));

    if (!char) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakter bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }

    if (!char.wandWood) {
      await interaction.reply({ embeds: [createEmbed("🪄 Asa Bilgisi", "Henüz kayıtlı asa bilgisi yok.", COLORS.info)], ephemeral: true });
      return;
    }

    await interaction.reply({
      embeds: [createEmbed(
        `🪄 ${target.displayName}'in Asası`,
        [
          `**Ağaç:** ${char.wandWood}`,
          `**Öz:** ${char.wandCore}`,
          `**Boy:** ${char.wandLength}`,
          `**Esneklik:** ${char.wandFlexibility}`,
          `**Dayanıklılık:** ${char.wandDurability}/100`,
        ].join("\n"),
        COLORS.gold
      )],
      ephemeral: target.id !== interaction.user.id
    });
    return;
  }

  if (sub === "buyu-kaydet") {
    const spell = interaction.options.getString("buyu", true);
    const targetUser = interaction.options.getUser("hedef");
    const isDark = interaction.options.getBoolean("karanlik") ?? false;

    const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
    if (!char) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }

    if (!char.wandWood || !char.wandCore) {
      await interaction.reply({ embeds: [createEmbed("❌ Asan Yok", "Bir asan olmadan büyü yapamazsın! Marketten bir asa edinmelisin.", COLORS.error)], ephemeral: true });
      return;
    }

    const { characterSpellsTable } = await import("@workspace/db");
    const [learned] = await db.select().from(characterSpellsTable).where(
      and(
        eq(characterSpellsTable.discordId, interaction.user.id),
        eq(characterSpellsTable.spellName, spell)
      )
    );

    if (!learned) {
      await interaction.reply({ embeds: [createEmbed("❌ Büyü Öğrenilmemiş", `**${spell}** büyüsünü henüz öğrenmemişsin! /buyu-ogren komutu ile öğrenebilirsin.`, COLORS.error)], ephemeral: true });
      return;
    }

    await db.insert(wandSpellLogTable).values({
      discordId: interaction.user.id,
      spell,
      target: targetUser?.displayName ?? null,
      isDarkMagic: isDark,
    });

    await interaction.reply({
      embeds: [createEmbed("✨ Büyü Kaydedildi", `**${spell}** asana kaydedildi ve başarıyla yapıldı.`, COLORS.success)],
      ephemeral: true
    });
  }
}
