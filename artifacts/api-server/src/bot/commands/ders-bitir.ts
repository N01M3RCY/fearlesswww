import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from "discord.js";
import { db, lessonsTable, shopItemsTable, inventoryTable, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";
import { CONFIG } from "../config";

export const data = new SlashCommandBuilder()
  .setName("ders-bitir")
  .setDescription("Aktif dersi sonlandır ve ses kanalındakilere parşömen ver")
  .addIntegerOption(opt => opt.setName("ders_id").setDescription("Bitirilecek dersin ID'si").setRequired(true).setMinValue(1))
  .addStringOption(opt => opt.setName("buyu").setDescription("Verilecek büyü parşömeninin adı (örn: Alohomora)").setRequired(true))
  .addIntegerOption(opt => opt.setName("miktar").setDescription("Verilecek parşömen miktarı").setRequired(false).setMinValue(1).setMaxValue(5));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasProfRole = member?.roles.cache.some(r => r.name === CONFIG.roles.professor || r.id === CONFIG.roles.professor);
  const isAdmin = member?.permissions.has("Administrator");

  if (!hasProfRole && !isAdmin) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Profesör** rolüne ihtiyacın var.", COLORS.error)], ephemeral: true });
    return;
  }

  const lessonId = interaction.options.getInteger("ders_id", true);
  const spellName = interaction.options.getString("buyu", true).trim();
  const amount = interaction.options.getInteger("miktar") ?? 1;

  // Dersi bul ve kontrol et
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", `ID'si **${lessonId}** olan bir ders bulunamadı.`, COLORS.error)], ephemeral: true });
    return;
  }

  if (!lesson.isLive) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Bu ders zaten sonlandırılmış.", COLORS.error)], ephemeral: true });
    return;
  }

  // Ses kanalı kontrolü
  const voiceState = member?.voice;
  const voiceChannel = voiceState?.channel;
  if (!voiceChannel) {
    await interaction.reply({
      embeds: [createEmbed("❌ Hata", "Derse katılanları belirlemek için dersi işlediğin **ses kanalında** bulunmalısın!", COLORS.error)],
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Ses kanalındaki kullanıcılar (Botlar hariç)
  const voiceMembers = voiceChannel.members.filter(m => !m.user.bot);
  const totalParticipants = voiceMembers.size;

  if (totalParticipants === 0) {
    await interaction.editReply({ embeds: [createEmbed("❌ Hata", "Bulunduğun ses kanalında senden başka öğrenci bulunmuyor.", COLORS.error)] });
    return;
  }

  // Parşömen ürününü dükkanda bul veya yoksa oluştur
  const scrollItemName = `${spellName} Parşömeni`;
  let [scrollItem] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.name, scrollItemName));
  if (!scrollItem) {
    [scrollItem] = await db.insert(shopItemsTable).values({
      name: scrollItemName,
      description: `${spellName} büyüsünü öğrenmek için gerekli ders parşömeni.`,
      price: 0,
      category: "scroll",
      location: "diagon",
      minClassYear: lesson.classYear,
      isAvailable: false
    }).returning();
  }

  // Öğrencilere parşömen dağıt
  const rewardedMentions: string[] = [];
  for (const [memberId, voiceMember] of voiceMembers.entries()) {
    // Karakteri var mı?
    const [studentChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, memberId));
    if (!studentChar) continue;

    // Envanterde var mı?
    const [invEntry] = await db.select().from(inventoryTable).where(
      and(
        eq(inventoryTable.discordId, memberId),
        eq(inventoryTable.itemId, scrollItem.id)
      )
    );

    if (invEntry) {
      await db.update(inventoryTable)
        .set({ quantity: invEntry.quantity + amount })
        .where(
          and(
            eq(inventoryTable.discordId, memberId),
            eq(inventoryTable.itemId, scrollItem.id)
          )
        );
    } else {
      await db.insert(inventoryTable).values({
        discordId: memberId,
        itemId: scrollItem.id,
        quantity: amount,
      });
    }
    rewardedMentions.push(`<@${memberId}>`);
  }

  // Dersi kapat
  await db.update(lessonsTable).set({ isLive: false }).where(eq(lessonsTable.id, lessonId));

  // Log gönder
  const logChannelId = CONFIG.channels.lessonLog;
  const logEmbed = createEmbed(
    "📚 Ders Tamamlandı & Parşömenler Dağıtıldı!",
    [
      `**Ders Konusu:** ${lesson.subject}`,
      `**Profesör:** <@${lesson.professorDiscordId}>`,
      `**Dağıtılan:** **${amount}** adet **${scrollItemName}**`,
      `**Toplam Katılımcı (Ses Kanalında):** ${totalParticipants}`,
      `**Ses Kanalı:** ${voiceChannel.name}`,
      "",
      "**── Ödül Alan Öğrenciler ──**",
      rewardedMentions.length > 0 ? rewardedMentions.join(", ") : "_Kayıtlı karakter sahibi öğrenci bulunamadı._"
    ].join("\n"),
    COLORS.success
  );

  const guild = interaction.guild;
  if (logChannelId && guild) {
    const logCh = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logCh?.isTextBased()) {
      await logCh.send({ embeds: [logEmbed] }).catch(err => console.error("Log channel send error:", err));
    }
  }

  // Ders duyurularına da bildirelim
  if (CONFIG.channels.announcements && guild) {
    const annCh = guild.channels.cache.get(CONFIG.channels.announcements) as TextChannel | undefined;
    if (annCh?.isTextBased()) {
      await annCh.send({
        embeds: [createEmbed(
          "🔔 Ders Bitti!",
          `**${lesson.subject}** (${lesson.classYear}. Yıl) dersi sona ermiştir. Katılan tüm öğrencilere teşekkürler!`,
          COLORS.info
        )]
      }).catch(() => {});
    }
  }

  await interaction.editReply({
    embeds: [createEmbed(
      "✅ Ders Başarıyla Sonlandırıldı",
      `**${lesson.subject}** dersi bitti ve ses kanalındaki **${rewardedMentions.length}** karakter sahibine **${amount}** adet **${scrollItemName}** dağıtıldı.`,
      COLORS.success
    )]
  });
}
