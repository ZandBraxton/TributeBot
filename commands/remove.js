const { SlashCommandBuilder } = require("@discordjs/builders");
const { deleteUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("(Mickey Masters Only) Add a user to the list of tributes")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Removes a user from tributes")
        .addUserOption((option) =>
          option.setName("user").setDescription("Select a user")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cpu")
        .setDescription("Removes a CPU from stored CPU's")
        .addStringOption((option) =>
          option
            .setName("cpu")
            .setDescription("Enter the name of the CPU you wish to remove")
        )
    ),
  async execute(interaction, db, mongoClient) {
    let user;
    let collection;
    if (interaction.options.getSubcommand() === "user") {
      user = interaction.options.getUser("user");
      collection = "tributes";
    } else if (interaction.options.getSubcommand() === "cpu") {
      const username = interaction.options.getString("cpu");
      user = {
        username: username,
        guild: interaction.guildId,
      };
      collection = "cpu-tributes";
    }

    if (!user) return interaction.reply("You must specify a user!");
    const result = await deleteUser(mongoClient, interaction, collection, user);

    if (result.deletedCount === 0) {
      interaction.reply(`${user.username} cannot be found!`);
    } else {
      interaction.reply(`${user.username} has been removed!`);
    }
  },
};
