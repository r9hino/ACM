const jwt = require("jsonwebtoken");

// Middleware to validate token.
const validateAccessToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers.authorization || req.body.token;
    token = token.split('Bearer ')[1];  // Removing Bearer to retrieve token.

    if(!token || token === '' || token === ' ') return res.status(401).json({ error: 'No access token.' });

    try{
        const verified = jwt.verify(token, process.env.WEB_JWT_ACCESS_SECRET);
        req.user = verified;
        next();
    }
    catch(error){
        console.error('ERROR - validateToken.js:', error);
        res.status(400).json({error: 'No valid token.'});
    }
}

module.exports = validateAccessToken;