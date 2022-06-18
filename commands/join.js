const { SlashCommandBuilder } = require("@discordjs/builders");
const { createUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join-tribute")
    .setDescription("Volunteer as tribute for the Mickey Games"),
  async execute(interaction, db, mongoClient) {
    const user = interaction.user;

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
