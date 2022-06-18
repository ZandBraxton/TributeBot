const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageSelectMenu,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const { v4: uuidv4 } = require("uuid");
const { getTributes, activateCPU } = require("../helpers/queries");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cpu-list")
    .setDescription("View Stored CPU's"),
  async execute(interaction, db, mongoClient, setComponentActive) {
    setComponentActive(true);
    const result = await getTributes(mongoClient, interaction, "cpu-tributes");

    if (!result.length) return interaction.reply("There are no cpu's");
    const cpuEmbed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Stored CPU's")
      .setFooter({ text: "Do you wish to change the status of a CPU?" });
    const uniqueId = uuidv4();
    const cpuRow = new MessageSelectMenu()
      .setCustomId("cpu + uniqueId")
      .setPlaceholder("Stored CPU's");

    const cpuRow2 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("cancel" + uniqueId)
        .setLabel("Close")
        .setStyle("SECONDARY")
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
      components: [new MessageActionRow({ components: [cpuRow] }), cpuRow2],
    });

    const filter = (i) => {
      i.deferUpdate();
      return i.user.id === interaction.user.id;
    };

    const collector = await interaction.channel.createMessageComponentCollector(
      {
        filter,
        max: 1,
      }
    );

    collector.on("collect", async (interaction) => {
      if (interaction.customId.substring(0, 6) === "cancel") {
        await interaction.deleteReply();
        collector.stop();
        setComponentActive(false);
        return;
      }
      console.log(interaction);
      let updateCpu = await activateCPU(
        mongoClient,
        interaction,
        interaction.values[0]
      );
      await interaction.channel.send(
        `Changed ${interaction.values[0]} status to ${
          updateCpu ? "Active" : "Inactive"
        }`
      );
      await interaction.deleteReply();
      collector.stop();
      setComponentActive(false);
    });
  },
};
