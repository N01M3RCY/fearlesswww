import {
  ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction, TextChannel
} from "discord.js";
import { db, sortingApplicationsTable, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, houseColor, houseEmoji, COLORS } from "../embed";
import { CONFIG } from "../config";

// Kullanıcı başvuru verilerini geçici olarak tut (in-memory)
const sortingCache = new Map<string, Record<string, any>>();

function determineSorting(answers: string[]): string {
  const scores = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
  const text = answers.join(" ").toLowerCase();

  const gryfWords = ["cesur", "cesaret", "korkmam", "korkm", "meydan", "savaş", "kahra", "önce", "atlarım", "savun", "yardım", "kurtarır", "macera", "mücadele"];
  const slytWords = ["zeki", "akıllıca", "hedef", "amaç", "başarı", "güç", "lider", "plan", "strateji", "kendi", "çıkar", "hesaplar", "seçer", "ağır"];
  const ravWords = ["kitap", "okur", "öğren", "araştır", "bilgi", "merak", "kütüph", "anlama", "mantık", "analiz", "gözlem", "soru", "cevap", "keşif", "teori"];
  const hufWords = ["sadık", "dürüst", "adalet", "hak", "paylaş", "birlik", "arkadaş", "yardım", "sabır", "çalışkan", "sever", "bağlı", "güven", "topluluk", "herkes"];

  for (const w of gryfWords) if (text.includes(w)) scores.Gryffindor += 2;
  for (const w of slytWords) if (text.includes(w)) scores.Slytherin += 2;
  for (const w of ravWords) if (text.includes(w)) scores.Ravenclaw += 2;
  for (const w of hufWords) if (text.includes(w)) scores.Hufflepuff += 2;

  scores.Gryffindor += Math.floor(Math.random() * 3);
  scores.Slytherin += Math.floor(Math.random() * 3);
  scores.Ravenclaw += Math.floor(Math.random() * 3);
  scores.Hufflepuff += Math.floor(Math.random() * 3);

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// 1. Adım: Başlat butonu → Modal 1 aç
export async function handleSortingButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId !== "sorting_hat_start") return;

  const [existing] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
  if (existing?.house) {
    await interaction.reply({
      embeds: [createEmbed("🎩 Zaten Sınıflandırıldın", `${houseEmoji(existing.house)} **${existing.house}** binasına zaten aittsin!`, houseColor(existing.house))],
      ephemeral: true
    });
    return;
  }

  const pendingApp = await db.select().from(sortingApplicationsTable).where(eq(sortingApplicationsTable.discordId, interaction.user.id));
  if (pendingApp.some(a => a.status === "beklemede")) {
    await interaction.reply({
      embeds: [createEmbed("⏳ Başvuru Bekliyor", "Aktif bir başvurun zaten bulunuyor. Yönetim ekibinin onayını bekle!", COLORS.warning)],
      ephemeral: true
    });
    return;
  }

  const q = CONFIG.sortingQuestions;
  const modal = new ModalBuilder().setCustomId("sorting_modal_1").setTitle("🎩 Seçmen Şapkası — Bölüm 1/3");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("ooc_name").setLabel("OOC İsmin").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("ooc_age").setLabel("OOC Yaşın (13+)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3).setPlaceholder("Örn: 18")
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q1").setLabel(q[0].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q2").setLabel(q[1].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q3").setLabel(q[2].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
  );
  await interaction.showModal(modal);
}

// 2. Modal 1 submit → cache'e kaydet → Modal 2 butonu göster
export async function handleSortingModal1(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId !== "sorting_modal_1") return;

  const oocName = interaction.fields.getTextInputValue("ooc_name");
  const oocAgeStr = interaction.fields.getTextInputValue("ooc_age");
  const q1 = interaction.fields.getTextInputValue("q1");
  const q2 = interaction.fields.getTextInputValue("q2");
  const q3 = interaction.fields.getTextInputValue("q3");

  const oocAge = parseInt(oocAgeStr, 10);
  if (isNaN(oocAge) || oocAge < 13 || oocAge > 99) {
    await interaction.reply({ content: "❌ Geçersiz yaş. 13-99 arası bir sayı girin.", ephemeral: true });
    return;
  }

  sortingCache.set(interaction.user.id, { oocName, oocAge, q1, q2, q3 });

  await interaction.reply({
    content: "✅ **Bölüm 1 tamamlandı!** Devam etmek için aşağıdaki butona tıkla:",
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("sorting_open_modal2").setLabel("🎩 Devam Et — Bölüm 2/3").setStyle(ButtonStyle.Primary)
      )
    ],
    ephemeral: true
  });
}

