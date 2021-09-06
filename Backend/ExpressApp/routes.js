// Links:
// https://github.com/scalablescripts/node-auth/blob/main/routes/routes.js   https://www.youtube.com/watch?v=IxcKMcsBGE8&list=PLlameCF3cMEsjpIRxfB9Rjici3aMCaQVo&index=2&ab_channel=ScalableScripts

const {hostname} = require('os');
const router = require('express').Router();
const jwt = require("jsonwebtoken");
const readLastLines = require('read-last-lines');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const verifyToken = require('./validateToken');

// Initialize DBs
require('dotenv').config({ path: __dirname + `/../.env` });
const remoteMongoURL = process.env.MONGODB_URL;
const deviceMetadataDB = new JSONdb('../deviceMetadataDB.json');
const remoteMongoDB = new MongoDBHandler(remoteMongoURL);

const ipReqMonitor = {};        // Store IPs and number of attempts.
const maxNumberOfAttempts = 5;
const waitTime = 10*1000;
let timeoutInterval = null;
let start, stop;

router.post('/login', (req, res) => {
    const USERNAME = process.env.WEB_USERNAME;
    const PASSWORD = process.env.WEB_PASSWORD;
    
    const ip = req.headers['x-forwarded-for'] || req.ip.split(':')[3];// || req.connection.remoteAddress.split(":")[3];
    const {username, password} = req.body;
    
    // If is a new ip, create entry object with ip as key.
    if((ip in ipReqMonitor == false)){
        ipReqMonitor[ip] = {numberOfAttempts: maxNumberOfAttempts};
    }

    if(ipReqMonitor[ip].numberOfAttempts > 0){
        if(username === USERNAME && password === PASSWORD){
            const user = {id: 1, username: 'pi'};
            const token = jwt.sign(user, process.env.WEB_JWT_SECRET);
            res.status(200);
            res.json({user, token});
            // Delete ip attemps information because user logged in correctly and it is no longer necessary to store it.
            delete ipReqMonitor[ip];
            console.log(`INFO: IP ${ip} logged in.`);
            return;
        }
        else{
            ipReqMonitor[ip].numberOfAttempts = ipReqMonitor[ip].numberOfAttempts - 1;
            //logger.debug(ipReqMonitor);
            // If no more attempts available, block for a period of time.
            if(ipReqMonitor[ip].numberOfAttempts == 0){
                console.log(`WARNING: Too many attempts from IP ${ip}.`);
                start = Date.now();
                timeoutInterval = setTimeout(() => {
                    // After timeout reset number of attempts for this ip.
                    ipReqMonitor[ip].numberOfAttempts = maxNumberOfAttempts;
                    clearTimeout(timeoutInterval);
                    timeoutInterval = null;
                }, waitTime);
                stop = Date.now();
                res.status(403);
                res.json({
                    message: `Too many attempts, please wait ${((waitTime - (stop - start))/1000).toFixed(0)} sec.`,
                    attemptsAvailable: ipReqMonitor[ip].numberOfAttempts,
                    remainingTime: (waitTime - (stop - start))/1000,
                });
            }
            else{
                res.status(403);
                res.json({
                    message: "Wrong credentials, try again.",
                    attemptsAvailable: ipReqMonitor[ip].numberOfAttempts,
                    remainingTime: 0
                });
            }
        }
    }
    else{
        // If maximum number of attempts is reached, don't do anything..
        //console.log(ipReqMonitor);
        stop = Date.now()
        res.status(403);
        res.json({
            message: `Too many attempts, please wait ${((waitTime - (stop - start))/1000).toFixed(0)} sec.`,
            attemptsAvailable: ipReqMonitor[ip].numberOfAttempts,
            remainingTime: (waitTime - (stop - start))/1000,
        });
    }
});

router.get('/logs/info', (req, res) => {
    res.status(200);
    res.contentType('application/text');
    readLastLines.read('/home/pi/Code/ACM/Backend/Logs/info.log', 100)
	    .then((lines) => {
            res.send(lines)
    });
});

router.get('/logs/errors', (req, res) => {
    res.status(200);
    res.contentType('application/text');
    readLastLines.read('/home/pi/Code/ACM/Backend/Logs/error.log', 100)
	    .then((lines) => {
            res.send(lines)
    });
});

router.get('/api/getguardusers', verifyToken, (req, res) => {
    let guardUsers = deviceMetadataDB.get('guard_users');
    guardUsers = guardUsers === undefined ? [] : guardUsers;    // Set array to empty if not guard users are store on the local database.
    res.status(200);
    res.contentType('application/json');
    res.send(guardUsers);
});

router.post('/api/addguarduser', verifyToken, async (req, res) => {
    let guardUsers = deviceMetadataDB.get('guard_users');       // Recover locally stored guard users.
    guardUsers = guardUsers === undefined ? [] : guardUsers;    // Check if undefined.

    const {newGuardUser} = req.body;
    if(newGuardUser !== ''){
        guardUsers.push(newGuardUser);
        // Store new guard user locally.
        deviceMetadataDB.set('guard_users', guardUsers);
        // Try to store new guard user remotely.
        try{
            await remoteMongoDB.connectDB();
            await remoteMongoDB.updateDevice(hostname(), {guard_users: guardUsers});    // Store remotely.
            await remoteMongoDB.close();
            res.status(200);
            res.json({message: 'OK: Guard user added to local and remote DBs.'});
        }                            
        catch(err){
            console.error('ERROR:', err);
            res.status(201);
            res.json({message: 'WARNING: Guard user added to local DB but not on remote DB.'});
        }
    }
    else{
        res.status(400);
        res.json({message: 'ERROR: No guard user added on local and remote DBs.'});
    }
});

router.post('/api/removeguarduser', verifyToken, async (req, res) => {
    let guardUsers = deviceMetadataDB.get('guard_users');       // Recover locally stored guard users.
    if(guardUsers === undefined){
        res.status(400);
        res.json({message: 'ERROR: No guard user to remove.'});
        return;
    }

    const {guardUserRemove} = req.body;
    const  index = guardUsers.indexOf(guardUserRemove);
    guardUsers.splice(index, 1);                                // Remove guard user from array.

    // Store locally array with removed guard user.
    deviceMetadataDB.set('guard_users', guardUsers);
    // Store remotely array with removed guard user.
    try{
        await remoteMongoDB.connectDB();
        await remoteMongoDB.updateDevice(hostname(), {guard_users: guardUsers});    // Store remotely.
        await remoteMongoDB.close();
        res.status(200);
        res.json({message: 'OK: Guard user removed from local and remote DBs.'});
    }                            
    catch(err){
        console.error('ERROR:', err);
        res.status(201);
        res.json({message: 'WARNING: Guard user removed from local DB but not from remote DB.'});
    }
});

module.exports = router;