const { Client, Intents, Collection } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MEMBERS,
    "GUILDS",
  ],
});
const db = require("./database");
const { MongoClient } = require("mongodb");
require("dotenv").config();
let betsOpen = false;
let componentActive = false;

function setComponentActive(bool) {
  componentActive = bool;
}

function setBetsOpen(bool) {
  betsOpen = bool;
}

const mongoClient = new MongoClient(process.env.MONGO_URI);

client.on("ready", () => {
  console.log("ready!");
});

let permissionCommands = [
  "mickey-games",
  "quick-add",
  "add",
  "remove",
  "shuffle",
  "test",
  "cpu-list",
  "store-cpu",
  "enrolled",
];

let allowedUsers = ["Bubbles"];

let oneAtATimeInteraction = ["mickey-games", "cpu-list", "store-cpu"];

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
  if (!interaction.isCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (command.data.name === "bet" || command.data.name === "withdraw") {
    if (betsOpen === false) {
      return interaction.channel.send("Bets are currently closed!");
    }
  }

  if (oneAtATimeInteraction.includes(command.data.name)) {
    if (componentActive === true)
      return interaction.reply(
        "You cannot call this while another command is active"
      );
  }

  if (permissionCommands.includes(command.data.name)) {
    //If we want to make it role specific
    // if (
    //   !interaction.member.roles.cache.some(
    //     (role) => role.name === "Mickey Master"
    //   )
    // )

    if (!allowedUsers.includes(interaction.user.username))
      return interaction.reply(
        "You do not have permission to use this command"
      );
  }

  if (!command) return;

  try {
    await command.execute(
      interaction,
      db,
      mongoClient,
      setComponentActive,
      setBetsOpen,
      client
    );
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.login(process.env.BOT_TOKEN);
