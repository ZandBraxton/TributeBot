const { SlashCommandBuilder } = require("discord.js");
const { deleteUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("(Hosts Only) Removes a user from tributes")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    ),
  async execute(interaction) {
    const user = await interaction.options.getUser("user");
    if (!user) return interaction.reply("You must specify a user!");

    const result = await deleteUser(interaction, "tributes", user, null);

    if (result.modifiedCount === 0) {
      interaction.reply(`${user.username} cannot be found!`);
    } else {
      interaction.reply(
        `${user.username} has been removed from ${interaction.user.username} tributes`
      );
    }
  },
};