// 3. Modal 2 butonu → Modal 2 aç
export async function handleOpenModal2(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId !== "sorting_open_modal2") return;

  if (!sortingCache.has(interaction.user.id)) {
    await interaction.reply({ content: "❌ Oturum süresi doldu. Baştan başlayın.", ephemeral: true });
    return;
  }

  const q = CONFIG.sortingQuestions;
  const modal = new ModalBuilder().setCustomId("sorting_modal_2").setTitle("🎩 Seçmen Şapkası — Bölüm 2/3");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q4").setLabel(q[3].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q5").setLabel(q[4].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q6").setLabel(q[5].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q7").setLabel(q[6].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q8").setLabel(q[7].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
  );
  await interaction.showModal(modal);
}

// 4. Modal 2 submit → cache'e ekle → Modal 3 butonu göster
export async function handleSortingModal2(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId !== "sorting_modal_2") return;

  const cached = sortingCache.get(interaction.user.id);
  if (!cached) {
    await interaction.reply({ content: "❌ Oturum süresi doldu. Baştan başlayın.", ephemeral: true });
    return;
  }

  cached.q4 = interaction.fields.getTextInputValue("q4");
  cached.q5 = interaction.fields.getTextInputValue("q5");
  cached.q6 = interaction.fields.getTextInputValue("q6");
  cached.q7 = interaction.fields.getTextInputValue("q7");
  cached.q8 = interaction.fields.getTextInputValue("q8");
  sortingCache.set(interaction.user.id, cached);

  await interaction.reply({
    content: "✅ **Bölüm 2 tamamlandı!** Son bölüm için devam et:",
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("sorting_open_modal3").setLabel("🎩 Son Bölüm — 3/3").setStyle(ButtonStyle.Primary)
      )
    ],
    ephemeral: true
  });
}

