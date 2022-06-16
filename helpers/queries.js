async function createUser(client, interaction, user) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection("tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
        username: user.username,
      },
      {
        $set: {
          id: user.id,
          username: user.username,
          avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`,
          guild: interaction.guild.id,
        },
      },
      { upsert: true }
    );
  return result;
}

async function getBets(client, interaction) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection("active-tributes")
    .findOne({
      guild: interaction.guild.id,
    });
  return result;
}

async function activateBets(client, interaction, dataSet) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection("active-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
      },
      {
        $set: dataSet,
      },
      { upsert: true }
    );
  return result;
}

async function activateTribute(client, interaction, dataSet) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection("active-tributes")
    .updateOne(
      {
        guild: interaction.guild.id,
      },
      {
        $set: dataSet,
      },
      { upsert: true }
    );
  return result;
}

async function payout(client, interaction, db, winningDistrict) {
  await client.connect();
  const result = await getBets(client, interaction);

  //   let bets = [
  //     { district: 1, amount: 50, username: "Bubbles" },
  //     { district: 1, amount: 60, username: "Tron Maker" },
  //     { district: 2, amount: 150, username: "EXSeraph" },
  //     { district: 4, amount: 50, username: "Lilnuggie" },
  //     { district: 4, amount: 50, username: "Nakkiel" },
  //     { district: 2, amount: 100, username: "Kunai" },
  //     { district: 1, amount: 50, username: "quzel" },
  //   ];

  //   let pool = 510;
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
      `${winnerScore.username} won ${prize} points! They now have ${winnerScore.points}`
    );
  }
}

async function deleteUser(client, interaction, user) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection("tributes")
    .deleteOne({
      guild: interaction.guild.id,
      username: user.username,
    });

  return result;
}

async function getTributes(client, interaction, collection) {
  await client.connect();

  const result = await client
    .db("hunger-games")
    .collection(collection)
    .find({
      guild: interaction.guild.id,
    })
    .toArray();

  return result;
}

module.exports = {
  createUser,
  deleteUser,
  getTributes,
  getBets,
  activateTribute,
  activateBets,
  payout,
};
