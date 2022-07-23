const { SlashCommandBuilder } = require("discord.js");
const { getBets, activateBets } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet points on which district you think will win!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("amount")
        .setDescription(
          "Bet Scambot points on which district you think will win"
        )
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
              "Bet all Scambot points on which district you think will win"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("withdraw")
        .setDescription("Withdraw from the betting pool")
    ),
  async execute(interaction, db, mongoClient) {
    const result = await getBets(mongoClient, interaction);
    let bet = result.bets;
    let districtCount = result.districtCount;
    let pool = result.pool;
    const user = interaction.user;
    const found = bet.find((element) => element.username === user.username);
    const choice = interaction.options.getSubcommand();
    if (choice === "withdraw") {
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
    }

    if (found !== undefined) {
      return interaction.reply({
        content: `You have already bet ${found.amount} points on District ${found.district}, use /bet withdraw to withdraw your prior bet`,
        ephemeral: true,
      });
    }

    let points;
    let betAmount;

    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        interaction.user.username,
        interaction.guild.id,
      ])
      .then((res) => (points = res.rows[0].points));

    if (choice === "all") {
      betAmount = points;
    } else if (choice === "amount") {
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
