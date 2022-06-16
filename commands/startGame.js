const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
} = require("discord.js");
const game = require("../helpers/game");
const { activateTribute, getTributes, payout } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");
const { bloodbath, day, night } = require("../events.json");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
let running = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mickey-games")
    .setDescription("(Mickey Masters Only) Set's up a new Mickey Games!"),
  async execute(interaction, db, mongoClient) {
    if (running === true) {
      interaction.reply("The game is currently running");
      return;
    }
    running = true;

    let data = await getTributes(mongoClient, interaction, "tributes");
    if (!data) return interaction.reply("Error setting up game!");

    let tributes = [];
    let gameData = [];

    await setupGame(data, interaction, true, mongoClient, tributes, gameData);
    await interaction.reply("Setting up game...");
  },
};

async function setupGame(
  data,
  interaction,
  shuffle,
  mongoClient,
  tributes,
  gameData
) {
  tributes = [];
  if (shuffle === true) {
    data = game.shuffle(data);
  }

  gameData.push({
    startGame: true,
    bloodBath: true,
    sun: true,
    turn: 0,
    i: 0,
    announcementCount: 1,
    deaths: [],
    results: [],
    embedResultsText: [],
    avatars: [],
  });

  let n = 0;
  let districtN = 2;
  let districtCount;
  console.log(data.length);
  console.log(districtN);
  for (let i = 0; i < data.length; i++) {
    n++;
    tributes.push({
      username: data[i].username,
      id: data[i].id,
      avatar: data[i].avatar,
      alive: true,
      kills: 0,
      district: data.length === districtN ? i + 1 : Math.ceil(n / districtN),
    });
    // console.log(n + " " + districtN);
    districtCount =
      data.length === districtN ? i + 1 : Math.ceil(n / districtN);
  }
  console.log(districtCount);

  await activateTribute(mongoClient, interaction, {
    guild: interaction.guild.id,
    tributeData: tributes,
    districtCount: districtCount,
    bets: [],
    pool: 0,
  });

  const embedData = await game.generateTributes(tributes);
  if (interaction.isCommand()) {
    await interaction.channel.send({
      embeds: [embedData.embed],
      files: [embedData.attachment],
      components: [embedData.row],
    });

    await interaction.channel.send("Bets are now open!");
    const filter = (i) => {
      i.deferUpdate();
      return (
        i.user.id === interaction.user.id && i.componentType !== "SELECT_MENU"
      );
    };

    const collector = await interaction.channel.createMessageComponentCollector(
      {
        filter,
      }
    );

    collector.on("collect", async (interaction) => {
      setup = false;
      running = true;

      if (interaction.customId.substring(0, 6) === "random") {
        await setupGame(
          data,
          interaction,
          true,
          mongoClient,
          tributes,
          gameData
        );
      } else if (interaction.customId.substring(0, 5) === "start") {
        await startTurn(interaction, gameData, tributes);

        await interaction.message.edit({ components: [] });
      } else if (interaction.customId.substring(0, 4) === "next") {
        await nextTurn(interaction, gameData, tributes);

        await interaction.message.edit({ components: [] });
      } else if (interaction.customId.substring(0, 4) === "dead") {
        await showFallenTributes(
          interaction,
          gameData,
          mongoClient,
          tributes,
          collector
        );
        await interaction.message.edit({ components: [] });
      } else if (interaction.customId.substring(0, 3) === "end") {
        const uniqueId = uuidv4();
        let row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("destroy" + uniqueId)
              .setLabel("End Game")
              .setStyle("DANGER")
          )
          .addComponents(
            new MessageButton()
              .setCustomId("cancel" + uniqueId)
              .setLabel("Cancel")
              .setStyle("SECONDARY")
          );

        await interaction.channel.send({
          content: "Are you sure you want to end the game?",
          components: [row],
        });
      } else if (interaction.customId.substring(0, 7) === "destroy") {
        await interaction.deleteReply();
        await interaction.channel.send("Game has been terminated");
        running = false;
        collector.stop();
      } else if (interaction.customId.substring(0, 6) === "cancel") {
        await interaction.deleteReply();
      }
    });
  } else {
    await interaction.deleteReply();
    interaction.channel.send({
      embeds: [embedData.embed],
      files: [embedData.attachment],
      components: [embedData.row],
    });
  }
}

async function startTurn(interaction, data, tributes) {
  if (!data[0].bloodBath && data[0].sun) data[0].turn++;

  const remainingTributes = game.tributesLeftAlive(tributes);
  const currentEvent = data[0].bloodBath
    ? bloodbath
    : data[0].sun
    ? day
    : night;

  game.eventTrigger(
    currentEvent,
    remainingTributes,
    data[0].avatars,
    data[0].deaths,
    data[0].results,
    data[0].embedResultsText
  );

  const eventText = `${
    data[0].bloodBath
      ? "Bloodbath"
      : data[0].sun
      ? `Day ${data[0].turn}`
      : `Night ${data[0].turn}`
  }`;

  const hungerGamesEmbed = new MessageEmbed()
    .setTitle(`The Mickey Games - ${eventText}`)
    .setColor("#5d5050");

  const uniqueId = uuidv4();

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("end" + uniqueId)
        .setLabel("End Game")
        .setStyle("DANGER")
    )
    .addComponents(
      new MessageButton()
        .setCustomId("next" + uniqueId)
        .setLabel("Next")
        .setStyle("SUCCESS")
    );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    data[0].results[data[0].i],
    data[0].avatars[data[0].i]
  );

  const eventAttachment = new MessageAttachment(
    eventImage.toBuffer(),
    "currentEvent.png"
  );

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: `${remainingTributes.length} Tributes Remaining...`,
  });

  data[0].i++;

  if (data[0].i === data[0].results.length) {
    const row2 = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("dead" + uniqueId)
          .setLabel("Show Fallen Tributes")
          .setStyle("PRIMARY")
      );

    const row3 = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("dead" + uniqueId)
          .setLabel("Nobody Died, Continue")
          .setStyle("SUCCESS")
      );

    await interaction.channel.send({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: data[0].deaths.length ? [row2] : [row3],
    });
  } else {
    await interaction.channel.send({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: [row],
    });
  }
}

