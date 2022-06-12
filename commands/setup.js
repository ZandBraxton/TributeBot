const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
} = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set's up a new hunger games!"),
  async execute(interaction) {
    let players = [];
    const role = await interaction.guild.roles.fetch("979775567501070387");
    await interaction.guild.members.fetch();
    const { members } = role; //Collection of members
    await members.map((m) => {
      console.log(m.user);
      players.push({
        id: m.user.id,
        username: m.user.username,
        avatar: `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.jpeg`,
        status: "Alive",
      });
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
    interaction.reply("Game has been setup!");
  },
};
