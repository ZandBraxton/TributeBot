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

module.exports = { createUser };