async function nextTurn(interaction, data, tributes) {
  const remainingTributes = game.tributesLeftAlive(tributes);

  const eventText = `${
    data[0].bloodBath
      ? "Bloodbath"
      : data[0].sun
      ? `Day ${data[0].turn}`
      : `Night ${data[0].turn}`
  }`;

  const hungerGamesEmbed = new MessageEmbed()
    .setTitle(`The Mickey Games - ${eventText}`)
    .setColor("#5d5050");

  const uniqueId = uuidv4();

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("end" + uniqueId)
        .setLabel("End Game")
        .setStyle("DANGER")
    )
    .addComponents(
      new MessageButton()
        .setCustomId("next" + uniqueId)
        .setLabel("Next")
        .setStyle("SUCCESS")
    );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    data[0].results[data[0].i],
    data[0].avatars[data[0].i]
  );

  const eventAttachment = new MessageAttachment(
    eventImage.toBuffer(),
    "currentEvent.png"
  );

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: `${remainingTributes.length} Tributes Remaining...`,
  });

  data[0].i++;

  if (data[0].i === data[0].results.length) {
    const row2 = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("dead" + uniqueId)
          .setLabel("Show Fallen Tributes")
          .setStyle("PRIMARY")
      );

    const row3 = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("dead" + uniqueId)
          .setLabel("Nobody Died, Continue")
          .setStyle("SUCCESS")
      );

    await interaction.channel.send({
      //   content: `${embedResultsText[i]}`,
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: data[0].deaths.length ? [row2] : [row3],
    });
  } else {
    await interaction.channel.send({
      //   content: `${embedResultsText[i]}`,
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: [row],
    });
  }
}

async function showFallenTributes(
  interaction,
  data,
  mongoClient,
  tributes,
  collector
) {
  await activateTribute(mongoClient, interaction, {
    guild: interaction.guild.id,
    tributeData: tributes,
  });

  if (data[0].deaths.length) {
    const deathMessage = `${data[0].deaths.length} cannon shot${
      data[0].deaths.length === 1 ? "" : "s"
    } can be heard in the distance.`;
    const deathList = data[0].deaths.map((trib) => `<@${trib.id}>`).join("\n");
    const deathImage = await canvasHelper.generateFallenTributes(
      data[0].deaths,
      data[0].announcementCount,
      deathMessage
    );

    const deathAttachment = new MessageAttachment(
      deathImage.toBuffer(),
      "deadTributes.png"
    );

    const uniqueId = uuidv4();

    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("start" + uniqueId)
          .setLabel("Continue Game")
          .setStyle("SUCCESS")
      );

    const deadTributesEmbed = new MessageEmbed()
      .setTitle(`The Mickey Games - Fallen Tributes`)
      .setImage("attachment://deadTributes.png")
      .setDescription(`\n${deathMessage}\n\n${deathList}`)
      .setColor("#5d5050");

    let gameEnd = await gameOver(tributes);

    await interaction.channel.send({
      embeds: [deadTributesEmbed],
      files: [deathAttachment],
      components: gameEnd === false ? [row] : [],
    });

    if (gameEnd === true) {
      const tributesLeft = game.tributesLeftAlive(tributes);
      const winner = tributesLeft.map((trib) => `${trib.name}`).join(" and ");
      const winnerText = tributesLeft.length > 1 ? `winners are` : `winner is`;

      const winnerImage = await canvasHelper.generateWinnerImage(tributesLeft);

      const winAttachment = new MessageAttachment(
        winnerImage.toBuffer(),
        "winner.png"
      );

      const winnerEmbed = new MessageEmbed()
        .setTitle(
          `The ${winnerText} ${winner} from District ${tributesLeft[0].district}!`
        )
        .setImage("attachment://winner.png")
        .setColor("#5d5050");
      await interaction.channel.send({
        embeds: [winnerEmbed],
        files: [winAttachment],
      });

      // await payout(mongoClient, interaction, db, tributesLeft[0].district);

      await payout(mongoClient, interaction, db, 2);

      running = false;
      collector.stop("game over");
    }

    if (!data[0].bloodBath) data[0].sun = !data[0].sun;

    if (data[0].bloodBath) data[0].bloodBath = false;
    data[0].deaths = [];
    data[0].results = [];
    data[0].embedResultsText = [];
    data[0].avatars = [];
    data[0].i = 0;
    data[0].announcementCount++;
  } else {
    if (!data[0].bloodBath) data[0].sun = !data[0].sun;

    if (data[0].bloodBath) data[0].bloodBath = false;
    data[0].deaths = [];
    data[0].results = [];
    data[0].embedResultsText = [];
    data[0].avatars = [];
    data[0].i = 0;

    await startTurn(interaction, data, tributes);
  }
}

function gameOver(tributeData) {
  const tributesLeftAlive = game.tributesLeftAlive(tributeData);

  if (tributesLeftAlive.length === 2)
    return tributesLeftAlive[0].district === tributesLeftAlive[1].district;
  else if (tributesLeftAlive.length === 1) return true;
  else return false;
}
