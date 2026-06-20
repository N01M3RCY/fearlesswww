import { REST, Routes } from "discord.js";
import { CONFIG } from "./config";
import { logger } from "../lib/logger";

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

export async function registerCommands(): Promise<void> {
  if (!CONFIG.token || !CONFIG.clientId || !CONFIG.guildId) {
    logger.warn("Discord credentials missing, skipping command registration");
    return;
  }

  const commandData = [
    kimlikCmd, profilCmd, bakiyeCmd, oocCmd, marketCmd, satinAlCmd,
    akademiCmd, dersAcCmd, sinavCmd, puanCmd, baykusCmd, asaCmd,
    yetCmd, tanitimCmd, cezaCmd,
  ].map(cmd => cmd.data.toJSON());

  const rest = new REST().setToken(CONFIG.token);

  try {
    logger.info(`Registering ${commandData.length} slash commands...`);
    await rest.put(
      Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId),
      { body: commandData }
    );
    logger.info("Slash commands registered successfully");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
