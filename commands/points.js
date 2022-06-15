const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder().setName("p").setDescription("placeholder"),
  async execute(interaction, db, mongoClient) {
    const user = interaction.user;
    console.log(user.id);
    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        interaction.user.username,
        interaction.guild.id,
      ])
      .then((res) => console.log(res.rows[0]));

    try {
      // Connect the client to the server
      await mongoClient.connect();
      // Establish and verify connection
      const result = await mongoClient
        .db("hunger-games")
        .collection("tributes")
        .find({ guild: interaction.guild.id })
        .toArray();
      console.log(result);
    } finally {
      // Ensures that the client will close when you finish/error
      await mongoClient.close();
    }

    // interaction.reply(`Added ${user.username} to the tributes!`);
  },
};
