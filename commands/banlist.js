const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const {
  getUser,
  getTributes,
  deleteUser,
  createUser,
} = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Call to view banlist, or add a user ")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("(Game Runners Only) View the banlist")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription(
          "(Game Runners Only) Add a user to the banlist, preventing them from joining"
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Select a user")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("(Game Runners Only) Remove a user from the banlist")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Select a user")
            .setRequired(true)
        )
    ),
  async execute(interaction, db, mongoClient) {
    const choice = interaction.options.getSubcommand();
    const banlist = await getTributes(mongoClient, interaction, "banlist");
    console.log(banlist);
    if (choice === "view") {
      if (banlist.length === 0)
        return interaction.reply("The banlist is empty");

      let p = banlist.map((p) => p.username);
      const banlistEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("banlist Users")
        .addFields({
          name: "Users",
          value: p.join(", "),
        });
      interaction.reply({
        embeds: [banlistEmbed],
        ephemeral: true,
      });
    } else {
      const user = await interaction.options.getUser("user");
      if (!user) return interaction.reply("You must specify a user!");

      //if removing
      if (choice === "remove") {
        const result = await deleteUser(
          mongoClient,
          interaction,
          "banlist",
          user
        );

        if (result.deletedCount === 0) {
          interaction.reply(`${user.username} is not on the banlist!`);
        } else {
          interaction.reply(
            `${user.username} has been removed from the banlist!`
          );
        }
      } else {
        //if adding
        //check if user is part of tributes
        const partOfTributes = await getUser(
          mongoClient,
          interaction,
          "tributes",
          user
        );
        if (partOfTributes) {
          await deleteUser(mongoClient, interaction, "tributes", user);
        }

        const result = await createUser(
          mongoClient,
          interaction,
          "banlist",
          user
        );
        if (result.upsertedId === null) {
          interaction.reply(
            `User had already been added, updating profile information`
          );
        } else {
          interaction.reply(`Added ${user.username} to the banlist!`);
        }
      }
    }
  },
};
