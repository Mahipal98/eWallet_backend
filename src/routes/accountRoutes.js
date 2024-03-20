const express = require("express");
const router = express.Router();
const { fundAccount } = require("../controllers/accountController");

router.post("/fund", fundAccount);

module.exports = router;