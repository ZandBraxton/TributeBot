const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { generateTributes } = require("../helpers/game");
const { getActiveTributes } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tributes")
    .setDescription("Gets a list of current tributes!")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Who's game do you want to view?")
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async execute(interaction) {
    const host = interaction.options.getString("game");
    const result = await getActiveTributes(interaction, host);
    if (!result.length) return interaction.reply("There are no tributes");

    await interaction.deferReply({ ephemeral: true });

    const embedData = await generateTributes(
      result[0].tributeData,
      result[0].districtSize
    );

    await interaction.editReply({
      // content: "`Bets are now open`",
      embeds: [embedData.embed],
      files: [embedData.attachment],
      ephemeral: true,
    });
  },
};
