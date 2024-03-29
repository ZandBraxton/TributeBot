const {
  EmbedBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
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
const events = require("../newEvents.json");
const Round = {
  BLOODBATH: "bloodbath",
  DAY: "day",
  NIGHT: "night",
  FEAST: "feast",
  ARENA: "arena",
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
    skippedDeaths: [],
    skippedAlive: [],
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
  let currentRound;
  let deathChance = getRandomIntInclusive(2, 4) + game.roundsWithoutDeath;
  let eventType = false;

  if (game.day === 1 && game.bloodBathPassed === false) {
    //bloodbath
    eventType = true;
    currentRound = await concatEvents(Round.BLOODBATH);
    // currentRound = events[Round.BLOODBATH];
    deathChance += 2;
  } else if (
    !game.dayPassed &&
    getRandomIntInclusive(0, 100) < getFeastChance(game.roundsSinceEvent) &&
    game.feastPassed === false
  ) {
    //feast
    eventType = true;
    currentRound = await concatEvents(Round.FEAST);
    game.roundsSinceEvent = 0;
    game.feastPassed = true;
    deathChance += 2;
  } else if (game.roundsSinceEvent > 0 && getRandomIntInclusive(1, 20) === 1) {
    //arena event
    eventType = true;

    currentRound =
      events[Round.ARENA][
        getRandomIntInclusive(0, events[Round.ARENA].length - 1)
      ];
    game.roundsSinceEvent = 0;
    deathChance += 1;
  } else if (!game.dayPassed) {
    //day
    currentRound = await concatEvents(Round.DAY);
  } else {
    //night
    currentRound = await concatEvents(Round.NIGHT);
  }

  // if (!game.bloodBath && game.sun)
  //   game.turn++;

  game.title = currentRound["title"];
  game.desc = currentRound["description"];

  const remainingTributes = tributesLeftAlive(gameState.tributes);
  // const currentRound = game.bloodBath
  //   ? bloodbath
  //   : game.sun
  //   ? day
  //   : night;

  eventTrigger(
    currentRound,
    remainingTributes,
    deathChance,
    game.avatars,
    game.deaths,
    game.results,
    game.embedResultsText
  );

  gameState.gameData[0] = game;

  await roundStart(interaction, gameState, remainingTributes.length);
}

async function roundStart(interaction, gameState, tributesLeft) {
  let game = gameState.gameData[0];
  let title = game.title;
  let desc = game.desc;
  if (game.title === "Day" || game.title === "Night") {
    title = `${game.title} ${game.day}`;
    desc = `${tributesLeft} tributes remaining`;
  }
  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor("#5d5050")
    .setDescription(desc);

  const row = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.nextButton
  );

  await interaction.editReply({
    embeds: [hungerGamesEmbed],
    components: [row],
  });
  const gameMsg = await interaction.fetchReply();
  const previewEmbed = await previewEvents(game);
  const preview = await interaction.followUp({
    embeds: [previewEmbed.embed],
    components: previewEmbed.components,
    ephemeral: true,
  });
  createCollector(interaction, gameState);
  createSkipCollector(interaction, preview, gameState, gameMsg);
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
    game.results[game.i].event,
    game.avatars[game.i]
  );

  const eventAttachment = new AttachmentBuilder(eventImage.toBuffer(), {
    name: "currentRound.png",
  });

  const names = getNames(game.results[game.i].event);

  hungerGamesEmbed.setImage("attachment://currentRound.png");
  hungerGamesEmbed.setFooter({
    text: (await names).join(", "),
  });

  game.i++;

  gameState.gameData[0] = game;

  if (gameState.gameData[0].i === gameState.gameData[0].results.length) {
    const components = [];
    if (game.skippedDeaths.length || game.skippedAlive.length) {
      const row = new ActionRowBuilder().addComponents(
        buttons.endButton,
        buttons.showSkip
      );
      components.push(row);
      // });
    } else {
      const row = new ActionRowBuilder().addComponents(
        buttons.endButton,
        buttons.deadButton
      );

      const row2 = new ActionRowBuilder().addComponents(
        buttons.endButton,
        buttons.noDeathButton
      );
      if (gameState.gameData[0].deaths.length) {
        components.push(row);
      } else {
        components.push(row2);
      }
    }

    await interaction.editReply({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: components,
    });

    createCollector(interaction, gameState);
  } else {
    await interaction.editReply({
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: [row],
    });
    const gameMsg = await interaction.fetchReply();
    const previewEmbed = await previewEvents(game);
    const preview = await interaction.followUp({
      embeds: [previewEmbed.embed],
      components: previewEmbed.components,
      ephemeral: true,
    });
    createCollector(interaction, gameState);
    createSkipCollector(interaction, preview, gameState, gameMsg);
  }
}

async function previewEvents(game) {
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`Next Events - ${game.results.length - game.i} left`);
  const components = [];
  const row = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  //check how many events are left
  let eventsLeft = game.results.length - game.i;
  if (eventsLeft > 5) {
    eventsLeft = 5;

    //row2 is next batch
    row2.addComponents(buttons.skipAll);
  } else {
    //row2 is skip to dead
    row2.addComponents(buttons.showSkip);
  }
  for (let i = 0; i < eventsLeft; i++) {
    embed.addFields({
      name: `Event ${i + 1} - ${game.results[game.i + i].type}`,
      value: game.results[game.i + i].event,
    });
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${i}`)
        .setLabel(`${i + 1}`)
        .setStyle(
          game.results[game.i + i].type === "fatal"
            ? ButtonStyle.Danger
            : ButtonStyle.Secondary
        )
    );
  }

  components.push(row, row2);

  return { embed, components };
}

async function generateSkippedTributes(gameRunner, tributes, headerText) {
  const embed = new EmbedBuilder()
    .setTitle(`${gameRunner}'s Game - Offscreen`)
    .setImage("attachment://skippedPage.png")
    .setColor("#5d5050");
  const skipEvents = events["skipped"][headerText];

  const event = skipEvents[Math.floor(Math.random() * skipEvents.length)];

  const canvas = await canvasHelper.generateSkippedTributes(
    tributes,
    event.text
  );

  const attachment = new AttachmentBuilder(canvas.toBuffer(), {
    name: "skippedPage.png",
  });

  return { embed, attachment };
}

