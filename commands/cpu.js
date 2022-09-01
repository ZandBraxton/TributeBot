const { SlashCommandBuilder } = require("discord.js");
const {
  EmbedBuilder,
  SelectMenuBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
} = require("discord.js");
const canvasHelper = require("../helpers/canvas");
const { v4: uuidv4 } = require("uuid");
const {
  getTributes,
  activateCPU,
  deleteCPU,
  createUser,
  getEnrolled,
  getUser,
} = require("../helpers/queries");

const buttons = require("../helpers/buttons");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cpu")
    .setDescription("(Hosts Only)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("(Hosts Only) View the list of stored CPU's")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("(Hosts Only) Create and save a CPU")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name the cpu to be added!")
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("Cpu's profile image")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("invisible")
            .setDescription("Make preview invisible to other users?")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const choice = interaction.options.getSubcommand();

    if (choice === "create") {
      const username = await interaction.options.getString("name");
      const attachment = interaction.options.getAttachment("image");
      const preview = interaction.options.getBoolean("invisible");

      if (username.length > 14 || username.length <= 0) {
        return interaction.reply({
          content: "Name must be between 1-15 characters",
        });
      }

      const cpuList = await getEnrolled(interaction, "cpu-tributes");
      for (let i = 0; i < cpuList.length; i++) {
        if (cpuList[i].username === username) {
          return interaction.reply({
            content: "A CPU with this name already exists!",
          });
        }
      }

      const imgURL = attachment.proxyURL;

      if (
        imgURL.substring(imgURL.length - 3, imgURL.length) === "jpg" ||
        imgURL.substring(imgURL.length - 3, imgURL.length) === "png" ||
        imgURL.substring(imgURL.length - 4, imgURL.length) === "jpeg"
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
            avatar: imgURL,
            guild: interaction.guildId,
          },
        ]);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), {
          name: "cpuImage.png",
        });
        const row = new ActionRowBuilder().addComponents(
          buttons.addCPU,
          buttons.cancelButton
        );

        await interaction.reply({
          embeds: [cpuEmbed],
          files: [attachment],
          components: [row],
          ephemeral: preview,
        });

        const reply = await interaction.fetchReply();

        const filter = (i) => {
          return i.user.id === interaction.user.id;
        };

        const collector = await reply.createMessageComponentCollector({
          filter,
        });

        collector.on("collect", async (interaction) => {
          try {
            if (interaction.customId.substring(0, 3) === "add") {
              const result = await createUser(
                interaction,
                "cpu-tributes",
                {
                  id: uniqueId,
                  username: username,
                  avatar: imgURL,
                  guild: interaction.guildId,
                },
                null
              );

              if (result.upsertedId === null && result.modifiedCount === 0) {
                await interaction.reply({
                  content: `CPU had already been added, updating profile information`,
                  ephemeral: true,
                });
              } else {
                await interaction.reply({
                  content: `Successfully added ${username} to the list of CPU's!`,
                  ephemeral: true,
                });
              }
              if (!preview) {
                reply.edit({ components: [] });
              }
              collector.stop();
            } else {
              //cancel
              if (!preview) {
                reply.edit({ components: [] });
              }
              collector.stop();
            }
          } catch (error) {
            console.log(error);
          }
        });
      } else {
        return interaction.reply({
          content:
            "This image type is not supported, only PNG and JPEG/JPG are accepted!",
          ephemeral: true,
        });
      }
    } else {
      try {
        const cpuList = await getEnrolled(interaction, "cpu-tributes");

        if (!cpuList.length) return interaction.reply("There are no cpu's");

        const embed = await generateCPUEmbed(cpuList[0], cpuList);

        interaction.reply({
          embeds: [(await embed).cpuEmbed],
          components: (await embed).components,
          files: [(await embed).attachment],
        });

        const reply = await interaction.fetchReply();

        const filter = (i) => {
          return i.user.id === interaction.user.id;
        };

        const collector = await reply.createMessageComponentCollector({
          filter,
        });

        collector.on("collect", async (interaction) => {
          if (interaction.customId === "cancel") {
            await reply.delete();
            collector.stop();
            return;
          } else if (interaction.customId === "status") {
            await activateCPU(
              interaction,
              interaction.message.embeds[0].data.title
            );
            const cpu = await getUser(
              interaction,
              "cpu-tributes",
              interaction.message.embeds[0].data.title
            );

            const embed = await generateCPUEmbed(cpu, cpuList);
            await interaction.deferUpdate();
            await interaction.editReply({
              embeds: [embed.cpuEmbed],
              components: embed.components,
              files: [embed.attachment],
            });
          } else if (interaction.customId === "remove-cpu") {
            const cpu = await getUser(
              interaction,
              "cpu-tributes",
              interaction.message.embeds[0].data.title
            );
            if (cpu.creator === interaction.user.username) {
              //delete cpu
              removeCPU(interaction, cpu);
            } else {
              //check if user is admin
              const user = getUser(
                interaction,
                "hosts",
                interaction.user.username
              );
              if (user.admin) {
                removeCPU(interaction, cpu);
              } else {
                await interaction.deferUpdate();
                interaction.followUp("You cannot delete another users CPU");
              }
            }
          } else {
            try {
              const cpu = await getUser(
                interaction,
                "cpu-tributes",
                interaction.values[0]
              );
              const embed = await generateCPUEmbed(cpu, cpuList);
              await interaction.deferUpdate();
              await interaction.editReply({
                embeds: [embed.cpuEmbed],
                components: embed.components,
                files: [embed.attachment],
              });
            } catch (error) {
              console.log(error);
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  },
};

async function generateCPUEmbed(cpu, cpuList) {
  const components = [];
  const cpuEmbed = new EmbedBuilder()
    .setColor("#0099ff")
    .setImage("attachment://cpuImage.png")
    .setTitle(`${cpu.username}`);

  cpuEmbed.addFields({
    name: "Active Games",
    value: cpu.active.length ? cpu.active.join(", ") : "No Active Games",
  });

  const cpuRow = new SelectMenuBuilder()
    .setCustomId("cpu + uniqueId")
    .setPlaceholder("Stored CPU's");

  const buttonRow = new ActionRowBuilder().addComponents(
    buttons.status,
    buttons.removeCPU,
    buttons.cancelButton
  );

  cpuList.map((cpu) => {
    cpuRow.addOptions({
      label: cpu.username,
      value: cpu.username,
      default: false,
    });
  });

  const canvas = await canvasHelper.populateCPU([
    {
      id: cpu.id,
      username: cpu.username,
      avatar: cpu.avatar,
      guild: cpu.guild,
    },
  ]);

  const attachment = new AttachmentBuilder(canvas.toBuffer(), {
    name: "cpuImage.png",
  });
  const selectCpuRow = new ActionRowBuilder().addComponents(cpuRow);

  components.push(selectCpuRow, buttonRow);

  return { cpuEmbed, components, attachment };
}

async function removeCPU(interaction, cpu) {
  await deleteCPU(interaction, "cpu-tributes", cpu);
  const cpuList = await getEnrolled(interaction, "cpu-tributes");
  if (!cpuList.length) {
    await interaction.deferUpdate();
    return interaction.editReply({
      content: "There are no CPU's",
      embeds: [],
      components: [],
      files: [],
    });
  }

  const embed = await generateCPUEmbed(cpuList[0], cpuList);

  await interaction.deferUpdate();
  await interaction.editReply({
    embeds: [embed.cpuEmbed],
    components: embed.components,
    files: [embed.attachment],
  });
}
