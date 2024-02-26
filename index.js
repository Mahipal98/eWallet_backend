const { Client } = require("pg");
const express = require("express");
const bodyParser = require("body-parser"); // Add body-parser for handling POST request bodies
const cors = require("cors");

const app = express();
const port = 3000;

const allowedOrigins = ["http://localhost:4200", "https://d34tm79nlljwo9.cloudfront.net"];

// Configure CORS options
var corsOptions = {
  origin: function (origin, callback) {
    // Check if the origin is in the list of allowed origins or if it's undefined (e.g., from a direct HTTP request)
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Deny the request
    }
  }
};

// Apply CORS middleware with custom options
app.use(cors(corsOptions));

// Database connection configuration
const dbConfig = {
  user: "ewalletuser",
  password: "HealthWwPgwW615!",
  host: "ewallet-api-rdsinstance9f6b765a-dgkmyzjb9p2k.cd8m6wu8guse.us-east-2.rds.amazonaws.com",
  port: 5432,
  database: "ewallet",
};

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// GET endpoint to fetch all users
app.get("/users", (req, res) => {
  // Create a new PostgreSQL client
  const client = new Client(dbConfig);

  client
    .connect()
    .then(() => {
      console.log("Connected to PostgreSQL database");

      // Executing SELECT query
      client.query("SELECT * FROM users", (err, result) => {
        if (err) {
          console.error("Error executing query", err);
          res.status(500).send("Internal Server Error");
        } else {
          res.status(200).json(result.rows);
          console.log("The result is: " + result);
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

// POST endpoint to create a new user
app.post("/users", (req, res) => {
  const {
    first_name,
    last_name,
    email,
    //wallet_id,
    password,
    role,
    account_status,
  } = req.body;
  const client = new Client(dbConfig);

  console.log(req.body);

// Checking is user exists
  client
    .connect()
    .then(() => {
      // const query = `SELECT email FROM users WHERE email=email`;
      const query = 'SELECT COUNT(email) FROM users WHERE email = $1';
      const values = [email];
      client.query(query, values, (err, result) => {
        if (err)  {
          console.error("Error executing query ="+ query +"\nError is:\n", err);
          res.status(500).send("Internal Server Error in client.query for checking user data");
        } else {
          const count = result.rows[0].count;
          if(count==1){
            res.status(201).send("User Already exists");
          }
          else{
            const newclient = new Client(dbConfig);
            // No user exists, Creating new user 
            newclient
            .connect()
            .then(() => {
              console.log("Connected to PostgreSQL database");
              const query = `
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
            
            const values = [first_name, last_name, email, null, password, role, account_status];
            
            newclient.query(query, values, (err, result) => {
                if (err) {
                  console.error("Error executing query", err);
                  res.status(500).send("Internal Server Error in new client.query");
                } else {
                  res.status(201).json(result);
                }
                newclient
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
          }
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

  // client
  //   .connect()
  //   .then(() => {
  //     console.log("Connected to PostgreSQL database");
  //     const query = `
  //     WITH new_user AS (
  //       INSERT INTO users (first_name, last_name, email, wallet_id, password, role, account_status)
  //       VALUES ($1, $2, $3, $4, $5, $6, $7)
  //       RETURNING id
  //     ),
  //     new_wallet AS (
  //       INSERT INTO wallet (user_id, balance) VALUES ((SELECT id FROM new_user), 0) RETURNING id
  //     )
  //     UPDATE users
  //     SET wallet_id = (SELECT id FROM new_wallet)
  //     WHERE id = (SELECT id FROM new_user);
  //   `;
    
  //   const values = [first_name, last_name, email, null, password, role, account_status];
    
  //     client.query(query, values, (err, result) => {
  //       if (err) {
  //         console.error("Error executing query", err);
  //         res.status(500).send("Internal Server Error in client.query");
  //       } else {
  //         res.status(201).json(result.rows[0]);
  //       }
  //       client
  //         .end()
  //         .then(() => {
  //           console.log("Connection to PostgreSQL closed");
  //         })
  //         .catch((err) => {
  //           console.error("Error closing connection", err);
  //         });
  //     });
  //   })
  //   .catch((err) => {
  //     console.error("Error connecting to PostgreSQL database", err);
  //     res.status(500).send("Internal Server Error");
  //   });
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

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

app.get('/', (req, res) => {
  res.status(200).send('Hello World!')
})
