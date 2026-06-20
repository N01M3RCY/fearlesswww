import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import { db, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createEmbed, COLORS } from "../embed";

export const data = new SlashCommandBuilder()
  .setName("ooc-guncelle")
  .setDescription("OOC isim ve yaşını güncelle")
  .addStringOption(opt => opt.setName("isim").setDescription("Yeni OOC ismin").setRequired(true))
  .addIntegerOption(opt => opt.setName("yas").setDescription("Yeni OOC yaşın").setRequired(true).setMinValue(13).setMaxValue(99));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString("isim", true);
  const age = interaction.options.getInteger("yas", true);

  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.discordId, interaction.user.id));
  if (!char) {
    await interaction.reply({ embeds: [createEmbed("❌ Hata", "Kayıtlı karakterin bulunamadı.", COLORS.error)], ephemeral: true });
    return;
  }

  await db.update(charactersTable).set({ oocName: name, oocAge: age }).where(eq(charactersTable.discordId, interaction.user.id));

  // Discord takma adını güncelle
  const newNick = `${name} | ${age}`;
  try {
    const member = interaction.member as GuildMember;
    await member.setNickname(newNick);
  } catch {}

  await interaction.reply({
    embeds: [createEmbed("✅ Güncellendi", `OOC bilgilerin güncellendi!\n**İsim:** ${name}\n**Yaş:** ${age}\n**Discord Takma Adı:** ${newNick}`, COLORS.success)],
    ephemeral: true
  });
}
