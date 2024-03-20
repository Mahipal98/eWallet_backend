const express = require("express");
const router = express.Router();
const { loginUser, checkUser, getUserInfo } = require("../controllers/authController");

router.post("/login", loginUser);
router.post("/checkuser", checkUser);
router.post("/getUserInfo", getUserInfo);

module.exports = router;