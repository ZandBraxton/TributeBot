const { createCanvas, loadImage } = require("canvas");

const avatarSize = 150;
const halfAvatar = 75;
const avatarPaddingX = 50;
const avatarPaddingY = 230;
const avatarSpacingX = 30;
const avatarSpacingY = 130;
const reBrackets = /\(([^)]+)\)/;

function drawBackground(ctx, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

async function massLoadImages(tributeData) {
  const avatarPromises = [];
  for (let i = 0; i < tributeData.length; i++) {
    const avatar = loadImage(tributeData[i].avatar);
    avatarPromises.push(avatar);
  }

  return await Promise.all(avatarPromises);
}

function greyScale(ctx, destinationX, destinationY, avatarSize) {
  const imageData = ctx.getImageData(
    destinationX,
    destinationY,
    avatarSize,
    avatarSize
  );

  const pixels = imageData.data;

  for (let j = 0; j < pixels.length; j += 4) {
    const lightness = parseInt((pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3);

    pixels[j] = lightness;
    pixels[j + 1] = lightness;
    pixels[j + 2] = lightness;
  }

  ctx.putImageData(imageData, destinationX, destinationY);
}

async function populateCanvas(tributeData) {
  const verticalAvatarCount = Math.min(tributeData.length, 6);
  const horitzontalAvatarCount = Math.ceil(tributeData.length / 6);

  const canvasWidth =
    (avatarSize + avatarSpacingX) * verticalAvatarCount -
    avatarSpacingX +
    avatarPaddingX * 2;
  const canvasHeight =
    horitzontalAvatarCount * avatarSpacingY +
    horitzontalAvatarCount * avatarSize -
    avatarSpacingY +
    avatarPaddingY * 2 -
    100;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, "#5d5050");
  drawHeaderText(ctx, ["The Reaping"], "tributes");
  await generateStatusImage(ctx, tributeData);

  return canvas;
}

async function generateStatusImage(ctx, tributeData) {
  ctx.strokeStyle = "#000000";

  let destinationX = avatarPaddingX;
  let destinationY = avatarPaddingY;

  const avatarPromises = await massLoadImages(tributeData);

  for (let i = 0; i < tributeData.length; i++) {
    ctx.drawImage(
      await avatarPromises[i],
      destinationX,
      destinationY,
      avatarSize,
      avatarSize
    );
    ctx.strokeRect(destinationX, destinationY, avatarSize, avatarSize);

    if (!tributeData[i].alive)
      greyScale(ctx, destinationX, destinationY, avatarSize);

    const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
    destinationX += avatarSize + avatarSpacingX * spacingMultiplier;

    if ((i + 1) % 6 === 0) {
      destinationX = avatarPaddingX;
      destinationY += avatarSize + avatarSpacingY;
    }
  }

  drawTributeName(ctx, tributeData);
  drawAliveText(ctx, tributeData);
  drawDistrictText(ctx, tributeData);
  drawKillsText(ctx, tributeData);
}

async function generateEventImage(eventText, resultsText, avatarArray) {
  const canvasHeight = 500;
  const canvas = createCanvas(1, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.font = "35px arial";

  let bracketOffset =
    resultsText.split("(").length - 1 + (resultsText.split(")").length - 1);

  const canvasWidth = Math.max(
    ctx.measureText(resultsText).width + 100 - bracketOffset * 12,
    ctx.measureText("The Mickey Games").width + 100
  );

  ctx.canvas.width = canvasWidth;

  drawBackground(ctx, "#5d5050");
  drawHeaderText(ctx, [eventText, resultsText], "event");

  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";

  const avatarYPosition = canvasHeight / 2 + -150;
  let avatarXPosition = canvasWidth / 2 - 125;
  avatarXPosition -= (avatarSpacingX / 2 + 125) * (avatarArray.length - 1);

  for (let i = 0; i < avatarArray.length; i++) {
    const tributeImage = await loadImage(avatarArray[i]);

    ctx.drawImage(tributeImage, avatarXPosition, avatarYPosition, 250, 250);
    ctx.strokeRect(avatarXPosition, avatarYPosition, 250, 250);

    avatarXPosition += avatarSpacingX + 250;
  }

  return canvas;
}

async function generateFallenTributes(deaths, announcementCount, deathMessage) {
  const canvasHeight = 500;

  const canvas = createCanvas(1, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.font = "bold 28px arial";

  const deathMessageLength = ctx.measureText(deathMessage).width + 200;
  const avatarXLength =
    avatarPaddingX * 2 +
    avatarSize * deaths.length +
    avatarSpacingX * (deaths.length - 1);
  const canvasWidth = Math.max(deathMessageLength, avatarXLength);

  ctx.canvas.width = canvasWidth;
  drawBackground(ctx, "#5d5050");
  drawHeaderText(
    ctx,
    [deathMessage, `Fallen Tributes ${announcementCount}`],
    "dead"
  );

  ctx.font = "bold 20px arial";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.textAlign = "center";

  const avatarYPosition = canvasHeight / 2 + -30;
  let avatarXPosition = canvasWidth / 2 - halfAvatar;
  const textYPosition = avatarYPosition + avatarSize + 10;

  avatarXPosition -= (avatarSpacingX / 2 + halfAvatar) * (deaths.length - 1);

  for (let i = 0; i < deaths.length; i++) {
    const tributeImage = await loadImage(deaths[i].avatar);

    ctx.drawImage(
      tributeImage,
      avatarXPosition,
      avatarYPosition,
      avatarSize,
      avatarSize
    );
    ctx.strokeRect(avatarXPosition, avatarYPosition, avatarSize, avatarSize);

    greyScale(ctx, avatarXPosition, avatarYPosition, avatarSize);

    const textXPosition = avatarXPosition + halfAvatar;

    ctx.fillText(
      `${deaths[i].username.slice(0, 10)}...`,
      textXPosition,
      textYPosition
    );
    ctx.fillText(
      `District ${deaths[i].district}`,
      textXPosition,
      textYPosition + 30
    );

    avatarXPosition += avatarSpacingX + avatarSize;
  }

  return canvas;
}

async function generateWinnerImage(tributeData) {
  const canvasWidth = 400 * tributeData.length;
  const canvasHeight = 400;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, "#5d5050");

  if (tributeData.length === 1) {
    drawHeaderText(
      ctx,
      ["The Winner", `District ${tributeData[0].district}`],
      "win"
    );
  } else {
    drawHeaderText(
      ctx,
      ["The Winners", `District ${tributeData[0].district}`],
      "win"
    );
  }

  ctx.strokeStyle = "#000000";

  const avatarYPosition = canvasHeight / 2 - 30;
  let avatarXPosition = canvasWidth / 2 - halfAvatar;
  avatarXPosition -= (avatarSpacingX + halfAvatar) * (tributeData.length - 1);
  const textYPosition = avatarYPosition + avatarSize + 10;

  for (let i = 0; i < tributeData.length; i++) {
    const tributeImage = await loadImage(tributeData[i].avatar);
    const textXPosition = avatarXPosition + halfAvatar;

    ctx.drawImage(
      tributeImage,
      avatarXPosition,
      avatarYPosition,
      avatarSize,
      avatarSize
    );
    ctx.strokeRect(avatarXPosition, avatarYPosition, avatarSize, avatarSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px arial";

    ctx.fillText(
      `${tributeData[i].username.slice(0, 10)}`,
      textXPosition,
      textYPosition
    );

    ctx.fillText(
      tributeData[i].kills === 1
        ? `${tributeData[i].kills} Kill`
        : `${tributeData[i].kills} Kills`,
      textXPosition,
      textYPosition + 30
    );

    avatarXPosition += avatarSpacingX + avatarSize;
  }

  return canvas;
}

function drawHeaderText(ctx, textArray, type) {
  let text = [...textArray];
  if (type === "tributes") {
    text = ["The Mickey Games", ...textArray];
  }

  ctx.textBaseline = "top";
  ctx.font = "35px arial";
  ctx.textAlign = "center";

  let textPaddingY = 30;
  const ySizing = 45;

  for (let i = 0; i < text.length; i++) {
    const textMeasure = ctx.measureText(text[i]);
    const textCenterAlignment =
      ctx.canvas.width / 2 - textMeasure.actualBoundingBoxLeft - 5;
    const textWidth = textMeasure.width + 10;

    if (type === "event") {
      let arr = text[i].split(/(?!\(.*)\s(?![^(]*?\))/g);
      let args = [];
      arr.map((word) => {
        let check = reBrackets.exec(word);
        if (check) {
          if (word.substring(word.length - 2) === "'s") {
            check[1] += "'s";
          }
          let punc = word.substring(word.length - 1);
          if (punc === "," || punc === ".") {
            check[1] += punc;
          }
          args.push({
            text: check[1],
            fillStyle: "#e4ae24",
          });
        } else {
          args.push({
            text: word,
          });
        }
      });
      if (i === 0) {
        //the black bg
        ctx.fillStyle = "#232323";
        ctx.fillRect(textCenterAlignment, 30, textWidth, ySizing);

        // this is the white border
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(textCenterAlignment, 30, textWidth, ySizing);

        ctx.fillStyle = "#e4ae24";
        ctx.fillText(text[i], ctx.canvas.width / 2, 30);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = "35px arial";
        ctx.textAlign = "left";
        fillMixedText(ctx, args, 50, 400);

        // ctx.fillStyle = "#ffffff";
        // ctx.fillText(text[i], ctx.canvas.width / 2, 400);
      }
    } else if (type === "win") {
      if (i === 2) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text[i], ctx.canvas.width / 2, 400);
      } else {
        ctx.fillStyle = "#232323";
        ctx.fillRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

        // this is the white border
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

        ctx.fillStyle = "#e4ae24";
        ctx.fillText(text[i], ctx.canvas.width / 2, textPaddingY);
        textPaddingY += 70;
      }
    } else {
      // this is the black background
      ctx.fillStyle = "#232323";
      ctx.fillRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

      // this is the white border
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(textCenterAlignment, textPaddingY, textWidth, ySizing);

      ctx.fillStyle = "#e4ae24";
      ctx.fillText(text[i], ctx.canvas.width / 2, textPaddingY);
      textPaddingY += 70;
    }
  }
}

function drawDistrictText(ctx, tributeArray) {
  ctx.font = "bold 28px arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const districtCount = tributeArray.map((trib) => trib.district).pop();

  let textDestinationY = avatarPaddingY - 40;
  let textDestinationX = avatarPaddingX + halfAvatar;

  if (tributeArray.length === 2) {
    ctx.fillText(`District 1`, textDestinationX, textDestinationY);
    ctx.fillText(
      `District 2`,
      textDestinationX + avatarSize + avatarSpacingX,
      textDestinationY
    );
    return;
  }

  const middleXPositionArray = [215, 590, 965];
  const centerXPositionArray = [125, 500, 875];

  let iterator = 0;

  for (let i = 0; i < districtCount; i++) {
    const isLastIteration = i === districtCount - 1;

    if (isLastIteration && tributeArray.length % 2 === 1) {
      textDestinationX = centerXPositionArray[iterator];
    } else {
      textDestinationX = middleXPositionArray[iterator];
    }

    ctx.fillText(`District ${i + 1}`, textDestinationX, textDestinationY);
    iterator++;

    if ((i + 1) % 3 === 0) {
      iterator = 0;
      textDestinationY += avatarSize + avatarSpacingY;
    }
  }
}

function drawAliveText(ctx, tributeArray) {
  const aliveColor = "#70ec25";
  const deceasedColor = "#fa6666";
  ctx.font = "bold 25px arial";
  ctx.textAlign = "center";

  let textDestinationX = avatarPaddingX + halfAvatar;
  let textDestinationY = avatarPaddingY + avatarSize + 30;

  for (let i = 0; i < tributeArray.length; i++) {
    const { alive } = tributeArray[i];
    const statusText = alive ? "Alive" : "Deceased";

    ctx.fillStyle = alive ? aliveColor : deceasedColor;
    ctx.fillText(statusText, textDestinationX, textDestinationY);

    const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
    textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

    if ((i + 1) % 6 === 0) {
      textDestinationX = avatarPaddingX + halfAvatar;
      textDestinationY += avatarSize + avatarSpacingY;
    }
  }
}

function drawKillsText(ctx, tributeArray) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px arial";
  ctx.textAlign = "center";

  let textDestinationX = avatarPaddingX + halfAvatar;
  let textDestinationY = avatarPaddingY + avatarSize + 60;

  for (let i = 0; i < tributeArray.length; i++) {
    if (tributeArray[i].kills !== 0) {
      ctx.fillText(
        tributeArray[i].kills === 1
          ? `${tributeArray[i].kills} Kill`
          : `${tributeArray[i].kills} Kills`,
        textDestinationX,
        textDestinationY
      );

      const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
      textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

      if ((i + 1) % 6 === 0) {
        textDestinationX = avatarPaddingX + halfAvatar;
        textDestinationY += avatarSize + avatarSpacingY;
      }
    } else {
      ctx.fillText("", textDestinationX, textDestinationY);

      const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
      textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

      if ((i + 1) % 6 === 0) {
        textDestinationX = avatarPaddingX + halfAvatar;
        textDestinationY += avatarSize + avatarSpacingY;
      }
    }
  }
}

function drawTributeName(ctx, tributeArray) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px arial";
  ctx.textAlign = "center";

  let textDestinationX = avatarPaddingX + halfAvatar;
  let textDestinationY = avatarPaddingY + avatarSize + 5;

  for (let i = 0; i < tributeArray.length; i++) {
    ctx.fillText(
      `${tributeArray[i].username.slice(0, 20)}`,
      textDestinationX,
      textDestinationY
    );

    const spacingMultiplier = i % 2 === 0 ? 1 : 1.5;
    textDestinationX += avatarSize + avatarSpacingX * spacingMultiplier;

    if ((i + 1) % 6 === 0) {
      textDestinationX = avatarPaddingX + halfAvatar;
      textDestinationY += avatarSize + avatarSpacingY;
    }
  }
}

const fillMixedText = (ctx, args, x, y) => {
  let defaultFillStyle = ctx.fillStyle;
  let defaultFont = ctx.font;

  ctx.save();
  args.forEach(({ text, fillStyle, font }) => {
    ctx.fillStyle = fillStyle || defaultFillStyle;
    ctx.font = font || defaultFont;
    ctx.fillText(text, x, y);
    x += ctx.measureText(text).width + 10;
  });

  ctx.restore();
};

module.exports = {
  drawBackground,
  massLoadImages,
  greyScale,
  populateCanvas,
  generateEventImage,
  generateFallenTributes,
  generateWinnerImage,
};
