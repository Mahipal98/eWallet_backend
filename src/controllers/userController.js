async function getUsers(req, res) {
  try {
    const client = await connectToDatabase();
    const result = await executeQuery(client, "SELECT * FROM users");
    res.status(200).json(result.rows);
    // return result.rows;
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return("Internal Server Error");
  }
}

module.exports = getUsers;