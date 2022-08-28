const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { getTributes } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("enrolled")
    .setDescription("Who's enrolled for the mickey games?"),
  async execute(interaction, db) {
    const result = await getTributes(interaction, "tributes");

    if (!result.length) return interaction.reply("There are no tributes");
    let p = result.map((p) => p.username);
    const enrolled = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Added Players")
      .addFields({
        name: "Players",
        value: p.join(", "),
      });
    interaction.reply({
      embeds: [enrolled],
      ephemeral: true,
    });
  },
};
