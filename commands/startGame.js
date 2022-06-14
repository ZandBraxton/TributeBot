const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
} = require("discord.js");
const fs = require("fs");
const game = require("../helpers/game");
const canvasHelper = require("../helpers/canvas");
const { bloodbath, day, night } = require("../events.json");
const { v4: uuidv4 } = require("uuid");

// const row2 = new MessageActionRow().addComponents(
//   new MessageButton().setCustomId("next").setLabel("Next").setStyle("SUCCESS")
// );

// const row3 = new MessageActionRow().addComponents(
//   new MessageButton()
//     .setCustomId("dead")
//     .setLabel("Show Fallen Tributes")
//     .setStyle("SUCCESS")
// );

// startGame = true;
// let bloodBath = true;
// let sun = true;
// let turn = 0;
// let announcementCount = 1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mickey-games")
    .setDescription("(Mickey Masters Only) Set's up a new Mickey Games!")
    .addBooleanOption((option) =>
      option.setName("shuffle").setDescription("Select to shuffle districts")
    ),
  async execute(interaction) {
    const shuffle = interaction.options.getBoolean("shuffle");
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        setupGame(data, interaction, shuffle);
      }
    });

    async function setupGame(data, interaction, shuffle) {
      let tributes = [];
      let i = 0;
      let parsedData = JSON.parse(data);
      if (shuffle === true) {
        parsedData = game.shuffle(parsedData);
        let json = JSON.stringify(parsedData);
        fs.writeFile("tributes.json", json, function (error) {
          if (error) {
            console.log("[write auth]:" + error);
            return interaction.reply("There was an error shuffling districts!");
          }
        });
      }

      let gameData = [
        {
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
        },
      ];

      fs.writeFile(
        "currentGame.json",
        JSON.stringify(gameData),
        function (error) {
          if (error) {
            console.log("[write auth]:" + error);
            return interaction.reply("There was an error shuffling districts!");
          }
        }
      );

      await parsedData.map((user) => {
        i++;
        tributes.push({
          username: user.username,
          id: user.id,
          avatar: user.avatar,
          alive: true,
          kills: 0,
          district: parsedData.length === 2 ? i + 1 : Math.ceil(i / 2),
        });
      });
      let json = JSON.stringify(tributes);
      fs.writeFile("game.json", json, function (error) {
        if (error) {
          console.log("[write auth]:" + error);
          return interaction.reply("There was an error setting up the game!");
        }
      });

      const embedData = await game.generateTributes(tributes);
      if (interaction.isCommand()) {
        interaction.reply({
          embeds: [embedData.embed],
          files: [embedData.attachment],
          components: [embedData.row],
        });
        const filter = (i) => {
          i.deferUpdate();
          return i.user.id === interaction.user.id;
        };

        const collector = interaction.channel.createMessageComponentCollector({
          filter,
        });

        collector.on("collect", async (interaction) => {
          console.log(interaction.customId);
          if (interaction.customId === "random") {
            fs.readFile("tributes.json", "utf-8", function (err, data) {
              if (err) {
                console.log(err);
              } else {
                setupGame(data, interaction, true);
              }
            });
          } else if (interaction.customId.substring(0, 5) === "start") {
            fs.readFile("currentGame.json", "utf-8", function (err, data) {
              if (err) {
                console.log(err);
              }
              startTurn(interaction, JSON.parse(data), tributes);
            });

            // if (!bloodBath && sun) turn++;
            // console.log(bloodBath);

            // const remainingTributes = game.tributesLeftAlive(tributes);
            // const currentEvent = bloodBath ? bloodbath : sun ? day : night;

            // const deaths = [];
            // const results = [];
            // const embedResultsText = [];
            // const avatars = [];

            // game.eventTrigger(
            //   currentEvent,
            //   remainingTributes,
            //   avatars,
            //   deaths,
            //   results,
            //   embedResultsText
            // );

            // const eventText = `${
            //   bloodBath ? "Bloodbath" : sun ? `Day ${turn}` : `Night ${turn}`
            // }`;

            // const hungerGamesEmbed = new MessageEmbed()
            //   .setTitle(`The Mickey Games - ${eventText}`)
            //   .setColor("#5d5050");

            // let i = 0;

            // // await gameTurn(
            // //   interaction,
            // //   eventText,
            // //   remainingTributes,
            // //   results,
            // //   avatars,
            // //   hungerGamesEmbed,
            // //   filter,
            // //   i
            // // );

            // do {
            //   if (!bloodBath && sun) turn++;
            //   console.log(bloodBath);

            //   const remainingTributes = game.tributesLeftAlive(tributes);
            //   const currentEvent = bloodBath ? bloodbath : sun ? day : night;

            //   const deaths = [];
            //   const results = [];
            //   const embedResultsText = [];
            //   const avatars = [];

            //   game.eventTrigger(
            //     currentEvent,
            //     remainingTributes,
            //     avatars,
            //     deaths,
            //     results,
            //     embedResultsText
            //   );

            //   const eventText = `${
            //     bloodBath ? "Bloodbath" : sun ? `Day ${turn}` : `Night ${turn}`
            //   }`;

            //   const hungerGamesEmbed = new MessageEmbed()
            //     .setTitle(`The Mickey Games - ${eventText}`)
            //     .setColor("#5d5050");

            //   //   let i = 0;

            //   //   await gameTurn(
            //   //     interaction,
            //   //     eventText,
            //   //     remainingTributes,
            //   //     results,
            //   //     avatars,
            //   //     hungerGamesEmbed,
            //   //     filter,
            //   //     i
            //   //   );

            //   for (let i = 0; i < results.length; i++) {
            //     const eventImage = await canvasHelper.generateEventImage(
            //       eventText,
            //       results[i],
            //       avatars[i]
            //     );

            //     const eventAttachment = new MessageAttachment(
            //       eventImage.toBuffer(),
            //       "currentEvent.png"
            //     );

            //     hungerGamesEmbed.setImage("attachment://currentEvent.png");
            //     hungerGamesEmbed.setFooter({
            //       text: `${remainingTributes.length} Tributes Remaining...`,
            //     });

            //     await interaction.followUp({
            //       //   content: `${embedResultsText[i]}`,
            //       embeds: [hungerGamesEmbed],
            //       files: [eventAttachment],
            //       components: [row2],
            //     });
            //     await game.sleep(5000);
            //   }

            //   if (deaths.length) {
            //     const deathMessage = `${deaths.length} cannon shot${
            //       deaths.length === 1 ? "" : "s"
            //     } can be heard in the distance.`;
            //     const deathList = deaths
            //       .map((trib) => `<@${trib.id}>`)
            //       .join("\n");
            //     const deathImage = await canvasHelper.generateFallenTributes(
            //       deaths,
            //       announcementCount,
            //       deathMessage
            //     );

            //     const deathAttachment = new MessageAttachment(
            //       deathImage.toBuffer(),
            //       "deadTributes.png"
            //     );

            //     const deadTributesEmbed = new MessageEmbed()
            //       .setTitle(`The Mickey Games - Fallen Tributes`)
            //       .setImage("attachment://deadTributes.png")
            //       .setDescription(`\n${deathMessage}\n\n${deathList}`)
            //       .setFooter({
            //         text: `You have 5 minutes to click proceed, or the game will continue automatically.`,
            //       })
            //       .setColor("#5d5050");
            //     const deadTributeMessage = await interaction.followUp({
            //       embeds: [deadTributesEmbed],
            //       files: [deathAttachment],
            //       components: [row2],
            //     });

            //     const continueGame = await deadTributeMessage
            //       .awaitMessageComponent({
            //         filter,
            //         componentType: "BUTTON",
            //         time: 300000,
            //       })
            //       .catch(() => false);

            //     announcementCount++;
            //   }

            //   if (!bloodBath) sun = !sun;

            //   if (bloodBath) bloodBath = false;
            // } while (game.gameOver(tributeData) === false);

            // const tributesLeft = game.tributesLeftAlive(tributes);
            // const winner = tributesLeft
            //   .map((trib) => `${trib.name}`)
            //   .join(" and ");
            // const winnerText =
            //   tributesLeft.length > 1 ? `winners are` : `winner is`;

            // const winnerImage = await canvas.generateWinnerImage(tributesLeft);

            // const winAttachment = new MessageAttachment(
            //   winnerImage.toBuffer(),
            //   "winner.png"
            // );

            // const winnerEmbed = new MessageEmbed()
            //   .setTitle(
            //     `The ${winnerText} ${winner} from District ${tributesLeft[0].district}!`
            //   )
            //   .setImage("attachment://winner.png")
            //   .setColor("#5d5050");
            // interaction.followUp({
            //   embeds: [winnerEmbed],
            //   files: [winAttachment],
            // });
          } else if (interaction.customId.substring(0, 4) === "next") {
            fs.readFile("currentGame.json", "utf-8", function (err, data) {
              if (err) {
                console.log(err);
              }
              nextTurn(interaction, JSON.parse(data), tributes);
            });
          } else if (interaction.customId.substring(0, 4) === "dead") {
            fs.readFile("currentGame.json", "utf-8", function (err, data) {
              if (err) {
                console.log(err);
              }
              showFallenTributes(interaction, JSON.parse(data), tributes);
            });
          }
        });
      } else {
        interaction.update({
          embeds: [embedData.embed],
          files: [embedData.attachment],
          components: [embedData.row],
        });
      }
    }
  },
};

