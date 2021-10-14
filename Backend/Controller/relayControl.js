const cron = require('node-cron');
const JSONdb = require('simple-json-db');

const pathDeviceMetadataDB = __dirname + '/../deviceMetadataDB.json';

// Class for storing each relay state.
class RelayControl {
    constructor(id, description, state, schedule, io, relayController){
        this.id = id;
        this.description = description;             // Rele valvula, luz oficina, motor 1.
        this.state = state;                         // Store relay state.
        this.relayScheduler = [];                   // Store on/off cron jobs for each day.

        // Store relay controller.
        this.relayController = relayController;
        this.setAllRelayCronJobs(schedule, io);
    }

    // Set relay cron job to on or off.
    // relay.schedule => [{weekDay": "lunes", "weekDayNumber": 1, "dayLetter": "L", "checked": true, "on": "12:15", "off": "12:17"}, {} ... {}]
    setCronJob(time, weekDay, weekDayNumber, onOrOff, io){
        let hours = time.split(":")[0];
        let minutes = time.split(":")[1];
        let state = onOrOff === 'on' ? true : false;
        //console.log("onOrOff", onOrOff, hours, minutes, state);

        this.relayScheduler[onOrOff + '-' + weekDay] = cron.schedule(`0 ${minutes} ${hours} * * ${weekDayNumber}`, async () =>  {
            const deviceMetadataDB = new JSONdb(pathDeviceMetadataDB, {syncOnWrite: false});
            let relays = deviceMetadataDB.get('relays');
            let indexRelay = relays.findIndex(relay => relay.id === this.id);
            relays[indexRelay].state = state;
            deviceMetadataDB.set('relays', relays);
            deviceMetadataDB.sync();

            console.log(`INFO - relayControl.js: Relay "${this.description}" was turned ${onOrOff}.`);
            io.emit('updateClients', relays[indexRelay]);
        });
    }

    // Delete cron job. Example: deleteCronJob('on', 'domingo').
    deleteCronJob(onOrOff, weekDay){
        // Check if cron job exist first.
        if(this.relayScheduler[onOrOff + '-' + weekDay] !== undefined){
            this.relayScheduler[onOrOff + '-' + weekDay].stop();
            delete this.relayScheduler[onOrOff + '-' + weekDay];
        }
    }

    // Set/Unset all cron jobs of this relay.
    // relay.schedule => [{weekDay": "lunes", "weekDayNumber": 1, "dayLetter": "L", "checked": true, "on": "12:15", "off": "12:17"}, {} ... {}]
    setAllRelayCronJobs(schedule, io){
        // Iterate over days in schedule.
        for(let day of schedule){
            if(day.checked === true){
                //console.log(`${day.weekDay} - ${day.on} - ${day.off}`);
                if(day.on !== '' && day.on !== null && day.on !== undefined){
                    // Delete any 'on' cron job previously defined on that day.
                    this.deleteCronJob('on', day.weekDay);
                    this.setCronJob(day.on, day.weekDay, day.weekDayNumber, 'on', io);
                }
                if(day.off !== '' && day.off !== null && day.off !== undefined){
                    // Delete any 'off' cron job previously defined on that day.
                    this.deleteCronJob('off', day.weekDay);
                    this.setCronJob(day.off, day.weekDay, day.weekDayNumber, 'off', io);
                }
            }
            else{
                this.deleteCronJob('on', day.weekDay);
                this.deleteCronJob('off', day.weekDay);
            }
        }
    }

}

module.exports = RelayControl;