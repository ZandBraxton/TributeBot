const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
  Interaction,
} = require("discord.js");
const { getBets, activateBets } = require("../helpers/queries");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet points on which district you think will win!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("amount")
        .setDescription("Enter an amount")
        .addIntegerOption((option) =>
          option.setName("amount").setDescription("The amount")
        )
        .addIntegerOption((option) =>
          option
            .setName("district")
            .setDescription(
              "Enter the number of the district you wish to bet on"
            )
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
        )
    ),
  async execute(interaction, db, mongoClient) {
    const result = await getBets(mongoClient, interaction);
    let bet = result.bets;
    let districtCount = result.districtCount;
    let pool = result.pool;
    const user = interaction.user;
    let found = bet.find((element) => element.username === user.username);
    console.log(found);
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
    console.log(districtN);

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

    // const betEmbed = new MessageEmbed()
    //   .setColor("#5d5050")
    //   .setDescription(
    //     `Select which district you want to bet ${betAmount} points on!`
    //   );
    // const uniqueId = uuidv4();
    // const betRow = new MessageSelectMenu()
    //   .setCustomId("bet" + uniqueId)
    //   .setPlaceholder("Districts");

    // for (let i = 0; i < Object.keys(result.bets).length; i++) {
    //   await betRow.addOptions({
    //     label: `District ${i + 1}`,
    //     value: `${i}`,
    //     default: false,
    //   });
    // }
    // console.log(betRow);

    // await interaction.reply({
    //   embeds: [betEmbed],
    //   components: [new MessageActionRow({ components: [betRow] })],
    //   ephemeral: true,
    // });

    // const filter = (i) => {
    //   i.deferUpdate();
    //   return (
    //     i.user.id === interaction.user.id && i.componentType === "SELECT_MENU"
    //   );
    // };

    // const collector = await interaction.channel.createMessageComponentCollector(
    //   {
    //     filter,
    //     max: 1,
    //     maxComponents: 1,
    //   }
    // );

    // collector.on("collect", async (interaction) => {
    //   pool += betAmount;
    //   bet.push({
    //     district: interaction.values[0],
    //     amount: betAmount,
    //     username: interaction.user.username,
    //   });

    //   console.log(
    //     `${user.username} has bet ${betAmount} on District ${parseInt(
    //       interaction.values[0] + 1
    //     )}, the total pool is now ${pool}.`
    //   );

    //   collector.stop();
    // });

    // try {
    //   // Connect the client to the server
    //   await mongoClient.connect();
    //   // Establish and verify connection
    //   const result = await mongoClient
    //     .db("hunger-games")
    //     .collection("tributes")
    //     .findOne({ guild: interaction.guild.id, username: user.username });
    //   console.log(result);
    // } finally {
    //   // Ensures that the client will close when you finish/error
    //   await mongoClient.close();
    // }

    // interaction.reply(`Added ${user.username} to the tributes!`);
  },
};
