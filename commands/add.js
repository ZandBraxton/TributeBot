const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");
const { createUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("(Mickey Masters Only) Add a user to the list of tributes")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    ),
  async execute(interaction, db, mongoClient) {
    const user = await interaction.options.getUser("user");
    if (!user) return interaction.reply("You must specify a user!");
    const result = await createUser(mongoClient, interaction, user);

    if (result.upsertedId === null) {
      interaction.reply(
        `User had already been added, updating profile information`
      );
    } else {
      interaction.reply(`Added ${user.username} to the tributes!`);
    }

    // console.log(user);
    // fs.readFile("tributes.json", "utf-8", function (err, data) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     players = JSON.parse(data);
    //     let found = players.find((p) => p.id === user.id);
    //     if (found !== undefined) {
    //       return interaction.reply("This user has already been added!");
    //     }
    //     players.push({
    //       id: user.id,
    //       username: user.username,
    //       avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`,
    //     });
    //     let json = JSON.stringify(players);
    //     fs.writeFile("tributes.json", json, function (error) {
    //       if (error) {
    //         console.log("[write auth]:" + error);
    //       } else {
    //         console.log("HELLO");
    //         // console.log(JSON.parse(fs.readFileSync("game.json", "utf-8")));
    //       }
    //     });
    //     interaction.reply(`Added ${user.username} to the tributes!`);
    //   }
    // });
  },
};
