const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const { getTributes } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tributes")
    .setDescription("Gets a list of current tributes!"),
  async execute(interaction, db, mongoClient) {
    const result = await getTributes(
      mongoClient,
      interaction,
      "active-tributes"
    );
    if (!result.length) return interaction.reply("There are no tributes");
    console.log(result[0].tributeData);

    await generateTributes(result[0].tributeData, interaction);
  },
};

async function generateTributes(players, interaction) {
  const tributeEmbed = new MessageEmbed()
    .setImage("attachment://tributesPage.png")
    .setColor("#5d5050");

  const canvas = await canvasHelper.populateCanvas(players);

  const attachment = new MessageAttachment(
    canvas.toBuffer(),
    "tributesPage.png"
  );

  await interaction.reply({
    embeds: [tributeEmbed],
    files: [attachment],
    ephemeral: true,
  });
}

// async function populateCanvas(canvasHelper, tributeData) {
//   const verticalAvatarCount = Math.min(tributeData.length, 6);
//   const horitzontalAvatarCount = Math.ceil(tributeData.length / 6);

//   const canvasWidth =
//     (avatarSize + avatarSpacingX) * verticalAvatarCount -
//     avatarSpacingX +
//     avatarPaddingX * 2;
//   const canvasHeight =
//     horitzontalAvatarCount * avatarSpacingY +
//     horitzontalAvatarCount * avatarSize -
//     avatarSpacingY +
//     avatarPaddingY * 2 -
//     100;

//   const canvas = createCanvas(canvasWidth, canvasHeight);
//   const ctx = canvas.getContext("2d");

//   canvasHelper.drawBackground(ctx, "#5d5050");
//   drawHeaderText(ctx, ["The Reaping"]);
//   await generateStatusImage(ctx, tributeData, canvasHelper);

//   return canvas;
// }

// async function generateStatusImage(ctx, tributeData, canvasHelper) {
//   ctx.strokeStyle = "#000000";

//   let destinationX = avatarPaddingX;
//   let destinationY = avatarPaddingY;

//   const avatarPromises = await canvasHelper.massLoadImages(tributeData);

//   for (let i = 0; i < tributeData.length; i++) {
//     ctx.drawImage(
//       await avatarPromises[i],
//       destinationX,
//       destinationY,
//       avatarSize,
//       avatarSize
//     );
//     ctx.strokeRect(destinationX, destinationY, avatarSize, avatarSize);

//     if (!tributeData[i].alive)
//       canvasHelper.greyScale(ctx, destinationX, destinationY, avatarSize);

//     const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
//     destinationX += avatarSize + avatarSpacingX * spacingMultiplier;

//     if ((i + 1) % 6 === 0) {
//       destinationX = avatarPaddingX;
//       destinationY += avatarSize + avatarSpacingY;
//     }
//   }

//   drawTributeName(ctx, tributeData);
//   drawAliveText(ctx, tributeData);
//   drawDistrictText(ctx, tributeData);
// }

// function drawHeaderText(ctx, textArray) {
//   const text = ["The Mickey Games", ...textArray];

//   ctx.textBaseline = "top";
//   ctx.font = "35px arial";
//   ctx.textAlign = "center";

//   let textPaddingY = 30;
//   const ySizing = 45;

//   for (let i = 0; i < text.length; i++) {
//     const textMeasure = ctx.measureText(text[i]);
//     const textCenterAlignment =
//       ctx.canvas.width / 2 - textMeasure.actualBoundingBoxLeft - 5;
//     const textWidth = textMeasure.width + 10;

//     ctx.fillStyle = "#232323";
//     ctx.fillRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

//     ctx.strokeStyle = "#ffffff";
//     ctx.strokeRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

//     ctx.fillStyle = "#e4ae24";
//     ctx.fillText(text[i], ctx.canvas.width / 2, textPaddingY);
//     textPaddingY += 70;
//   }
// }

// function drawDistrictText(ctx, tributeArray) {
//   ctx.font = "bold 28px arial";
//   ctx.fillStyle = "#ffffff";
//   ctx.textAlign = "center";
//   ctx.textBaseline = "top";

//   const districtCount = tributeArray.map((trib) => trib.district).pop();

//   let textDestinationY = avatarPaddingY - 40;
//   let textDestinationX = avatarPaddingX + halfAvatar;

//   if (tributeArray.length === 2) {
//     ctx.fillText(`District 1`, textDestinationX, textDestinationY);
//     ctx.fillText(
//       `District 2`,
//       textDestinationX + avatarSize + avatarSpacingX,
//       textDestinationY
//     );
//     return;
//   }

//   const middleXPositionArray = [215, 590, 965];
//   const centerXPositionArray = [125, 500, 875];

//   let iterator = 0;

//   for (let i = 0; i < districtCount; i++) {
//     const isLastIteration = i === districtCount - 1;

//     if (isLastIteration && tributeArray.length % 2 === 1) {
//       textDestinationX = centerXPositionArray[iterator];
//     } else {
//       textDestinationX = middleXPositionArray[iterator];
//     }

//     ctx.fillText(`District ${i + 1}`, textDestinationX, textDestinationY);
//     iterator++;

//     if ((i + 1) % 3 === 0) {
//       iterator = 0;
//       textDestinationY += avatarSize + avatarSpacingY;
//     }
//   }
// }

// function drawAliveText(ctx, tributeArray) {
//   const aliveColor = "#70ec25";
//   const deceasedColor = "#fa6666";
//   ctx.font = "bold 25px arial";
//   ctx.textAlign = "center";

//   let textDestinationX = avatarPaddingX + halfAvatar;
//   let textDestinationY = avatarPaddingY + avatarSize + 30;

//   for (let i = 0; i < tributeArray.length; i++) {
//     const { alive } = tributeArray[i];
//     const statusText = alive ? "Alive" : "Deceased";

//     ctx.fillStyle = alive ? aliveColor : deceasedColor;
//     ctx.fillText(statusText, textDestinationX, textDestinationY);

//     const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
//     textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

//     if ((i + 1) % 6 === 0) {
//       textDestinationX = avatarPaddingX + halfAvatar;
//       textDestinationY += avatarSize + avatarSpacingY;
//     }
//   }
// }

// function drawTributeName(ctx, tributeArray) {
//   ctx.fillStyle = "#ffffff";
//   ctx.font = "bold 20px arial";
//   ctx.textAlign = "center";

//   let textDestinationX = avatarPaddingX + halfAvatar;
//   let textDestinationY = avatarPaddingY + avatarSize + 5;

//   for (let i = 0; i < tributeArray.length; i++) {
//     ctx.fillText(
//       `${tributeArray[i].username.slice(0, 20)}`,
//       textDestinationX,
//       textDestinationY
//     );

//     const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
//     textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

//     if ((i + 1) % 6 === 0) {
//       textDestinationX = avatarPaddingX + halfAvatar;
//       textDestinationY += avatarSize + avatarSpacingY;
//     }
//   }
// }
