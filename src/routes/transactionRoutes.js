const express = require("express");
const router = express.Router();
const { transferFunds, getTransactions } = require("../controllers/transactionController");

router.post("/transfer", transferFunds);
router.get("/", getTransactions);

module.exports = router;