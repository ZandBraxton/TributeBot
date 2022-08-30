const { SlashCommandBuilder } = require("discord.js");
const { createUser, getUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join-tribute")
    .setDescription("Volunteer as tribute for the Mickey Games")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Who's game do you want to join?")
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async execute(interaction, db) {
    const user = interaction.user;
    const selectedHost = interaction.options.getString("game");

    const host = await getUser(interaction, "hosts", selectedHost);
    if (host.lockedTributes) {
      return await interaction.reply({
        content: "Tributes are currently locked for this game",
        ephemeral: true,
      });
    }

    // const banlist = await getUser(interaction, "banlist", user);

    // if (banlist)
    //   return interaction.reply(
    //     "You are currently banned from joining The Mickey Games"
    //   );

    const result = await createUser(
      interaction,
      "tributes",
      user,
      selectedHost
    );

    if (result.upsertedId === null && result.modifiedCount === 0) {
      interaction.reply(
        `${user.username} had already been added, updating profile information`
      );
    } else {
      interaction.reply(`Added ${user.username} to the tributes!`);
    }
  },
};
