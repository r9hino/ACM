// Handle all alarms defined at startup or on UI.
// For this, it retrieve sensor values from InfluxDB and compare them with defined alarms.
// If an alarm is triggered a notification logic is executed.

const http = require('http');
const socketio = require('socket.io');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');

const MongoDBHandler = require('../DB/MongoDBHandler');
const InfluxDBHandler = require('../DB/InfluxDBHandler');

// Environment variables.
require('dotenv').config({ path: __dirname + `/../.env` });
const remoteMongoURL = process.env.MONGODB_URL;
const localInfluxURL = process.env.INFLUXDB_LOCAL_URL;
const influxToken = process.env.INFLUXDB_TOKEN;
const influxPort = process.env.INFLUXDB_PORT;
const org = process.env.INFLUXDB_ORG;
const sensorBucket = process.env.INFLUXDB_SENSORS_BUCKET;
const systemBucket = process.env.INFLUXDB_SYSTEM_BUCKET;

// Objects initialization.
const remoteMongoDB = new MongoDBHandler(remoteMongoURL);
const localInfluxDB = new InfluxDBHandler(localInfluxURL, influxPort, influxToken, org, [sensorBucket, systemBucket]);

// Define global variables
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';

const queryInfluxDB = async (sensorName) => {
    await localInfluxDB.getLastData(sensorName);
};


let alertMonitorInterval = setInterval(async () => {
    let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);

    let alerts = deviceMetadataDB.get('alerts');

    // Get sensors
    let sensor = {value: 19};

    // Iterate over array of alerts.
    for(const alert of alerts){
        // Get sensor value from Influx DB.
        /////////////let sensorLastData = await Query from InfluxDB alert.sensor

        switch(alert.criteria) {
            case 'menor':
                if(sensor.value < alert.value){
                    console.log('Valor menor al limite');
                }
                break;
            case 'menor o igual':
                if(sensor.value <= alert.value){
                    console.log('Valor menor igual al limite');
                }
                break;
            case 'igual':
                if(sensor.value == alert.value){
                    console.log('Valor igual al limite');
                }
                break;
            case 'mayor o igual':
                if(sensor.value >= alert.value){
                    console.log('Valor mayor igual al limite');
                }
                break;
            case 'mayor':
                if(sensor.value > alert.value){
                    console.log('Valor mayor al limite');
                }
                break;
            case 'entre el rango':
                if(sensor.value >= alert.value && sensor.value <= alert.value_aux){
                    console.log('Valor entre el rango');
                }
                break;
            case 'fuera del rango':
                if(sensor.value < alert.value || sensor.value > alert.value_aux){
                    console.log('Valor fuera del rango');
                }
                break;
            default:
                // code block
        }   // Switch
    }   // for
}, 2000);