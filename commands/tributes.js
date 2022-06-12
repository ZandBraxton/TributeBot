const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tributes")
    .setDescription("Gets a list of current tributes!"),
  async execute(interaction) {
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        players = JSON.parse(data);

        const embed = new MessageEmbed()
          .setColor("#0099ff")
          .setTitle(`Tributes`);
        let n = 0;
        let i = 0;
        console.log(players.length);
        for (const t of players) {
          if (players[n] !== undefined || players[n + 1] !== undefined) {
            embed.addFields({
              name: `District ${i + 1}`,
              value: `${players[n].username}: ${players[n].status}\n${
                !players[n + 1] ? "None" : players[n + 1].username
              }: ${!players[n + 1] ? "" : players[n + 1].status}`,
              inline: true,
            });
            i += 1;
            n += 2;
          }
        }
        interaction.reply({
          embeds: [embed],
        });
      }
    });
  },
};
