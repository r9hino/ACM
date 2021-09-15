require('dotenv').config({ path: __dirname + `/.env` });

module.exports = {
    MONGODB_REMOTE_URL: process.env.MONGODB_REMOTE_URL,
    INFLUXDB_LOCAL_URL: process.env.INFLUXDB_LOCAL_URL,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN,
    INFLUXDB_PORT: process.env.INFLUXDB_PORT,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG,
    INFLUXDB_SENSORS_BUCKET: process.env.INFLUXDB_SENSORS_BUCKET,
    INFLUXDB_SYSTEM_BUCKET: process.env.INFLUXDB_SYSTEM_BUCKET,
    SOCKETIO_PORT: process.env.SOCKETIO_PORT,
    WEB_USERNAME: process.env.WEB_USERNAME,
    WEB_PASSWORD: process.env.WEB_PASSWORD,
    WEB_JWT_SECRET: process.env.WEB_JWT_SECRET,
};