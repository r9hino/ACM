const accountSid = 'AC21024cdd87e9e65f08dff7c833717361'; 
const authToken = 'b53c593398c935c5687dc289265e73fa'; 
const client = require('twilio')(accountSid, authToken);

// Objects initialization.
const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';
let deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);

// Global variables intitalization.
let delayStateUpdateInterval;
let guardUsers = deviceMetadataDB.get('guard_users');
let alerts = deviceMetadataDB.get('alerts');


// Watch for changes in local DB (json file).
// If a change was made to the file, deviceMetadaDB instance is updated.
fs.watch(pathDeviceMetadataDB, (event, filename) => {
    if(filename){
        clearTimeout(delayStateUpdateInterval);

        delayStateUpdateInterval = setTimeout(() => {
            console.log(`INFO - Notifications.js: Instance of deviceMetadataDB has been updated.`);

            // Update alarms and sensors if local dB is changed or updated.
            deviceMetadataDB = new JSONdb(pathDeviceMetadataDB);
            guardUsers = deviceMetadataDB.get('guard_users');
            alerts = deviceMetadataDB.get('alerts');

            // If an alert was removed from the local DB, delete corresponding firstAlertTriggerTime key.
            for(const prop in firstAlertTriggerTime){
                // Search for the index of the properties on the alerts array.
                let index = alerts.findIndex(alert => alert.sensor_name == prop);
                // If prop (sensor name) is not found, remove property from firstAlertTriggerTime.
                if(index < 0) delete firstAlertTriggerTime[prop];
            }
        }, 1000);
    }
});


client.messages 
      .create({ 
         body: 'This is Philippe Botttttt.', 
         from: 'whatsapp:+14155238886',       
         to: 'whatsapp:+56999972023' 
       }) 
      .then(message => console.log(message.sid)) 
      .done();