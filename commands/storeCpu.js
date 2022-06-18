const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageAttachment,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const { createUser } = require("../helpers/queries");
const canvasHelper = require("../helpers/canvas");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("store-cpu")
    .setDescription(
      "(Mickey Masters Only) Stores a CPU to a list of stored CPU's"
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name the cpu to be added!")
        .setRequired(true)
    ),
  async execute(interaction, db, mongoClient, setComponentActive) {
    setComponentActive(true);
    const username = await interaction.options.getString("name");
    if (username.length > 14 || username.length <= 0) {
      return interaction.reply({
        content: "Name must be between 1-15 characters",
      });
    }

    await interaction.channel.send(
      'Upload the cpu\'s avatar, or type "end" to cancel this command'
    );
    const filter = (i) => {
      return i.author.id === interaction.user.id;
    };

    const collector = interaction.channel.createMessageCollector({
      filter,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.content === "end") {
        await interaction.channel.send(`Cancelled`);
        collector.stop();
        setComponentActive(false);
        return;
      }

      if (Array.from(interaction.attachments).length === 0) {
        return interaction.reply({
          content: "You must upload an image!",
          ephemeral: true,
        });
      }
      let img = Array.from(interaction.attachments);

      let url = img[0][1].proxyURL;

      if (
        url.substring(url.length - 3, url.length) === "jpg" ||
        url.substring(url.length - 3, url.length) === "png" ||
        url.substring(url.length - 4, url.length) === "jpeg"
      ) {
        const cpuEmbed = new MessageEmbed()
          .setTitle("CPU Preview")
          .setImage("attachment://cpuImage.png")
          .setColor("#5d5050");

        const uniqueId = uuidv4();

        const canvas = await canvasHelper.populateCPU([
          {
            id: uniqueId,
            username: username,
            avatar: url,
            guild: interaction.guildId,
          },
        ]);

        const attachment = new MessageAttachment(
          canvas.toBuffer(),
          "cpuImage.png"
        );
        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId("add" + uniqueId)
              .setLabel("Add CPU")
              .setStyle("SUCCESS")
          )
          .addComponents(
            new MessageButton()
              .setCustomId("cancel" + uniqueId)
              .setLabel("Cancel")
              .setStyle("SECONDARY")
          );

        await interaction.channel.send({
          embeds: [cpuEmbed],
          files: [attachment],
          components: [row],
          ephemeral: true,
        });
        collector.stop();

        const buttonFilter = (i) => {
          i.deferUpdate();
          return i.user.id === interaction.user.id;
        };

        const buttonCollector =
          await interaction.channel.createMessageComponentCollector({
            buttonFilter,
          });
        buttonCollector.on("collect", async (interaction) => {
          if (interaction.customId.substring(0, 3) === "add") {
            const result = await createUser(
              mongoClient,
              interaction,
              "cpu-tributes",
              {
                id: uniqueId,
                username: username,
                avatar: url,
                guild: interaction.guildId,
                active: true,
              }
            );

            if (result.upsertedId === null) {
              await interaction.channel.send(
                `CPU had already been added, updating profile information`
              );
            } else {
              await interaction.channel.send(
                `Successfully added ${username} to the list of CPU's!`
              );
            }
            await interaction.message.delete();
            buttonCollector.stop();
            setComponentActive(false);
          } else {
            //cancel
            await interaction.message.delete();
            await interaction.channel.send(`Cancelled`);
            buttonCollector.stop();
            setComponentActive(false);
          }
        });
      } else {
        return interaction.reply({
          content: "This image type is not supported!",
          ephemeral: true,
        });
      }
    });
  },
};
