const env = require('../Helper/envExport.js');   // Environment variables.

const fs = require('fs');
const {hostname} = require('os');
var cron = require('node-cron');
const JSONdb = require('simple-json-db');
const client = require('twilio')(env.TWILIO_ACCOUNT_SID, env.TWILIO_TOKEN);//TWILIO_TOKEN
const MongoDBHandler = require('../DB/MongoDBHandler');

// Objects initialization.
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';
let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
const remoteMongoDB = new MongoDBHandler(env.MONGODB_REMOTE_URL);

// Global variables intitalization.
let guardUsers = deviceMetadataDB.get('guard_users');
let alerts = deviceMetadataDB.get('alerts');
let delayStateUpdateInterval, alertScheduler = [], semaforeNotifiedProps = true;//md5Previous = null;


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(async () => {
            let previousGuardUsers = guardUsers;
            // Update alarms and guardUsers if local DB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            guardUsers = deviceMetadataDB.get('guard_users');
            alerts = deviceMetadataDB.get('alerts');

            // If a guard user was removed from the local DB, deactivate its scheduler.
            previousGuardUsers.forEach(previousGuardUser => {
                // Search for the index in guardUsers.
                let index = guardUsers.findIndex(guardUser => guardUser.email == previousGuardUser.email);

                // If previous guard user is not found, remove its scheduler.
                if(index < 0){
                    for(const prop in alertScheduler){
                        if(alertScheduler[prop][previousGuardUser.email] !== undefined){
                            alertScheduler[prop][previousGuardUser.email].stop();
                            delete alertScheduler[prop][previousGuardUser.email];
                            console.log(`INFO - Notifications.js: Scheduler for user ${previousGuardUser.email} was stopped and deleted - "${prop}".`);
                        }
                    }
                }
            });

            // If alert on local DB was updated, clean alertScheduler.
            alerts.forEach(alert => {
                if(alertScheduler[alert.sensor_name] !== undefined && alert.state === 'off'){
                    for(const guardUser in alertScheduler[alert.sensor_name]){
                        alertScheduler[alert.sensor_name][guardUser].stop();
                        delete alertScheduler[alert.sensor_name][guardUser];
                        console.log(`INFO - Notifications.js: Scheduler for "${alert.sensor_name}" was stopped and deleted.`);
                    }
                }
            });

            // If alert on local DB was deleted, clean alertScheduler.
            for(const prop in alertScheduler){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == prop);
                // If prop (sensor name) is not found, stop and remove property from alertScheduler.
                if(index < 0){
                    for(const guardUser in alertScheduler[prop]){
                        alertScheduler[prop][guardUser].stop();
                        delete alertScheduler[prop][guardUser];
                        console.log(`INFO - Notifications.js: Scheduler for "${prop}" was stopped and deleted.`);
                    }
                }
            }
        }, 1000);
    }
});

let notificationInterval = setInterval(async () => {
    // Iterate over array of alerts.
    alerts.forEach(async (alert) => {
        // Execute only if there are guard users defined to send notifications.
        guardUsers.forEach(async (guardUser, index) => {
            if(alert.state === 'on' && guardUser.notified !== true){
                // Immediately notify guard users through Whatsapp.
                try{
                    await wspNotificationAlert('Immediate - '+alert.alert_message, guardUser.phone);
                    let dateUpdate = new Date().toString();
                    guardUser.notified = true;
                    guardUser.date_update = dateUpdate;

                    storeOnAllDB({guard_users: guardUsers, date_update: dateUpdate});
                }
                catch(error){
                    console.log(`WARNING - Notifications.js: There was problems with Twilio, guard user ${guardUser.email} couldn't be notified.`);
                }
            }
            // Schedule notifications for active alerts and for each guard user.
            if(alert.state === 'on'){
                if(alertScheduler[alert.sensor_name] === undefined) alertScheduler[alert.sensor_name] = {};
                if(alertScheduler[alert.sensor_name][guardUser.email] === undefined){
                    alertScheduler[alert.sensor_name][guardUser.email] = cron.schedule('*/10 * * * * *', async () =>  {
                        //console.log('Task executed each 10 seconds.');
                        try{
                            await wspNotificationAlert('Scheduler - '+alert.alert_message, guardUser.phone);
                        }
                        catch(error){
                            console.log('WARNING - Notifications.js: There was problems with Twilio, none of the guard users were notified with the scheduler.');
                        }
                    });
                    console.log(`INFO - Notifications.js: Added a notification scheduler for ${guardUser.email} - "${alert.sensor_name}".`);
                }
            }
        });     // forEach alert in alertsarray.
    });
}, 10*1000);    // setInterval


// Send notifications with Twilio via whatsapp to all phone numbers registered as guard users.
const wspNotificationAlert = async (alertMessage, phone) => {
    try{
        //await client.messages.create({body: alertMessage, from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`});
        console.log(`INFO - Notifications.js: WSP Phone ${phone} was notified about the alert. ${alertMessage}`);
        return Promise.resolve();
    }
    catch(error){
        console.error(error);
        console.log(`WARNING - Notifications.js: WSP Phone ${phone} was not notified about the alert.`);
        return Promise.reject();
    }
}

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
        console.error('ERROR - Notifications.js:', error);
        console.log('WARNING - Notifications.js: Data was stored only in local DB.');
    }
}