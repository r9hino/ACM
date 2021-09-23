// Handle all alerts defined at startup or on UI.
// For this, it retrieve sensor values from InfluxDB and compare them with defined alerts.
// If an alerts is triggered, the alert is activeted setting it state to 'on' and adding an alert message.
// If an alert value is no longer on the trigger limits, the program will change its state to 'off' after x amount of time.

const env = require('../Helper/envExport.js');              // Environment variables.

const fs = require('fs');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const InfluxDBHandler = require('../DB/InfluxDBHandler');
const {isNumber} = require('../Helper/auxFunctions.js');    // Auxiliary functions.

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


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(() => {
            console.log(new Date().toString(), alerts);
            let previousAlerts = alerts;
            // Update alarms and sensors if local DB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            sensors = deviceMetadataDB.get('sensors');
            alerts = deviceMetadataDB.get('alerts');

            // If an alert was updated or removed from the local DB, log the alert deactivation and its alertTriggerTimes.
            previousAlerts.forEach(previousAlert => {
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == previousAlert.sensor_name);
                // If previous alert sensor name is not found, remove property from alertTriggerTimes.
                if(index < 0){
                    if(alertTriggerTimes[previousAlert.sensor_name] !== undefined){
                        delete alertTriggerTimes[previousAlert.sensor_name];
                        console.log(`INFO - alertActivation.js: Property alertTriggerTimes["${previousAlert.sensor_name}"] was removed.`);
                    }
                    if(previousAlert.state === 'on') console.log(`INFO - alertActivation.js: Alert for "${previousAlert.sensor_name}" was deactivated.`);
                }
                // If state change from 'on' to 'off', remove property from alertTriggerTimes.
                else if(index >= 0){
                    if(alerts[index].state === 'off'){
                        //if(alerts[index].id === 2) console.log('debug', previousAlert, alerts[index]);
                        if(alertTriggerTimes[previousAlert.sensor_name] !== undefined){
                            delete alertTriggerTimes[previousAlert.sensor_name];
                            console.log(`INFO - alertActivation.js: Property alertTriggerTimes["${previousAlert.sensor_name}"] was removed.`);
                        }
                        if(previousAlert.state === 'on') console.log(`INFO - alertActivation.js: Alert for "${previousAlert.sensor_name}" was deactivated.`);
                    }
                }
            });
        }, 100);
    }
});

// Activate alerts and check if settling time has passed in order to set alert state to 'on'.
// This function is called twice, in the last call it set state to 'on'.
// sensorTime come from InfluxDb, not from actual current time.
const activateAlert = async (alert, alertIndex, sensorTime, alertMessage) => {
    // Enter here only the first time. It will defined the time for the first time the alert was triggered.
    if(alertTriggerTimes[alert.sensor_name] === undefined){
        alertTriggerTimes[alert.sensor_name] = {firstTimeTrigger: Date.parse(sensorTime), lastTime: Date.parse(sensorTime)};
        return;
    }
    // Calculate elapsed time since first trigger.
    alertTriggerTimes[alert.sensor_name].lastTime = Date.parse(sensorTime);
    let timeElapsedSinceFirstTrigger = (alertTriggerTimes[alert.sensor_name].lastTime - alertTriggerTimes[alert.sensor_name].firstTimeTrigger)/1000;

    // Set alert state to "on", log the alert.
    // Delete alertTriggerTimes prop for the sensor as it no longer needed.
    if(timeElapsedSinceFirstTrigger >= alert.settling_time){
        const dateUpdate = new Date().toString();
        alerts[alertIndex].state = 'on';
        alerts[alertIndex].alert_message = alertMessage;
        alerts[alertIndex].date_trigger = dateUpdate;
        alerts[alertIndex].date_update = dateUpdate;

        delete alertTriggerTimes[alert.sensor_name];
        console.log(alertMessage);

        storeOnAllDB({alerts: alerts, date_update: dateUpdate});
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
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" es menor que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'menor o igual':
                            if(lastSensorData.value <= alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" es menor o igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'igual':
                            if(lastSensorData.value == alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" es igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'mayor o igual':
                            if(lastSensorData.value >= alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" es mayor o igual que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'mayor':
                            if(lastSensorData.value > alert.value){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" es mayor que ${alert.value} ${alert.unit}.`);
                            }
                            break;
                        case 'entre el rango':
                            if(lastSensorData.value >= alert.value && lastSensorData.value <= alert.value_aux){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${lastSensorData.sensor_name}" se encuentra entre el rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`);
                            }
                            break;
                        case 'fuera del rango':
                            if(lastSensorData.value < alert.value || lastSensorData.value > alert.value_aux){
                                activateAlert(alert, index, lastSensorData.time, `Alerta: "${alert.sensor_name}" se encuentra fuera del rango ${alert.value} y ${alert.value_aux} ${alert.unit}.`);
                            }
                            break;
                        default:
                            // default code
                    }       // switch
                }           // if isNumber()
            }               // if(lastSensorData !== undefined)
        }                   // if alert.state === 'off'
    });                     // forEach
}, 2000);                   // setInterval


