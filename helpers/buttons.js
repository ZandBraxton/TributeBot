const { ButtonStyle } = require("discord.js");
const { ButtonBuilder } = require("discord.js");

const destroyButton = new ButtonBuilder()
  .setCustomId("destroy")
  .setLabel("End Game")
  .setStyle(ButtonStyle.Danger);

const cancelButton = new ButtonBuilder()
  .setCustomId("cancel")
  .setLabel("Cancel")
  .setStyle(ButtonStyle.Secondary);

const endButton = new ButtonBuilder()
  .setCustomId("end")
  .setLabel("End Game")
  .setStyle(ButtonStyle.Danger);

const startButton = new ButtonBuilder()
  .setCustomId("start")
  .setLabel("Start")
  .setStyle(ButtonStyle.Success);

const nextDayButton = new ButtonBuilder()
  .setCustomId("start")
  .setLabel("Continue Game")
  .setStyle(ButtonStyle.Success);

const nextButton = new ButtonBuilder()
  .setCustomId("next")
  .setLabel("Next")
  .setStyle(ButtonStyle.Success);

const deadButton = new ButtonBuilder()
  .setCustomId("dead")
  .setLabel("Show Fallen Tributes")
  .setStyle(ButtonStyle.Primary);

const noDeathButton = new ButtonBuilder()
  .setCustomId("dead")
  .setLabel("Nobody Died, Continue")
  .setStyle(ButtonStyle.Success);

const randomButton = new ButtonBuilder()
  .setCustomId("random")
  .setLabel("Randomize Districts")
  .setStyle(ButtonStyle.Primary);

const newGame = new ButtonBuilder()
  .setCustomId("newGame")
  .setLabel("End Active Game")
  .setStyle(ButtonStyle.Success);

const status = new ButtonBuilder()
  .setCustomId("status")
  .setLabel("Change Status")
  .setStyle(ButtonStyle.Primary);

const removeCPU = new ButtonBuilder()
  .setCustomId("remove-cpu")
  .setLabel("Delete CPU")
  .setStyle(ButtonStyle.Danger);

const addCPU = new ButtonBuilder()
  .setCustomId("add")
  .setLabel("Add CPU")
  .setStyle(ButtonStyle.Success);

module.exports = {
  destroyButton,
  cancelButton,
  endButton,
  startButton,
  nextDayButton,
  nextButton,
  deadButton,
  noDeathButton,
  randomButton,
  newGame,
  status,
  removeCPU,
  addCPU,
};
