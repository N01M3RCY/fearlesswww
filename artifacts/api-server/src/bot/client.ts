import { Client, GatewayIntentBits, Collection, Partials } from "discord.js";

// GuildMembers ve MessageContent = privileged intents, Discord Dev Portal'dan aktif edilmeli
// https://discord.com/developers/applications → Bot → Privileged Gateway Intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // Dev Portal: SERVER MEMBERS INTENT
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,    // Dev Portal: MESSAGE CONTENT INTENT
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

export const commands = new Collection<string, any>();
