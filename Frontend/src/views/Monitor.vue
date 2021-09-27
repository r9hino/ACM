<template>
  <Spinner v-if="loading"></Spinner>
  <div class="container-fluid d-flex flex-column justify-content-center">
    <div class="d-flex justify-content-around align-items-center mt-3">
      <h5 class="mt-2">Sensores</h5>
      <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown"
        :id="`time-windows`" style="width: 125px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock me-2" viewBox="0 0 16 16">
          <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
        </svg>{{ timeWindow }}
      </button>
      <ul class="dropdown-menu" :aria-labelledby="`time-window`">
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`5 minutos`">5 minutos</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`15 minutos`">15 minutos</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`1 hora`">1 hora</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`3 horas`">3 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`6 horas`">6 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`12 horas`">12 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`1 dia`">1 dia</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`2 dias`">2 dias</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`7 dias`">7 dias</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindow=`30 dias`">30 dias</a></li>
      </ul>
    </div>
    <!-- Graficos -->
    <div>
      <Chart :sensorData="sensorData"></Chart>
    </div>
    <div class="" style="width: 370px; margin: 0 auto">
      <CheckboxSensorAlert v-for="(sensor, index) in sensorsAvailable" :key="index"
        :sensor="sensor" :alert="alerts.find(alert => alert.sensor_name === sensor.sensor_name)"
        :stopAlertFunction="stopAlert" @emitCheckboxStatus="updateSensorsSelectedToChart">
      </CheckboxSensorAlert>
    </div>
  </div>
  <Footer ref="footerRef"></Footer>
</template>

<script>
import { useStore } from 'vuex';
import { ref, watch, computed, onBeforeMount, onBeforeUnmount } from 'vue';

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
        let loading = ref(false);
        let timeWindow = ref('15 minutos');
        let footerRef = ref();
        let alerts = ref([]);
        let sensorsAvailable = ref([]);         // Sensors installed in the system.
        let sensorsSelectedToChart = ref([]);   // Sensors selected on checkbox to be displayed on the chart.
        let sensorData = ref([]);               // Sensor data points retrieved from Influx DB.

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);
        const token = computed(() => store.getters.getToken);

        let getAlertsAndSensorsAvailable = async () => {
            loading.value = true;
            const response = await fetch(`http://rpi4id0.mooo.com:5000/api/getalertsandsensorsavailable`, {
                method: "GET",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
            });
            const responseJSON = await response.json();

            if(response.status == 200){
                // Return array of all alerts and sensors available on system.
                alerts.value = responseJSON.alerts;
                sensorsAvailable.value = responseJSON.sensorsAvailable;
            }
            else{
                // Only if there is a warning or and error display footer message.
                footerRef.value.setTemporalMessage(responseJSON.message, 5000);
            }
            loading.value = false;
        };

        // Update selected sensor list that will be displayed on the chart.
        let updateSensorsSelectedToChart = (checkboxStatus) => {
            let indexSensorSelected = sensorsSelectedToChart.value.findIndex(sensorSelected => sensorSelected === checkboxStatus.sensor_name);
            // Add sensor to list.
            if(indexSensorSelected < 0 && checkboxStatus.value === true){
                sensorsSelectedToChart.value.push(checkboxStatus.sensor_name);
            }
            // Remove sensor from list.
            else if(indexSensorSelected >= 0 && checkboxStatus.value === false){
                sensorsSelectedToChart.value.splice(indexSensorSelected, 1);
            }
            console.log(sensorsSelectedToChart.value);
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
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({
                    alertUpdate: alerts.value[alertIndex],
                    index: alertIndex,
                })
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){

            }
            footerRef.value.setTemporalMessage(responseJSON.message, 5000);
            loading.value = false;
        };

        onBeforeMount(() => {
            getAlertsAndSensorsAvailable();
        });
        
        return{
            user,
            isAuthenticated,
            loading,
            footerRef,
            timeWindow,
            alerts,
            sensorsAvailable,
            sensorData,
            stopAlert,
            updateSensorsSelectedToChart,
        }
    }
}
</script>

<style scoped>
  .btn:disabled{
    opacity: 0.45 !important;
  }
</style>