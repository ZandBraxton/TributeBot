const { SlashCommandBuilder } = require("discord.js");
const { createUser, getUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join-tribute")
    .setDescription("Volunteer as tribute for the Mickey Games"),
  async execute(interaction, db, mongoClient) {
    const user = interaction.user;
    const banlist = await getUser(mongoClient, interaction, "banlist", user);

    if (banlist)
      return interaction.reply(
        "You are currently banned from joining The Mickey Games"
      );

    const result = await createUser(mongoClient, interaction, "tributes", user);

    if (result.upsertedId === null) {
      interaction.reply(
        `You have already joined, updating profile information`
      );
    } else {
      interaction.reply(`Added ${user.username} to the tributes!`);
    }
  },
};
