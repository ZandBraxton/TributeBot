const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const { getTributes } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tributes")
    .setDescription("Gets a list of current tributes!"),
  async execute(interaction, db, mongoClient) {
    const result = await getTributes(
      mongoClient,
      interaction,
      "active-tributes"
    );
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
  const tributeEmbed = new MessageEmbed()
    .setImage("attachment://tributesPage.png")
    .setColor("#5d5050");

  const canvas = await canvasHelper.populateCanvas(players, districtSize);

  const attachment = new MessageAttachment(
    canvas.toBuffer(),
    "tributesPage.png"
  );

  await interaction.editReply({
    embeds: [tributeEmbed],
    files: [attachment],
    ephemeral: true,
  });
}
