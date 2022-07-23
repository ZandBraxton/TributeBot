const { SlashCommandBuilder } = require("discord.js");
const { deleteUser } = require("../helpers/queries");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave-tribute")
    .setDescription("Leave the Mickey Games"),
  async execute(interaction, db, mongoClient) {
    const user = interaction.user;

    const result = await deleteUser(mongoClient, interaction, "tributes", user);

    if (result.deletedCount === 0) {
      interaction.reply("You have not joined!");
    } else {
      interaction.reply(`${user.username} has left the tributes!`);
    }
  },
};
