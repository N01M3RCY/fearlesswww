import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { db, houseCupTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, houseEmoji, COLORS } from "../embed";
import { CONFIG } from "../config";

const HOUSES = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];

async function ensureHouses() {
  for (const house of HOUSES) {
    const [existing] = await db.select().from(houseCupTable).where(eq(houseCupTable.house, house));
    if (!existing) {
      await db.insert(houseCupTable).values({ house, points: 0 });
    }
  }
}

export const data = new SlashCommandBuilder()
  .setName("puan")
  .setDescription("Bina kupası puan sistemi")
  .addSubcommand(sub =>
    sub.setName("ver").setDescription("Binaya puan ver (Seherbaz/Yönetim)")
      .addStringOption(opt =>
        opt.setName("bina").setDescription("Bina seç").setRequired(true)
          .addChoices(
            { name: "Gryffindor", value: "Gryffindor" },
            { name: "Slytherin", value: "Slytherin" },
            { name: "Ravenclaw", value: "Ravenclaw" },
            { name: "Hufflepuff", value: "Hufflepuff" },
          )
      )
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Verilecek puan miktarı").setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName("sebep").setDescription("Puan verme sebebi").setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName("al").setDescription("Binadan puan al (Seherbaz/Yönetim)")
      .addStringOption(opt =>
        opt.setName("bina").setDescription("Bina seç").setRequired(true)
          .addChoices(
            { name: "Gryffindor", value: "Gryffindor" },
            { name: "Slytherin", value: "Slytherin" },
            { name: "Ravenclaw", value: "Ravenclaw" },
            { name: "Hufflepuff", value: "Hufflepuff" },
          )
      )
      .addIntegerOption(opt => opt.setName("miktar").setDescription("Alınacak puan miktarı").setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName("sebep").setDescription("Puan alma sebebi").setRequired(false))
  )
  .addSubcommand(sub => sub.setName("tablosu").setDescription("Güncel bina kupası sıralaması"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  await ensureHouses();

  if (sub === "tablosu") {
    const cups = await db.select().from(houseCupTable);
    cups.sort((a, b) => b.points - a.points);

    const medals = ["🥇", "🥈", "🥉", "4️⃣"];
    const lines = cups.map((c, i) =>
      `${medals[i] ?? "▪️"} **${houseEmoji(c.house)} ${c.house}** — ${c.points} Puan`
    );

    await interaction.reply({
      embeds: [createEmbed("🏆 Bina Kupası Sıralaması", lines.join("\n"), COLORS.gold, "Hogwarts Bina Kupası")]
    });
    return;
  }

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasAuth = member?.roles.cache.some(r =>
    r.name === CONFIG.roles.auror || r.name === CONFIG.roles.ministry || r.permissions.has("Administrator")
  );

  if (!hasAuth) {
    await interaction.reply({ embeds: [createEmbed("❌ Yetkisiz", "Bu komutu kullanmak için **Seherbaz** veya **Bakanlık** rolüne ihtiyacın var.", COLORS.error)], ephemeral: true });
    return;
  }

  const house = interaction.options.getString("bina", true);
  const amount = interaction.options.getInteger("miktar", true);
  const reason = interaction.options.getString("sebep") ?? "Belirtilmedi";

  const [current] = await db.select().from(houseCupTable).where(eq(houseCupTable.house, house));
  const currentPoints = current?.points ?? 0;
  const newPoints = sub === "ver" ? currentPoints + amount : Math.max(0, currentPoints - amount);

  await db.update(houseCupTable).set({ points: newPoints }).where(eq(houseCupTable.house, house));

  const action = sub === "ver" ? "verildi ✨" : "alındı ⚡";
  const embed = createEmbed(
    `${houseEmoji(house)} Bina Kupası`,
    [
      `**Bina:** ${house}`,
      `**${sub === "ver" ? "Verilen" : "Alınan"} Puan:** ${amount}`,
      `**Sebep:** ${reason}`,
      `**Yeni Toplam:** ${newPoints} Puan`,
    ].join("\n"),
    COLORS.gold
  );

  await interaction.reply({ embeds: [embed] });

  if (CONFIG.channels.housePoints) {
    const ch = interaction.guild?.channels.cache.get(CONFIG.channels.housePoints);
    if (ch?.isTextBased()) await (ch as any).send({ embeds: [embed] });
  }
}