// 5. Modal 3 butonu → Modal 3 aç
export async function handleOpenModal3(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId !== "sorting_open_modal3") return;

  if (!sortingCache.has(interaction.user.id)) {
    await interaction.reply({ content: "❌ Oturum süresi doldu. Baştan başlayın.", ephemeral: true });
    return;
  }

  const q = CONFIG.sortingQuestions;
  const modal = new ModalBuilder().setCustomId("sorting_modal_3").setTitle("🎩 Seçmen Şapkası — Son Adım");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("blood_status").setLabel("IC Kan Durumun").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Safkan / Melez / Muggle Doğumlu").setMaxLength(20)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("gender").setLabel("Cinsiyet").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Büyücü veya Cadı").setMaxLength(10)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q9").setLabel(q[8].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q10").setLabel(q[9].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("q11").setLabel(q[10].substring(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
  );
  await interaction.showModal(modal);
}

// 6. Modal 3 submit → başvuruyu kaydet → onay kanalına gönder
export async function handleSortingModal3(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId !== "sorting_modal_3") return;
  await interaction.deferReply({ ephemeral: true });

  const cached = sortingCache.get(interaction.user.id);
  if (!cached) {
    await interaction.editReply({ content: "❌ Oturum süresi doldu. Baştan başlayın." });
    return;
  }

  const bloodStatusRaw = interaction.fields.getTextInputValue("blood_status").toLowerCase();
  const genderRaw = interaction.fields.getTextInputValue("gender").toLowerCase();
  const q9 = interaction.fields.getTextInputValue("q9");
  const q10 = interaction.fields.getTextInputValue("q10");
  const q11 = interaction.fields.getTextInputValue("q11");

  let bloodStatus = "Melez";
  if (bloodStatusRaw.includes("safkan")) bloodStatus = "Safkan";
  else if (bloodStatusRaw.includes("muggle")) bloodStatus = "Muggle Doğumlu";

  let gender = "Büyücü";
  if (genderRaw.includes("cadı") || genderRaw.includes("kız")) gender = "Cadı";

  const allAnswers = [
    cached.q1, cached.q2, cached.q3,
    cached.q4, cached.q5, cached.q6, cached.q7, cached.q8,
    q9, q10, q11
  ];
  const finalHouse = determineSorting(allAnswers);

  sortingCache.delete(interaction.user.id);

  const [app] = await db.insert(sortingApplicationsTable).values({
    discordId: interaction.user.id,
    discordUsername: interaction.user.username,
    oocName: cached.oocName,
    oocAge: cached.oocAge,
    bloodStatus,
    gender,
    answers: JSON.stringify(allAnswers),
    suggestedHouse: finalHouse,
    status: "beklemede",
  }).returning();

  // Onay kanalına gönder
  const guild = interaction.guild;
  if (CONFIG.channels.applications && guild) {
    const ch = guild.channels.cache.get(CONFIG.channels.applications) as TextChannel | undefined;
    if (ch?.isTextBased()) {
      const reviewEmbed = createEmbed(
        `🎩 Seçmen Şapkası Başvurusu #${app.id}`,
        [
          `**Başvuran:** <@${interaction.user.id}> (${interaction.user.username})`,
          `**OOC İsim/Yaş:** ${cached.oocName} | ${cached.oocAge}`,
          `**Kan Durumu:** ${bloodStatus}`,
          `**Cinsiyet:** ${gender}`,
          `**Önerilen Bina:** ${houseEmoji(finalHouse)} **${finalHouse}**`,
          "",
          "**── Cevaplar (özet) ──**",
          ...allAnswers.slice(0, 5).map((a: string, i: number) => `**S${i + 1}:** ${a.substring(0, 100)}${a.length > 100 ? "..." : ""}`),
          allAnswers.length > 5 ? `_...ve ${allAnswers.length - 5} cevap daha_` : "",
        ].filter(Boolean).join("\n"),
        houseColor(finalHouse),
        `Başvuru ID: ${app.id}`
      );

      const approveRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`sorting_approve_${app.id}`).setLabel(`✅ ${finalHouse}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`sorting_gryf_${app.id}`).setLabel("🦁 Gryffindor").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sorting_slyt_${app.id}`).setLabel("🐍 Slytherin").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sorting_rave_${app.id}`).setLabel("🦅 Ravenclaw").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sorting_huff_${app.id}`).setLabel("🦡 Hufflepuff").setStyle(ButtonStyle.Secondary),
      );
      const rejectRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`sorting_reject_${app.id}`).setLabel("❌ Reddet").setStyle(ButtonStyle.Danger),
      );

      await ch.send({ embeds: [reviewEmbed], components: [approveRow, rejectRow] });
    }
  }

  await interaction.editReply({
    embeds: [createEmbed(
      "🎩 Başvurun Alındı!",
      [
        `Seçmen Şapkası törenine katıldığın için teşekkürler, **${cached.oocName}**!`,
        "",
        `Şapka seni **${houseEmoji(finalHouse)} ${finalHouse}** binasına yerleştirmek istiyor...`,
        "",
        "Yönetim ekibi başvurunu inceledikten sonra binana kabul edileceksin. Biraz sabır! ⌛",
      ].join("\n"),
      houseColor(finalHouse)
    )]
  });
}

