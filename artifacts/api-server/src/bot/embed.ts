import { EmbedBuilder, ColorResolvable } from "discord.js";

export const COLORS = {
  gold: 0xFFD700,
  gryffindor: 0xAE0001,
  slytherin: 0x1A472A,
  ravenclaw: 0x0E1A40,
  hufflepuff: 0xECB939,
  dark: 0x2C2F33,
  success: 0x57F287,
  error: 0xED4245,
  warning: 0xFEE75C,
  info: 0x5865F2,
  ministry: 0x4B0082,
  azkaban: 0x1C1C1C,
};

export function createEmbed(
  title: string,
  description: string,
  color: ColorResolvable = COLORS.gold,
  footer?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

export function houseColor(house: string | null | undefined): number {
  switch (house?.toLowerCase()) {
    case "gryffindor": return COLORS.gryffindor;
    case "slytherin": return COLORS.slytherin;
    case "ravenclaw": return COLORS.ravenclaw;
    case "hufflepuff": return COLORS.hufflepuff;
    default: return COLORS.gold;
  }
}

export function houseEmoji(house: string | null | undefined): string {
  switch (house?.toLowerCase()) {
    case "gryffindor": return "🦁";
    case "slytherin": return "🐍";
    case "ravenclaw": return "🦅";
    case "hufflepuff": return "🦡";
    default: return "⚡";
  }
}
