import {
  SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ComponentType
} from "discord.js";
import { db, skillsTable, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

type SkillRow = typeof skillsTable.$inferSelect;

const BRANCHES: { key: keyof SkillRow; label: string }[] = [
  { key: "tılsım" as keyof SkillRow, label: "✨ Tılsım" },
  { key: "bicimDegistirme", label: "🦊 Biçim Değiştirme" },
  { key: "ksks", label: "🛡️ KSKS" },
  { key: "iksir", label: "⚗️ İksir" },
  { key: "quidditch", label: "🧹 Quidditch" },
  { key: "zihnefend", label: "🧠 Zihnefend" },
  { key: "zihnebend", label: "💜 Zihnebend" },
];

// customId için güvenli key eşlemesi (özel karakterlerden kaçınmak için)
const KEY_TO_ID: Record<string, keyof SkillRow> = {
  "tilsim": "tılsım" as keyof SkillRow,
  "bicimDegistirme": "bicimDegistirme",
  "ksks": "ksks",
  "iksir": "iksir",
  "quidditch": "quidditch",
  "zihnefend": "zihnefend",
  "zihnebend": "zihnebend",
};

const KEY_TO_SAFE: Record<string, string> = {
  "tılsım": "tilsim",
  "bicimDegistirme": "bicimDegistirme",
  "ksks": "ksks",
  "iksir": "iksir",
  "quidditch": "quidditch",
  "zihnefend": "zihnefend",
  "zihnebend": "zihnebend",
};

export const data = new SlashCommandBuilder()
  .setName("yetenek-agaci")
  .setDescription("Yetenek ağacını görüntüle ve geliştir");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  let [skills] = await db.select().from(skillsTable).where(eq(skillsTable.discordId, interaction.user.id));
  if (!skills) {
    [skills] = await db.insert(skillsTable).values({ discordId: interaction.user.id }).returning();
  }

  const buildEmbed = (s: SkillRow) => {
    const lines = BRANCHES.map(b => {
      const level = s[b.key] as number;
      const bar = "█".repeat(level) + "░".repeat(Math.max(0, 10 - level));
      return `${b.label}\n\`${bar}\` **${level}/10**`;
    });

    return createEmbed(
      "🌟 Yetenek Ağacı",
      [
        `**${char.oocName}** — Seviye ${char.level}`,
        `💡 **Kullanılabilir Yetenek Puanı:** ${char.skillPoints}`,
        "",
        ...lines,
      ].join("\n"),
      COLORS.info,
      "Geliştirmek istediğin branşı seç"
    );
  };

  const buildButtons = (s: SkillRow, sp: number) => {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const chunks: typeof BRANCHES[number][][] = [];

    for (let i = 0; i < BRANCHES.length; i += 4) {
      chunks.push(BRANCHES.slice(i, i + 4));
    }

    for (const chunk of chunks) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const branch of chunk) {
        const level = s[branch.key] as number;
        const safeId = KEY_TO_SAFE[branch.key] ?? String(branch.key);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`skill_${safeId}`)
            .setLabel(`${branch.label} (${level})`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(sp < 1 || level >= 10)
        );
      }
      rows.push(row);
    }

    return rows;
  };

  const msg = await interaction.reply({
    embeds: [buildEmbed(skills)],
    components: buildButtons(skills, char.skillPoints),
    ephemeral: true,
    fetchReply: true
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
    filter: i => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btnInt) => {
    await btnInt.deferUpdate();
    const safeKey = btnInt.customId.replace("skill_", "");
    const branchKey = KEY_TO_ID[safeKey];
    if (!branchKey) return;

    const [freshChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
    if (!freshChar || freshChar.skillPoints < 1) {
      await btnInt.followUp({ content: "❌ Yeterli yetenek puanın yok!", ephemeral: true });
      return;
    }

    const [freshSkills] = await db.select().from(skillsTable).where(eq(skillsTable.discordId, interaction.user.id));
    const currentLevel = freshSkills[branchKey] as number;
    if (currentLevel >= 10) {
      await btnInt.followUp({ content: "❌ Bu branş zaten maksimum seviyede!", ephemeral: true });
      return;
    }

    await db.update(skillsTable)
      .set({ [branchKey]: currentLevel + 1 } as Partial<SkillRow>)
      .where(eq(skillsTable.discordId, interaction.user.id));
    await db.update(charactersTable)
      .set({ skillPoints: freshChar.skillPoints - 1 })
      .where(eq(charactersTable.discordId, interaction.user.id));

    const [updatedSkills] = await db.select().from(skillsTable).where(eq(skillsTable.discordId, interaction.user.id));
    const [updatedChar] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));

    await btnInt.editReply({
      embeds: [buildEmbed(updatedSkills)],
      components: buildButtons(updatedSkills, updatedChar.skillPoints),
    });
  });
}
