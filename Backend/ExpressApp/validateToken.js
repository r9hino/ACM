const jwt = require("jsonwebtoken");

// Middleware to validate token.
const verifyToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers.authorization || req.body.token;
    token = token.split('Bearer ')[1];  // Removing Bearer to retrieve token.

    if(!token || token === '' || token === ' ') return res.status(401).json({ error: 'No token.' });

    try{
        const verified = jwt.verify(token, process.env.WEB_JWT_SECRET);
        req.user = verified;
        next();
    }
    catch(error){
        res.status(400).json({error: 'No valid token.'});
    }
}

module.exports = verifyToken;