async function showSkippedTributes(interaction, gameState) {
  let game = gameState.gameData[0];
  const results = [];
  const components = [];
  if (game.skippedDeaths.length) {
    //show skipped deaths
    const deadTributes = await generateSkippedTributes(
      game.gameRunner,
      game.skippedDeaths,
      "dead"
    );
    results.push(deadTributes);
  }

  if (game.skippedAlive.length) {
    //show alive tributes
    const aliveTributes = await generateSkippedTributes(
      game.gameRunner,
      game.skippedAlive,
      "alive"
    );

    results.push(aliveTributes);
    // let t = game.skippedAlive.map((t) => t.username);
    // const embed = new EmbedBuilder()
    //   .setColor("#0099ff")
    //   .setTitle(`${game.gameRunner}'s Game - Offscreen`)
    //   .setDescription("alive")
    //   .addFields({
    //     name: "Tributes",
    //     value: t.join(", "),
    //   });

    // results.push({ embed: embed, attachment: null });
  }

  for (let i = 0; i < results.length; i++) {
    if (i === 0) {
      await interaction.editReply({
        embeds: [results[i].embed],
        files: [results[i].attachment],
      });
    } else {
      await interaction.followUp({
        embeds: [results[i].embed],
        files: results[i].attachment !== null ? [results[i].attachment] : [],
      });
    }
  }

  const row = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.deadButton
  );

  const row2 = new ActionRowBuilder().addComponents(
    buttons.endButton,
    buttons.noDeathButton
  );
  if (game.deaths.length) {
    components.push(row);
  } else {
    components.push(row2);
  }

  const selection = await interaction.followUp({
    content: ".",
    components: components,
  });
  createCollector(interaction, gameState, selection);
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
      buttons.nextDayButton
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
  game.skippedAlive = [];
  game.skippedDeaths = [];
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

async function collectorSwitch(interaction, gameState, gameMsg) {
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
    } else {
      //skip/continue
      await showSkippedTributes(interaction, gameState);
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

async function createSkipCollector(interaction, preview, gameState, gameMsg) {
  const filter = (i) => {
    return i.user.id === interaction.user.id;
  };
  const collector = await preview.createMessageComponentCollector({
    filter,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "skip") {
        await interaction.deferUpdate();
        await skipTributes(gameState.gameData[0], gameState.gameData[0].i + 5);

        const previewEmbed = await previewEvents(gameState.gameData[0]);
        interaction.editReply({
          embeds: [previewEmbed.embed],
          components: previewEmbed.components,
          ephemeral: true,
        });
      } else {
        await interaction.deferReply();
        if (interaction.customId === "showskip") {
          let n =
            gameState.gameData[0].results.length - gameState.gameData[0].i;
          await skipTributes(
            gameState.gameData[0],
            n + gameState.gameData[0].i
          );
          //show skipped
          await showSkippedTributes(interaction, gameState);
        } else {
          let n = parseInt(interaction.customId);
          await skipTributes(
            gameState.gameData[0],
            n + gameState.gameData[0].i
          );
          await runTurn(interaction, gameState);
        }
        await gameMsg.edit({ components: [] });
        collector.stop();
        return;
      }
    } catch (error) {
      console.log(error);
    }
  });
}

async function createCollector(interaction, gameState, selection) {
  let gameMsg;
  if (!selection) {
    gameMsg = await interaction.fetchReply();
  } else {
    gameMsg = selection;
  }

  const filter = (i) => {
    return i.user.id === interaction.user.id;
  };

  const collector = await gameMsg.createMessageComponentCollector({
    filter,
  });

  // const filter = (i) => {
  //   return i.user.id === interaction.user.id;
  // };
  // const collector = await gameMsg.createMessageComponentCollector({
  //   filter,
  // });

  // const collector = await gameMsg.createMessageComponentCollector({
  //   filter,
  // });

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
        collectorSwitch(interaction, gameState, gameMsg);
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

async function skipTributes(game, n) {
  while (game.i < n) {
    game.results[game.i].tributes.map((tribute) => {
      if (tribute.alive) {
        game.skippedAlive.push(tribute);
      } else {
        game.skippedDeaths.push(tribute);
      }
    });
    game.i++;
  }
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

async function concatEvents(roundType) {
  if (roundType === Round.BLOODBATH || roundType === Round.FEAST) {
    //mix fatal
    const fatalEvents = events[roundType]["fatal"].concat(
      events["general"]["fatal"]
    );
    return {
      title: events[roundType]["title"],
      description: events[roundType]["description"],
      nonfatal: events[roundType]["nonfatal"],
      fatal: fatalEvents,
    };
  } else if (roundType === Round.DAY || roundType === Round.NIGHT) {
    //mix both fatal and nonfatal
    const nonfatalEvents = events[roundType]["nonfatal"].concat(
      events["general"]["nonfatal"]
    );
    const fatalEvents = events[roundType]["fatal"].concat(
      events["general"]["fatal"]
    );
    return {
      title: events[roundType]["title"],
      description: events[roundType]["description"],
      nonfatal: nonfatalEvents,
      fatal: fatalEvents,
    };
  }
}

module.exports = { createNewGameCollector, setupGame };
