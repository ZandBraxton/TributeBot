const { SlashCommandBuilder } = require("discord.js");
const { updateHost } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("(Bubbles Only)")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    )
    .addBooleanOption((option) =>
      option.setName("permission").setDescription("Grant or remove permission")
    ),
  async execute(interaction) {
    if (interaction.user.username !== "Bubbles") {
      return interaction.reply(
        "You do not have permission to use this command"
      );
    }
    const user = await interaction.options.getUser("user");
    const boolean = interaction.options.getBoolean("permission");

    const result = await updateHost(interaction, "hosts", user, boolean, true);
    console.log(result);

    if (result.upsertedId === null && result.modifiedCount === 0) {
      interaction.reply(
        `${user.username} is already an Admin, updating profile information`
      );
    } else if (result.deletedCount === 1) {
      interaction.reply(`${user.username} is no longer an Admin`);
    } else if (result.deletedCount === 0) {
      interaction.reply(`${user.username} is not an Admin`);
    } else {
      interaction.reply(`${user.username} is now an Admin`);
    }
  },
};
