const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("points")
    .setDescription("placeholder"),
  async execute(interaction, db, mongoClient) {
    const user = interaction.user;
    console.log(user.id);
    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        interaction.user.username,
        interaction.guild.id,
      ])
      .then((res) => {
        interaction.reply(`You have ${res.rows[0].points} points`);
      });

    // interaction.reply(`Added ${user.username} to the tributes!`);
  },
};
