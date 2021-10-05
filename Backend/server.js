// Links:
// Routes express: https://github.com/scalablescripts/node-auth/blob/main/routes/routes.js   https://www.youtube.com/watch?v=IxcKMcsBGE8&list=PLlameCF3cMEsjpIRxfB9Rjici3aMCaQVo&index=2&ab_channel=ScalableScripts
// Express session: https://ull-esit-dsi-1617.github.io/estudiar-cookies-y-sessions-en-expressjs-alejandro-raul-35l2-p4/sessionsexpress.html
// JWT security: https://www.netsparker.com/blog/web-security/json-web-token-jwt-attacks-vulnerabilities/
// Microservices patterns: https://blog.bitsrc.io/my-favorite-microservice-design-patterns-for-node-js-fe048c635d83
// Promise - async/await: https://blog.risingstack.com/mastering-async-await-in-nodejs/ https://dmitripavlutin.com/what-is-javascript-promise/
// Class: https://javascript.info/class#not-just-a-syntactic-sugar
// Vue basics: https://github.com/iamshaunjp/Vue-3-Firebase/tree/master  https://www.vuemastery.com/pdf/Vue-3-Cheat-Sheet.pdf
// Vue authentication: https://www.smashingmagazine.com/2020/10/authentication-in-vue-js/        https://github.com/firebase007/JWT_VUE_APP
// Change values of the vue app from browser console: document.getElementsByTagName('div')[0].__vue_app__._context.provides.store._state.data.authenticated = false

// To-do
// Run server on booting and check if influx docker can be reached at startup
// Use bcrypt for hashing passwords.
// Add only one array element when saving to local and remote DB.
// Check there is no problem when 2 alert are duplicated.
// Test if everything is good when two or more alert get activated.
// Check hysteresis, maybe is needed to enter exit point by UI.
// Control decimation in chart. Add stacket option in case there is boolean sensors or actuators.
// Add actuator section in Monitor.

const http = require('http');
const socketio = require('socket.io');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');
const ifaces = require('os').networkInterfaces();

const I2CHandler = require('./Controller/I2CHandler');
const osData = require('./Controller/osData');
const SensorMonitor = require('./Controller/SensorMonitor');
const MongoDBHandler = require('./DB/MongoDBHandler');
const InfluxDBHandler = require('./DB/InfluxDBHandler');
const app = require('./ExpressApp/app');
const env = require('./Helper/envExport');   // Environment variables.
//const logger = require('./Logs/logger');

// Objects initialization.
const i2c = new I2CHandler();
const deviceMetadataDB = new JSONdb('deviceMetadataDB.json');
const remoteMongoDB = new MongoDBHandler(env.MONGODB_REMOTE_URL);
const localInfluxDB = new InfluxDBHandler(env.INFLUXDB_LOCAL_URL, env.INFLUXDB_PORT, env.INFLUXDB_TOKEN, env.INFLUXDB_ORG, [env.INFLUXDB_SENSORS_BUCKET, env.INFLUXDB_SYSTEM_BUCKET]);

// Global variables initialization.
let httpServer, io, 
    monitoredSensors = [],
    dynamicDataInterval, tenSecInterval, minInterval, tenMinInterval;

