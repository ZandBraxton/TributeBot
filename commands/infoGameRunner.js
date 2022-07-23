const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { getTributes } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("game-runner-info")
    .setDescription("(Game Runners Only) Useful commands for Game Runners"),
  async execute(interaction, db, mongoClient) {
    const info = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Tributebot - A Hunger Games Simulator")
      .setDescription("List of helpful commands for Game Runners")
      .addFields(
        {
          name: "Start Games",
          value:
            "/mickey-games \n(Cannot be called while another game or CPU command is active)",
        },
        { name: "Add user to tributes", value: "/add", inline: true },
        { name: "\u200B", value: "\u200B", inline: true },
        { name: "Remove users from tributes", value: "/remove", inline: true },

        {
          name: 'Lock/Unlock the "join-tribute" command',
          value: "/lock-tributes",
        },
        { name: "\u200B", value: "\u200B" },
        {
          name: "CPU's can be stored for use in games to fill slots or for fun",
          value:
            "CPU commands cannot be called while a game is running/setting up",
        },
        {
          name: "View list/change active state of stored CPU's",
          value:
            "/cpu [view-list] \n Can change active state of CPU's \n Active CPU's will join games, while inactive CPU's will not",
        },
        { name: "Store a CPU", value: "/cpu [store-cpu]", inline: true },
        { name: "Remove a CPU", value: "/cpu [remove-cpu]", inline: true },

        { name: "\u200B", value: "\u200B" },
        {
          name: "The banlist can be used to ban a user from joining",
          value: "Only use for genuine reasons, do not abuse this",
        },
        {
          name: "View the banlist",
          value: "/banlist [view]",
        },
        {
          name: "Add user to the banlist",
          value: "/banlist [add]",
          inline: true,
        },
        {
          name: "Remove user from the banlist",
          value: "/banlist [remove]",
          inline: true,
        }
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
