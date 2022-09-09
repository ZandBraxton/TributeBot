const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { getTributes } = require("../helpers/queries");

const admin =
  "https://cdn.discordapp.com/attachments/967172279807143946/1014682048327340032/adminrules.png";

const commands =
  "https://cdn.discordapp.com/attachments/967172279807143946/1017892094813151322/tributebotCommands.png";

const gameControl =
  "https://cdn.discordapp.com/attachments/967172279807143946/1017892433071177911/gameControl.png";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("View info on commands and the bot")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Which info do you want to see?")
        .setRequired(true)
        .addChoices(
          { name: "Commands", value: "command" },
          { name: "Admin Cheatsheet", value: "admin" },
          { name: "Game Control", value: "control" }
        )
    ),
  async execute(interaction) {
    const type = interaction.options.getString("type");
    let title;
    let img;
    if (type === "admin") {
      title = "Admin Cheatsheet";
      img = admin;
    } else if (type === "command") {
      title = "Commands";
      img = commands;
    } else {
      title = "Game Control";
      img = gameControl;
    }

    const info = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(title)
      .setImage(img);
    interaction.reply({
      embeds: [info],
      ephemeral: true,
    });
  },
};