// Sequential initialization functions.
const initializationFunctionList = [
    // Initialize system state.
    async () => {
        let deviceMetadata = deviceMetadataDB.JSON();  // Load local storage for system state if any.

        // If there are no entries on the local database, go to remote MongoDB to retrieve it.
        if(Object.keys(deviceMetadata).length === 0){
            try{
                console.log('INFO - server.js: Connecting to remote MongoDB...');
                await remoteMongoDB.connectDB();
                console.log('INFO - server.js: Retrieving device metadata from remote MongoDB...');
                deviceMetadata = await remoteMongoDB.getDeviceMetadata(hostname());
            }
            catch(e){
                console.error('ERROR - server.js: device metadata was not retrieved from remote MongoDB. Exiting Node server...');
                process.send('STOP');
            }
        }

        // Add OS and system info.
        const newValuesToStore = {
            node_version: process.version,
            architecture: process.arch,
            date_update: new Date().toString(),
            ip_public: ifaces["eth0"][0].address,
        };

        // Store locally OS and system info.
        deviceMetadata = Object.assign(deviceMetadata, newValuesToStore);
        deviceMetadataDB.JSON(deviceMetadata);
        deviceMetadataDB.sync();
        console.log('INFO - server.js: New OS and system values stored locally');

        // Store remotely new values retrieved from the OS and system.
        try{
            if(remoteMongoDB.isConnected() === false) await remoteMongoDB.connectDB();
            await remoteMongoDB.updateDevice(hostname(), newValuesToStore);
            console.log('INFO - server.js: New OS and system values stored remotely.');
            await remoteMongoDB.close();
        }
        catch(e){
            console.log('WANRING - server.js: Couldn\'t store new OS and system values in the remote MongoDB.');
        };
    },
    // Initialize sensors available.
    async () => {
        // Load local storage for system state if any.
        let deviceMetadata = deviceMetadataDB.JSON();

        // Iterate over all sensors defined in DB.
        for(const sensor of deviceMetadata.sensors){
            // Define retriever function depending on sensor protocol and type.
            if(sensor.protocol === 'i2c'){
                monitoredSensors.push(new SensorMonitor(sensor.sensor_name, sensor.type, sensor.unit, sensor.sample_time_s,
                    sensor.samples_number, async () => await i2c.readSensor(sensor.type)));
            }
            else if(sensor.protocol === 'mqtt'){
            }
        }
    },
    // Initialize http server and socket.io.
    async () => {
        httpServer = http.createServer(app).listen(env.SOCKETIO_PORT, () => console.log(`INFO - server.js: HTTP server for socket.io is listening on port ${env.SOCKETIO_PORT}`));
        io = socketio(httpServer, {cors: true});
        io.on("connection", socketCoordinator);
    },
    // Initialize intervals.
    async () => {
        tenSecInterval = setInterval(tenSecFunction, 1000*10);
        minInterval = setInterval(minFunction, 1000*10);
        tenMinInterval = setInterval(tenMinFunction, 1000*60*10);
    }
];

async function initializer(){
    for(const task of initializationFunctionList){
        await task().catch(e => process.exit(1));
    }
}
initializer();

// Intervals for data retrieval and injection.
const tenSecFunction = async () => {
    let dynamicData = await osData.getDynamicData();
    if(dynamicData.memoryRAM.activePercent !== null) localInfluxDB.writeData(env.INFLUXDB_SYSTEM_BUCKET, 'ram', 'active','%', dynamicData.memoryRAM.activePercent);
    if(dynamicData.memoryDisk.usedPercent !== null)  localInfluxDB.writeData(env.INFLUXDB_SYSTEM_BUCKET, 'disk', 'used', '%', dynamicData.memoryDisk.usedPercent);
    if(dynamicData.cpu.currentLoad !== null) localInfluxDB.writeData(env.INFLUXDB_SYSTEM_BUCKET, 'cpu', 'total', '%', dynamicData.cpu.currentLoad);

    // Write data to Influx DB of all sensors with sample time equal to 10 seconds.
    monitoredSensors.forEach((sensor, index) => {
        //console.log(sensor);
        if(Number(sensor.sampleTime) === 10) localInfluxDB.writeData(env.INFLUXDB_SENSORS_BUCKET, sensor.type, sensor.name, sensor.unit, sensor.average());
    })
};

const minFunction = async () => {
    // Store public IP if it has changed.
    let actualPublicIP = ifaces["eth0"][0].address;
    let actualDate = new Date().toString();
    if(deviceMetadataDB.get('ip_public') !== actualPublicIP){
        // Store locally new public ip.
        deviceMetadataDB.set('ip_public', actualPublicIP);
        deviceMetadataDB.set('date_update', actualDate);
        // Store remotely new values retrieved from the OS and system.
        try{
            if(remoteMongoDB.isConnected() === false) await remoteMongoDB.connectDB();
            await remoteMongoDB.updateDevice(hostname(), {ip_public: actualPublicIP, date_update: actualDate});
            console.log('INFO - server.js: New IP stored locally and remotely.');
            await remoteMongoDB.close();
        }
        catch(e){
            console.log('WANRING - server.js: Couldn\'t store new IP in the remotely.');
        };
    }
};

