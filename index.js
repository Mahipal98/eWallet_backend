const { Client } = require("pg");
const express = require("express");
const bodyParser = require("body-parser"); // Add body-parser for handling POST request bodies
const cors = require("cors");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

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
  user: "ewalletuser",
  password: "HealthWwPgwW615!",
  host: "ewallet-db.cd8m6wu8guse.us-east-2.rds.amazonaws.com",
  port: 5432,
  database: "ewallet",
  ssl: {
    rejectUnauthorized: false
  }
};

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

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
    //wallet_id,
    password,
    role,
    account_status,
  } = req.body;

  password = bcrypt.hashSync(password, 8);

  try {
    const client = await connectToDatabase();

    // Check if user exists
    const query = "SELECT COUNT(email) FROM users WHERE email = $1";
    const values = [email];
    const result = await executeQuery(client, query, values);

    if (result.rows[0].count === 1) {
      res.status(201).send("User Already exists");
      return;
    }
    const newclient = await connectToDatabase();
    // Create new user and wallet
    const newuserQuery = `
      WITH new_user AS (
        INSERT INTO users (first_name, last_name, email, wallet_id, password, role, account_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      ),
      new_wallet AS (
        INSERT INTO wallet (user_id, balance) VALUES ((SELECT id FROM new_user), 0) RETURNING id
      )
      UPDATE users
      SET wallet_id = (SELECT id FROM new_wallet)
      WHERE id = (SELECT id FROM new_user);
    `;
    const newuserValues = [
      first_name,
      last_name,
      email,
      null,
      password,
      role,
      account_status,
    ];
    const newuserResult = await executeQuery(
      newclient,
      newuserQuery,
      newuserValues
    );

    res.status(201).json(newuserResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// GET endpoint to fetch all wallets
app.get("/wallets", (req, res) => {
  const client = new Client(dbConfig);

  client
    .connect()
    .then(() => {
      console.log("Connected to PostgreSQL database");

      // Executing SELECT query
      client.query("SELECT * FROM wallet", (err, result) => {
        if (err) {
          console.error("Error executing query", err);
          res.status(500).send("Internal Server Error");
        } else {
          res.status(200).json(result.rows);
        }
        client
          .end()
          .then(() => {
            console.log("Connection to PostgreSQL closed");
          })
          .catch((err) => {
            console.error("Error closing connection", err);
          });
      });
    })
    .catch((err) => {
      console.error("Error connecting to PostgreSQL database", err);
      res.status(500).send("Internal Server Error");
    });
});

// POST endpoint to create a new wallet
app.post("/wallets", (req, res) => {
  const { balance } = req.body;
  const client = new Client(dbConfig);

  client
    .connect()
    .then(() => {
      console.log("Connected to PostgreSQL database");

      // Executing INSERT query
      const query = `
        INSERT INTO wallet (balance)
        VALUES ($1)
        RETURNING *`;
      const values = [balance];

      client.query(query, values, (err, result) => {
        if (err) {
          console.error("Error executing query", err);
          res.status(500).send("Internal Server Error");
        } else {
          res.status(201).json(result.rows[0]);
        }
        client
          .end()
          .then(() => {
            console.log("Connection to PostgreSQL closed");
          })
          .catch((err) => {
            console.error("Error closing connection", err);
          });
      });
    })
    .catch((err) => {
      console.error("Error connecting to PostgreSQL database", err);
      res.status(500).send("Internal Server Error");
    });
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

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

app.get('/', (req, res) => {
  res.status(200).send('Hello World!')
})
