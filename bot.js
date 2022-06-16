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
const { activateBets, getBets } = require("./helpers/queries");
const bet = require("./commands/bet");
require("dotenv").config();
let betsOpen = false;
let bets = [];
let pool = [];
// let bets = [
//   { district: "1", amount: 1265, username: "Bubbles" },
//   { district: "1", amount: 400, username: "Tron Maker" },
//   { district: "2", amount: 2, username: "Kaio" },
// ];

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
  "test",
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
  console.log(pool);
  console.log(bets);
  // console.log(interaction);
  if (!interaction.isCommand()) {
    // if (interaction.customId.substring(0, 3) === "bet") {
    //   let data = JSON.parse(interaction.values[0]);
    //   let found = bets.find((element) => element.username === data.username);
    //   if (found !== undefined) return;
    //   pool += data.betAmount;
    //   bets.push({
    //     district: data.district,
    //     amount: data.betAmount,
    //     username: data.username,
    //   });

    //   console.log(
    //     `${data.username} has bet ${data.betAmount} on District ${data.district}, the total pool is now ${pool}.`
    //   );
    //   interaction.channel.send(".");
    // }

    console.log("here");
    if (interaction.customId.substring(0, 5) === "start") {
      betsOpen = false;
      let result = await getBets(mongoClient, interaction);
      let pot = 0;
      console.log(result.bets);
      await bets.map((bet) => {
        pot += bet.amount;
        result.bets[bet.district].total += bet.amount;
        result.bets[bet.district].users.push({
          username: bet.username,
          amount: bet.amount,
        });
        console.log(result.bets[1].users);
        console.log(pot);
      });

      await activateBets(mongoClient, interaction, {
        guild: interaction.guild.id,
        bets: result.bets,
        pot: pot,
      });
      bets = [];
      pool = 0;
    }
    return;
  }
  console.log("not here");

  const command = client.commands.get(interaction.commandName);

  // console.log(command.data);
  // console.log(interaction.customId);

  if (command.data.name === "mickey-games") betsOpen = true;

  if (
    command.data.name === "bet" ||
    command.data.name === "withdraw" ||
    command.data.name === "pool"
  ) {
    if (betsOpen === false)
      return interaction.channel.send("Bets are currently closed!");
    // return interaction.reply({
    //   content: "Bets are currently closed!",
    //   ephemeral: true,
    // });
    try {
      await command.execute(interaction, db, mongoClient, bets, pool);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
    return;
  }

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
