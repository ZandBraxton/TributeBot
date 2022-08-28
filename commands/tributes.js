const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getTributes } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tributes")
    .setDescription("Gets a list of current tributes!"),
  async execute(interaction, db) {
    const result = await getTributes(interaction, "active-tributes");
    if (!result.length) return interaction.reply("There are no tributes");

    await interaction.deferReply({ ephemeral: true });

    await generateTributes(
      result[0].tributeData,
      interaction,
      result[0].districtSize
    );
  },
};

async function generateTributes(players, interaction, districtSize) {
  const tributeEmbed = new EmbedBuilder()
    .setImage("attachment://tributesPage.png")
    .setColor("#5d5050");

  const canvas = await canvasHelper.populateCanvas(players, districtSize);

  const attachment = new AttachmentBuilder(
    canvas.toBuffer(),
    "tributesPage.png"
  );

  await interaction.editReply({
    embeds: [tributeEmbed],
    files: [attachment],
    ephemeral: true,
  });
}
