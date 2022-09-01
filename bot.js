require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  InteractionType,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});
const db = require("./database");
const { submitBet } = require("./helpers/game");
const { getHosts } = require("./helpers/queries");
let betsOpen = false;
let componentActive = false;
let lock = false;

function setComponentActive(bool) {
  componentActive = bool;
}

function setLock(bool) {
  lock = bool;
}

function setBetsOpen(bool) {
  betsOpen = bool;
}

client.on("ready", () => {
  console.log("ready!");
});

let adminCommands = ["permission"];

let permissionCommands = [
  "mickey-games",
  "add",
  "remove",
  "flush",
  "lock-tributes",
  "banlist",
  "cpu",
  "game-runner-info",
];

// let oneAtATimeInteraction = ["mickey-games", "cpu"];

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.commands.set(command.data.name, command);
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    if (
      interaction.commandName === "tributes" ||
      interaction.commandName === "join-tribute" ||
      interaction.commandName === "leave-tribute"
    ) {
      let choices = [];
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "game") {
        try {
          const result = await getHosts(interaction, "hosts");
          result.map((user) => choices.push(user));
          return await interaction.respond(
            choices.map((user) => ({
              name: user.username,
              value: user.username,
            }))
          );
        } catch (error) {}
      }
    }
  }
  if (interaction.type === InteractionType.ModalSubmit) {
    try {
      await submitBet(interaction);
    } catch (error) {
      await interaction.reply({
        content: "Something went wrong!",
        ephemeral: true,
      });
    }
  }

  if (interaction.type !== InteractionType.ApplicationCommand) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  // if (command.data.name === "bet") {
  //   if (betsOpen === false) {
  //     return interaction.channel.send("Bets are currently closed!");
  //   }
  // }

  if (adminCommands.includes(command.data.name)) {
    //If we want to make it role specific
    // if (
    //   !interaction.member.roles.cache.some(
    //     (role) => role.name === "Mickey Master"
    //   )
    // )
    const result = await getHosts(interaction, "hosts");

    if (
      !result.some(
        (user) =>
          user.username === interaction.user.username && user.admin === true
      )
    )
      return interaction.reply(
        "You do not have permission to use this command"
      );
  }

  if (permissionCommands.includes(command.data.name)) {
    //If we want to make it role specific
    // if (
    //   !interaction.member.roles.cache.some(
    //     (role) => role.name === "Mickey Master"
    //   )
    // )
    const result = await getHosts(interaction, "hosts");

    if (!result.some((user) => user.username === interaction.user.username))
      return interaction.reply(
        "You do not have permission to use this command"
      );
  }

  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    try {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.BOT_TOKEN);
