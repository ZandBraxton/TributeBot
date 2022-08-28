const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("points")
    .setDescription("View your points!"),
  async execute(interaction, db) {
    let score;
    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        interaction.user.username,
        interaction.guild.id,
      ])
      .then((res) => {
        score = res.rows[0];
      });

    if (!score) {
      score = {
        id: `${interaction.guild.id}-${interaction.user.id}`,
        userid: interaction.user.id,
        username: interaction.user.username,
        guild: interaction.guild.id,
        points: 1,
        prestige: 0,
      };
      await db.query(
        "INSERT INTO scores (id, userid, username, guild, points, prestige) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET (userid, username, guild, points, prestige) = (EXCLUDED.userid, EXCLUDED.username, EXCLUDED.guild, EXCLUDED.points, EXCLUDED.prestige)",
        [
          score.id,
          score.userid,
          score.username,
          score.guild,
          score.points,
          score.prestige,
        ]
      );
    }
    interaction.reply({
      content: `You have ${score.points} points`,
      ephemeral: true,
    });
  },
};
