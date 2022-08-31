const { SlashCommandBuilder } = require("discord.js");
const { createUser, getUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("(Host's Only) Add a user to the list of tributes")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    ),
  async execute(interaction) {
    const user = await interaction.options.getUser("user");
    if (!user) return interaction.reply("You must specify a user!");

    const banCheck = await getUser(interaction, "tributes", user.username);

    if (banCheck.banned.includes(interaction.user.username))
      return interaction.reply(
        `${user.username} is currently banned from joining this game`
      );

    const result = await createUser(interaction, "tributes", user, null);

    if (result.upsertedId === null && result.modifiedCount === 0) {
      interaction.reply(
        `${user.username} had already been added, updating profile information`
      );
    } else {
      interaction.reply(
        `Added ${user.username} to ${interaction.user.username}'s tributes`
      );
    }
  },
};

///someone
