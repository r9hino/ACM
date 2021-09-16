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
let firstAlertTriggerTime = {};                 // Store time at which each sensor alert trigger for the first time.


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(() => {
            console.log(`INFO - AlertMonitor.js: Instance of deviceMetadataDB has been updated.`);

            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
            sensors = deviceMetadataDB.get('sensors');
            alerts = deviceMetadataDB.get('alerts');

            // If an alert was removed from the local DB, delete corresponding firstAlertTriggerTime key.
            // Iterate over object properties.
            /*console.log('Before delete');
            console.log(firstAlertTriggerTime);
            for(const prop in firstAlertTriggerTime){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == prop);
                //console.log(alerts);
                //console.log(index);

                // If prop (sensor name) is not found, remove property from firstAlertTriggerTime.
                if(index < 0){
                    console.log('delete ' + prop);
                    delete firstAlertTriggerTime[prop];
                    console.log(firstAlertTriggerTime);
                    console.log('End delete');
                }
            }*/
        }, 1000);
    }
});


// Activate alerts.
const activateAlert = (sensor, alert, alertIndex, alertLog) => {
    if(firstAlertTriggerTime[sensor.sensor_name] === undefined){
        firstAlertTriggerTime[sensor.sensor_name] = Date.now();
        return;
    }
    let timeElapsedSinceFirstTrigger = (Date.now() - firstAlertTriggerTime[sensor.sensor_name])/1000;

    // Set alert state to "on", log the alert and send notification.
    // Delete firstAlertTriggerTime prop for the sensor as it no longer needed.
    if(timeElapsedSinceFirstTrigger >= alert.settling_time){
        alerts[alertIndex].state = 'on';
        delete firstAlertTriggerTime[sensor.sensor_name];

        deviceMetadataDB.set('alerts', alerts);
        deviceMetadataDB.sync();

        console.log(alertLog);
        // Send notifications to responsible guard users.
    }
};

let alertMonitorInterval = setInterval(() => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert, index) => {
        // Get last sensor data from Influx DB.
        let sensorIndex = sensors.findIndex(sensor => sensor.sensor_name == alert.sensor_name);
        let lastSensorData = await localInfluxDB.queryLastData(env.INFLUXDB_SENSORS_BUCKET, sensors[sensorIndex].type, sensors[sensorIndex].sensor_name, '1h');

        if(lastSensorData !== undefined){
            //console.log(lastSensorData);
            switch(alert.criteria){
                case 'menor':
                    if(lastSensorData.value < alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${sensor.sensor_name}" es menor que ${alert.value} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'menor o igual':
                    if(lastSensorData.value <= alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" es menor o igual que ${alert.value} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'igual':
                    if(lastSensorData.value == alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" es igual que ${alert.value} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'mayor o igual':
                    if(lastSensorData.value >= alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" es mayor o igual que ${alert.value} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'mayor':
                    if(lastSensorData.value > alert.value){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" es mayor que ${alert.value} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'entre el rango':
                    if(lastSensorData.value >= alert.value && lastSensorData.value <= alert.value_aux){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" se encuentra entre el rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                case 'fuera del rango':
                    if(lastSensorData.value < alert.value || lastSensorData.value > alert.value_aux){
                        let alertLog = `WARNING - AlertMonitor.js: Alarma sensor "${lastSensorData.sensor_name}" se encuentra fuera del rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`;
                        if(alert.state === 'off') activateAlert(lastSensorData, alert, index, alertLog);
                    }
                    break;
                default:
                    // code block
            }       // switch
        }           // if
    });             // forEach
}, 2000);           // setInterval