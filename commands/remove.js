const { SlashCommandBuilder } = require("@discordjs/builders");
const { deleteUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("(Mickey Masters Only) Add a user to the list of tributes")
    .addUserOption((option) =>
      option.setName("user").setDescription("Select a user")
    ),
  async execute(interaction, db, mongoClient) {
    const user = interaction.options.getUser("user");
    if (!user) return interaction.reply("You must specify a user!");
    const result = await deleteUser(mongoClient, interaction, user);

    if (result.deletedCount === 0) {
      interaction.reply(`${user.username} cannot be found!`);
    } else {
      interaction.reply(`${user.username} has left the tributes!`);
    }
  },
};