// Sorting onay/red butonları
export async function handleSortingApproval(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  const match = customId.match(/^sorting_(approve|reject|gryf|slyt|rave|huff)_(\d+)$/);
  if (!match) return;

  const action = match[1];
  const appId = parseInt(match[2], 10);

  const [app] = await db.select().from(sortingApplicationsTable).where(eq(sortingApplicationsTable.id, appId));
  if (!app) {
    await interaction.reply({ content: "❌ Başvuru bulunamadı.", ephemeral: true });
    return;
  }

  if (app.status !== "beklemede") {
    await interaction.reply({ content: `Bu başvuru zaten **${app.status}** olarak işaretlenmiş.`, ephemeral: true });
    return;
  }

  if (action === "reject") {
    await db.update(sortingApplicationsTable).set({ status: "reddedildi", reviewedBy: interaction.user.id, reviewedAt: new Date() }).where(eq(sortingApplicationsTable.id, appId));
    await interaction.update({ components: [] });
    try {
      const user = await interaction.client.users.fetch(app.discordId);
      await user.send({ embeds: [createEmbed("❌ Başvurun Reddedildi", "Seçmen Şapkası başvurun reddedildi. Detaylar için yönetimle iletişime geç.", COLORS.error)] });
    } catch {}
    return;
  }

  const houseMap: Record<string, string> = {
    approve: app.suggestedHouse,
    gryf: "Gryffindor",
    slyt: "Slytherin",
    rave: "Ravenclaw",
    huff: "Hufflepuff",
  };
  const assignedHouse = houseMap[action] ?? app.suggestedHouse;

  const [existingChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, app.discordId));
  if (existingChar) {
    await db.update(charactersTable).set({ house: assignedHouse, bloodStatus: app.bloodStatus, gender: app.gender, oocName: app.oocName, oocAge: app.oocAge }).where(eq(charactersTable.discordId, app.discordId));
  } else {
    await db.insert(charactersTable).values({
      discordId: app.discordId,
      discordUsername: app.discordUsername,
      oocName: app.oocName,
      oocAge: app.oocAge,
      bloodStatus: app.bloodStatus,
      gender: app.gender,
      house: assignedHouse,
      classYear: 1,
      walletGalleons: 50,
      bankGalleons: 0,
    });
  }

  await db.update(sortingApplicationsTable).set({ status: "onaylandi", reviewedBy: interaction.user.id, reviewedAt: new Date() }).where(eq(sortingApplicationsTable.id, appId));

  const guild = interaction.guild;
  if (guild) {
    await guild.members.fetch();
    const member = guild.members.cache.get(app.discordId);
    if (member) {
      const houseRole = guild.roles.cache.find(r => r.name === assignedHouse);
      if (houseRole) await member.roles.add(houseRole).catch(() => {});

      const bloodRoleMap: Record<string, string> = {
        "Safkan": CONFIG.roles.safkan,
        "Melez": CONFIG.roles.melez,
        "Muggle Doğumlu": CONFIG.roles.muggleDogu,
      };
      const bloodRole = guild.roles.cache.find(r => r.name === bloodRoleMap[app.bloodStatus]);
      if (bloodRole) await member.roles.add(bloodRole).catch(() => {});

      const genderRoleName = app.gender === "Cadı" ? CONFIG.roles.cadi : CONFIG.roles.buyucu;
      const genderRole = guild.roles.cache.get(genderRoleName) || guild.roles.cache.find(r => r.name === genderRoleName);
      if (genderRole) await member.roles.add(genderRole).catch(() => {});

      const yearRole = guild.roles.cache.get(CONFIG.roles.firstYear) || guild.roles.cache.find(r => r.name === CONFIG.roles.firstYear);
      if (yearRole) await member.roles.add(yearRole).catch(() => {});

      // Kayıtsız rolünü çıkar ve Tanıtım Yazılmadı rolünü ekle
      if (CONFIG.roles.unregistered) {
        const unregRole = guild.roles.cache.get(CONFIG.roles.unregistered) || guild.roles.cache.find(r => r.name === CONFIG.roles.unregistered);
        if (unregRole) await member.roles.remove(unregRole).catch(() => {});
      }
      if (CONFIG.roles.introNotWritten) {
        const introNotWrittenRole = guild.roles.cache.get(CONFIG.roles.introNotWritten) || guild.roles.cache.find(r => r.name === CONFIG.roles.introNotWritten);
        if (introNotWrittenRole) await member.roles.add(introNotWrittenRole).catch(() => {});
      }

      await member.setNickname(`${app.oocName} | ${app.oocAge}`).catch(() => {});
    }
  }

  await interaction.update({ components: [] });

  const successEmbed = createEmbed(
    `🎉 ${houseEmoji(assignedHouse)} ${assignedHouse}'e Hoş Geldin!`,
    [
      `**${app.oocName}**, Hogwarts'ın kapıları sana açıldı!`,
      `${houseEmoji(assignedHouse)} **${assignedHouse}** binasına kabul edildin!`,
      `**Kan Durumu:** ${app.bloodStatus} | **Cinsiyet:** ${app.gender}`,
      "",
      "Başarılar dileriz! 🪄✨",
    ].join("\n"),
    houseColor(assignedHouse)
  );

  try {
    const user = await interaction.client.users.fetch(app.discordId);
    await user.send({ embeds: [successEmbed] });
  } catch {}

  if (CONFIG.channels.sortingHat && guild) {
    const ch = guild.channels.cache.get(CONFIG.channels.sortingHat) as TextChannel | undefined;
    if (ch?.isTextBased()) await ch.send({ embeds: [successEmbed] });
  }

  await interaction.followUp({ content: `✅ <@${app.discordId}> → **${assignedHouse}** binasına atandı.`, ephemeral: true });
}

