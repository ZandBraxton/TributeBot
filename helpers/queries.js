const mongoClient = require("../database/mongodb");

async function createUser(interaction, collection, user, join) {
  await mongoClient.connect();
  if (collection !== "cpu-tributes") {
    if (user.avatar === null || user.avatar === undefined) {
      user.avatar =
        "https://icon-library.com/images/blue-discord-icon/blue-discord-icon-15.jpg";
    } else {
      user.avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`;
    }
  }

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .updateOne(
      {
        guild: interaction.guild.id,
        username: user.username,
      },
      {
        $set: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          guild: interaction.guild.id,
          creator:
            collection === "cpu-tributes" ? interaction.user.username : null,
        },

        $addToSet: {
          active: join ? join : interaction.user.username,
        },
      },
      { upsert: true }
    );
  return result;
}

async function deleteUser(interaction, collection, user, leave) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .updateOne(
      {
        guild: interaction.guild.id,
        username: user.username,
      },
      {
        $pull: {
          active: leave ? leave : interaction.user.username,
        },
      }
    );

  return result;
}

async function createBan(interaction, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .updateOne(
      {
        guild: interaction.guild.id,
        username: user.username,
      },
      {
        $set: {
          id: user.id,
          username: user.username,
          guild: interaction.guild.id,
        },

        $addToSet: {
          banned: interaction.user.username,
        },
      },
      { upsert: true }
    );
  return result;
}

async function removeBan(interaction, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .updateOne(
      {
        guild: interaction.guild.id,
        username: user.username,
      },
      {
        $pull: {
          banned: interaction.user.username,
        },
      }
    );

  return result;
}

async function updateHost(interaction, collection, user, bool, admin) {
  await mongoClient.connect();

  result = await mongoClient.db("hunger-games").collection(collection).findOne({
    guild: interaction.guild.id,
    username: user.username,
  });
  if (result) {
    if (result.admin === true && interaction.user.username !== "Bubbles") {
      return "Denied";
    }
  }

  if (bool) {
    return (result = await mongoClient
      .db("hunger-games")
      .collection(collection)
      .updateOne(
        {
          guild: interaction.guild.id,
          username: user.username,
        },
        {
          $set: {
            id: user.id,
            username: user.username,
            guild: interaction.guild.id,
            admin: admin,
            lockedTributes: false,
          },
        },
        { upsert: true }
      ));
  } else {
    //kill game
    await destroyGame(interaction, user.username);

    //flush tributes
    let tributes = await getTributes(interaction, "tributes", user.username);

    for (let i = 0; i < tributes.length; i++) {
      tempInteraction = {
        guild: {
          id: interaction.guild.id,
        },
        user: {
          username: user.username,
        },
      };
      await deleteUser(tempInteraction, "tributes", tributes[i], null);
    }

    //delete perm
    return (result = await mongoClient
      .db("hunger-games")
      .collection(collection)
      .deleteOne({
        guild: interaction.guild.id,
        username: user.username,
      }));
  }
}

async function setLock(interaction, bool) {
  await mongoClient.connect();
  await mongoClient
    .db("hunger-games")
    .collection("hosts")
    .updateOne(
      {
        guild: interaction.guild.id,
        username: interaction.user.username,
      },
      {
        $set: {
          lockedTributes: bool,
        },
      }
    );
}

async function destroyGame(interaction, host) {
  await mongoClient.connect();
  await mongoClient.db("hunger-games").collection("active-tributes").deleteOne({
    guild: interaction.guild.id,
    gameRunner: host,
  });
}

async function getUser(interaction, collection, user) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .findOne({
      guild: interaction.guild.id,
      username: user,
    });

  return result;
}

async function getHosts(interaction, collection) {
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

async function getTributes(interaction, collection, host) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .find({
      guild: interaction.guild.id,
      active: { $in: [host] },
    })
    .toArray();

  return result;
}

async function getBanned(interaction, collection, host) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .find({
      guild: interaction.guild.id,
      banned: { $in: [host] },
    })
    .toArray();

  return result;
}

async function getEnrolled(interaction, collection) {
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

async function getActiveTributes(interaction, gameRunner) {
  await mongoClient.connect();

  const result = await mongoClient
    .db("hunger-games")
    .collection("active-tributes")
    .find({
      guild: interaction.guild.id,
      gameRunner: gameRunner,
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
  if (cpu.active.includes(interaction.user.username)) {
    return await mongoClient
      .db("hunger-games")
      .collection("cpu-tributes")
      .findOneAndUpdate(
        {
          guild: interaction.guild.id,
          username: cpuName,
        },
        {
          $pull: {
            active: interaction.user.username,
          },
        },
        { upsert: true }
      );
  } else {
    return await mongoClient
      .db("hunger-games")
      .collection("cpu-tributes")
      .findOneAndUpdate(
        {
          guild: interaction.guild.id,
          username: cpuName,
        },
        {
          $addToSet: {
            active: interaction.user.username,
          },
        },
        { upsert: true }
      );
  }
}

async function deleteCPU(interaction, collection, cpu) {
  await mongoClient.connect();
  return (result = await mongoClient
    .db("hunger-games")
    .collection(collection)
    .deleteOne({
      guild: interaction.guild.id,
      username: cpu.username,
    }));
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

module.exports = {
  createUser,
  deleteUser,
  createBan,
  removeBan,
  updateHost,
  getTributes,
  getBanned,
  getHosts,
  getActiveTributes,
  getEnrolled,
  getBets,
  getUser,
  activateTribute,
  activateBets,
  activateCPU,
  deleteCPU,
  payout,
  endGame,
  setLock,
  checkGameRunning,
};
