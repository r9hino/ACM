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
let delayStateUpdateInterval, alertScheduler = [], notifiedPropsUpdated = false;//md5Previous = null;


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(async () => {
            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            guardUsers = deviceMetadataDB.get('guard_users');
            alerts = deviceMetadataDB.get('alerts');

            // Clean alertScheduler if it alert has been deleted from local DB.
            for(const prop in alertScheduler){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == prop);
                // If prop (sensor name) is not found, stop and remove property from alertScheduler.
                if(index < 0){
                    alertScheduler[prop].stop();
                    delete alertScheduler[prop];
                    console.log(`INFO - Notifications.js: Scheduler for "${prop}" was stopped and deleted.`);
                }
            }

            // If there are not guard users, put alert.notified property to false and stop all alert schedules.
            if(guardUsers.length === 0 && notifiedPropsUpdated === false){
                let dateUpdate;
                notifiedPropsUpdated = true;
                // Iterate over array of alerts and set alert.notified to false.
                alerts.forEach(async (alert) => {
                    // This will allow to notify guard users when added.
                    if(alert.notified === true){
                        dateUpdate = new Date().toString();
                        alert.notified = false;
                        alert.date_update = dateUpdate;
                    }
                });
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
                    console.log('WARNING - Notifications.js: alert.notified = false was stored only in local DB.');
                }

                // Stop all scheduled alerts, when there are not guard users to notify.
                for(const prop in alertScheduler){
                    alertScheduler[prop].stop();
                    delete alertScheduler[prop];
                }
            }
            if(guardUsers.length > 0 && notifiedPropsUpdated === true) notifiedPropsUpdated = false;
        }, 1000);
    }
});

let notificationInterval = setInterval(async () => {
    // Execute only if there are guard users defined.
    if(guardUsers.length > 0){
        const phones = guardUsers.map(guardUser => guardUser.phone);
        // Iterate over array of alerts.
        alerts.forEach(async (alert, index) => {
            if(alert.state === 'on' && alert.notified !== true){
                // Immediately notify guard users through Whatsapp.
                try{
                    await wspNotificationAlert(alert.alert_message, phones);

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
                        console.log('WARNING - Notifications.js: alert.notified = true stored only in local DB.');
                    }
                }
                catch(error){
                    console.log('WARNING - Notifications.js: There was problems with Twilio, none of the guard users were notified.');
                }
            }
            // Schedule notifications for active alerts.
            if(alert.state === 'on' && alertScheduler[alert.sensor_name] === undefined){
                alertScheduler[alert.sensor_name] = cron.schedule('*/10 * * * * *', async () =>  {
                    //console.log('Task executed each 10 seconds.');
                    try{
                        await wspNotificationAlert(alert.alert_message, phones);
                    }
                    catch(error){
                        console.log('WARNING - Notifications.js: There was problems with Twilio, none of the guard users were notified with the scheduler.');
                    }
                });
                console.log(`INFO - Notifications.js: Added scheduler for "${alert.sensor_name}".`);
            }
        });     // forEach alert in alertsarray.
    }           // if for number of guard users.
}, 10*1000);    // setInterval


// settling time after settling time

// Send notifications with Twilio via whatsapp to all phone numbers registered as guard users.
const wspNotificationAlert = async (alertMessage, phones) => {
    const resultPromises = await Promise.allSettled(phones.map(async (phone) => {
        try{
            //await client.messages.create({body: alertMessage, from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`});
            console.log(`INFO - Notifications.js: Phone ${phone} was notified about the alert.`);
            return Promise.resolve();
        }
        catch(error){
            console.error(error);
            console.log(`WARNING - Notifications.js: Phone ${phone} was not notified about the alert.`);
            return Promise.reject();
        }
    }));
    //resultPromises.map((e) => console.log(e));
    const atLeatOneFullfilled = resultPromises.some(result => result.status === 'fulfilled');

    // If at least one person is notified, then is considered a succeeded.
    // This is to avoid keeping sending whatsapps if only one user get error.
    if(atLeatOneFullfilled) return Promise.resolve();

    return Promise.reject('None of the guard users were notified');
}