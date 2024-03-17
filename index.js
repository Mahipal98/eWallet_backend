const dotenv = require('dotenv');
dotenv.config();

const { Client } = require("pg");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const authenticateToken = require('./src/helper/authenticator.js');
const deconstructToken = require('./src/helper/token.js');

const app = express();
const port = 3000;

const allowedOrigins = [
  "http://localhost:4200",
  "https://d34tm79nlljwo9.cloudfront.net",
];

const secret = "ewallet-sdlc-operxxx5002";

// Configure CORS options
var corsOptions = {
  origin: function (origin, callback) {
    // Check if the origin is in the list of allowed origins or if it's undefined (e.g., from a direct HTTP request)
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Deny the request
    }
  },
};

// Apply CORS middleware with custom options
app.use(cors(corsOptions));

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
};

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// GET endpoint to fetch all users
app.get("/users", async (req, res) => {
  try {
    const client = await connectToDatabase();
    const result = await executeQuery(client, "SELECT * FROM users");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST endpoint to create a new user
app.post("/users", async (req, res) => {
  let {
    first_name,
    last_name,
    email,
    password,
    role,
    account_status,
  } = req.body;

  password = bcrypt.hashSync(password, 8);

  try {
    const client = await connectToDatabase();

    // 1. Check if user exists (already using executeQuery)
    const userExists = await executeQuery(
      client,
      "SELECT COUNT(email) FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows[0].count === 1) {
      res.status(201).send("User Already exists");
      return;
    }

    // 2. Create new user (separate query)
    const createUserQuery = `
      INSERT INTO users (first_name, last_name, email, wallet_id, password, role, account_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const createUserValues = [
      first_name,
      last_name,
      email,
      null,
      password,
      role,
      account_status,
    ];
    const createUserclient = await connectToDatabase();
    const createUserResult = await executeQuery(createUserclient, createUserQuery, createUserValues);
    const userId = createUserResult.rows[0].id; // Get the created user ID

    // 3. Create wallet and update user (separate query)
    const createWalletQuery = `
      INSERT INTO wallet (user_id, balance) VALUES ($1, 0) RETURNING id;
    `;
    const createWalletValues = [userId]; // Use the retrieved userId
    const createWalletclient = await connectToDatabase();
    const createWalletResult = await executeQuery(createWalletclient, createWalletQuery, createWalletValues);
    const walletId = createWalletResult.rows[0].id; // Get the created wallet ID

    const updateUserQuery = await connectToDatabase();
    // Update user's wallet_id (no separate query needed)
    await executeQuery(
      updateUserQuery,
      `UPDATE users SET wallet_id = $1 WHERE id = $2`,
      [walletId, userId]
    );

    res.status(201).json({
      id: userId, // Return both user and wallet IDs in the response
      wallet_id: walletId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Login endpoint
app.post("/checkuser", async (req, res) => {
  const { email, password } = req.body;

  try {
    const client = await connectToDatabase();
    const query = "SELECT id, email, password FROM users WHERE email = $1";
    const values = [email];
    const result = await executeQuery(client, query, values);

    // Check if user exists, if not, terminate process and return 404
    if (result.rows.length <= 0) {
      res.status(404).send("User not found"); // Use a more appropriate status code for a missing user
      console.log("No matching rows found");
    } else {
      
      // Get user and verify hashed password
      let user = result.rows[0];
      var passwordIsValid = bcrypt.compareSync(password, user.password);

      // If password isn't valid, terminate before proceeding
      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!",
        });
      } else {
        const token = jwt.sign({ id: user.id, email: user.email }, secret, {
          algorithm: "HS256",
          allowInsecureKeySizes: true,
          expiresIn: 86400, // 24 hours
        });

        res.status(200).json({
          id: user.id,
          email: user.email,
          accessToken: token,
          message: "Login Successful",
        });
        console.log("The result is: " + result.rows[0]);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Getting user Info by email/wallet
app.post("/getUserInfo", async(req, res) => {
  const{email, wallet_id} = req.body;

  const isValidToken = authenticateToken(req, res, secret);

  if (!isValidToken) {
      // Unauthorized request, handle it accordingly
      return;
  }

  try {
    const client = await connectToDatabase();
    const result = await getUserInfo(client, email, wallet_id);

    // Check if user exists, if not, terminate process and return 404
    if (result === null) {
      res.status(404).send({message: "User not found"}); // Use a more appropriate status code for a missing user
      console.log("No matching rows found");
    } else {
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Transfer Funds to Recipient
app.post("/transferFunds", async(req, res) => {
  const{ recipient_wallet, amount, narration } = req.body;

  const isValidToken = authenticateToken(req, res, secret);
  if (!isValidToken) {
      res.status(401).send({message: "Unauthorized"});
      return;
  }

  const token = deconstructToken(req, res, secret);
  if (!token){
    res.status(401).send({message: "Unauthorized"});
    return;
  }

  const { id } = token;

  console.log("Sender's wallet:", id);
  console.log("Recipient's wallet:", recipient_wallet);

  if (id == recipient_wallet) {
    res.status(400).send({message: "You cannot transfer funds to yourself"});
    return;
  }

  try {
    var client = await connectToDatabase();
    // Fetch balance for sender's wallet
    const senderBalance = await getBalance(client, id);

    if (senderBalance === null) {
      res.status(404).send({ message: "Sender wallet not found" });
      return;
    }

    if (parseFloat(senderBalance) < parseFloat(amount)) {
      res.status(400).send({message: "Insufficient Funds"});
      return;
    }

    var client = await connectToDatabase();
    // Fetch balance for recipient's wallet
    const recipientBalance = await getBalance(client, recipient_wallet);

    if (recipientBalance === null) {
      res.status(404).send({ message: "Recipient wallet not found" });
      return;
    }

    // Deduct amount from sender's wallet
    const senderClient = await connectToDatabase();
    const senderQuery = `
      UPDATE wallet
      SET balance = balance - $1
      WHERE user_id = $2
      RETURNING balance;
    `;
    const senderValues = [amount, id];
    const senderResult = await executeQuery(senderClient, senderQuery, senderValues);
    const postsenderBalance = senderResult.rows[0].balance;

    // Update receiver's wallet with amount
    const recipientClient = await connectToDatabase();
    const recipientQuery = `
      UPDATE wallet
      SET balance = balance + $1
      WHERE user_id = $2
      RETURNING balance;
    `;
    const recipientValues = [amount, recipient_wallet];
    const recipientResult = await executeQuery(recipientClient, recipientQuery, recipientValues);
    const postrecipientBalance = recipientResult.rows[0].balance;

    console.log("Sender's balance after deduction:", postsenderBalance);
    console.log("Recipient's balance after addition:", postrecipientBalance);

    const transactionData = await createTransaction(client, id, recipient_wallet, amount, narration);

    res.status(200).send({message: "Transfer Successful", transactionData: transactionData, senderBalance: postsenderBalance});
  
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Getting user Info by email/wallet
app.get("/getTransactions", async(req, res) => {

  const isValidToken = authenticateToken(req, res, secret);

  if (!isValidToken) {
      return;
  }

  const token = deconstructToken(req, res, secret);
  if (!token){
    res.status(401).send({message: "Unauthorized"});
    return;
  }

  const { id } = token;

  try {
    const client = await connectToDatabase();
    const query = "SELECT * FROM transactions WHERE sender_wallet = $1 OR receiver_wallet = $1 ORDER BY id DESC LIMIT 10";
    const values = [id];
    const result = await executeQuery(client, query, values);

    // Check if transactions exist, if not, terminate process and return 404
    if (result === null) {
      res.status(404).send({message: "Transaction List Empty"});
      console.log("No matching rows found");
    } else {

      result.rows.map((transaction) => {
        if (transaction.sender_wallet == id) {
          transaction.transaction_type = "Debit";
        } else {
          transaction.transaction_type = "Credit";
        }
      })

      res.status(200).send({
        message: "Transactions Found",
        transactions: result.rows
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Fund Account
app.post("/fundAccount", async(req, res) => {
  const{ amount } = req.body;

  const isValidToken = authenticateToken(req, res, secret);
  if (!isValidToken) {
      res.status(401).send({message: "Unauthorized"});
      return;
  }

  const token = deconstructToken(req, res, secret);
  if (!token){
    res.status(401).send({message: "Unauthorized"});
    return;
  }

  const { id } = token;
  const poolWallet = 100054;

  try {
    var client = await connectToDatabase();
    // Fetch balance for user's wallet
    const userBalance = await getBalance(client, id);

    if (userBalance === null) {
      res.status(404).send({ message: "Wallet not found" });
      return;
    }

    var client = await connectToDatabase();
    // Fetch balance for pool's wallet
    const poolBalance = await getBalance(client, poolWallet);

    if (poolBalance === null) {
      res.status(404).send({ message: "Pool Account wallet not found" });
      return;
    }

    if (parseFloat(poolBalance) < parseFloat(amount)) {
      res.status(400).send({message: "Insufficient Funds with Internal Account"});
      return;
    }

    // Deduct amount from pool's wallet
    const senderClient = await connectToDatabase();
    const senderQuery = `
      UPDATE wallet
      SET balance = balance - $1
      WHERE user_id = $2
      RETURNING balance;
    `;
    const senderValues = [amount, poolWallet];
    const senderResult = await executeQuery(senderClient, senderQuery, senderValues);
    const postsenderBalance = senderResult.rows[0].balance;

    // Update user's wallet with amount
    const recipientClient = await connectToDatabase();
    const recipientQuery = `
      UPDATE wallet
      SET balance = balance + $1
      WHERE user_id = $2
      RETURNING balance;
    `;
    const recipientValues = [amount, id];
    const recipientResult = await executeQuery(recipientClient, recipientQuery, recipientValues);
    const postrecipientBalance = recipientResult.rows[0].balance;

    console.log("Sender's balance after deduction:", postsenderBalance);
    console.log("Recipient's balance after addition:", postrecipientBalance);

    const transactionData = await createTransaction(client, poolWallet, id, amount, 'Funding Account');

    res.status(200).send({message: "Funding Successful", transactionData: transactionData, newBalance: postrecipientBalance});
  
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Function to connect to the PostgreSQL database
async function connectToDatabase() {
  const client = new Client(dbConfig);
  await client.connect();
  console.log("Connected to PostgreSQL database");
  return client;
}

// Function to execute a query and close the connection
async function executeQuery(client, query, values) {
  try {
    const result = await client.query(query, values);
    return result;
  } catch (err) {
    console.error("Error executing query:", err);
    throw err; // Re-throw the error to be handled by the route handler
  } finally {
    await client.end();
    console.log("Connection to PostgreSQL closed");
  }
}

async function getBalance(client, walletId) {
  const query = "SELECT balance FROM wallet WHERE id = $1";
  const values = [walletId];
  const result = await executeQuery(client, query, values);
  return result.rows.length > 0 ? result.rows[0].balance : null;
}

async function getUserInfo(client, email, wallet_id) {
  const query = "SELECT id,first_name,last_name,email FROM users WHERE email = $1 OR wallet_id = $2";
  const values = [email, wallet_id];
  const result = await executeQuery(client, query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function createTransaction(client, sender_wallet, receiver_wallet, amount, narration) {

  var client = await connectToDatabase();
  const recipientInfo = await getUserInfo(client, '', receiver_wallet);

  var client = await connectToDatabase();
  const senderInfo = await getUserInfo(client, '', sender_wallet);

  var client = await connectToDatabase();
  const query = `
  INSERT INTO transactions (sender_wallet, sender_name, receiver_wallet, receiver_name, amount, narration)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id;
`;
  const values = [sender_wallet, senderInfo.first_name + ' ' + senderInfo.last_name, receiver_wallet, recipientInfo.first_name + ' ' + recipientInfo.last_name, amount, narration];
  const result = await executeQuery(client, query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});