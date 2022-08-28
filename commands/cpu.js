const { SlashCommandBuilder } = require("discord.js");
const {
  EmbedBuilder,
  SelectMenuBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const canvasHelper = require("../helpers/canvas");
const { v4: uuidv4 } = require("uuid");
const {
  getTributes,
  activateCPU,
  createUser,
  deleteUser,
} = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cpu")
    .setDescription("(Game Runners Only) placeholder")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view-list")
        .setDescription("(Game Runners Only) View the list of stored CPU's")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("store-cpu")
        .setDescription(
          "(Game Runners Only) Stores a CPU to a list of stored CPU's"
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name the cpu to be added!")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove-cpu")
        .setDescription("(Game Runners Only) Removes a CPU from stored CPU's")
    ),
  async execute(interaction, db, setComponentActive) {
    setComponentActive(true);
    const choice = interaction.options.getSubcommand();

    if (choice === "store-cpu") {
      const username = await interaction.options.getString("name");
      if (username.length > 14 || username.length <= 0) {
        return interaction.reply({
          content: "Name must be between 1-15 characters",
        });
      }

      await interaction.reply(
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
          const cpuEmbed = new EmbedBuilder()
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

          const attachment = new AttachmentBuilder(
            canvas.toBuffer(),
            "cpuImage.png"
          );
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId("add" + uniqueId)
                .setLabel("Add CPU")
                .setStyle(ButtonStyle.Success)
            )
            .addComponents(
              new ButtonBuilder()
                .setCustomId("cancel" + uniqueId)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
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
                interaction.guild.id,
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
            content:
              "This image type is not supported, only PNG and JPEG/JPG are accepted!",
            ephemeral: true,
          });
        }
      });
    } else {
      const result = await getTributes(interaction, "cpu-tributes");

      if (!result.length) return interaction.reply("There are no cpu's");

      let footerText;
      if (choice === "view-list") {
        footerText = "Do you wish to change the status of a CPU?";
      } else {
        footerText = "Select the CPU you would like to delete";
      }

      const cpuEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Stored CPU's")
        .setFooter({ text: footerText });
      const uniqueId = uuidv4();
      const cpuRow = new SelectMenuBuilder()
        .setCustomId("cpu + uniqueId")
        .setPlaceholder("Stored CPU's");

      const cpuRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("cancel" + uniqueId)
          .setLabel("Close")
          .setStyle(ButtonStyle.Secondary)
      );

      for (const cpu of result) {
        cpuRow.addOptions({
          label: cpu.username,
          value: cpu.username,
          default: false,
        });

        cpuEmbed.addFields({
          name: cpu.username,
          value: `Status: ${cpu.active === true ? "Active" : "Inactive"}`,
        });
      }

      interaction.reply({
        embeds: [cpuEmbed],
        components: [new ActionRowBuilder({ components: [cpuRow] }), cpuRow2],
      });

      const filter = (i) => {
        i.deferUpdate();
        return i.user.id === interaction.user.id;
      };

      const collector =
        await interaction.channel.createMessageComponentCollector({
          filter,
          max: 1,
        });

      collector.on("collect", async (interaction) => {
        if (interaction.customId.substring(0, 6) === "cancel") {
          await interaction.deleteReply();
          collector.stop();
          setComponentActive(false);
          return;
        }

        if (choice === "remove-cpu") {
          await deleteUser(interaction, "cpu-tributes", {
            username: interaction.values[0],
            guild: interaction.guildId,
          });

          await interaction.channel.send(
            `${interaction.values[0]} has been removed!`
          );
        } else {
          let updateCpu = await activateCPU(interaction, interaction.values[0]);
          await interaction.channel.send(
            `Changed ${interaction.values[0]} status to ${
              updateCpu ? "Active" : "Inactive"
            }`
          );
        }

        await interaction.deleteReply();
        collector.stop();
        setComponentActive(false);
      });
    }
  },
};
