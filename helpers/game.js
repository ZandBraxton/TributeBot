const {
  EmbedBuilder,
  SelectMenuBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const mongoClient = require("../database/mongodb");
const { v4: uuidv4 } = require("uuid");
const canvasHelper = require("../helpers/canvas");
const db = require("../database");
const { getBets, activateBets } = require("../helpers/queries");
const bet = require("../commands/bet");

function shuffleDistricts(array) {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

function tributesLeftAlive(tributeData) {
  return tributeData.filter((tribute) => tribute.alive);
}

async function generateTributes(players, districtSize) {
  const embed = new EmbedBuilder()
    .setImage("attachment://tributesPage.png")
    .setColor("#5d5050");

  const canvas = await canvasHelper.populateCanvas(players, districtSize);

  const attachment = new AttachmentBuilder(canvas.toBuffer(), {
    name: "tributesPage.png",
  });

  const uniqueId = uuidv4();

  let row = new ActionRowBuilder()

    .addComponents(
      new ButtonBuilder()
        .setCustomId("end" + uniqueId)
        .setLabel("End Game")
        .setStyle(ButtonStyle.Danger)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId("random" + uniqueId)
        .setLabel("Randomize Districts")
        .setStyle(ButtonStyle.Primary)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId("start" + uniqueId)
        .setLabel("Start")
        .setStyle(ButtonStyle.Success)
    );

  let districtSizeRow = new ActionRowBuilder().addComponents(
    new SelectMenuBuilder()
      .setCustomId("random" + uuidv4())
      .setPlaceholder("District Size")
      .addOptions([
        {
          label: "Two",
          value: "2",
        },
        {
          label: "Three",
          value: "3",
        },
        {
          label: "Four",
          value: "4",
        },
      ])
  );

  let components = [row, districtSizeRow];

  return { embed, attachment, components };
}

async function betComponents(interaction) {
  console.log(interaction);
  const components = [];
  // const bettingRow = new SelectMenuBuilder()
  // bettingRow.setCustomId("bet").setPlaceholder(`Districts 1-${districtCount}`)

  // for (let i = 0; i < )

  const betButton = new ButtonBuilder()
    .setCustomId(`${interaction.user.username}`)
    .setLabel("Bet")
    .setStyle(ButtonStyle.Success);

  const buttonRow = new ActionRowBuilder().addComponents(betButton);
  components.push(buttonRow);
  return components;
}

async function placeBet(i, districtCount, gameRunner) {
  const result = await getBets(mongoClient, i, gameRunner);
  const user = i.user;
  const found = result.bets.find((bet) => bet.username === user.username);
  if (found !== undefined) {
    return i.reply({
      content: `You have already bet ${found.amount} points on District ${found.district}, use /bet withdraw to withdraw your prior bet`,
      ephemeral: true,
    });
  }
  await db
    .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
      i.user.username,
      i.guild.id,
    ])
    .then((res) => (points = res.rows[0].points));

  console.log(points);

  const modal = new ModalBuilder()
    .setCustomId(gameRunner)
    .setTitle("Place your bet");

  const districtInput = new TextInputBuilder()
    .setCustomId("district")
    .setLabel(`District Number (1-${districtCount})`)
    .setPlaceholder("Enter the district number you want to bet on")
    .setStyle(TextInputStyle.Short);

  const pointsInput = new TextInputBuilder()
    .setCustomId("points")
    .setLabel("Points to bet")
    .setPlaceholder(`You currently have ${points} points`)
    .setStyle(TextInputStyle.Short);
  const firstActionRow = new ActionRowBuilder().addComponents(districtInput);
  const secondActionRow = new ActionRowBuilder().addComponents(pointsInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await i.showModal(modal, { interaction: i });
}

async function buildModal(points, districtCount) {
  const modal = new ModalBuilder()
    .setCustomId("bet")
    .setTitle("Place your bet");

  const districtInput = new TextInputBuilder()
    .setCustomId("district")
    .setLabel("District Number")
    .setStyle(TextInputStyle.Short);
  const firstActionRow = new ActionRowBuilder().addComponents(districtInput);

  modal.addComponents(firstActionRow);
  return modal;
}

async function submitBet(interaction) {
  const result = await getBets(mongoClient, interaction, interaction.customId);
  const bets = result.bets;
  const districtCount = result.districtCount;
  let pool = result.pool;
  const user = interaction.user;

  const betAmount = interaction.fields.getTextInputValue("points");
  const district = interaction.fields.getTextInputValue("district");
  if (typeof betAmount !== "number" || typeof district !== "number") {
    return interaction.reply({
      content: "Both values must be a number",
      ephemeral: true,
    });
  }
  console.log(interaction.customId);
  console.log(result);

  let points;
  await db
    .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
      interaction.user.username,
      interaction.guild.id,
    ])
    .then((res) => (points = res.rows[0].points));

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

  if (district > districtCount || district < 0)
    return interaction.reply({
      content: "This district does not exist!",
      ephemeral: true,
    });

  pool += parseInt(betAmount);

  bets.push({
    district: district,
    amount: betAmount,
    username: user.username,
  });

  await activateBets(mongoClient, interaction, interaction.customId, {
    bets: bets,
    pool: pool,
  });

  return interaction.reply({
    content: `${user.username} has bet ${betAmount} on District ${district}, the total pool is now ${pool}.`,
  });
}

function eventTrigger(
  events,
  tributeData,
  avatars,
  deaths,
  results,
  embedResultsText
) {
  const tributes = new Set(tributeData);

  for (const tribute of tributes) {
    if (!tributes.has(tribute)) continue;

    const filteredEvents = events.filter(
      (event) => event.tributes <= tributes.size && event.deaths < tributes.size
    );
    const event =
      filteredEvents[Math.floor(Math.random() * filteredEvents.length)];

    tributes.delete(tribute);

    if (event.tributes === 1) {
      if (event.deaths.length === 1) {
        deaths.push(tribute);
        tribute.alive = false;
        tributes.delete(tribute);
      }

      results.push(parseEvent(event.text, [tribute], false));
      embedResultsText.push(parseEvent(event.text, [tribute], true));
      avatars.push([tribute.avatar]);
    } else {
      const currTribute = [tribute];

      if (event.killers.includes(1)) tribute.kills++;

      if (event.deaths.includes(1)) {
        deaths.push(tribute);
        tribute.alive = false;
        tributes.delete(tribute);
      }

      for (let i = 2; i <= event.tributes; i++) {
        const tributesArray = Array.from(tributes);
        const randomTribute =
          tributesArray[Math.floor(Math.random() * tributesArray.length)];

        if (event.killers.includes(i)) randomTribute.kills++;

        if (event.deaths.includes(i)) {
          randomTribute.alive = false;
          deaths.push(randomTribute);
          tributes.delete(randomTribute);
        }

        currTribute.push(randomTribute);
        tributes.delete(randomTribute);
      }

      results.push(parseEvent(event.text, currTribute));
      embedResultsText.push(parseEvent(event.text, currTribute, true));
      avatars.push(currTribute.map((trib) => trib.avatar));
    }
  }

  function parseEvent(text, tributes, ID) {
    for (let i = 0; i < tributes.length; i++) {
      const idOrName = ID ? `<@${tributes[i].id}>` : tributes[i].username;
      text = text.replaceAll(`(Player${i + 1})`, `(${idOrName})`);
    }

    return text;
  }
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  shuffleDistricts,
  tributesLeftAlive,
  generateTributes,
  eventTrigger,
  betComponents,
  buildModal,
  placeBet,
  submitBet,
  sleep,
};
