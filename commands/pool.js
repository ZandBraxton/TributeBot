const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const { getBets, activateBets } = require("../helpers/queries");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("pool")
    .setDescription("View the current pool"),
  async execute(interaction, db, mongoClient) {
    const result = await getBets(mongoClient, interaction);

    let bets = result.bets;
    let districtCount = result.districtCount;

    if (!bets.length)
      return interaction.reply({
        content: "There are no bets!",
        ephemeral: true,
      });

    const poolEmbed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Pool")
      .addFields({
        name: `Total Pool`,
        value: `${result.pool} points`,
      });

    for (let i = 0; i < districtCount; i++) {
      let value = [];

      await bets.map((bet) => {
        if (bet.district === i + 1) {
          value.push(`${bet.username} - ${bet.amount}`);
        }
      });

      console.log(value);

      poolEmbed.addFields({
        name: `District ${i + 1}`,
        value: value.length === 0 ? "No Bets" : value.join("\n"),
      });
    }

    // await bets.map((bet) => {
    //   poolEmbed.addFields({
    //     name: `${bet.username}`,
    //     value: `${bet.amount} points on District ${bet.district}`,
    //   });
    // });
    // let b = result.map((p) => p.username);

    interaction.reply({
      embeds: [poolEmbed],
    });
  },
};
