const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
} = require("discord.js");
const fs = require("fs");
const game = require("../helpers/game");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("(Mickey Masters Only) Shuffles the districts!"),
  async execute(interaction) {
    fs.readFile("tributes.json", "utf-8", function (err, data) {
      if (err) {
        console.log(err);
      } else {
        shuffleDistricts(data);
      }
    });

    async function shuffleDistricts(data) {
      let shuffledTributes = game.shuffle(JSON.parse(data));

      let json = JSON.stringify(shuffledTributes);
      fs.writeFile("tributes.json", json, function (error) {
        if (error) {
          console.log("[write auth]:" + error);
          return interaction.reply("There was an error shuffling districts!");
        }

        interaction.reply("Districts have been shuffled!");
      });
    }

    // fs.readFile("game.json", "utf-8", function (err, data) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     shuffleDistricts(data);
    //   }
    // });

    // async function shuffleDistricts(data) {
    //   let shuffledTributes = game.shuffle(JSON.parse(data));
    //   let i = 0;
    //   await shuffledTributes.map((user) => {
    //     i++;
    //     user.district =
    //       shuffledTributes.length === 2 ? i + 1 : Math.ceil(i / 2);
    //   });

    //   let json = JSON.stringify(shuffledTributes);
    //   fs.writeFile("game.json", json, function (error) {
    //     if (error) {
    //       console.log("[write auth]:" + error);
    //       return interaction.reply("There was an error shuffling districts!");
    //     }
    //   });

    //   interaction.reply("Districts have been shuffled!");
    // }
  },
};