async function startTurn(interaction, data, tributes) {
  if (!data[0].bloodBath && data[0].sun) data[0].turn++;

  const remainingTributes = game.tributesLeftAlive(tributes);
  const currentEvent = data[0].bloodBath
    ? bloodbath
    : data[0].sun
    ? day
    : night;

  //   const deaths = [];
  //   const results = [];
  //   const embedResultsText = [];
  //   const avatars = [];

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

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("next" + uniqueId)
      .setLabel("Next")
      .setStyle("SUCCESS")
  );

  //   let i = 0;

  //   await gameTurn(
  //     interaction,
  //     eventText,
  //     remainingTributes,
  //     results,
  //     avatars,
  //     hungerGamesEmbed,
  //     filter,
  //     i
  //   );

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
  let json = JSON.stringify(data);

  fs.writeFile("currentGame.json", json, function (error) {
    if (error) {
      console.log("[write auth]:" + error);
      return interaction.reply("There was an error shuffling districts!");
    }
  });

  return await interaction.channel.send({
    //   content: `${embedResultsText[i]}`,
    embeds: [hungerGamesEmbed],
    files: [eventAttachment],
    components: [row],
  });
}

async function nextTurn(interaction, data, tributes) {
  if (!data[0].bloodBath && data[0].sun) data[0].turn++;

  const remainingTributes = game.tributesLeftAlive(tributes);
  // const currentEvent = data[0].bloodBath
  //   ? bloodbath
  //   : data[0].sun
  //   ? day
  //   : night;

  // //   const deaths = [];
  // //   const results = [];
  // //   const embedResultsText = [];
  // //   const avatars = [];

  // game.eventTrigger(
  //   currentEvent,
  //   remainingTributes,
  //   data[0].avatars,
  //   data[0].deaths,
  //   data[0].results,
  //   data[0].embedResultsText
  // );

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

  //   let i = 0;

  //   await gameTurn(
  //     interaction,
  //     eventText,
  //     remainingTributes,
  //     results,
  //     avatars,
  //     hungerGamesEmbed,
  //     filter,
  //     i
  //   );

  const uniqueId = uuidv4();

  const row = new MessageActionRow().addComponents(
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
  let json = JSON.stringify(data);

  fs.writeFile("currentGame.json", json, function (error) {
    if (error) {
      console.log("[write auth]:" + error);
      return interaction.reply("There was an error shuffling districts!");
    }
  });

  if (data[0].i === data[0].results.length) {
    const row2 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("dead" + uniqueId)
        .setLabel("Show Fallen Tributes")
        .setStyle("SUCCESS")
    );
    await interaction.channel.send({
      //   content: `${embedResultsText[i]}`,
      embeds: [hungerGamesEmbed],
      files: [eventAttachment],
      components: [row2],
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

async function showFallenTributes(interaction, data, tributes) {
  let json = JSON.stringify(tributes);
  fs.writeFile("game.json", json, function (error) {
    if (error) {
      console.log("[write auth]:" + error);
      return interaction.reply("There was an error setting up the game!");
    }
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

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("next" + uniqueId)
        .setLabel("Next")
        .setStyle("SUCCESS")
    );

    const deadTributesEmbed = new MessageEmbed()
      .setTitle(`The Mickey Games - Fallen Tributes`)
      .setImage("attachment://deadTributes.png")
      .setDescription(`\n${deathMessage}\n\n${deathList}`)
      .setFooter({
        text: `You have 5 minutes to click proceed, or the game will continue automatically.`,
      })
      .setColor("#5d5050");
    await interaction.channel.send({
      embeds: [deadTributesEmbed],
      files: [deathAttachment],
      components: [row],
    });
    data[0].announcementCount++;
  }

  if (!data[0].bloodBath) data[0].sun = !data[0].sun;

  if (data[0].bloodBath) data[0].bloodBath = false;
}
