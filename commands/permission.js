const { SlashCommandBuilder } = require("discord.js");
const { updateHost } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("host")
    .setDescription("(Admins Only) Grants/Removes the ability to host games")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    )
    .addBooleanOption((option) =>
      option.setName("permission").setDescription("Grant or remove permission")
    ),
  async execute(interaction) {
    const user = await interaction.options.getUser("user");
    const boolean = interaction.options.getBoolean("permission");

    const result = await updateHost(interaction, "hosts", user, boolean, false);

    if (result === "Denied") {
      interaction.reply(`You cannot change an Admins permission`);
    } else if (result.upsertedId === null && result.modifiedCount === 0) {
      interaction.reply(
        `${user.username} is already a Host, updating profile information`
      );
    } else if (result.deletedCount === 1) {
      interaction.reply(`${user.username} is no longer a Host`);
    } else if (result.deletedCount === 0) {
      interaction.reply(`${user.username} is not a Host`);
    } else {
      interaction.reply(`${user.username} is now a Host`);
    }
  },
};

///someone
