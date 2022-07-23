const { SlashCommandBuilder } = require("discord.js");
const { getUser } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock-tributes")
    .setDescription(
      "(Game Runners Only) Lock or unlock the command for users to join tributes"
    )
    .addStringOption((option) =>
      option
        .setName("lock")
        .setDescription("Set Lock")
        .setRequired(true)
        .addChoices(
          { name: "Lock", value: "lock" },
          { name: "Unlock", value: "unlock" }
        )
    ),
  async execute(interaction, db, mongoClient, setLock) {
    if (interaction.options.getString("lock") === "lock") {
      setLock(true);
      return interaction.reply("Tributes have been locked!");
    } else {
      setLock(false);
      return interaction.reply("Tributes have been unlocked!");
    }
  },
};