const tenMinFunction = async () => {
};

// Coordinate data through sockets.
function socketCoordinator(socket){
    remoteMongoDB.connectDB().catch((e) => console.log('WARNING - server.js: Couldn\'t connect to remote MongoDB at starting of socket connection.'));
    console.log(`INFO - server.js: IP ${socket.request.connection.remoteAddress.split(':')[3]} connected - Client(s) ${io.engine.clientsCount}`);

    if(dynamicDataInterval) clearInterval(dynamicDataInterval);

    // At connection send static and dynamic system data.
    osData.getStaticData().then(data => socket.emit('socketStaticSystemData', data));
    osData.getDynamicData().then(data => socket.emit('socketDynamicSystemData', data));

    dynamicDataInterval = setInterval(() => {
        osData.getDynamicData().then(data => socket.emit('socketDynamicSystemData', data));

        socket.emit('socketAnalogValues', {
            //analog0: analogSensor.average(),
            //temperature: temperatureSensor.average()
        });
    }, 1000);

    // Home page: client request for device states only when mounting the page.
    socket.on('reqRelayStates', () => {
        let relays = deviceMetadataDB.get('relays');
        socket.emit('resRelayStates', relays);  // Send device state only to socket requesting it.
    });

    // Home page: listen for changes made by user on client side. Then update device state.
    socket.on('elementChanged', relay => {
        // Broadcast new device state to everyone except sender.
        socket.broadcast.emit('updateClients', relay);
        let idRelay = relay.id;
        let relayState = relay.state;
        let dateUpdate = new Date().toString();
        let relays = deviceMetadataDB.get('relays');
        relays[idRelay].state = relayState;
        relays[idRelay].date_update = dateUpdate;

        // Store new state on the local DB.
        deviceMetadataDB.set('relays', relays);
        deviceMetadataDB.set('date_update', dateUpdate);
        deviceMetadataDB.sync();

        // Store remotely new state.
        if(remoteMongoDB.isConnected() === false){
            remoteMongoDB.connectDB().then(() => {
                // As remote DB was disconnected, local and remote DB may have different states.
                // So local DB is loaded and then uploaded completely to the remote DB.
                const deviceMetadata = deviceMetadataDB.JSON();
                delete deviceMetadata["_id"];   // _id is inmutable and can not be updated.
                remoteMongoDB.updateDevice(hostname(), deviceMetadata).catch(e => console.log('WARNING: Couldn\'t update relay state on remote MongoDB'))
            });
        }
        else remoteMongoDB.updateRelayState(hostname(), idRelay, relayState, dateUpdate).catch(e => console.log('WARNING: Couldn\'t update relay state on remote MongoDB'));
    });

    socket.on('disconnect', () => {
        console.log(`INFO - server.js: IP ${socket.request.connection.remoteAddress.split(":")[3]} disconnected - Client(s) ${io.engine.clientsCount}`);
        if(io.engine.clientsCount === 0) clearInterval(dynamicDataInterval);
        remoteMongoDB.close();
    });
}

async function shutdownServer(){
    console.log('INFO - server.js: Shuting down the server.js...');
    clearInterval(tenSecInterval);
    clearInterval(minInterval);
    clearInterval(tenMinInterval);
    clearInterval(dynamicDataInterval);

    io.emit('closeSocket');

    try {
        await i2c.close();
        await localInfluxDB.close([env.INFLUXDB_SENSORS_BUCKET, env.INFLUXDB_SYSTEM_BUCKET]);
        await remoteMongoDB.close();

        io.close(() => {
            console.log('INFO - server.js: Socket.io closed.');
            httpServer.close(() => {
                console.log('INFO - server.js: HTTP server closed.')
                process.exit(0);
            });
        });
    }
    catch(error){
        console.error('ERROR - server.js: ', error);
        process.exit(0);
    }
}

process.on('SIGTERM', shutdownServer);
process.on('SIGINT', shutdownServer);
process.on('STOP', shutdownServer);