const {MongoClient} = require('mongodb');

class MongoDBHandler {
    constructor(url){
        this.dbClient = null; //await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.url = url;
        this.connected = false;
    }

    connectDB = async () => {
        // If it is not connected, proceed to create a new connection.
        try{
            this.dbClient = await MongoClient.connect(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
            this.connected = true;
            //console.log('INFO - MongoDBHandler.js: Connected to remote MongoDB.');
        }
        catch(err){
            this.connected = false;
            console.error('ERROR - MongoDBHandler.js:', err);
            throw err;
        }
    }

    isConnected = () => {
        return this.connected;
    }

    // Get device metadata store remotely.
    getDeviceMetadata = async (hostname) => {
        try{
            const cursor = await this.dbClient.db('iot').collection('iot_manager').find({hostname: hostname}).toArray();
            return cursor[0];
        }
        catch(err){
            console.error('ERROR - MongoDBHandler.js:', err);
            throw err;
        }
    }

    // Update device values.
    updateDevice = async (hostname, newValues) => {
        try{
            const id = await this.dbClient.db('iot').collection('iot_manager')
                .updateOne({hostname: hostname}, {$set: newValues});
            return id;
        }
        catch(err){
            console.error('ERROR - MongoDBHandler.js:', err);
            throw err;
        }
    }

    // Update device relay values.   https://docs.mongodb.com/manual/reference/method/db.collection.update/
    updateRelayState = async (hostname, idRelay, state, triggerType, dateUpdate) => {
        try{
            const id = await this.dbClient.db('iot').collection('iot_manager')
                .updateOne({hostname: hostname, 'relays.id': idRelay}, {
                    $set: {
                        date_update: dateUpdate,
                        'relays.$.state': state,
                        'relays.$.trigger_type': triggerType,
                        'relays.$.date_update': dateUpdate,
                    }});
            return id;
        }
        catch(err){
            console.error('ERROR - MongoDBHandler.js:', err);
            throw err;
        }
    }

    close = async () => {
        try{
            await this.dbClient.close();
            this.connected = false;
        }
        catch(err){
            console.error('ERROR - MongoDBHandler.js:', err);
        }
    }
}

module.exports = MongoDBHandler;
