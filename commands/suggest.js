const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Suggest a scenario for the hunger games"),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(interaction.user.username)
      .setTitle("Suggest a scenario to be added");

    const scenarioInput = new TextInputBuilder()
      .setCustomId("scenario")
      .setLabel(`Enter your suggestion below`)
      .setPlaceholder('E.g: "Someone dropkicks someone else off a cliff"')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(scenarioInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  },
};
