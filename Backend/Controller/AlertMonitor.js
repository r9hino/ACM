// Handle all alarms defined at startup or on UI.
// For this, it retrieve sensor values from InfluxDB and compare them with defined alarms.
// If an alarm is triggered a notification logic is executed.

const fs = require('fs');
const http = require('http');
const socketio = require('socket.io');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const InfluxDBHandler = require('../DB/InfluxDBHandler');
const env = require('../Helper/envExport.js');   // Environment variables.

// Objects initialization.
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';
let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
const remoteMongoDB = new MongoDBHandler(env.MONGODB_REMOTE_URL);
const localInfluxDB = new InfluxDBHandler(env.INFLUXDB_LOCAL_URL, env.INFLUXDB_PORT, env.INFLUXDB_TOKEN, env.INFLUXDB_ORG, [env.INFLUXDB_SENSORS_BUCKET, env.INFLUXDB_SYSTEM_BUCKET]);

// Global variables intitalization.
let delayStateUpdateInterval;
let alerts = deviceMetadataDB.get('alerts');
let sensors = deviceMetadataDB.get('sensors');
let firstAlertTriggerTime = {};


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);
        delayStateUpdateInterval = setTimeout(() => {
            console.log(`INFO - AlertMonitor: Instance of deviceMetadataDB has been updated.`);

            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
            alerts = deviceMetadataDB.get('alerts');
            sensors = deviceMetadataDB.get('sensors');
        }, 500);
    }
});

// Activate alerts
const activateAlert = (sensor, alert, alertIndex, alertLog) => {
    if(firstAlertTriggerTime[sensor.name] === undefined) firstAlertTriggerTime[sensor.name] = Date.now();

    let timeElapsedSinceFirstTrigger = (Date.now() - firstAlertTriggerTime[sensor.name])/1000;

    // Set alert state to "on", log the alert and send notification.
    // Once the alert is "on", is not necessary to enter again here.
    if(timeElapsedSinceFirstTrigger >= alert.settling_time && alert.state === 'off'){
        alerts[alertIndex].state = 'on';
        delete firstAlertTriggerTime[sensor.name];

        deviceMetadataDB.set('alerts', alerts);
        deviceMetadataDB.sync();

        console.log(alertLog);
        // Send notification to resonsible guard users.
    }
};

let alertMonitorInterval = setInterval(() => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert, index) => {
        // Get last sensor data from Influx DB.
        let sensorIndex = sensors.findIndex(sensor => sensor.name == alert.sensor);
        let lastSensorData = await localInfluxDB.queryLastData(env.INFLUXDB_SENSORS_BUCKET, sensors[sensorIndex].type, sensors[sensorIndex].name, '1h');

        if(lastSensorData !== undefined){
            //console.log(lastSensorData);
            switch(alert.criteria){
                case 'menor':
                    if(lastSensorData.value < alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${sensor.name}" es menor que ${alert.value} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'menor o igual':
                    if(lastSensorData.value <= alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" es menor o igual que ${alert.value} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'igual':
                    if(lastSensorData.value == alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" es igual que ${alert.value} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'mayor o igual':
                    if(lastSensorData.value >= alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" es mayor o igual que ${alert.value} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'mayor':
                    if(lastSensorData.value > alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" es mayor que ${alert.value} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'entre el rango':
                    if(lastSensorData.value >= alert.value && lastSensorData.value <= alert.value_aux){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" se encuentra entre el rango ${alert.value} y ${alert.value_aux} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'fuera del rango':
                    if(lastSensorData.value < alert.value || lastSensorData.value > alert.value_aux){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.name}" se encuentra fuera del rango ${alert.value} y ${alert.value_aux} ${alert.unit}`;
                        activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                default:
                    // code block
            }   // switch
        }   // if
    });     // forEach
}, 2000);