var jwt = require("jsonwebtoken");

function authenticateToken(req, res, secret) {
    const token = req.headers['authorization'];

    if (!token || !token.startsWith('Bearer ')) {
      res.status(401).send({message: "Unauthorized"});
      return false; // Return false when unauthorized
    }
  
    const tokenString = token.slice(7);
    try {
      const decodedToken = jwt.verify(tokenString, secret);

      if (Date.now() >= decodedToken.exp * 1000) {
        res.status(401).send({message: "Token Expired"});
        return false;
      } else {
        return true;
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return false; // Return false on error
    }
}

module.exports = authenticateToken;
