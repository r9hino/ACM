const {hostname} = require('os');
const express = require('express');
const cookieParser = require("cookie-parser");
const rateLimit = require('express-rate-limit');

const routes = require('./routes');

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
    windowMs: 60*60*1000,
    max: 25, // limit each IP to 100 requests per windowMs
    message: 'Too many requests' // message to send
});
//app.use(limiter);

// CORS middleware.
const beforeRouting = function(req, res, next){
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-type'); // 'Authorization, X-Requested-With, Content-type, Accept, X-Access-Token, X-Key'
    res.header('Access-Control-Allow-Origin', `http://${hostname()}.mooo.com:3000`);
    res.header('Access-Control-Allow-Credentials', true);

    console.log("Before routes");
    next();
}
app.use(beforeRouting);

app.use(routes);

module.exports = app;