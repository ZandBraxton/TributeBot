const { SlashCommandBuilder, ActionRowBuilder } = require("discord.js");

const { getTributes, checkGameRunning } = require("../helpers/queries");

const { createNewGameCollector, setupGame } = require("../helpers/gameLogic");
const { validateAvatar } = require("../helpers/game");
const buttons = require("../helpers/buttons");
let districtSize;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mickey-games")
    .setDescription("(Hosts Only)  Set's up a new Mickey Games!")
    .addIntegerOption((option) =>
      option
        .setName("district-size")
        .setDescription("Select the size of the districts (Default is 2)")
        .addChoices(
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          { name: "4", value: 4 }
        )
    ),
  async execute(interaction, client) {
    await interaction.deferReply();
    const result = await checkGameRunning(interaction);
    if (result && result.gameRunning === true) {
      const row = new ActionRowBuilder().addComponents(
        buttons.newGame,
        buttons.cancelButton
      );
      interaction.editReply({
        content:
          "You still have an active game! Would you like to start a new one?",
        components: [row],
      });

      await createNewGameCollector(interaction);
    } else {
      districtSize = await interaction.options.getInteger("district-size");
      if (!districtSize) districtSize = 2;

      let data = await getTributes(
        interaction,
        "tributes",
        interaction.user.username
      );

      for (let i = 0; i < data.length; i++) {
        await validateAvatar(client, interaction, data[i]);
      }
      let CPUdata = await getTributes(
        interaction,
        "cpu-tributes",
        interaction.user.username
      );
      await CPUdata.map((cpu) => data.push(cpu));

      if (!data) return interaction.editReply("Error setting up game!");

      if (data.length < 2) {
        return interaction.editReply(
          "You need at least two tributes to run a game"
        );
      }

      if (districtSize === 3 && data.length < 6) {
        return interaction.editReply(
          "You need at least six tributes to run teams of three"
        );
      }
      if (districtSize === 4 && data.length < 8) {
        return interaction.editReply(
          "You need at least eight tributes to run teams of four"
        );
      }

      const gameState = {
        data: data,
        shuffle: true,
        tributes: [],
        gameData: [],
        districtSize: districtSize,
      };

      await setupGame(interaction, gameState);
    }
  },
};
