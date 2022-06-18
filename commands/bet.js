const { SlashCommandBuilder } = require("@discordjs/builders");
const { getBets, activateBets } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet points on which district you think will win!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("amount")
        .setDescription("Enter an amount")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount")
            .setRequired(true)
        )

        .addIntegerOption((option) =>
          option
            .setName("district")
            .setDescription(
              "Enter the number of the district you wish to bet on"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("all")
        .setDescription("Bet all of your points!")
        .addIntegerOption((option) =>
          option
            .setName("district")
            .setDescription(
              "Enter the number of the district you wish to bet on"
            )
            .setRequired(true)
        )
    ),
  async execute(interaction, db, mongoClient) {
    const result = await getBets(mongoClient, interaction);
    let bet = result.bets;
    let districtCount = result.districtCount;
    let pool = result.pool;
    const user = interaction.user;
    let found = bet.find((element) => element.username === user.username);
    if (found !== undefined)
      return interaction.reply({
        content: `You have already bet ${found.amount} points on District ${found.district}, use /withdraw to withdraw your prior bet`,
        ephemeral: true,
      });
    let points;
    let betAmount;

    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        interaction.user.username,
        interaction.guild.id,
      ])
      .then((res) => (points = res.rows[0].points));

    if (interaction.options.getSubcommand() === "all") {
      betAmount = points;
    } else if (interaction.options.getSubcommand() === "amount") {
      betAmount = await interaction.options.getInteger("amount");
    }

    if (!betAmount || betAmount <= 0) {
      return interaction.reply({
        content: "You need to specify how many points to bet",
        ephemeral: true,
      });
    }

    if (points < betAmount) {
      return interaction.reply({
        content: "You do not have that many points to bet",
        ephemeral: true,
      });
    }

    const districtN = interaction.options.getInteger("district");
    if (districtN === null)
      return interaction.reply({
        content: "You need to specify a district!",
        ephemeral: true,
      });

    if (districtN > districtCount || districtN < 0)
      return interaction.reply({
        content: "This district does not exist!",
        ephemeral: true,
      });
    console.log(result.bets);

    pool += betAmount;
    bet.push({
      district: districtN,
      amount: betAmount,
      username: user.username,
    });

    await activateBets(mongoClient, interaction, {
      bets: bet,
      pool: pool,
    });

    return interaction.reply({
      content: `${user.username} has bet ${betAmount} on District ${districtN}, the total pool is now ${pool}.`,
    });
  },
};
