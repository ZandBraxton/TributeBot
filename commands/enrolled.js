const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  SelectMenuBuilder,
} = require("discord.js");
const { getEnrolled } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("enrolled")
    .setDescription("Who's enrolled for the mickey games?"),
  async execute(interaction, db) {
    const result = await getEnrolled(interaction, "tributes");

    if (!result.length) return interaction.reply("There are no tributes");

    const gameRunners = {};
    result.map((user) => {
      user.active.map((gameRunner) => {
        if (gameRunners[gameRunner]) {
          gameRunners[gameRunner].push(user);
        } else {
          gameRunners[gameRunner] = [];
          gameRunners[gameRunner].push(user);
        }
      });
    });
    const enrolledRow = new SelectMenuBuilder()
      .setCustomId("gameRunners")
      .setPlaceholder("Other Games");
    for (const runner in gameRunners) {
      enrolledRow.addOptions({
        label: runner,
        value: runner,
        default: false,
      });
    }

    const row = new ActionRowBuilder().addComponents(enrolledRow);
    let user = Object.keys(gameRunners)[0];
    const embed = await generateEnrolledEmbed(user, gameRunners);

    interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    const reply = await interaction.fetchReply();
    const filter = (i) => {
      return i.user.id === interaction.user.id;
    };

    const collector = await reply.createMessageComponentCollector({
      filter,
    });

    collector.on("collect", async (interaction) => {
      try {
        await interaction.deferUpdate();
        const embed = await generateEnrolledEmbed(
          interaction.values[0],
          gameRunners
        );
        await interaction.editReply({
          embeds: [embed],
        });
      } catch (error) {}
    });
  },
};

async function generateEnrolledEmbed(user, gameRunners) {
  let p = gameRunners[user].map((p) => p.username);
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`${user} - Tributes`)
    .addFields({
      name: "Players",
      value: p.join(", "),
    });

  return embed;
}
