const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getActiveTributes } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("me")
    .setDescription("View your status in an active game")
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
      const embed = new EmbedBuilder()
        .setTitle(`${user[0].username} - District ${user[0].district}`)
        .setColor("#5d5050")
        .addFields(
          {
            name: `Status`,
            value: user[0].alive ? `Alive` : `Deceased`,
          },
          {
            name: `Kills`,
            value: `${user[0].kills}`,
          }
        );
      await interaction.editReply({
        embeds: [embed],
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
