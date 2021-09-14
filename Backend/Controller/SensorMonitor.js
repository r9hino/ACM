// Class for storing each sensor setup.
// Constructor inputs:
//      sensorRetriever is a function whose job is to retrieve the data from the sensor.
// Properties:
//      interval set a fixed time execution of the sensorRetrieve function.
class SensorMonitor {
    constructor(name, type, unit, sampleTime, samplesNumber, sensorRetriever){
        this.name = name;                           // Caudal bomba 1, Temperatura oficina
        this.type = type;                           // voltaje, temperatura, caudal
        this.unit = unit;                           // V, °C, m3/h
        this.sampleTime = sampleTime;               // Interval time for retrieving sensor values.
        this.samplesNumber = samplesNumber; 
        this.value = null;                          // Store last value from sensor.
        this.values = [];                           // Store last samplesNumber values from sensor.

        // Values from sensor are stored in arrays.
        this.sensorRetriever = async () => {
            this.value = await sensorRetriever();
            this.value = parseFloat(this.value, 10);
            // Add new value to the beginning of the array.
            this.values.unshift(this.value);

            // Remove last elements in array if number of elements exceed samplesNumber.
            if(this.values.length > this.samplesNumber){
                this.values.pop();
            }
        };
        this.interval = setInterval(this.sensorRetriever, sampleTime*1000);
    }

    changeIntervalTime(newSampleTime){
        clearInterval(this.interval);
        this.interval = setInterval(this.sensorRetriever, newSampleTime*1000);
    }

    average(){
        // If there aren't elements on the array, then do nothing.
        if(this.values.length == 0) return null;

        // First clean the array from undefined, null or "" values.
        let filteredValues = this.values.filter(function(x) {
            return x !== undefined && x !== null && x !== NaN && x !== "";
       });

       return filteredValues.reduce((a, b) => a + b) / filteredValues.length;
    }
}

module.exports = SensorMonitor;