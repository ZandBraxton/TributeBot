const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave-tribute")
    .setDescription("Leave the Mickey Games"),
  async execute(interaction) {
    const user = interaction.user;
    console.log(user);
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        players = JSON.parse(data);
        let newPlayers = players.filter((p) => p.id !== user.id);
        let json = JSON.stringify(newPlayers);
        fs.writeFile("tributes.json", json, function (error) {
          if (error) {
            console.log("[write auth]:" + error);
          } else {
            // console.log(JSON.parse(fs.readFileSync("game.json", "utf-8")));
          }
        });
        interaction.reply(`You have left the tributes!`);
      }
    });
  },
};