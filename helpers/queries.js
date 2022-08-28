const mongoClient = require("../database/mongodb");

async function createUser(guildId, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .updateOne(
      {
        guild: guildId,
        username: user.username,
      },
      {
        $set: {
          id: user.id,
          username: user.username,
          avatar:
            collection === "cpu-tributes"
              ? user.avatar
              : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`,
          guild: guildId,
          active: true,
        },
      },
      { upsert: true }
    );
  return result;
}

async function getUser(interaction, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .findOne({
      guild: interaction.guild.id,
      username: user.username,
    });

  return result;
}

async function getTributes(interaction, collection) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .find({
      guild: interaction.guild.id,
    })
    .toArray();

  return result;
}

async function getBets(interaction, gameRunner) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .findOne({
      guild: interaction.guild.id,
      gameRunner: gameRunner,
    });
  return result;
}

async function activateBets(interaction, gameRunner, dataSet) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
        gameRunner: gameRunner,
      },
      {
        $set: dataSet,
      },
      { upsert: true }
    );
  return result;
}

async function activateTribute(interaction, dataSet) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
        gameRunner: interaction.user.username,
      },
      {
        $set: dataSet,
      },
      { upsert: true }
    );
  return result;
}

async function checkGameRunning(interaction) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .findOne(
      {
        guild: interaction.guild.id,
        gameRunner: interaction.user.username,
      },
      { projection: { gameRunning: 1 } }
    );
  return result;
}

async function endGame(interaction) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
        gameRunner: interaction.user.username,
      },
      {
        $set: {
          gameRunning: false,
        },
      }
    );
  return result;
}

async function activateCPU(interaction, cpuName) {
  await mongoClient.connect();

  const cpu = await mongoClient
    .db("hunger-games")
    .collection("cpu-tributes")
    .findOne({
      guild: interaction.guild.id,
      username: cpuName,
    });
  let status = !cpu.active;

  await mongoClient
    .db("hunger-games")
    .collection("cpu-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
        username: cpuName,
      },
      {
        $set: {
          active: status,
        },
      },
      { upsert: true }
    );

  return status;
}

async function payout(interaction, db, winningDistrict) {
  await mongoClient.connect();
  const result = await getBets(mongoClient, interaction);

  let bets = result.bets;
  let pool = result.pool;

  let winners = [];

  for (let i = 0; i < bets.length; i++) {
    let better = bets[i];
    let playerScore;
    await db
      .query("SELECT * FROM scores WHERE username = $1 AND guild = $2", [
        better.username,
        interaction.guild.id,
      ])
      .then((res) => (playerScore = res.rows[0]));
    if (better.district === winningDistrict) {
      //win stuff
      winners.push({ playerScore, better });
    } else {
      playerScore.points -= better.amount;
      await db.query(
        "INSERT INTO scores (id, userid, username, guild, points, prestige) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET (userid, username, guild, points, prestige) = (EXCLUDED.userid, EXCLUDED.username, EXCLUDED.guild, EXCLUDED.points, EXCLUDED.prestige)",
        [
          playerScore.id,
          playerScore.userid,
          playerScore.username,
          playerScore.guild,
          playerScore.points,
          playerScore.prestige,
        ]
      );
      interaction.channel.send(
        `${playerScore.username} lost ${better.amount} points, they now have ${playerScore.points} points`
      );
    }
  }

  winners.map((winner) => {
    pool -= winner.better.amount;
  });

  let prize = Math.floor(pool / winners.length);

  for (let i = 0; i < winners.length; i++) {
    let winnerScore = winners[i].playerScore;
    winnerScore.points += prize;

    await db.query(
      "INSERT INTO scores (id, userid, username, guild, points, prestige) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET (userid, username, guild, points, prestige) = (EXCLUDED.userid, EXCLUDED.username, EXCLUDED.guild, EXCLUDED.points, EXCLUDED.prestige)",
      [
        winnerScore.id,
        winnerScore.userid,
        winnerScore.username,
        winnerScore.guild,
        winnerScore.points,
        winnerScore.prestige,
      ]
    );

    interaction.channel.send(
      `${winnerScore.username} won ${prize} points! They now have ${winnerScore.points} points`
    );
  }
}

async function deleteUser(interaction, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .deleteOne({
      guild: interaction.guild.id,
      username: user.username,
    });

  return result;
}

module.exports = {
  createUser,
  deleteUser,
  getTributes,
  getBets,
  getUser,
  activateTribute,
  activateBets,
  activateCPU,
  payout,
  endGame,
  checkGameRunning,
};
