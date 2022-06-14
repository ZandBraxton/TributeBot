const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join-tribute")
    .setDescription("Volunteer as tribute for the Mickey Games"),
  async execute(interaction) {
    const user = interaction.user;
    console.log(user);
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        players = JSON.parse(data);
        let found = players.find((p) => p.id === user.id);
        if (found !== undefined) {
          return interaction.reply("You have already joined!");
        }
        players.push({
          id: user.id,
          username: user.username,
          avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`,
        });
        let json = JSON.stringify(players);
        fs.writeFile("tributes.json", json, function (error) {
          if (error) {
            console.log("[write auth]:" + error);
          } else {
            console.log("HELLO");
            // console.log(JSON.parse(fs.readFileSync("game.json", "utf-8")));
          }
        });
        interaction.reply(`Added ${user.username} to the tributes!`);
      }
    });
  },
};
