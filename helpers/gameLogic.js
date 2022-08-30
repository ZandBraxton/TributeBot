const {
  EmbedBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  InteractionType,
} = require("discord.js");

const {
  shuffleDistricts,
  tributesLeftAlive,
  generateTributes,
  eventTrigger,
  betComponents,
  validateAvatar,
  placeBet,
  getNames,
} = require("./game");

const { activateTribute, activateBets, payout, endGame } = require("./queries");

const canvasHelper = require("./canvas");
const buttons = require("./buttons");
const { bloodbath, day, night } = require("../events.json");

async function setupGame(interaction, gameState) {
  gameState.tributes = [];
  if (gameState.shuffle === true) {
    gameState.data = shuffleDistricts(gameState.data);
  }

  gameState.gameData.push({
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
    gameRunner: interaction.user.username,
  });

  let n = 0;
  let districtCount;
  for (let i = 0; i < gameState.data.length; i++) {
    n++;
    gameState.tributes.push({
      username: gameState.data[i].username,
      id: gameState.data[i].id,
      avatar: gameState.data[i].avatar,
      alive: true,
      kills: 0,
      district:
        gameState.data.length === gameState.districtSize
          ? i + 1
          : Math.ceil(n / gameState.districtSize),
    });
    districtCount =
      gameState.data.length === gameState.districtSize
        ? i + 1
        : Math.ceil(n / gameState.districtSize);
  }

  await activateTribute(interaction, {
    guild: interaction.guild.id,
    gameRunner: interaction.user.username,
    gameRunning: true,
    tributeData: gameState.tributes,
    districtSize: gameState.districtSize,
    districtCount: districtCount,
    bets: [],
    pool: 0,
  });

  const embedData = await generateTributes(
    gameState.tributes,
    gameState.districtSize
  );

  //BETTING STUFF, Wait for scambot update
  // const bettingComponent = await interaction.followUp({
  //   content: "`Bets are now open`",
  //   components: await betComponents(interaction),
  // });

  // const bettingCollector =
  //   await bettingComponent.createMessageComponentCollector({});
  // bettingCollector.on("collect", async (i) => {
  //   try {
  //     await placeBet(i, districtCount, interaction.user.username);
  //     console.log(i);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  // await interaction.followUp("Bets are now open!");

  await interaction.editReply({
    // content: "`Bets are now open`",
    embeds: [embedData.embed],
    files: [embedData.attachment],
    components: embedData.components,
  });

  createCollector(interaction, gameState);
}

async function startTurn(interaction, gameState) {
  if (!gameState.gameData[0].bloodBath && gameState.gameData[0].sun)
    gameState.gameData[0].turn++;

  const remainingTributes = tributesLeftAlive(gameState.tributes);
  const currentEvent = gameState.gameData[0].bloodBath
    ? bloodbath
    : gameState.gameData[0].sun
    ? day
    : night;

  eventTrigger(
    currentEvent,
    remainingTributes,
    gameState.gameData[0].avatars,
    gameState.gameData[0].deaths,
    gameState.gameData[0].results,
    gameState.gameData[0].embedResultsText
  );

  await runTurn(interaction, gameState);
}

async function runTurn(interaction, gameState) {
  const eventText = `${
    gameState.gameData[0].bloodBath
      ? "Bloodbath"
      : gameState.gameData[0].sun
      ? `Day ${gameState.gameData[0].turn}`
      : `Night ${gameState.gameData[0].turn}`
  }`;

  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(`${gameState.gameData[0].gameRunner}'s Game - ${eventText}`)
    .setColor("#5d5050");

  const row = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.nextButton
  );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    gameState.gameData[0].results[gameState.gameData[0].i],
    gameState.gameData[0].avatars[gameState.gameData[0].i]
  );

  const eventAttachment = new AttachmentBuilder(eventImage.toBuffer(), {
    name: "currentEvent.png",
  });

  const names = getNames(
    gameState.gameData[0].results[gameState.gameData[0].i]
  );

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: (await names).join(", "),
  });

  gameState.gameData[0].i++;

  if (gameState.gameData[0].i === gameState.gameData[0].results.length) {
    const row2 = new ActionRowBuilder().addComponents(
      buttons.endButton,
      buttons.deadButton
    );

    const row3 = new ActionRowBuilder().addComponents(
      buttons.endButton,
      buttons.noDeathButton
    );

    await interaction.editReply({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: gameState.gameData[0].deaths.length ? [row2] : [row3],
    });
    createCollector(interaction, gameState);
  } else {
    await interaction.editReply({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: [row],
    });
    createCollector(interaction, gameState);
  }
}

