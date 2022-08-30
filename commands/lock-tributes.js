const { SlashCommandBuilder } = require("discord.js");
const { getUser, setLock } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock-tributes")
    .setDescription(
      "(Hosts Only) Lock/Unlock users being able to join your game"
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
  async execute(interaction) {
    if (interaction.options.getString("lock") === "lock") {
      setLock(interaction, true);
      return interaction.reply("Tributes have been locked!");
    } else {
      setLock(interaction, false);
      return interaction.reply("Tributes have been unlocked!");
    }
  },
};
