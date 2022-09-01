const { SlashCommandBuilder } = require("discord.js");
const { getTributes, deleteUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flush")
    .setDescription("Remove's all tributes from your game"),
  async execute(interaction) {
    let result = await getTributes(
      interaction,
      "tributes",
      interaction.user.username
    );

    result.map((user) => deleteUser(interaction, "tributes", user, null));

    await interaction.reply({
      content: "All tributes have been removed from your game",
      ephemeral: true,
    });
  },
};
