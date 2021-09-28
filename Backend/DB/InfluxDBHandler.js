// Links
// Examples: https://github.com/influxdata/influxdb-client-js/blob/master/examples/writeAdvanced.js
// Concepts: https://docs.influxdata.com/influxdb/cloud/reference/key-concepts/data-elements/

const {InfluxDB, Point} = require('@influxdata/influxdb-client');
const {hostname} = require('os');
//const logger = require('../Logs/logger');

class InfluxDBHandler {
    constructor(url, port, token, org, buckets){
        this.org = org;
        let writeOptions = {
            batchSize: 2,
            flushInterval: 0,
            //writeFailed: [Function: writeFailed],
            //writeSuccess: [Function: writeSuccess],
            maxRetries: 10,
            maxRetryTime: 1000*60*60*24*15,
            maxBufferLines: 32000,
            gzipThreshold: 1000,
            minRetryDelay: 5000,
            maxRetryDelay: 1000*60*60,
            defaultTags: {host: hostname()},

        };
        this.dbClient = new InfluxDB({url: `${url}:${port}`, token: token, writeOptions});

        // witeAPI object store different bucket API.
        this.writeAPI = {};
        // Define query Api for the organization.
        this.queryApi = this.dbClient.getQueryApi(this.org);

        // Create a default writeAPI for a bucket.
        this.addWriteAPI(buckets);
    }

    // Add write API so then we can write or query data.
    addWriteAPI(buckets){
        buckets.forEach(bucket => {
            let writeAPI = this.dbClient.getWriteApi(this.org, bucket);
            console.log(`INFO - InfluxDBHandler.js: Influx ${bucket} bucket API available.`);

            this.writeAPI[bucket] = writeAPI;  
        });
    }

    writeData = (bucket, sensorType, sensorName, sensorUnit, value) => {
        const point = new Point(sensorType).tag('sensor_name', sensorName).floatField(sensorUnit, value);
        this.writeAPI[bucket].writePoint(point);
    }

    queryLastData = async (bucket, sensorType, sensorName, timeWindow) => {
        const fluxQuery = `from(bucket: "${bucket}")
            |> range(start: -${timeWindow})
            |> filter(fn: (r) => r._measurement == "${sensorType}")
            |> filter(fn: (r) => r["sensor_name"] == "${sensorName}")
            |> last()`;

        try{
            let o = await this.queryApi.collectRows(fluxQuery);     // return an array.
            //console.timeEnd("dbsave");
            return o[0] === undefined ? undefined : {time: o[0]._time, measurement: o[0]._measurement, sensor_name: o[0].sensor_name, unit: o[0]._field, value: o[0]._value.toFixed(2)};
        }
        catch(error){
            console.error(error)
            console.error(`ERROR - InfluxDBHandler.js: Last value from the sensor "${sensorName}" couldn't be retrieved.`)
        };
    }

    queryWindowData = async (bucket, sensorList, timeWindow) => {
        let querySensorNames = '';
        if(sensorList.length <= 0) return;
        if(sensorList.length === 1) querySensorNames = `r["sensor_name"] == "${sensorList[0]}"`;
        else if(sensorList.length > 1){
            querySensorNames = sensorList.reduce((prev, curr, index) => {
                if(index === 0) return prev;
                return prev + ' or r["sensor_name"] == ' + curr;
            }, 'r["sensor_name"] == ' + sensorList[0]);
        }

        const fluxQuery = `from(bucket: "${bucket}")
            |> range(start: -${timeWindow})
            |> filter(fn: (r) => r._measurement == "${sensorType}")
            |> filter(fn: (r) => "${querySensorNames}")`;

        try{
            let o = await this.queryApi.collectRows(fluxQuery);     // return an array.
            if(o === undefined) throw 'Query returned undefined.';
            
            let data = [];
            o.forEach((row, index) => {
                data[index] = {time: row._time, measurement: row._measurement, sensor_name: row.sensor_name, unit: row._field, value: row._value.toFixed(2)};
            });
            
            return o;
        }
        catch(error){
            console.error(`ERROR - InfluxDBHandler.js: ${error}.`)
        };
    }

    close = async (buckets) => {
        await Promise.all(buckets.map(async bucket => {
            await this.writeAPI[bucket].close();
            console.log(`INFO - InfluxDBHandler.js: InfluxDB ${bucket} bucket closed.`);
        }));
    }
}

module.exports = InfluxDBHandler;