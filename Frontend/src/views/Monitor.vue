<template>
    <Spinner v-if="loading"></Spinner>
    <div class="container-fluid d-flex flex-column justify-content-center">
        <!-- Title and time buttons -->
        <div class="d-flex justify-content-around align-items-center mt-3">
            <h5 class="mt-2">Sensores</h5>
            <div class="d-flex justify-content-between align-items-center">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex justify-content-between align-items-center me-3" type="button" data-bs-toggle="dropdown"
                    :id="`reloading-chart-time`" style="width: 110px">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
                        <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                        <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                    </svg>{{ reloadingChartTime === null ? 'Pausado' : reloadingChartTime + 's' }}
                </button>
                <ul class="dropdown-menu" :aria-labelledby="`reloading-chart-time`">
                    <li><a class="dropdown-item" href="#" @click.prevent="reloadingChartTime=null; setReloadingChartTime();">Pausado</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="reloadingChartTime=5; setReloadingChartTime();">5s</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="reloadingChartTime=10; setReloadingChartTime();">10s</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="reloadingChartTime=60; setReloadingChartTime();">60s</a></li>
                </ul>
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown"
                    :id="`time-windows`" style="width: 125px">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock me-2" viewBox="0 0 16 16">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>{{ timeWindow }}
                </button>
                <ul class="dropdown-menu" :aria-labelledby="`time-window`">
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`5 minutos`; getSensorData();">5 minutos</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`15 minutos`; getSensorData();">15 minutos</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`1 hora`; getSensorData();">1 hora</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`3 horas`; getSensorData();">3 horas</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`12 horas`; getSensorData();">12 horas</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`1 dia`; getSensorData();">1 dia</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`3 dias`; getSensorData();">3 dias</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`7 dias`; getSensorData();">7 dias</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`15 dias`; getSensorData();">15 dias</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`30 dias`; getSensorData();">30 dias</a></li>
                </ul>
            </div>
        </div>

        <!-- Chart -->
        <div>
            <Chart :sensorData="sensorData"></Chart>
        </div>

        <!-- Sensors available -->
        <div class="" style="width: 370px; margin: 0 auto">
            <CheckboxSensorAlert v-for="(sensor, index) in sensorsAvailable" :key="index"
                :sensor="sensor" :alert="alerts.find(alert => alert.sensor_name === sensor.sensor_name)"
                :checked="sensorsSelectedToChart.includes(sensor.sensor_name)"
                :stopAlertFunction="stopAlert" @emitCheckboxStatus="updateSensorsSelectedToChart">
            </CheckboxSensorAlert>
        </div>
    </div>
    <Footer ref="footerRef"></Footer>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

import Spinner from '../components/Spinner.vue';
import Chart from '../components/Chart.vue';
import CheckboxSensorAlert from '../components/CheckboxSensorAlert.vue';
import Footer from '../components/Footer.vue';

