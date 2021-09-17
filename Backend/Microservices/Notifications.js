const env = require('../Helper/envExport.js');   // Environment variables.

const fs = require('fs');
const {hostname} = require('os');
const JSONdb = require('simple-json-db');
const client = require('twilio')(env.TWILIO_ACCOUNT_SID, env.TWILIO_TOKEN);
const MongoDBHandler = require('../DB/MongoDBHandler');

// Objects initialization.
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';
let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
const remoteMongoDB = new MongoDBHandler(env.MONGODB_REMOTE_URL);

// Global variables intitalization.
let delayStateUpdateInterval;
let guardUsers = deviceMetadataDB.get('guard_users');
let alerts = deviceMetadataDB.get('alerts');

//let date = new Date();
//console.log(date.toTimeString(), date.getHours(), date.getMinutes(), date.getSeconds());

// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(() => {
            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
            guardUsers = deviceMetadataDB.get('guard_users');
            alerts = deviceMetadataDB.get('alerts');
        }, 1000);
    }
});

let notificationInterval = setInterval(async () => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert, index) => {
        if(alert.state === 'on' && alert.notified !== true){
            // Notify guard users through Whatsapp.
            try{
                const phones = guardUsers.map(guardUser => guardUser.phone);
                const succeeded = await wspNotificationAlert(alert.alert_message, phones);
                //console.log('succeed', succeeded);

                const dateUpdate = new Date().toString();
                alert.notified = true;
                alert.date_update = dateUpdate;

                // Store alert.notified in local DB.
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
                    console.error('ERROR - Notifications.js:', error);
                    console.log('WARNING - Notifications.js: Notified property in alert stored only in local DB.');
                }
            }
            catch(error){
                console.error(error);
                console.log('WARNING - Notifications.js: There was problems with Twilio for notifying users.');
            }

            // Schedule notifications for active alerts.
            //let task = cron.schedule('*/10 * * * * *', () =>  {
            //    console.log('Task executed each 10 seconds.');
            //});
        }
    });
}, 10*1000);

// Send notifications with Twilio via whatsapp to all phone numbers registered as guard users.
const wspNotificationAlert = async (alertMessage, phones) => {
    // How to avoid sending a bulk of message if Twilio client continously keep getting errors?
    const resultPromises = await Promise.allSettled(phones.map(async (phone) => {
        return await client.messages.create({body: alertMessage, from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`});
    }));
    //resultPromises.map((e) => console.log(e));
    //resultPromises.map((e) => console.log(e.value));
    const atLeatOneFullfilled = resultPromises.some((result) => result.status === 'fulfilled');

    // If at least one person is notified, then is considered a succeeded.
    // This is to avoid keeping sending whatsapps if only one user get error.
    if(atLeatOneFullfilled) return Promise.resolve();

    return Promise.reject(resultPromises[0]);
}