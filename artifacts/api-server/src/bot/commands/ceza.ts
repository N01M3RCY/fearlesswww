import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, finesTable, charactersTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

export const data = new SlashCommandBuilder()
  .setName("ceza")
  .setDescription("Bakanlık ceza sistemi")
  .addSubcommand(sub =>
    sub.setName("yaz").setDescription("Büyücüye Galleon cezası yaz (Seherbaz)")
      .addUserOption(opt => opt.setName("kullanici").setDescription("Ceza yazılacak kişi").setRequired(true))
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Galleon cezası miktarı").setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName("sebep").setDescription("Ceza sebebi").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("ode").setDescription("Bakanlık borcunu öde")
  )
  .addSubcommand(sub =>
    sub.setName("listele").setDescription("Aktif cezalarını görüntüle")
      .addUserOption(opt => opt.setName("kullanici").setDescription("Başka birinin cezalarını gör (Seherbaz)").setRequired(false))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const member = interaction.guild?.members.cache.get(interaction.user.id);

  if (sub === "yaz") {
    const hasAuth = member?.roles.cache.some(r =>
      r.name === CONFIG.roles.auror || r.name === CONFIG.roles.ministry || r.permissions.has("Administrator")
    );
    if (!hasAuth) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Seherbaz** rolü gerekli.", COLORS.error)], ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("kullanici", true);
    const amount = interaction.options.getInteger("miktar", true);
    const reason = interaction.options.getString("sebep", true);

    await db.insert(finesTable).values({
      discordId: target.id,
      amount,
      reason,
      issuedBy: interaction.user.id,
      isPaid: "false",
    });

    const embed = createEmbed(
      "⚖️ Bakanlık Ceza Kararı",
      [
        `**Suçlu:** ${target.displayName}`,
        `**Ceza:** ${amount} Galleon`,
        `**Sebep:** ${reason}`,
        `**Kesen Seherbaz:** ${interaction.user.displayName}`,
        "",
        `*Cezayı ödemek için /ceza ode komutunu kullan.*`,
      ].join("\n"),
      COLORS.ministry
    );

    await interaction.reply({ embeds: [embed] });

    try {
      await target.send({ embeds: [embed] });
    } catch {}
    return;
  }

  if (sub === "ode") {
    const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
    if (!char) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }

    const unpaidFines = await db.select().from(finesTable).where(
      and(eq(finesTable.discordId, interaction.user.id), eq(finesTable.isPaid, "false"))
    );

    if (!unpaidFines.length) {
      await interaction.reply({ embeds: [createEmbed("✅ Temiz Kayıt", "Ödenmemiş cezanız bulunmuyor.", COLORS.success)], ephemeral: true });
      return;
    }

    const total = unpaidFines.reduce((s, f) => s + f.amount, 0);
    if (char.walletGalleons < total) {
      await interaction.reply({
        embeds: [createEmbed(
          "❌ Yetersiz Galleon",
          `Toplam ceza: **${total} Galleon**\nCüzdanın: **${char.walletGalleons} Galleon**\nEksik: **${total - char.walletGalleons} Galleon**`,
          COLORS.error
        )],
        ephemeral: true
      });
      return;
    }

    await db.update(charactersTable).set({ walletGalleons: char.walletGalleons - total }).where(eq(charactersTable.discordId, interaction.user.id));
    for (const fine of unpaidFines) {
      await db.update(finesTable).set({ isPaid: "true" }).where(eq(finesTable.id, fine.id));
    }
    await db.insert(transactionsTable).values({
      fromDiscordId: interaction.user.id,
      toDiscordId: "MINISTRY",
      amount: total,
      type: "fine_payment",
      description: "Bakanlık ceza ödemesi",
    });

    await interaction.reply({
      embeds: [createEmbed(
        "✅ Ceza Ödendi",
        `**${total} Galleon** Bakanlık'a ödendi.\n💰 Kalan bakiyen: **${char.walletGalleons - total} Galleon**`,
        COLORS.success
      )],
      ephemeral: true
    });
    return;
  }

  if (sub === "listele") {
    const target = interaction.options.getUser("kullanici");
    const isOther = !!target;

    if (isOther) {
      const hasAuth = member?.roles.cache.some(r =>
        r.name === CONFIG.roles.auror || r.name === CONFIG.roles.ministry || r.permissions.has("Administrator")
      );
      if (!hasAuth) {
        await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Başkasının cezalarını görmek için Seherbaz rolü gerekli.", COLORS.error)], ephemeral: true });
        return;
      }
    }

    const userId = target?.id ?? interaction.user.id;
    const fines = await db.select().from(finesTable).where(
      and(eq(finesTable.discordId, userId), eq(finesTable.isPaid, "false"))
    );

    if (!fines.length) {
      await interaction.reply({
        embeds: [createEmbed("✅ Temiz Kayıt", `${isOther ? "Bu kullanıcının" : "Senin"} ödenmemiş cezası bulunmuyor.`, COLORS.success)],
        ephemeral: true
      });
      return;
    }

    const total = fines.reduce((s, f) => s + f.amount, 0);
    const lines = fines.map(f => `• **${f.amount} Galleon** — ${f.reason}`);
    lines.push(`\n**Toplam Borç:** ${total} Galleon`);

    await interaction.reply({
      embeds: [createEmbed("⚖️ Aktif Cezalar", lines.join("\n"), COLORS.ministry)],
      ephemeral: true
    });
  }
}
