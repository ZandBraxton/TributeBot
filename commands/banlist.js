const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const {
  getUser,
  getTributes,
  deleteUser,
  createUser,
  createBan,
  removeBan,
  getBanned,
} = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Call to view banlist, or add a user ")
    .addSubcommand((subcommand) =>
      subcommand.setName("view").setDescription("(Hosts Only) View the banlist")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription(
          "(Hosts Only) Add a user to the banlist, preventing them from joining"
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
        .setDescription("(Hosts Only) Remove a user from the banlist")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Select a user")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const choice = interaction.options.getSubcommand();
    const banlist = await getBanned(
      interaction,
      "tributes",
      interaction.user.username
    );
    if (choice === "view") {
      if (banlist.length === 0)
        return interaction.reply("The banlist is empty");

      let p = banlist.map((p) => p.username);
      const banlistEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${interaction.user.username} - Banlist`)
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
        const result = await removeBan(interaction, "tributes", user);

        if (result.modifiedCount === 0) {
          interaction.reply(`${user.username} is not on the banlist`);
        } else {
          interaction.reply(
            `${user.username} has been removed from ${interaction.user.username}'s banlist`
          );
        }
      } else {
        await deleteUser(interaction, "tributes", user, null);

        const result = await createBan(interaction, "tributes", user);
        if (result.upsertedId === null && result.modifiedCount === 0) {
          interaction.reply(`${user.username} had already been banned`);
        } else {
          interaction.reply(
            `Added ${user.username} to ${interaction.user.username}'s banlist`
          );
        }
      }
    }
  },
};
