// Handle all alerts defined at startup or on UI.
// For this, it retrieve sensor values from InfluxDB and compare them with defined alerts.
// If an alerts is triggered, the alert is activeted setting it state to 'on' and adding an alert message.

const fs = require('fs');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const InfluxDBHandler = require('../DB/InfluxDBHandler');
const {isNumber} = require('../Helper/AuxFunctions.js');   // Auxiliary functions.
const env = require('../Helper/envExport.js');      // Environment variables.

// Objects initialization.
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';
let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
const remoteMongoDB = new MongoDBHandler(env.MONGODB_REMOTE_URL);
const localInfluxDB = new InfluxDBHandler(env.INFLUXDB_LOCAL_URL, env.INFLUXDB_PORT, env.INFLUXDB_TOKEN, env.INFLUXDB_ORG, [env.INFLUXDB_SENSORS_BUCKET, env.INFLUXDB_SYSTEM_BUCKET]);

// Global variables intitalization.
let delayStateUpdateInterval;
let alerts = deviceMetadataDB.get('alerts');
let sensors = deviceMetadataDB.get('sensors');
let alertTriggerTimes = {};             // Store current time and time at which each sensor alert trigger for the first time.
let logMessageNotNumber = null;         // Is set only when there is not retrieved a number from Influx DB.


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(() => {
            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            sensors = deviceMetadataDB.get('sensors');
            alerts = deviceMetadataDB.get('alerts');

            // If an alert was removed from the local DB, delete corresponding alertTriggerTimes key.
            for(const prop in alertTriggerTimes){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == prop);
                // If prop (sensor name) is not found, remove property from alertTriggerTimes.
                if(index < 0) delete alertTriggerTimes[prop];
            }
        }, 1000);
    }
});

// Activate alerts and check if settling time has passed in order to set alert state to 'on'.
const activateAlert = async (alert, alertIndex, sensorTime, alertMessage) => {
    // Enter here only the first time. It will defined the time for the first time the alert was triggered.
    if(alertTriggerTimes[alert.sensor_name] === undefined){
        alertTriggerTimes[alert.sensor_name] = {firstTimeTrigger: Date.parse(sensorTime), lastTime: Date.parse(sensorTime)};
        return;
    }
    alertTriggerTimes[alert.sensor_name].lastTime = Date.parse(sensorTime);
    let timeElapsedSinceFirstTrigger = (alertTriggerTimes[alert.sensor_name].lastTime - alertTriggerTimes[alert.sensor_name].firstTimeTrigger)/1000;

    // Set alert state to "on", log the alert.
    // Delete alertTriggerTimes prop for the sensor as it no longer needed.
    if(timeElapsedSinceFirstTrigger >= alert.settling_time){
        const dateUpdate = new Date().toString();
        alerts[alertIndex].state = 'on';
        alerts[alertIndex].alert_message = alertMessage;
        alerts[alertIndex].date_update = dateUpdate;

        delete alertTriggerTimes[alert.sensor_name];
        console.log(alertMessage);

        // Store on local DB.
        deviceMetadataDB.set('alerts', alerts);
        deviceMetadataDB.set('date_update', dateUpdate);
        deviceMetadataDB.sync();
        // Store on remote DB.
        try{
            await remoteMongoDB.connectDB();
            await remoteMongoDB.updateDevice(hostname(), {alerts: alerts, date_update: dateUpdate});
            await remoteMongoDB.close();
        }
        catch(error){
            console.error('ERROR - AlertActivation.js:', error);
            console.log('WARNING - AlertActivation.js: Alert state change stored only in local DB.');
        }
    }
};

// Continously check if any of the defined alerts get triggered.
let alertActivationInterval = setInterval(() => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert, index) => {
        // Enter here only if alert is not already set. Once set, it is not necesary to execute this part.
        if(alert.state === 'off'){
            // Get last sensor data from Influx DB.
            let sensorIndex = sensors.findIndex(sensor => sensor.sensor_name == alert.sensor_name); // Get sensor index for retrieving sensor type.
            let lastSensorData = await localInfluxDB.queryLastData(env.INFLUXDB_SENSORS_BUCKET, sensors[sensorIndex].type, sensors[sensorIndex].sensor_name, '1h');

            if(lastSensorData !== undefined){
                // If it is a number then enter here.
                if(isNumber(lastSensorData.value)){
                    switch(alert.criteria){
                        case 'menor':
                            if(lastSensorData.value < alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" es menor que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'menor o igual':
                            if(lastSensorData.value <= alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" es menor o igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'igual':
                            if(lastSensorData.value == alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" es igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'mayor o igual':
                            if(lastSensorData.value >= alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" es mayor o igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'mayor':
                            if(lastSensorData.value > alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" es mayor que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'entre el rango':
                            if(lastSensorData.value >= alert.value && lastSensorData.value <= alert.value_aux){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${lastSensorData.sensor_name}" se encuentra entre el rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`);
                            }
                            break;
                        case 'fuera del rango':
                            if(lastSensorData.value < alert.value || lastSensorData.value > alert.value_aux){
                                activateAlert(alert, index, lastSensorData.time, `Alarma: "${alert.sensor_name}" se encuentra fuera del rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`);
                            }
                            break;
                        default:
                            // code block
                    }       // switch
                    logMessageNotNumber = null;
                }           // if isNumber()
                else if(logMessageNotNumber === null){
                    logMessageNotNumber = `WARNING - AlertActivation.js: Influx DB do not have a number type value for "${alert.sensor_name}"".`;
                    console.log(logMessageNotNumber);
                }
            }               // if(lastSensorData !== undefined)
        }                   // if alert.state 
    });                     // forEach
}, 2000);                   // setInterval