// Karakter tanıtım onay/red
export async function handleIntroApproval(interaction: ButtonInteraction): Promise<void> {
  const match = interaction.customId.match(/^intro_(approve|reject)_(\d+)$/);
  if (!match) return;

  const action = match[1];
  const introId = parseInt(match[2], 10);

  const { characterIntroTable } = await import("@workspace/db");

  const [intro] = await db.select().from(characterIntroTable).where(eq(characterIntroTable.id, introId));
  if (!intro || intro.status !== "beklemede") {
    await interaction.reply({ content: "Bu başvuru zaten işlenmiş.", ephemeral: true });
    return;
  }

  if (action === "reject") {
    await db.update(characterIntroTable).set({ status: "reddedildi", reviewedBy: interaction.user.id, reviewedAt: new Date() }).where(eq(characterIntroTable.id, introId));
    await interaction.update({ components: [] });
    try {
      const user = await interaction.client.users.fetch(intro.discordId);
      await user.send({ embeds: [createEmbed("❌ Karakter Tanıtımın Reddedildi", "Karakter tanıtım başvurun reddedildi. Hikayeni gözden geçirip tekrar dene.", COLORS.error)] });
    } catch {}
    return;
  }

  await db.update(characterIntroTable).set({ status: "onaylandi", reviewedBy: interaction.user.id, reviewedAt: new Date() }).where(eq(characterIntroTable.id, introId));
  await db.update(charactersTable).set({ icName: intro.icName, icAge: intro.icAge, icStory: intro.icStory, icStoryApproved: true }).where(eq(charactersTable.discordId, intro.discordId));

  // Tanıtım yazılmadı rolünü kaldır
  const guild = interaction.guild;
  if (guild) {
    try {
      await guild.members.fetch();
      const member = guild.members.cache.get(intro.discordId);
      if (member && CONFIG.roles.introNotWritten) {
        const introNotWrittenRole = guild.roles.cache.get(CONFIG.roles.introNotWritten) || guild.roles.cache.find(r => r.name === CONFIG.roles.introNotWritten);
        if (introNotWrittenRole) await member.roles.remove(introNotWrittenRole).catch(() => {});
      }
    } catch (err) {
      console.error("Intro approval role error:", err);
    }
  }

  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, intro.discordId));
  await interaction.update({ components: [] });

  if (CONFIG.channels.characterIntro && interaction.guild) {
    const ch = interaction.guild.channels.cache.get(CONFIG.channels.characterIntro) as TextChannel | undefined;
    if (ch?.isTextBased()) {
      await ch.send({
        embeds: [createEmbed(
          `📜 Yeni Karakter Tanıtımı — ${intro.icName}`,
          [
            `**Oyuncu:** <@${intro.discordId}>`,
            `**Bina:** ${char?.house ? `${houseEmoji(char.house)} ${char.house}` : "Belirsiz"}`,
            `**IC İsim:** ${intro.icName} | ${intro.icAge} Yaşında`,
            "",
            `**Hikaye:**\n${intro.icStory}`,
          ].join("\n"),
          houseColor(char?.house),
          "Fearless Wizarding World — Karakter Tanıtım"
        )]
      });
    }
  }

  try {
    const user = await interaction.client.users.fetch(intro.discordId);
    await user.send({
      embeds: [createEmbed(
        "✅ Karakter Tanıtımın Onaylandı!",
        `**IC Adın:** ${intro.icName} | **IC Yaşın:** ${intro.icAge}\n\nKarakter tanıtımın onaylandı ve profiline eklendi! 🪄`,
        COLORS.success
      )]
    });
  } catch {}
}
