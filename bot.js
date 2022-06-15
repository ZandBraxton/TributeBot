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
const canvasHelper = require("./helpers/canvas");
require("dotenv").config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

// async function run() {
//   try {
//     // Connect the client to the server
//     await mongoClient.connect();
//     // Establish and verify connection
//     await mongoClient.db("admin").command({ ping: 1 });
//     console.log("Connected successfully to server");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await mongoClient.close();
//   }
// }
// run().catch(console.dir);

client.on("ready", () => {
  const Guilds = client.guilds.cache.map((guild) => guild.id);

  console.log("ready!");
});

let permissionCommands = [
  "mickey-games",
  "quick-add",
  "add",
  "remove",
  "shuffle",
];

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
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (permissionCommands.includes(command.data.name)) {
    // if (
    //   !interaction.member.roles.cache.some(
    //     (role) => role.name === "Mickey Master"
    //   )
    // )
    if (interaction.user.username !== "Bubbles")
      return interaction.reply(
        "You do not have permission to use this command"
      );
  }

  if (!command) return;

  try {
    await command.execute(interaction, db, mongoClient);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

currentPlayers = [];

// discordClient.on("messageCreate", async (message) => {
//   if (message.author.bot) return;
//   let id;
//   await db
//     .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
//       message.author.username,
//       message.guild.id,
//     ])
//     .then((res) => (id = res.rows[0].userid));
//   const user = await discordClient.users.fetch(id).catch(console.error);

//   let link = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`;

//   const role = await message.guild.roles.fetch("979775567501070387");
//   await message.guild.members.fetch();
//   const { members } = role; //Collection of members
//   members.map((m) => currentPlayers.push(m.user));
//   let json = JSON.stringify(currentPlayers);
//   fs.writeFile("game.json", json, function (error) {
//     if (error) {
//       console.log("[write auth]:" + error);
//     } else {
//       console.log(JSON.parse(fs.readFileSync("game.json", "utf-8")));
//     }
//   });
//   console.log(link);
// });

client.login(process.env.BOT_TOKEN);
