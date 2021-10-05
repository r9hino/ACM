const {hostname} = require('os');
const router = require('express').Router();
const cookieParser = require("cookie-parser");
const readLastLines = require('read-last-lines');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const validateAccessToken = require('./validateToken');
const {MONGODB_REMOTE_URL, WEB_USERNAME, WEB_PASSWORD, WEB_JWT_ACCESS_SECRET, WEB_JWT_REFRESH_SECRET, INFLUXDB_TOKEN} = require('../Helper/envExport');   // Environment variables.

// Initialize DBs
const remoteMongoDB = new MongoDBHandler(MONGODB_REMOTE_URL);

// Global variables.
const ipReqMonitor = {};                    // Store IPs and number of attempts.
const maxNumberOfAttempts = 4;
const waitTime = 30*1000;

let storeSessions = [];
let timeoutInterval = null;
let start, stop;

// Authorization Middleware
const authValidation = function(req, res, next){
    console.log(storeSessions, req.session);
    if(req.session && storeSessions.findIndex(session => session.user === req.session.user) >= 0)
        return next();
    else
        return res.status(401).json({});
};

router.post('/login', (req, res) => {    
    const ip = req.headers['x-forwarded-for'] || req.ip.split(':')[3];// || req.connection.remoteAddress.split(":")[3];
    const {username, password} = req.body;
    
    // If is a new ip, create entry object with ip as key.
    if((ip in ipReqMonitor == false)) ipReqMonitor[ip] = {numberOfAttempts: maxNumberOfAttempts};

    if(ipReqMonitor[ip].numberOfAttempts > 0){
        if(username === WEB_USERNAME && password === WEB_PASSWORD){
            req.session.user = username;
            // Avoid storing user if it is already stored on system memory.
            if(storeSessions.some(session => session.user === username) === false) storeSessions.push(req.session);

            const user = {id: 1, username: 'pi'};
            res.status(200);
            res.json({user: user, influxToken: INFLUXDB_TOKEN});
            // Delete ip attemps information, because user logged in correctly and it is no longer necessary to store it.
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

// Validate session.
router.get('/validatesession', (req, res) => {
    console.log("Validate session:", req.session);
    // If session has a user.
    if(req.session.user !== undefined){
        // If session has the user stored.
        if(storeSessions.findIndex(session => session.user === req.session.user) >= 0){
            res.status(200);
            res.json({user: req.session.user, influxToken: INFLUXDB_TOKEN});
        }
        else res.sendStatus(403);
    }
    else res.sendStatus(403);
    return;
});

router.get('/logs/info', authValidation, (req, res) => {
    res.status(200);
    res.contentType('application/text');
    readLastLines.read('/home, pi/Code/ACM/Backend/Logs/info.log', 100)
	    .then((lines) => res.send(lines));
});

router.get('/logs/errors', authValidation, (req, res) => {
    res.status(200);
    res.contentType('application/text');
    readLastLines.read('/home/pi/Code/ACM/Backend/Logs/error.log', 100)
	    .then((lines) => res.send(lines));
});

// Guard users apis -------------------------------------------------------------------------------------------------
router.get('/api/getguardusers', authValidation, (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let guardUsers = deviceMetadataDB.get('guard_users');
    guardUsers = guardUsers === undefined ? [] : guardUsers;    // Set array to empty if not guard users are store on the local database.
    res.status(200);
    res.contentType('application/json');
    res.send(guardUsers);
});

router.post('/api/addguarduser', authValidation, async (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let guardUsers = deviceMetadataDB.get('guard_users');       // Recover locally stored guard users.
    guardUsers = guardUsers === undefined ? [] : guardUsers;    // Check if undefined.

    const {newGuardUser} = req.body;
    if(newGuardUser !== ''){
        guardUsers.push(newGuardUser);
        // Store new guard user locally.
        deviceMetadataDB.set('guard_users', guardUsers);
        deviceMetadataDB.sync();
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
            res.json({message: 'WARNING: Guard user added only to local DB.'});
        }
    }
    else{
        res.status(400);
        res.json({message: 'ERROR: No guard user added on local or remote DBs.'});
    }
});

router.post('/api/removeguarduser', authValidation, async (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let guardUsers = deviceMetadataDB.get('guard_users');       // Recover locally stored guard users.
    if(guardUsers === undefined){
        res.status(400);
        res.json({message: 'ERROR: No guard user to remove.'});
        return;
    }

    const {guardUserRemove} = req.body;
    const  index = guardUsers.findIndex(guardUser => guardUser.email === guardUserRemove.email && guardUser.phone === guardUserRemove.phone);
    if(index < 0){
        console.error('ERROR: No guard user found on server.');
        res.status(400);
        res.json({message: 'ERROR: No guard user found on server.'});
        return;
    }
    guardUsers.splice(index, 1);                                // Remove guard user from array.

    // Store locally array with removed guard user.
    deviceMetadataDB.set('guard_users', guardUsers);
    deviceMetadataDB.sync();
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

// Alerts apis -------------------------------------------------------------------------------------------------
// Retrieve alerts and sensors available connected to the system.
router.get('/api/getalertsandsensorsavailable', authValidation, (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let alerts = deviceMetadataDB.get('alerts');                // Retrieve all alerts already defined.s
    alerts = alerts === undefined ? [] : alerts;                // Set array to empty if not alerts are store on the local database.
    
    let sensorsAvailable = deviceMetadataDB.get('sensors');     // Retrieve all sensors connected in the system.
    if(sensorsAvailable === undefined){
        res.status(401);
        res.contentType('application/json');
        res.json({message: 'ERROR: No sensors found on DB.'});
        return;
    }
    sensorsAvailable = sensorsAvailable.map(sensorAvailable => {
        return {sensor_name: sensorAvailable.sensor_name, unit: sensorAvailable.unit};
    });

    res.status(200);
    res.contentType('application/json');
    if(alerts.length === 0) res.json({alerts, sensorsAvailable, message: "OK: No alerts defined on server, only sensors retrieved."});
    else res.json({alerts, sensorsAvailable, message: "OK: Alerts and sensors availables successfully retrieved."});
});

router.post('/api/addalert', authValidation, async (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let alerts = deviceMetadataDB.get('alerts');        // Recover locally stored alerts.
    alerts = alerts === undefined ? [] : alerts;        // Check if undefined.

    let {newAlert} = req.body;
    if(newAlert !== ''){
        const dateUpdate = new Date().toString();
        newAlert = Object.assign(newAlert, {date_update: dateUpdate});
        // Set new id, from max id found on array + 1.
        newAlert.id = alerts.reduce((prev, current) => (prev.id > current.id) ? prev : current).id+1;
        alerts.push(newAlert);
        
        // Store new guard user locally.
        deviceMetadataDB.set('alerts', alerts);
        deviceMetadataDB.set('date_update', dateUpdate);
        deviceMetadataDB.sync();
        // Try to store new guard user remotely.
        try{
            await remoteMongoDB.connectDB();
            await remoteMongoDB.updateDevice(hostname(), {alerts: alerts, date_update: dateUpdate});    // Store remotely.
            await remoteMongoDB.close();
            res.status(200);
            res.json({id: newAlert.id, message: 'OK: Alert added to local and remote DBs.'});
        }                            
        catch(err){
            console.error('ERROR:', err);
            res.status(201);
            res.json({id: newAlert.id, message: 'WARNING: Alert added only to local DB.'});
        }
    }
    else{
        res.status(400);
        res.json({message: 'ERROR: No alert added on local or remote DBs.'});
    }
});

router.post('/api/removealert', authValidation, async (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let alerts = deviceMetadataDB.get('alerts');            // Recover locally stored alerts.
    if(alerts === undefined){
        res.status(400);
        res.json({message: 'ERROR: No alert to remove.'});
        return;
    }
    const {alertRemove} = req.body;

    const index = alerts.findIndex(({sensor_name, criteria}) => sensor_name === alertRemove.sensor_name && criteria === alertRemove.criteria);
    if(index < 0){
        res.status(400);
        res.json({message: 'ERROR: Alert not found.'});
        return;
    }
    alerts.splice(index, 1);                                // Remove alert from array.
    const dateUpdate = new Date().toString();

    // Store locally array with removed alert.
    deviceMetadataDB.set('alerts', alerts);
    deviceMetadataDB.set('date_update', dateUpdate);
    deviceMetadataDB.sync();
    // Store remotely array with removed alert.
    try{
        await remoteMongoDB.connectDB();
        await remoteMongoDB.updateDevice(hostname(), {alerts: alerts, date_update: dateUpdate});    // Store remotely.
        await remoteMongoDB.close();
        res.status(200);
        res.json({message: 'OK: Alert removed from local and remote DBs.'});
    }                            
    catch(err){
        console.error('ERROR:', err);
        res.status(201);
        res.json({message: 'WARNING: Alert removed from local DB but not from remote DB.'});
    }
});

router.put('/api/updatealert', authValidation, async (req, res) => {
    let deviceMetadataDB = new JSONdb(__dirname + '/../deviceMetadataDB.json');
    let alerts = deviceMetadataDB.get('alerts');            // Recover locally stored alerts.
    // Send error if no alerts are found on the local DB.
    if(alerts === undefined){
        res.status(400);
        res.json({message: 'ERROR - routes.js: There are no alerts defined on server to update.'});
        return;
    }
    const {alertUpdate, index} = req.body;

    // Send error if alert with index is not found.
    if(alerts[index] === undefined){
        res.status(400);
        res.json({message: 'ERROR: Alert not found.'});
        return;
    }
    alerts[index] = alertUpdate;                            // Update alert from array.
    const dateUpdate = new Date().toString();
    alerts[index] = Object.assign(alerts[index], {date_update: dateUpdate});

    // Store locally array with removed alert.
    deviceMetadataDB.set('alerts', alerts);
    deviceMetadataDB.set('date_update', dateUpdate);
    deviceMetadataDB.sync();
    // Store remotely array with removed alert.
    try{
        await remoteMongoDB.connectDB();
        await remoteMongoDB.updateDevice(hostname(), {alerts: alerts, date_update: dateUpdate});    // Store remotely.
        await remoteMongoDB.close();
        res.status(200);
        res.json({message: 'OK: Alert updated on local and remote DBs.'});
    }                            
    catch(err){
        console.error('ERROR:', err);
        res.status(201);
        res.json({message: 'WARNING: Alert updated only on local DB and not on remote DB.'});
    }
});

module.exports = router;