// Check if the alert must be turned off automatically after x amount of time if sensor value has been out of the trigger range.
let alertDeactivationInterval = setInterval(() => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert, index) => {
        // Enter here only if alert is not already set. Once set, it is not necesary to execute this part.
        if(alert.state === 'on'){
            let keepTriggering = false;
            // Get last sensor data from Influx DB.
            let sensorIndex = sensors.findIndex(sensor => sensor.sensor_name == alert.sensor_name); // Get sensor index for retrieving sensor type.
            let lastSensorData = await localInfluxDB.queryLastData(env.INFLUXDB_SENSORS_BUCKET, sensors[sensorIndex].type, sensors[sensorIndex].sensor_name, '1h');

            if(lastSensorData !== undefined){
                // If it is a number then enter here.
                if(isNumber(lastSensorData.value)){
                    switch(alert.criteria){
                        case 'menor':
                            if(lastSensorData.value < alert.value) keepTriggering = true;
                            break;
                        case 'menor o igual':
                            if(lastSensorData.value <= alert.value) keepTriggering = true;
                            break;
                        case 'igual':
                            if(lastSensorData.value == alert.value) keepTriggering = true;
                            break;
                        case 'mayor o igual':
                            if(lastSensorData.value >= alert.value) keepTriggering = true;
                            break;
                        case 'mayor':
                            if(lastSensorData.value > alert.value) keepTriggering = true;
                            break;
                        case 'entre el rango':
                            if(lastSensorData.value >= alert.value && lastSensorData.value <= alert.value_aux) keepTriggering = true;
                            break;
                        case 'fuera del rango':
                            if(lastSensorData.value < alert.value || lastSensorData.value > alert.value_aux) keepTriggering = true;
                            break;
                        default:
                            // default code
                    }       // switch
                }           // if isNumber()

                // If alert conditions are still triggering, just update date_trigger.
                if(keepTriggering === true){
                    alert.date_trigger = new Date().toString();
                    storeOnAllDB({alerts: alerts, date_update: alert.date_trigger});
                }
                // If alert conditions are not been triggering now, change alert state to 'off' if x amount of time has passed.
                else{
                    let timeElapsedSinceLastTrigger = (Date.now() - Date.parse(alert.date_trigger))/1000;   // Convert to seconds.
                    if(timeElapsedSinceLastTrigger > 20){
                        alert.date_trigger = null;
                        alert.date_update = new Date().toString();
                        alert.state = 'off';
                        storeOnAllDB({alerts: alerts, date_update: alert.date_update});
                    }
                }
            }               // if(lastSensorData !== undefined)
        }                   // if alert.state === 'on'
    });                     // forEach
}, 5000);                   // setInterval


const storeOnAllDB = async (keyProps) =>{
    // Store alert.notified in local DB.
    for(const [key, value] of Object.entries(keyProps)){
        deviceMetadataDB.set(key, value);
    }
    deviceMetadataDB.sync();
    // Store on remote DB.
    try{
        await remoteMongoDB.connectDB();
        await remoteMongoDB.updateDevice(hostname(), keyProps);
        await remoteMongoDB.close();
    }
    catch(error){
        console.error('ERROR - notifications.js:', error);
        console.log('WARNING - notifications.js: Data was stored only in local DB.');
    }
}