export default {
    name: 'Monitor',
    components: { Spinner, Chart, CheckboxSensorAlert, Footer },
    props: [],
    setup(){
        const store = useStore();
        const router = useRouter();

        let loading = ref(false);
        let timeWindow = ref('15 minutos');     // Time window used for the x-axis in chart.
        let reloadingChartTime = ref(null);     // Reloading time for updating chart.
        let realoadingChartInterval;            // Interval for reloading chart with new data.
        let alerts = ref([]);
        let sensorsAvailable = ref([]);         // Sensors installed in the system.
        let sensorsSelectedToChart = ref([]);   // Sensors selected on checkbox to be displayed on the chart.
        let sensorData = ref({});               // Sensor data points retrieved from Influx DB.
        let footerRef = ref();

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);
        const influxToken = computed(() => store.getters.getInfluxToken);

        // Return array with all alerts and an array with all sensors available on system.
        let getAlertsAndSensorsAvailable = async () => {
            loading.value = true;

            const response = await fetch(`http://rpi4id0.mooo.com:5000/api/getalertsandsensorsavailable`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
                credentials: 'include',
            });
            const responseJSON = await response.json();

            if(response.status == 200){
                alerts.value = responseJSON.alerts;
                sensorsAvailable.value = responseJSON.sensorsAvailable;
            }
            else if(response.status == 401 || response.status == 403){
                store.commit('setAuthenticated', false);
                await router.push({ path: "/login"});
                return;
            }
            else footerRef.value.setTemporalMessage(responseJSON.message, 5000); // Only if there is a warning or and error display footer message.
            loading.value = false;
        };

        // Convert CSV table returned from the Influx query to array of series fot highcharts standard.
        // , , time, field, value -> {name: sensorName, data: [[], [], ... []]}
        const csvParser = csvText => {
            const timeZone = (new Date()).getTimezoneOffset()*60000;
            let lines = csvText.split('\r\n');        // Create string array.

            const titles = lines.shift().split(',');  // Recover titles from first row.

            const sensorNameIndex = titles.findIndex(title => title === 'sensor_name');
            const timeIndex = titles.findIndex(title => title === '_time');
            const valueIndex = titles.findIndex(title => title === '_value');
            const unitIndex = titles.findIndex(title => title === '_field');

            //let start = Date.now();
            let sensorSeries = {};
            // Create array of array for each column.
            lines.forEach((line, index) => {
                line = line.split(',');
                let sensorName = line[sensorNameIndex];
                // Do not process a line when there is not sensor name.
                if(sensorName === undefined) return;
                // Push (x,y) values to array.
                if(sensorSeries[sensorName] !== undefined) sensorSeries[sensorName].push([Date.parse(line[timeIndex]) - timeZone, parseFloat(line[valueIndex])]);
                else sensorSeries[sensorName] = [[Date.parse(line[timeIndex]) - timeZone, parseFloat(line[valueIndex])]];
            });
            //let end = Date.now();
            //console.log('Milliseconds:', (end-start));

            // Set Highcharts series format [{name: xx, data: [[], [], ... []]}, {name: yy, data: [[], [], ... []]}].
            let series = [];
            for(const [key, value] of Object.entries(sensorSeries)) {
                series.push({name: key, data: value});
            }
            //console.log(series); 
            return series;
        }

        let getSensorData = async () => {
            let localTimeWindow = '15m';
            switch(timeWindow.value){
                case '5 minutos': localTimeWindow = '5m'; break;
                case '15 minutos': localTimeWindow = '15m'; break;
                case '1 hora': localTimeWindow = '1h'; break;
                case '3 horas': localTimeWindow = '3h'; break;
                case '12 horas': localTimeWindow = '12h'; break;
                case '1 dia': localTimeWindow = '1d'; break;
                case '3 dias': localTimeWindow = '3d'; break;
                case '7 dias': localTimeWindow = '7d'; break;
                case '15 dias': localTimeWindow = '15d'; break;
                case '30 dias': localTimeWindow = '30d'; break;
            }

            // Construction of the Influx DB query for sensor data.
            let querySensorNames = '';
            // If no sensor is selected, clean chart.
            if(sensorsSelectedToChart.value.length === 0){
                sensorData.value = [];
                return;   // No sensor selected.
            }
            if(sensorsSelectedToChart.value.length === 1) querySensorNames = `r["sensor_name"] == "${sensorsSelectedToChart.value[0]}"`;
            else if(sensorsSelectedToChart.value.length > 1){
                querySensorNames = sensorsSelectedToChart.value.reduce((prev, curr, index) => {
                    if(index === 0) return prev;
                    return prev + ` or r["sensor_name"] == "${curr}"`;
                }, `r["sensor_name"] == "${sensorsSelectedToChart.value[0]}"`);
            }

            // Define aggregate window time.
            // This will average the data for improving laoding time (less data is returned from server when aggregate time window is increased).
            let aggregateTimeWindow = '';
            if(localTimeWindow === '3d') aggregateTimeWindow = `|> aggregateWindow(every: 30s, fn: mean, createEmpty: false)`;
            else if(localTimeWindow === '7d') aggregateTimeWindow = `|> aggregateWindow(every: 1m, fn: mean, createEmpty: false)`;
            else if(localTimeWindow === '15d') aggregateTimeWindow = `|> aggregateWindow(every: 3m, fn: mean, createEmpty: false)`;
            else if(localTimeWindow === '30d') aggregateTimeWindow = `|> aggregateWindow(every: 5m, fn: mean, createEmpty: false)`;

            const fluxQuery = `from(bucket: "rpi-sensors")
                |> range(start: -${localTimeWindow})
                |> filter(fn: (r) => ${querySensorNames})
                ${aggregateTimeWindow}
                |> drop(columns:["_start", "_stop", "host"])`;

            const response = await fetch(`http://rpi4id0.mooo.com:8086/api/v2/query?org=SET`, {
                method: "POST",
                headers: {
                    "Authorization": `Token ${influxToken.value}`, "Content-Type": "application/vnd.flux",
                    "Accept-Encoding": "gzip, deflate, br", "Accept": "application/text"
                },
                body: fluxQuery
            });
            const responseText = await response.text();

            if(response.status == 200) sensorData.value = csvParser(responseText);
            else footerRef.value.setTemporalMessage(responseText.message, 5000);  // Only if there is a warning or and error display footer message.
        };

        // Update selected sensor list that will be displayed on the chart.
        let updateSensorsSelectedToChart = (checkboxStatus) => {
            let indexSensorSelected = sensorsSelectedToChart.value.findIndex(sensorSelected => sensorSelected === checkboxStatus.sensor_name);
            // Add sensor to list.
            if(indexSensorSelected < 0 && checkboxStatus.value === true) sensorsSelectedToChart.value.push(checkboxStatus.sensor_name);
            // Remove sensor from list.
            else if(indexSensorSelected >= 0 && checkboxStatus.value === false) sensorsSelectedToChart.value.splice(indexSensorSelected, 1);
            //console.log(sensorsSelectedToChart.value);
            localStorage.setItem("sensorsSelectedToChart", sensorsSelectedToChart.value);
            getSensorData();
        };

        // Send a request to server updating alert state to 'off'.
        let stopAlert = async (id) => {
            loading.value = true;
            const alertIndex = alerts.value.findIndex(alert => alert.id === id);
            alerts.value[alertIndex].state = 'off';
            alerts.value[alertIndex].notified_users = [];
            alerts.value[alertIndex].alert_message = [];

            const response = await fetch("http://rpi4id0.mooo.com:5000/api/updatealert", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                credentials: 'include',
                body: JSON.stringify({ alertUpdate: alerts.value[alertIndex], index: alertIndex})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){

            }
            else if(response.status == 401 || response.status == 403){
                store.commit('setAuthenticated', false);
                await router.push({ path: "/login"});
                return;
            }
            footerRef.value.setTemporalMessage(responseJSON.message, 5000);
            loading.value = false;
        };

        // Set interval time at which chart is updated.
        let setReloadingChartTime = () => {
            clearInterval(realoadingChartInterval);
            getSensorData();
            if(reloadingChartTime.value !== null) realoadingChartInterval = setInterval(getSensorData, reloadingChartTime.value*1000);
        };

        onBeforeMount(() => {
            // Load stored data from browser.
            if(localStorage.getItem("sensorsSelectedToChart") !== null) sensorsSelectedToChart.value = localStorage.getItem("sensorsSelectedToChart").split(',');
            
            setReloadingChartTime(reloadingChartTime.value);
            getAlertsAndSensorsAvailable();
        });

        onBeforeUnmount(() => {
            clearInterval(realoadingChartInterval);
            sensorData.value = [];
        });
        
        return{
            user,
            isAuthenticated,
            loading,
            timeWindow,
            reloadingChartTime,
            alerts,
            sensorsAvailable,
            sensorData,
            stopAlert,
            getSensorData,
            setReloadingChartTime,
            sensorsSelectedToChart,
            updateSensorsSelectedToChart,
            footerRef,
        }
    }
}
</script>

<style scoped>

</style>