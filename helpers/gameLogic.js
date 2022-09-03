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
  getRandomIntInclusive,
} = require("./game");

const {
  activateTribute,
  activateBets,
  payout,
  checkGameRunning,
  endGame,
} = require("./queries");

const canvasHelper = require("./canvas");
const buttons = require("./buttons");
const events = require("../events.json");
const Round = {
  BLOODBATH: "bloodbath",
  DAY: "day",
  NIGHT: "night",
  FEAST: "feast",
  ARENA: "arena",
  FALLEN: "fallen",
};

async function setupGame(interaction, gameState) {
  gameState.tributes = [];
  if (gameState.shuffle === true) {
    gameState.data = shuffleDistricts(gameState.data);
  }

  // gameState.gameData.push({
  //   startGame: true,
  //   bloodBath: true,
  //   sun: true,
  //   turn: 0,
  //   i: 0,
  //   announcementCount: 1,
  //   deaths: [],
  //   results: [],
  //   embedResultsText: [],
  //   avatars: [],
  //   gameRunner: interaction.user.username,
  // });

  gameState.gameData.push({
    day: 1,
    roundsSinceEvent: 0,
    roundsWithoutDeath: 0,
    dayPassed: false,
    nightPassed: false,
    bloodBathPassed: false,
    feastPassed: false,
    title: "",
    desc: "",
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

// let RoundsSinceEvent
// let RoundsWithoutDeath

async function startTurn(interaction, gameState) {
  let game = gameState.gameData[0];
  if (game.nightPassed) {
    game.day++;
    game.dayPassed = false;
    game.nightPassed = false;
    game.fallenPassed = false;
    game.roundsSinceEvent++;
  }
  let currentEvent;
  console.log(getRandomIntInclusive(1, 20));
  let deathChance = getRandomIntInclusive(2, 4) + game.roundsWithoutDeath;
  let eventType = false;

  if (game.day === 1 && game.bloodBathPassed === false) {
    //bloodbath
    eventType = true;
    currentEvent = events[Round.BLOODBATH];
    deathChance += 2;
  } else if (
    !game.dayPassed &&
    getRandomIntInclusive(0, 100) < getFeastChance(game.roundsSinceEvent) &&
    game.feastPassed === false
  ) {
    //feast
    eventType = true;
    currentEvent = events[Round.FEAST];
    game.roundsSinceEvent = 0;
    game.feastPassed = true;
    deathChance += 2;
  } else if (game.roundsSinceEvent > 0 && getRandomIntInclusive(1, 20) === 1) {
    //arena event
    eventType = true;

    currentEvent =
      events[Round.ARENA][
        getRandomIntInclusive(0, events[Round.ARENA].length - 1)
      ];
    game.roundsSinceEvent = 0;
    deathChance += 1;
  } else if (!game.dayPassed) {
    //day
    currentEvent = events[Round.DAY];
  } else {
    //night
    currentEvent = events[Round.NIGHT];
  }

  // if (!game.bloodBath && game.sun)
  //   game.turn++;

  game.title = currentEvent["title"];
  game.desc = currentEvent["description"];

  const remainingTributes = tributesLeftAlive(gameState.tributes);
  // const currentEvent = game.bloodBath
  //   ? bloodbath
  //   : game.sun
  //   ? day
  //   : night;

  eventTrigger(
    currentEvent,
    remainingTributes,
    deathChance,
    game.avatars,
    game.deaths,
    game.results,
    game.embedResultsText
  );

  gameState.gameData[0] = game;

  if (!eventType) {
    await runTurn(interaction, gameState);
  } else {
    await runEvent(interaction, gameState);
  }
}

async function runEvent(interaction, gameState) {
  let game = gameState.gameData[0];
  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(game.title)
    .setColor("#5d5050")
    .setDescription(game.desc);

  const row = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.nextButton
  );

  await interaction.editReply({
    embeds: [hungerGamesEmbed],
    components: [row],
  });
  createCollector(interaction, gameState);
}

async function runTurn(interaction, gameState) {
  let game = gameState.gameData[0];
  const eventText = game.desc ? game.title : `${game.title} ${game.day}`;

  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(`${game.gameRunner}'s Game - ${eventText}`)
    .setColor("#5d5050");

  const row = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.nextButton
  );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    game.results[game.i],
    game.avatars[game.i]
  );

  const eventAttachment = new AttachmentBuilder(eventImage.toBuffer(), {
    name: "currentEvent.png",
  });

  const names = getNames(game.results[game.i]);

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: (await names).join(", "),
  });

  game.i++;

  gameState.gameData[0] = game;

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
  let game = gameState.gameData[0];

  if (game.deaths.length) {
    const deathMessage = `${game.deaths.length} cannon shot${
      game.deaths.length === 1 ? "" : "s"
    } can be heard in the distance.`;
    const deathList = game.deaths.map((trib) => `<@${trib.id}>`).join("\n");
    const deathImage = await canvasHelper.generateFallenTributes(
      game.deaths,
      game.announcementCount,
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
      .setTitle(`${game.gameRunner}'s Game - Fallen Tributes`)
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
      const winner = tributesLeft
        .map((trib) => `${trib.username}`)
        .join(" and ");
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
      await interaction.followUp({
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

    await refresh(game, true);
    gameState.gameData[0] = game;
    createCollector(interaction, gameState);
  } else {
    await refresh(game, false);
    gameState.gameData[0] = game;
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

async function refresh(game, fallen) {
  if (!game.bloodBathPassed) {
    game.bloodBathPassed = true;
  } else if (!game.dayPassed) {
    game.dayPassed = true;
  } else game.nightPassed = true;

  game.deaths = [];
  game.results = [];
  game.embedResultsText = [];
  game.avatars = [];
  game.i = 0;
  if (fallen) {
    game.roundsWithoutDeath = 0;
    game.announcementCount++;
  } else {
    game.roundsWithoutDeath++;
  }
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
    if (!(await IsGameRunning(interaction, endMsg, collector))) {
      return;
    }
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
    if (!(await IsGameRunning(interaction, gameMsg, collector))) {
      return;
    }
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

async function IsGameRunning(interaction, message, collector) {
  const IsRunning = await checkGameRunning(interaction);
  let bool = true;
  if (!IsRunning) {
    bool = false;
  } else {
    if (IsRunning.gameRunning === false) {
      message.edit({
        content: "Game has been terminated",
        components: [],
      });
      collector.stop();
      bool = false;
    }
  }
  return bool;
}

function getFeastChance(RoundsSinceEvent) {
  return 100 * (Math.pow(RoundsSinceEvent, 2) / 55.0) + 9.0 / 55.0;
}

module.exports = { createNewGameCollector, setupGame };
