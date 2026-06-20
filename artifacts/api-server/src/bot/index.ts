import { Events, GuildMember } from "discord.js";
import { client, commands } from "./client";
import { CONFIG } from "./config";
import { logger } from "../lib/logger";
import { handleVoiceStateUpdate } from "./handlers/xp-voice";
import { handleMemberUpdate } from "./handlers/azkaban";
import { startSalaryLoop, startOwlMailLoop } from "./handlers/salary";
import {
  handleSortingButton,
  handleSortingModal1,
  handleSortingModal2,
  handleSortingModal3,
  handleOpenModal2,
  handleOpenModal3,
  handleSortingApproval,
  handleIntroApproval,
} from "./handlers/sorting-hat";
import { handleModal as handleKarakterTanitimModal } from "./commands/karakter-tanitim";

import * as kimlikCmd from "./commands/kimlik";
import * as profilCmd from "./commands/profil";
import * as bakiyeCmd from "./commands/bakiye";
import * as oocCmd from "./commands/ooc-guncelle";
import * as marketCmd from "./commands/market";
import * as satinAlCmd from "./commands/satin-al";
import * as akademiCmd from "./commands/akademi";
import * as dersAcCmd from "./commands/ders-ac";
import * as sinavCmd from "./commands/sinav";
import * as puanCmd from "./commands/puan";
import * as baykusCmd from "./commands/baykus";
import * as asaCmd from "./commands/asa";
import * as yetCmd from "./commands/yetenek-agaci";
import * as tanitimCmd from "./commands/karakter-tanitim";
import * as cezaCmd from "./commands/ceza";
import * as setupCmd from "./commands/setup";

const allCommands = [
  kimlikCmd, profilCmd, bakiyeCmd, oocCmd, marketCmd, satinAlCmd,
  akademiCmd, dersAcCmd, sinavCmd, puanCmd, baykusCmd, asaCmd,
  yetCmd, tanitimCmd, cezaCmd, setupCmd,
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, async (c) => {
  logger.info({ tag: c.user.tag }, "Discord bot hazır");
  (global as any).__discordClient = c;
  startSalaryLoop(c);
  startOwlMailLoop(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash komutları
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Komut hatası");
      const reply = { content: "❌ Bir hata oluştu, lütfen tekrar dene.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
    return;
  }

  // Modal submit
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "sorting_modal_1") {
      await handleSortingModal1(interaction).catch(err => logger.error({ err }, "sorting_modal_1 hatası"));
      return;
    }
    if (interaction.customId === "sorting_modal_2") {
      await handleSortingModal2(interaction).catch(err => logger.error({ err }, "sorting_modal_2 hatası"));
      return;
    }
    if (interaction.customId === "sorting_modal_3") {
      await handleSortingModal3(interaction).catch(err => logger.error({ err }, "sorting_modal_3 hatası"));
      return;
    }
    if (interaction.customId === "karakter_tanitim_modal") {
      await handleKarakterTanitimModal(interaction).catch(err => logger.error({ err }, "karakter_tanitim hatası"));
      return;
    }
    return;
  }

  // Buton etkileşimleri
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id === "sorting_hat_start") {
      await handleSortingButton(interaction).catch(err => logger.error({ err }, "sorting_hat_start hatası"));
      return;
    }
    if (id === "sorting_open_modal2") {
      await handleOpenModal2(interaction).catch(err => logger.error({ err }, "sorting_open_modal2 hatası"));
      return;
    }
    if (id === "sorting_open_modal3") {
      await handleOpenModal3(interaction).catch(err => logger.error({ err }, "sorting_open_modal3 hatası"));
      return;
    }
    if (id.match(/^sorting_(approve|reject|gryf|slyt|rave|huff)_\d+$/)) {
      await handleSortingApproval(interaction).catch(err => logger.error({ err }, "sorting_approval hatası"));
      return;
    }
    if (id.match(/^intro_(approve|reject)_\d+$/)) {
      await handleIntroApproval(interaction).catch(err => logger.error({ err }, "intro_approval hatası"));
      return;
    }
  }
});

client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
client.on(Events.GuildMemberUpdate, (o, n) =>
  handleMemberUpdate(o as GuildMember, n as GuildMember)
);

export async function startBot(): Promise<void> {
  if (!CONFIG.token) {
    logger.warn("DISCORD_BOT_TOKEN ayarlanmamış, bot başlatılmıyor");
    return;
  }
  await client.login(CONFIG.token);
}
