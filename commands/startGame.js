const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
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
  buildModal,
  placeBet,
  sleep,
} = require("../helpers/game");
const {
  activateTribute,
  activateBets,
  getTributes,
  payout,
} = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");
const { bloodbath, day, night } = require("../events.json");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
let districtSize;
let running = false;
const mongoClient = require("../database/mongodb");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mickey-games")
    .setDescription("(Game Runners Only)  Set's up a new Mickey Games!")
    .addIntegerOption((option) =>
      option
        .setName("district-size")
        .setDescription("Select the size of the districts (Default is 2)")
        .addChoices(
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          { name: "4", value: 4 }
        )
    ),
  async execute(interaction, db, setComponentActive, setBetsOpen) {
    districtSize = await interaction.options.getInteger("district-size");
    if (!districtSize) districtSize = 2;

    let data = await getTributes(mongoClient, interaction, "tributes");

    let CPUdata = await getTributes(mongoClient, interaction, "cpu-tributes");
    await CPUdata.map((cpu) => {
      if (cpu.active === true) {
        data.push(cpu);
      }
    });

    if (!data) return interaction.editReply("Error setting up game!");

    if (data.length < 2) {
      return interaction.editReply(
        "You need at least two tributes to run a game"
      );
    }

    if (districtSize === 3 && data.length < 6) {
      return interaction.editReply(
        "You need at least six tributes to run teams of three"
      );
    }
    if (districtSize === 4 && data.length < 8) {
      return interaction.editReply(
        "You need at least eight tributes to run teams of four"
      );
    }

    setComponentActive(true);
    setBetsOpen(true);

    await interaction.deferReply();

    let tributes = [];
    let gameData = [];

    await setupGame(
      data,
      interaction,
      true,
      mongoClient,
      tributes,
      gameData,
      setComponentActive,
      setBetsOpen,
      districtSize
    );
  },
};

async function setupGame(
  data,
  interaction,
  shuffle,
  mongoClient,
  tributes,
  gameData,
  setComponentActive,
  setBetsOpen,
  districtSize
) {
  tributes = [];
  if (shuffle === true) {
    data = shuffleDistricts(data);
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
  let districtCount;
  for (let i = 0; i < data.length; i++) {
    n++;
    tributes.push({
      username: data[i].username,
      id: data[i].id,
      avatar: data[i].avatar,
      alive: true,
      kills: 0,
      district:
        data.length === districtSize ? i + 1 : Math.ceil(n / districtSize),
    });
    districtCount =
      data.length === districtSize ? i + 1 : Math.ceil(n / districtSize);
  }

  await activateTribute(mongoClient, interaction, {
    guild: interaction.guild.id,
    gameRunner: interaction.user.username,
    tributeData: tributes,
    districtSize: districtSize,
    districtCount: districtCount,
    bets: [],
    pool: 0,
  });
  console.log(districtCount);

  const embedData = await generateTributes(tributes, districtSize);
  if (interaction.type === InteractionType.ApplicationCommand) {
    await interaction.editReply({
      // content: "`Bets are now open`",
      embeds: [embedData.embed],
      files: [embedData.attachment],
      components: embedData.components,
    });

    const bettingComponent = await interaction.followUp({
      content: "`Bets are now open, select a district to bet Scampoints on`",
      components: await betComponents(interaction),
    });

    const filter = (i) => {
      return i.user.id === interaction.user.id;
    };

    const bettingCollector =
      await bettingComponent.createMessageComponentCollector({});
    bettingCollector.on("collect", async (i) => {
      try {
        await placeBet(i, districtCount, interaction.user.username);
        console.log(i);
      } catch (error) {
        console.log(error);
      }
    });

    // await interaction.followUp("Bets are now open!");

    const collector = await interaction.channel.createMessageComponentCollector(
      {
        filter,
      }
    );

    collector.on("collect", async (interaction) => {
      if (interaction.customId.substring(0, 6) === "random") {
        if (interaction.values !== undefined) {
          let ds = parseInt(interaction.values[0]);

          if (ds === 3 && data.length < 6) {
            return interaction.channel.send(
              "You need at least six tributes to run teams of three"
            );
          }
          if (ds === 4 && data.length < 8) {
            return interaction.channel.send(
              "You need at least eight tributes to run teams of four"
            );
          }
          districtSize = parseInt(interaction.values[0]);
        }

        await interaction.channel.send("Bets have refreshed!");

        await setupGame(
          data,
          interaction,
          true,
          mongoClient,
          tributes,
          gameData,
          setComponentActive,
          setBetsOpen,
          districtSize
        );
      } else if (interaction.customId.substring(0, 5) === "start") {
        if (running === false) {
          setBetsOpen(false);
          await interaction.channel.send("Bets have now closed!");
        }
        running = true;

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
          collector,
          setComponentActive,
          setBetsOpen
        );
        await interaction.message.edit({ components: [] });
      } else if (interaction.customId.substring(0, 3) === "end") {
        const uniqueId = uuidv4();
        let row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("destroy" + uniqueId)
              .setLabel("End Game")
              .setStyle(ButtonStyle.Danger)
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId("cancel" + uniqueId)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.channel.send({
          content: "Are you sure you want to end the game?",
          components: [row],
        });
      } else if (interaction.customId.substring(0, 7) === "destroy") {
        await interaction.deleteReply();
        await interaction.channel.send("Game has been terminated");
        await activateBets(mongoClient, interaction, {
          bets: [],
          pool: 0,
        });
        setComponentActive(false);
        setBetsOpen(false);
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
      components: embedData.components,
    });
  }
}

async function startTurn(interaction, data, tributes) {
  if (!data[0].bloodBath && data[0].sun) data[0].turn++;

  const remainingTributes = tributesLeftAlive(tributes);
  const currentEvent = data[0].bloodBath
    ? bloodbath
    : data[0].sun
    ? day
    : night;

  eventTrigger(
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

  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(`The Mickey Games - ${eventText}`)
    .setColor("#5d5050");

  const uniqueId = uuidv4();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("end" + uniqueId)
        .setLabel("End Game")
        .setStyle(ButtonStyle.Danger)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId("next" + uniqueId)
        .setLabel("Next")
        .setStyle(ButtonStyle.Success)
    );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    data[0].results[data[0].i],
    data[0].avatars[data[0].i]
  );

  const eventAttachment = new AttachmentBuilder(
    eventImage.toBuffer(),
    "currentEvent.png"
  );

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: `${remainingTributes.length} Tributes Remaining...`,
  });

  data[0].i++;

  if (data[0].i === data[0].results.length) {
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle(ButtonStyle.Danger)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("dead" + uniqueId)
          .setLabel("Show Fallen Tributes")
          .setStyle(ButtonStyle.Primary)
      );

    const row3 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle(ButtonStyle.Danger)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("dead" + uniqueId)
          .setLabel("Nobody Died, Continue")
          .setStyle(ButtonStyle.Success)
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
  const remainingTributes = tributesLeftAlive(tributes);

  const eventText = `${
    data[0].bloodBath
      ? "Bloodbath"
      : data[0].sun
      ? `Day ${data[0].turn}`
      : `Night ${data[0].turn}`
  }`;

  const hungerGamesEmbed = new EmbedBuilder()
    .setTitle(`The Mickey Games - ${eventText}`)
    .setColor("#5d5050");

  const uniqueId = uuidv4();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("end" + uniqueId)
        .setLabel("End Game")
        .setStyle(ButtonStyle.Danger)
    )
    .addComponents(
      new ButtonBuilder()
        .setCustomId("next" + uniqueId)
        .setLabel("Next")
        .setStyle(ButtonStyle.Success)
    );

  const eventImage = await canvasHelper.generateEventImage(
    eventText,
    data[0].results[data[0].i],
    data[0].avatars[data[0].i]
  );

  const eventAttachment = new AttachmentBuilder(
    eventImage.toBuffer(),
    "currentEvent.png"
  );

  hungerGamesEmbed.setImage("attachment://currentEvent.png");
  hungerGamesEmbed.setFooter({
    text: `${remainingTributes.length} Tributes Remaining...`,
  });

  data[0].i++;

  if (data[0].i === data[0].results.length) {
    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle(ButtonStyle.Danger)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("dead" + uniqueId)
          .setLabel("Show Fallen Tributes")
          .setStyle(ButtonStyle.Primary)
      );

    const row3 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle(ButtonStyle.Danger)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("dead" + uniqueId)
          .setLabel("Nobody Died, Continue")
          .setStyle(ButtonStyle.Success)
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

