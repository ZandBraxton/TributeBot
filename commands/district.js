const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { generateTributes } = require("../helpers/game");
const { getActiveTributes } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("district")
    .setDescription("View the status of your district")
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

    const user = result[0].tributeData.filter(
      (t) => t.username === interaction.user.username
    );

    if (user) {
      const district = result[0].tributeData.filter(
        (t) => t.district === user[0].district
      );
      const winnerImage = await canvasHelper.generateWinnerImage(
        district,
        true
      );
      const winAttachment = new AttachmentBuilder(winnerImage.toBuffer(), {
        name: "winner.png",
      });
      await interaction.editReply({
        // content: "`Bets are now open`",
        files: [winAttachment],
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: "You are not in this game!",
        ephemeral: true,
      });
    }
  },
};
