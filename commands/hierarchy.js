const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  SelectMenuBuilder,
} = require("discord.js");
const { getEnrolled, getHosts } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hierarchy")
    .setDescription("View list of Admins and Hosts"),
  async execute(interaction) {
    const result = await getHosts(interaction, "hosts");
    console.log(result);
    const admins = [];
    const hosts = [];

    result.map((user) => {
      if (user.admin === true) {
        admins.push(user.username);
      } else {
        hosts.push(user.username);
      }
    });

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Admins & Hosts")
      .addFields({
        name: "Admins",
        value: admins.join(", "),
      });
    if (hosts.length !== 0) {
      embed.addFields({
        name: "Hosts",
        value: hosts.join(", "),
      });
    }

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
