import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, charactersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("bakiye")
  .setDescription("Gringotts hesabını yönet")
  .addSubcommand(sub => sub.setName("goster").setDescription("Bakiyeni görüntüle"))
  .addSubcommand(sub =>
    sub.setName("yatir").setDescription("Cüzdandan kasaya para yatır")
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Yatırılacak Galleon miktarı").setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName("cek").setDescription("Kasadan cüzdana para çek")
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Çekilecek Galleon miktarı").setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName("gonder").setDescription("Başka bir oyuncuya Galleon gönder")
      .addUserOption(opt => opt.setName("kullanici").setDescription("Alıcı kullanıcı").setRequired(true))
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Gönderilecek Galleon miktarı").setRequired(true).setMinValue(1))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı. Önce Seçmen Şapkası törenine katıl!", COLORS.error)], ephemeral: true });
    return;
  }

  if (sub === "goster") {
    await interaction.reply({
      embeds: [createEmbed(
        "🏦 Gringotts Hesabı",
        [
          `**Cüzdan:** ${char.walletGalleons} Galleon 💰`,
          `**Gringotts Kasası:** ${char.bankGalleons} Galleon 🏛️`,
          `**Toplam:** ${char.walletGalleons + char.bankGalleons} Galleon`,
        ].join("\n"),
        COLORS.gold,
        "Gringotts Cadılar ve Büyücüler Bankası"
      )],
      ephemeral: true
    });
    return;
  }

  if (sub === "yatir") {
    const amount = interaction.options.getInteger("miktar", true);
    if (char.walletGalleons < amount) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Bakiye", `Cüzdanında yeterli Galleon yok. Mevcut: ${char.walletGalleons} Galleon`, COLORS.error)], ephemeral: true });
      return;
    }
    await db.update(charactersTable).set({
      walletGalleons: char.walletGalleons - amount,
      bankGalleons: char.bankGalleons + amount,
    }).where(eq(charactersTable.discordId, interaction.user.id));
    await db.insert(transactionsTable).values({ fromDiscordId: interaction.user.id, toDiscordId: "BANK", amount, type: "deposit", description: "Gringotts kasasına yatırma" });
    await interaction.reply({ embeds: [createEmbed("✅ Para Yatırıldı", `**${amount} Galleon** Gringotts kasana yatırıldı.\n🏦 Yeni kasa bakiyesi: **${char.bankGalleons + amount} Galleon**`, COLORS.success)], ephemeral: true });
    return;
  }

  if (sub === "cek") {
    const amount = interaction.options.getInteger("miktar", true);
    if (char.bankGalleons < amount) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Bakiye", `Kasanda yeterli Galleon yok. Mevcut: ${char.bankGalleons} Galleon`, COLORS.error)], ephemeral: true });
      return;
    }
    await db.update(charactersTable).set({
      walletGalleons: char.walletGalleons + amount,
      bankGalleons: char.bankGalleons - amount,
    }).where(eq(charactersTable.discordId, interaction.user.id));
    await db.insert(transactionsTable).values({ fromDiscordId: "BANK", toDiscordId: interaction.user.id, amount, type: "withdraw", description: "Gringotts kasasından çekme" });
    await interaction.reply({ embeds: [createEmbed("✅ Para Çekildi", `**${amount} Galleon** kasandan çekildi.\n💰 Yeni cüzdan bakiyesi: **${char.walletGalleons + amount} Galleon**`, COLORS.success)], ephemeral: true });
    return;
  }

  if (sub === "gonder") {
    const target = interaction.options.getUser("kullanici", true);
    const amount = interaction.options.getInteger("miktar", true);
    if (target.id === interaction.user.id) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kendine para gönderemezsin!", COLORS.error)], ephemeral: true });
      return;
    }
    if (char.walletGalleons < amount) {
      await interaction.reply({ embeds: [createEmbed("❌ Yetersiz Bakiye", `Cüzdanında yeterli Galleon yok. Mevcut: ${char.walletGalleons} Galleon`, COLORS.error)], ephemeral: true });
      return;
    }
    const [targetChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, target.id));
    if (!targetChar) {
      await interaction.reply({ embeds: [createEmbed("❌ Hata", "Hedef kullanıcının kayıtlı karakteri bulunamadı.", COLORS.error)], ephemeral: true });
      return;
    }
    await db.update(charactersTable).set({ walletGalleons: char.walletGalleons - amount }).where(eq(charactersTable.discordId, interaction.user.id));
    await db.update(charactersTable).set({ walletGalleons: targetChar.walletGalleons + amount }).where(eq(charactersTable.discordId, target.id));
    await db.insert(transactionsTable).values({ fromDiscordId: interaction.user.id, toDiscordId: target.id, amount, type: "transfer", description: `Transfer: ${interaction.user.username} → ${target.username}` });

    const receipt = createEmbed(
      "📬 Gringotts Makbuzu — Transfer",
      `**${interaction.user.displayName}** sana **${amount} Galleon** gönderdi!\n💰 Yeni bakiyen: **${targetChar.walletGalleons + amount} Galleon**`,
      COLORS.gold,
      "Gringotts Cadılar ve Büyücüler Bankası"
    );
    try { await target.send({ embeds: [receipt] }); } catch {}

    await interaction.reply({ embeds: [createEmbed("✅ Transfer Başarılı", `**${amount} Galleon** başarıyla **${target.displayName}**'e gönderildi.\n💰 Kalan bakiyen: **${char.walletGalleons - amount} Galleon**`, COLORS.success)], ephemeral: true });
  }
}
