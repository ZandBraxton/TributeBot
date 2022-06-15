const { createCanvas, loadImage } = require("canvas");

async function generateEventText() {
  const resultsText = "Nakkiel shoots an arrow at Eduardo_Hook";
  console.log(resultsText.split(" ").length);
  const args = [
    { text: "Nakkiel", fillStyle: "#e4ae24" },
    { text: "shoots an arrow", fillStyle: "#ffffff" },
    { text: "at", fillStyle: "#ffffff" },
    { text: "Eduardo_Hook", fillStyle: "#e4ae24" },
  ];
  const canvasHeight = 100;
  const canvas = createCanvas(1, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.font = "35px arial";
  ctx.fillStyle = "#ffffff";

  const canvasWidth =
    Math.max(ctx.measureText(resultsText).width) +
    resultsText.split(" ").length * 10;
  console.log(canvasWidth);
  ctx.canvas.width = canvasWidth;

  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";
  drawBackground(ctx, "#5d5050");

  fillMixedText(ctx, args, 10, 30);

  return canvas;
}

const fillMixedText = (ctx, args, x, y) => {
  console.log(ctx.font);
  console.log(ctx.fillStyle);
  let defaultFillStyle = "#ffffff";
  let defaultFont = "35px arial";

  ctx.save();
  args.forEach(({ text, fillStyle, font }) => {
    ctx.fillStyle = fillStyle || defaultFillStyle;
    ctx.font = font || defaultFont;
    ctx.fillText(text, x, y, ctx.canvas.width);
    x += ctx.measureText(text).width + 10;
    console.log(x);
  });

  ctx.restore();
};

function drawBackground(ctx, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

module.exports = { generateEventText };
