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

  //   const result = await client
  //     .db("hunger-games")
  //     .collection("active-tributes")
  //     .updateOne(
  //       {
  //         guild: interaction.guild.id,
  //         username: user.username,
  //       },
  //       {
  //         $set: dataSet,
  //       },
  //       { upsert: true }
  //     );
  return result;
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

module.exports = { createUser, deleteUser, getTributes, activateTribute };
