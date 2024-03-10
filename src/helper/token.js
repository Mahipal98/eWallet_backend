var jwt = require("jsonwebtoken");

function deconstructToken(req, res, secret) {
    const token = req.headers['authorization'];

    if (!token || !token.startsWith('Bearer ')) {
      return {}; // Return false when unauthorized
    }
  
    const tokenString = token.slice(7);
    try {
      const decodedToken = jwt.verify(tokenString, secret);

      if (!decodedToken) {
        return {};
      } else {
        return decodedToken;
      }
    } catch (err) {
      return {}; // Return false on error
    }
}

module.exports = deconstructToken;
