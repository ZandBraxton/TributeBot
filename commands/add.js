const { SlashCommandBuilder } = require("discord.js");
const { createUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("(Game Runners Only) Add a user to the list of tributes")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    ),
  async execute(interaction, db) {
    const user = await interaction.options.getUser("user");
    if (!user) return interaction.reply("You must specify a user!");
    const result = await createUser(interaction.guild.id, "tributes", user);

    if (result.upsertedId === null) {
      interaction.reply(
        `User had already been added, updating profile information`
      );
    } else {
      interaction.reply(`Added ${user.username} to the tributes!`);
    }
  },
};
