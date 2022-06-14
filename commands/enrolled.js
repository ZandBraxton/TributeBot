const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("enrolled")
    .setDescription("Who's enrolled for the mickey games?"),
  async execute(interaction) {
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        players = JSON.parse(data);
        let p = players.map((p) => p.username);
        console.log(p.join(", "));
        // interaction.reply(`Added ${user.username} to the tributes!`);
        const enrolled = new MessageEmbed()
          .setColor("#0099ff")
          .setTitle("Added Players")
          .addFields({
            name: "Players",
            value: p.join(", "),
          });

        console.log(players.map((p) => p.username).toString());

        // for (const p of players) {
        //     enrolled.addFields({
        //         name: "Players",
        //         value:
        //     });
        // }

        interaction.reply({
          embeds: [enrolled],
        });
      }
    });
  },
};
