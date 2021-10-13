const env = require('../Helper/envExport.js');   // Environment variables.

const fs = require('fs');
const {hostname} = require('os');
const cron = require('node-cron');
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
let delayStateUpdateInterval, alertScheduler = [];


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(async () => {
            // Update alarms and guardUsers if local DB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            guardUsers = deviceMetadataDB.get('guard_users');
            alerts = deviceMetadataDB.get('alerts');

            // Clean alert schedulers.
            alerts.forEach(alert => {
                // If an alert on local DB was updated to state 'off', clean alertScheduler.
                if(alertScheduler[alert.sensor_name + ' - id' + alert.id] !== undefined && alert.state === 'off'){
                    alertScheduler[alert.sensor_name + ' - id' + alert.id].stop();
                    delete alertScheduler[alert.sensor_name + ' - id' + alert.id];
                    console.log(`INFO - notifications.js: Scheduler for "${alert.sensor_name} - id${alert.id}" was deleted.`);
                }
                // If there are no guard users, clean all alert schedulers.
                if(alertScheduler[alert.sensor_name + ' - id' + alert.id] !== undefined && alert.state === 'on' && guardUsers.length === 0){
                    alertScheduler[alert.sensor_name + ' - id' + alert.id].stop();
                    delete alertScheduler[alert.sensor_name + ' - id' + alert.id];
                    console.log(`INFO - notifications.js: No guard users, scheduler for "${alert.sensor_name} - id${alert.id}" was deleted.`);
                }
            });

            // If alert on local DB was deleted, clean alertScheduler.
            for(const prop in alertScheduler){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name + ' - id' + alert.id == prop);
                // If prop (sensor name) is not found, stop and remove property from alertScheduler.
                if(index < 0){
                    alertScheduler[prop].stop();
                    delete alertScheduler[prop];
                    console.log(`INFO - notifications.js: Scheduler for "${prop}" was deleted as there are not alert associated to it.`);
                }
            }
        }, 100);
    }
});

let notificationInterval = setInterval(() => {
    // Iterate over alerts array.
    alerts.forEach((alert) => {
        // Get all non existing guard users stored in alert.notified_users.
        let nonExistingGuardUsers = alert.notified_users.filter(x => guardUsers.map(guardUser => guardUser.email).indexOf(x)===-1);
        if(nonExistingGuardUsers.length > 0){
            // Remove non existing guard users from alert.notified_users.
            alert.notified_users = alert.notified_users.filter(x => !nonExistingGuardUsers.includes(x));
            alert.date_update = new Date().toString();

            storeOnAllDB({alerts: alerts, date_update: alert.date_update});
            console.log(`INFO - notifications.js: Non existing notified users [${nonExistingGuardUsers}] were removed from "${alert.sensor_name} - id${alert.id}".`);
        }
        // Clean alert.notified_users if alert changed its state to 'off'.
        // Will not enter here ff alert was updated from web UI, as alert.notified_users is empty when updated from UI.
        if(alert.notified_users.length > 0 && alert.state === 'off'){
            alert.notified_users = [];
            alert.date_update = new Date().toString();

            storeOnAllDB({alerts: alerts, date_update: alert.date_update});
            console.log(`INFO - notifications.js: All notified users were removed from "${alert.sensor_name} - id${alert.id}".`);
        }

        // Notify immediately each guard user.
        guardUsers.forEach(async (guardUser, index) => {
            if(alert.notified_users === undefined) alert.notified_users = [];
            if(alert.state === 'on' && alert.notified_users.find(email => email === guardUser.email) === undefined){
                // Immediately notify guard users through Whatsapp.
                try{
                    await wspNotificationAlert(alert.alert_message, guardUser.phone);
                    console.log(`INFO - notifications.js: Immediate notification for user ${guardUser.email} - ${guardUser.phone} about alert "${alert.sensor_name} - id${alert.id}".`);
                    let dateUpdate = new Date().toString();
                    alert.notified_users.push(guardUser.email);
                    alert.date_update = dateUpdate;
                    guardUser.date_update = dateUpdate;
                    storeOnAllDB({guard_users: guardUsers, alerts: alerts, date_update: dateUpdate});
                }
                catch(error){
                    console.error(error);
                    console.log(`WARNING - notifications.js: Problems with Twilio, no immediate notification for user ${guardUser.email} - ${guardUser.phone} about alert "${alert.sensor_name} - id${alert.id}".`);
                }
            }
        });

        // Schedule notifications for active alerts and for each guard user.
        if(alert.state === 'on' && guardUsers.length > 0){
            if(alertScheduler[alert.sensor_name + ' - id' + alert.id] === undefined){
                // An example name for the schedulers will be: "Temperatura bomba - 2".
                alertScheduler[alert.sensor_name + ' - id' + alert.id] = cron.schedule('0 44 17 * * *', async () =>  {
                    // Notify each user, even when list of guard is changed.
                    guardUsers.forEach(async (guardUser, index) => {
                        try{
                            await wspNotificationAlert(alert.alert_message, guardUser.phone);
                            console.log(`INFO - notifications.js: Scheduled notification for user ${guardUser.email} - ${guardUser.phone} about alert "${alert.sensor_name} - id${alert.id}".`);
                        }
                        catch(error){
                            console.log(`WARNING - notifications.js: Problems with Twilio, no scheduled notification for user ${guardUser.email} - ${guardUser.phone} about alert "${alert.sensor_name} - id${alert.id}".`);
                        }
                    });
                });
                console.log(`INFO - notifications.js: Added notification scheduler for "${alert.sensor_name} - id${alert.id}".`);
            }
        }
    });
}, 10*1000);    // setInterval


// Send notifications with Twilio via whatsapp to all phone numbers registered as guard users.
const wspNotificationAlert = async (alertMessage, phone) => {
    try{
        await client.messages.create({body: alertMessage, from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`});
        return Promise.resolve();
    }
    catch(error){
        return Promise.reject(error);
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
        console.error('ERROR - notifications.js:', error);
        console.log('WARNING - notifications.js: Data was stored only in local DB.');
    }
}

async function shutdownMicroservice(){
    console.log('INFO - notifications.js: Shuting down notifications.js microservice...');
    clearInterval(notificationInterval);
    clearInterval(delayStateUpdateInterval);

    try {
        if(remoteMongoDB.isConnected() === true) await remoteMongoDB.close();
        process.exit(0);
    }
    catch(error){
        console.error('ERROR: ', error);
        process.exit(0);
    }
}

process.on('SIGTERM', shutdownMicroservice);
process.on('SIGINT', shutdownMicroservice);
process.on('STOP', shutdownMicroservice);