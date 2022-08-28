async function collectorSwitch(interaction) {
  console.log(interaction);
  if (interaction.customId.substring(0, 6) === "random") {
    if (interaction.values !== undefined) {
      let ds = parseInt(interaction.values[0]);

      if (ds === 3 && data.length < 6) {
        return interaction.channel.send(
          "You need at least six tributes to run teams of three"
        );
      }
      if (ds === 4 && data.length < 8) {
        return interaction.channel.send(
          "You need at least eight tributes to run teams of four"
        );
      }
      districtSize = parseInt(interaction.values[0]);
    }
    //BETTING
    // await interaction.channel.send("Bets have refreshed!");

    await setupGame(
      data,
      interaction,
      true,
      tributes,
      gameData,
      setComponentActive,
      setBetsOpen,
      districtSize
    );
  } else if (interaction.customId.substring(0, 5) === "start") {
    //BETTING
    // if (running === false) {
    //   bettingComponent.edit({
    //     content: "`Bets are now closed`",
    //     components: [],
    //   });
    //   bettingCollector.stop();
    // }

    running = true;

    await startTurn(interaction, gameMsg, gameData, tributes);

    // ?????? might need this, deletes buttons of previous image
    await interaction.message.edit({ components: [] });
  } else if (interaction.customId.substring(0, 4) === "next") {
    await nextTurn(interaction, gameData, tributes);

    await interaction.message.edit({ components: [] });
  } else if (interaction.customId.substring(0, 4) === "dead") {
    await showFallenTributes(
      interaction,
      gameData,
      tributes,
      collector,
      setComponentActive,
      setBetsOpen
    );
    await interaction.message.edit({ components: [] });
  } else if (interaction.customId.substring(0, 3) === "end") {
    let row = new ActionRowBuilder(buttons.destroyButton, buttons.cancelButton);
    await interaction.channel.send({
      content: "Are you sure you want to end the game?",
      components: [row],
    });
  } else if (interaction.customId.substring(0, 7) === "destroy") {
    await interaction.deleteReply();
    await interaction.channel.send("Game has been terminated");
    await activateBets(interaction, {
      bets: [],
      pool: 0,
    });
    setComponentActive(false);
    setBetsOpen(false);
    collector.stop();
  } else if (interaction.customId.substring(0, 6) === "cancel") {
    await interaction.deleteReply();
  }
}
