const { SlashCommandBuilder } = require("@discordjs/builders");
const { getBets, activateBets } = require("../helpers/queries");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw from the betting pool"),
  async execute(interaction, db, mongoClient) {
    const result = await getBets(mongoClient, interaction);

    let bet = result.bets;
    let pool = result.pool;

    let found = bet.find(
      (element) => element.username === interaction.user.username
    );

    if (found === undefined)
      return interaction.reply({
        content: `You have not made a bet yet!`,
        ephemeral: true,
      });
    bet = bet.filter((bet) => bet.username === interaction.username);
    pool -= found.amount;

    await activateBets(mongoClient, interaction, {
      bets: bet,
      pool: pool,
    });

    return interaction.reply({
      content: `${found.username} has withdrawn their bet of ${found.amount} on District ${found.district}, the total pool is now ${pool}.`,
    });
  },
};