async function showFallenTributes(interaction, gameState) {
  await activateTribute(interaction, {
    guild: interaction.guild.id,
    tributeData: gameState.tributes,
  });

  if (gameState.gameData[0].deaths.length) {
    const deathMessage = `${gameState.gameData[0].deaths.length} cannon shot${
      gameState.gameData[0].deaths.length === 1 ? "" : "s"
    } can be heard in the distance.`;
    const deathList = gameState.gameData[0].deaths
      .map((trib) => `<@${trib.id}>`)
      .join("\n");
    const deathImage = await canvasHelper.generateFallenTributes(
      gameState.gameData[0].deaths,
      gameState.gameData[0].announcementCount,
      deathMessage
    );

    const deathAttachment = new AttachmentBuilder(deathImage.toBuffer(), {
      name: "deadTributes.png",
    });

    const row = new ActionRowBuilder().addComponents(
      buttons.endButton,
      buttons.startButton
    );

    const deadTributesEmbed = new EmbedBuilder()
      .setTitle(`${gameState.gameData[0].gameRunner}'s Game - Fallen Tributes`)
      .setImage("attachment://deadTributes.png")
      .setDescription(`\n${deathMessage}\n\n${deathList}`)
      .setColor("#5d5050");

    let gameEnd = await gameOver(gameState.tributes, gameState.districtSize);

    await interaction.editReply({
      embeds: [deadTributesEmbed],
      files: [deathAttachment],
      components: gameEnd === false ? [row] : [],
    });

    if (gameEnd === true) {
      const tributesLeft = tributesLeftAlive(gameState.tributes);
      const winner = tributesLeft.map((trib) => `${trib.name}`).join(" and ");
      const winnerText = tributesLeft.length > 1 ? `winners are` : `winner is`;

      const winnerImage = await canvasHelper.generateWinnerImage(tributesLeft);

      const winAttachment = new AttachmentBuilder(winnerImage.toBuffer(), {
        name: "winner.png",
      });

      const winnerEmbed = new EmbedBuilder()
        .setTitle(
          `The ${winnerText} ${winner} from District ${tributesLeft[0].district}!`
        )
        .setImage("attachment://winner.png")
        .setColor("#5d5050");
      await interaction.editReply({
        embeds: [winnerEmbed],
        files: [winAttachment],
      });
      endGame(interaction);

      //BETTING
      // await payout(interaction, db, tributesLeft[0].district);
      // await activateBets(interaction, {
      //   bets: [],
      //   pool: 0,
      // });
    }

    if (!gameState.gameData[0].bloodBath)
      gameState.gameData[0].sun = !gameState.gameData[0].sun;

    if (gameState.gameData[0].bloodBath)
      gameState.gameData[0].bloodBath = false;
    gameState.gameData[0].deaths = [];
    gameState.gameData[0].results = [];
    gameState.gameData[0].embedResultsText = [];
    gameState.gameData[0].avatars = [];
    gameState.gameData[0].i = 0;
    gameState.gameData[0].announcementCount++;

    createCollector(interaction, gameState);
  } else {
    if (!gameState.gameData[0].bloodBath)
      gameState.gameData[0].sun = !gameState.gameData[0].sun;

    if (gameState.gameData[0].bloodBath)
      gameState.gameData[0].bloodBath = false;
    gameState.gameData[0].deaths = [];
    gameState.gameData[0].results = [];
    gameState.gameData[0].embedResultsText = [];
    gameState.gameData[0].avatars = [];
    gameState.gameData[0].i = 0;
    await interaction.deferReply();
    await startTurn(interaction, gameState);
  }
}

