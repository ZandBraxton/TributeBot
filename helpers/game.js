const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  createMessageComponentCollector,
} = require("discord.js");
const canvasHelper = require("../helpers/canvas");

const fs = require("fs");

function shuffle(array) {
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

function gameOver(tributeData) {
  const tributesLeftAlive = tributesLeftAlive(tributeData);

  if (tributesLeftAlive.length === 2)
    return tributesLeftAlive[0].district === tributesLeftAlive[1].district;
  else if (tributesLeftAlive.length === 1) return true;
  else return false;
}

function tributesLeftAlive(tributeData) {
  return tributeData.filter((tribute) => tribute.alive);
}

// async function startGame() {
//   fs;
// }

async function generateTributes(players) {
  const embed = new MessageEmbed()
    .setTitle("Game has been setup!")
    .setImage("attachment://tributesPage.png")
    .setColor("#5d5050");

  const canvas = await canvasHelper.populateCanvas(players);

  const attachment = new MessageAttachment(
    canvas.toBuffer(),
    "tributesPage.png"
  );

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId("random")
        .setLabel("Randomize Districts")
        .setStyle("PRIMARY")
    )
    .addComponents(
      new MessageButton()
        .setCustomId("start")
        .setLabel("Start")
        .setStyle("SUCCESS")
    );
  return { embed, attachment, row };
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
          tribute.kills++;
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
      const idOrName = ID ? `<${tributes[i].id}>` : tributes[i].username;
      text = text.replaceAll(`(Player${i + 1})`, `${idOrName}`);
    }

    return text;
  }
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  shuffle,
  tributesLeftAlive,
  gameOver,
  generateTributes,
  eventTrigger,
  sleep,
};