async function showFallenTributes(
  interaction,
  data,
  mongoClient,
  tributes,
  collector,
  setComponentActive,
  setBetsOpen
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

    const deathAttachment = new AttachmentBuilder(
      deathImage.toBuffer(),
      "deadTributes.png"
    );

    const uniqueId = uuidv4();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("end" + uniqueId)
          .setLabel("End Game")
          .setStyle(ButtonStyle.Danger)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("start" + uniqueId)
          .setLabel("Continue Game")
          .setStyle(ButtonStyle.Success)
      );

    const deadTributesEmbed = new EmbedBuilder()
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
      const tributesLeft = tributesLeftAlive(tributes);
      const winner = tributesLeft.map((trib) => `${trib.name}`).join(" and ");
      const winnerText = tributesLeft.length > 1 ? `winners are` : `winner is`;

      const winnerImage = await canvasHelper.generateWinnerImage(tributesLeft);

      const winAttachment = new AttachmentBuilder(
        winnerImage.toBuffer(),
        "winner.png"
      );

      const winnerEmbed = new EmbedBuilder()
        .setTitle(
          `The ${winnerText} ${winner} from District ${tributesLeft[0].district}!`
        )
        .setImage("attachment://winner.png")
        .setColor("#5d5050");
      await interaction.channel.send({
        embeds: [winnerEmbed],
        files: [winAttachment],
      });

      await payout(mongoClient, interaction, db, tributesLeft[0].district);
      await activateBets(mongoClient, interaction, {
        bets: [],
        pool: 0,
      });

      setBetsOpen(false);
      running = false;
      setComponentActive(false);
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
  const tributesLeftAlive = tributesLeftAlive(tributeData);

  if (tributesLeftAlive.length === 1) return true;

  if (tributesLeftAlive.length <= districtSize) {
    if (districtSize === 2) {
      return tributesLeftAlive[0].district === tributesLeftAlive[1].district;
    } else {
      let check = tributesLeftAlive[0].district;
      return tributesLeftAlive.every((tribute) => tribute.district === check);
    }
  } else return false;
}
