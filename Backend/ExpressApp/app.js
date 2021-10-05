const {SESSION_SECRET} = require('../Helper/envExport');   // Environment variables.

const {hostname} = require('os');
const express = require('express');
const sessions = require('express-session');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');

const app = express();

app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
    windowMs: 60*60*1000,
    max: 25, // limit each IP to 100 requests per windowMs
    message: 'Too many requests' // message to send
});
//app.use(limiter);

// Cookie parser.
function cookieParser(req, res, next) {
    let cookies = req.headers.cookie;
    if(cookies){
        req.cookies = cookies.split(";").reduce((obj, c) => {
            var n = c.split("=");
            obj[n[0].trim()] = n[1].trim();
            return obj
        }, {})
    }
    next();
}
app.use(cookieParser);

// Session middleware with x milliseconds of duration.
const sessionDuration = 1000*60*30;
app.use(sessions({
    secret: SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: { httpOnly: true, maxAge: sessionDuration, sameSite: 'strict' },
}));

// CORS middleware.
const middlewareCORS = function(req, res, next){
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type'); // 'Authorization, X-Requested-With, Content-type, Accept, X-Access-Token, X-Key'
    res.header('Access-Control-Allow-Origin', `http://${hostname()}.mooo.com:3000`);
    res.header('Access-Control-Allow-Credentials', true);

    next();
}
app.use(middlewareCORS);

app.use(routes);

module.exports = app;