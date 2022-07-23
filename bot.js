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
// const { MongoClient } = require("mongodb");
const { submitBet } = require("./helpers/game");
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

// const mongoClient = new MongoClient(process.env.MONGO_URI);

client.on("ready", () => {
  console.log("ready!");
});

let permissionCommands = [
  "mickey-games",
  "add",
  "remove",
  "lock-tributes",
  "banlist",
  "cpu",
  "game-runner-info",
];

let allowedUsers = ["Bubbles"];

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
  if (interaction.type === InteractionType.ModalSubmit) {
    console.log(interaction);
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

  console.log(command);

  if (command.data.name === "bet") {
    if (betsOpen === false) {
      return interaction.channel.send("Bets are currently closed!");
    }
  }

  if (command.data.name === "lock-tributes") {
    try {
      await command.execute(interaction, db, mongoClient, setLock);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
    return;
  }

  if (command.data.name === "join-tribute") {
    if (lock === true) {
      return interaction.reply(
        "Tributes are currently locked! Only Game Runners can add tributes at this time."
      );
    }
  }

  // if (oneAtATimeInteraction.includes(command.data.name)) {
  //   if (componentActive === true)
  //     return interaction.reply(
  //       "You cannot call this while another command is active"
  //     );
  // }

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