function gameOver(tributeData, districtSize) {
  const tributesRemaining = tributesLeftAlive(tributeData);

  if (tributesRemaining.length === 1) return true;

  if (tributesRemaining.length <= districtSize) {
    if (districtSize === 2) {
      return tributesRemaining[0].district === tributesRemaining[1].district;
    } else {
      let check = tributesRemaining[0].district;
      return tributesRemaining.every((tribute) => tribute.district === check);
    }
  } else return false;
}

async function collectorSwitch(interaction, gameState) {
  if (interaction.customId.substring(0, 6) === "random") {
    //BETTING
    // await interaction.channel.send("Bets have refreshed!");
    await interaction.deferUpdate();
    await setupGame(interaction, gameState);
  } else {
    await interaction.deferReply();
    if (interaction.customId.substring(0, 5) === "start") {
      //BETTING
      // if (running === false) {
      //   bettingComponent.edit({
      //     content: "`Bets are now closed`",
      //     components: [],
      //   });
      //   bettingCollector.stop();
      // }

      await startTurn(interaction, gameState);
    } else if (interaction.customId.substring(0, 4) === "next") {
      await runTurn(interaction, gameState);
    } else if (interaction.customId.substring(0, 4) === "dead") {
      await showFallenTributes(interaction, gameState);
    }
    await interaction.message.edit({ components: [] });
  }
}

async function createEndCollector(interaction, gameState, gameMsg) {
  const endMsg = await interaction.fetchReply();
  const filter = (i) => {
    return i.user.id === interaction.user.id;
  };
  const collector = await endMsg.createMessageComponentCollector({
    filter,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId.substring(0, 7) === "destroy") {
        await gameMsg.edit({
          components: [],
        });
        await endMsg.edit({
          content: "Game has been terminated",
          components: [],
        });
        endGame(interaction);
        collector.stop();
      } else if (interaction.customId.substring(0, 6) === "cancel") {
        await endMsg.delete();
      }
    } catch (error) {
      console.log(error);
    }
  });
}

async function createCollector(interaction, gameState) {
  const gameMsg = await interaction.fetchReply();
  const filter = (i) => {
    return i.user.id === interaction.user.id;
  };

  const collector = await gameMsg.createMessageComponentCollector({
    filter,
  });

  collector.on("collect", async (interaction) => {
    console.log(interaction);
    try {
      if (interaction.customId.substring(0, 3) === "end") {
        const row = new ActionRowBuilder().addComponents(
          buttons.destroyButton,
          buttons.cancelButton
        );
        await interaction.reply({
          content: "Are you sure you want to end the game?",
          components: [row],
        });

        createEndCollector(interaction, gameState, gameMsg);
      } else {
        if (interaction.customId.substring(0, 6) === "random") {
          if (interaction.values !== undefined) {
            let ds = parseInt(interaction.values[0]);

            if (ds === 3 && gameState.data.length < 6) {
              return interaction.channel.send(
                "You need at least six tributes to run teams of three"
              );
            }
            if (ds === 4 && gameState.data.length < 8) {
              return interaction.channel.send(
                "You need at least eight tributes to run teams of four"
              );
            }
            gameState.districtSize = parseInt(interaction.values[0]);
          }
        }

        collectorSwitch(interaction, gameState);
        collector.stop();
      }
    } catch (error) {
      console.log(error);
    }
  });
}

async function createNewGameCollector(interaction) {
  const newGameMsg = await interaction.fetchReply();
  const filter = (i) => {
    return i.user.id === interaction.user.id;
  };

  const collector = await newGameMsg.createMessageComponentCollector({
    filter,
  });
  collector.on("collect", async (interaction) => {
    if (interaction.customId === "newGame") {
      endGame(interaction);
      newGameMsg.edit({
        content:
          "Active Game Terminated, use /mickey-games to create a new one!",
        components: [],
      });
    } else {
      newGameMsg.delete();
    }
  });
}

module.exports = { createNewGameCollector, setupGame };
