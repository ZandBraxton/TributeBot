const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const { getTributes } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("List of commands"),
  async execute(interaction, db, mongoClient) {
    const info = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Tributebot - A Hunger Games Simulator")
      .setDescription("List of helpful commands")
      .addFields(
        { name: "Join the games", value: "/join-tribute", inline: true },
        { name: "\u200B", value: "\u200B", inline: true },
        { name: "Leave the games", value: "/leave-tribute", inline: true },
        { name: "Show current tributes", value: "/tributes" },
        { name: "\u200B", value: "\u200B" },
        {
          name: "Bet on the district that you think will be the victor!",
          value: "Only one bet can be placed per game!",
        },
        { name: "To view your points", value: "/points", inline: true },
        { name: "\u200B", value: "\u200B", inline: true },
        { name: "To view the current pool", value: "/pool", inline: true },
        { name: "To place a bet", value: "/bet", inline: true },
        { name: "To withdraw a bet", value: "/withdraw", inline: true }
      )
      .setFooter({
        text: "Visit #scam-bot to learn more about earning points!",
      });
    interaction.reply({
      embeds: [info],
      ephemeral: true,
    });
  },
};
