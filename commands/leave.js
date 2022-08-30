const { SlashCommandBuilder } = require("discord.js");
const { deleteUser } = require("../helpers/queries");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave-tribute")
    .setDescription("Leave the Mickey Games")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Who's game do you want to leave?")
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.user;
    const selectedHost = interaction.options.getString("game");

    const result = await deleteUser(
      interaction,
      "tributes",
      user,
      selectedHost
    );

    if (result.modifiedCount === 0) {
      interaction.reply(`User not found in tributes`);
    } else {
      interaction.reply(`${user.username} has left ${selectedHost}'s game`);
    }
  },
};
