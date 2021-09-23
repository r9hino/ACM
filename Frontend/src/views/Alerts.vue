<template>
    <Spinner v-if="loading"></Spinner>
    <div class="container-fluid">
        <div class="mt-3 mb-1">
            <h3>Definicion de Alertas</h3>
        </div>
        <!--UI for editing and deleting alerts already defined.-->
        <InputAlertGroup v-for="(alert, index) in alerts" :key="index" 
            :alert="alert" :indexAlert="index" :sensorsAvailable="sensorsAvailable"
            :endFunction="removeAlert" textEndFunction="Borrar" colorEndFunction="btn-danger" :updateFunction="updateAlert">
        </InputAlertGroup>

        <hr v-if="sensorsAvailable.length !== 0">

        <!--UI for adding alerts.-->
        <InputAlertGroup v-if="sensorsAvailable.length !== 0"
            :alert="newAlert" :indexAlert="alerts.length" :sensorsAvailable="sensorsAvailable"
            :endFunction="addAlert" textEndFunction="Agregar" colorEndFunction="btn-secondary">
        </InputAlertGroup>
    </div>
    <Footer ref="footerRef"></Footer>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount} from 'vue';
import Spinner from '../components/Spinner.vue';
import InputAlertGroup from '../components/InputAlertGroup.vue';
import Footer from '../components/Footer.vue';

export default {
    name: 'Alerts',
    components: { Spinner, InputAlertGroup, Footer },
    setup(){
        const store = useStore();
        let loading = ref(false);
        let footerRef = ref();
        let alerts = ref([]);
        let sensorsAvailable = ref([]);
        let newAlert = ref({sensor_name: 'Sensor', criteria: 'Criterio', value: undefined, value_aux: undefined,
            unit: 'unidad', settling_time: null, state: 'off', notified_users: [], alert_message: []});

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);
        const token = computed(() => store.getters.getToken);

        let getAlertsAndSensorsAvailable = async () => {
            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/getalertsandsensorsavailable", {
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
        }

        let validateAlert = (alert) => {
            // Validate that all input fields are correct.
            if(alert.sensor_name === 'Sensor'){
                footerRef.value.setTemporalMessage('ERROR: Sensor no asignado.', 5000);
                return false;
            }
            if(alert.criteria === 'Criterio'){
                footerRef.value.setTemporalMessage('ERROR: Criterio no asignado.', 5000);
                return false;
            }
            if(alert.value === '' || alert.value === undefined || alert.value === null){
                footerRef.value.setTemporalMessage('ERROR: Valor no asignado.', 5000);
                return false;
            }
            if((alert.criteria === 'entre el rango' || alert.criteria === 'fuera del rango') && (alert.value_aux === '' || alert.value_aux === undefined || alert.value_aux === null)){
                footerRef.value.setTemporalMessage('ERROR: Valor no asignado.', 5000);
                return false;
            }
            if(isNaN(Number(alert.value)) || ((alert.criteria === 'entre el rango' || alert.criteria === 'fuera del rango') && isNaN(Number(alert.value_aux)))){
                footerRef.value.setTemporalMessage('ERROR: Valor debe ser un numero.', 5000);
                return false;
            }
            if(alert.settling_time === '' || alert.settling_time === undefined || alert.settling_time === null){
                footerRef.value.setTemporalMessage('ERROR: Tiempo estabilizacion no asignado.', 5000);
                return false;
            }
            if(isNaN(Number(alert.settling_time))){
                footerRef.value.setTemporalMessage('ERROR: Tiempo estabilizacion debe ser positivo o igual a cero.', 5000);
                return false;
            }
            // Validation ok.
            return true;
        }

        let addAlert = async () => {
            // Returning if not validated.
            if(!validateAlert(newAlert.value)) return;

            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/addalert", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({newAlert: newAlert.value})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){
                alerts.value.push({id: responseJSON.id, sensor_name: newAlert.value.sensor_name, criteria: newAlert.value.criteria, value: newAlert.value.value,
                    value_aux: newAlert.value.value_aux, unit: newAlert.value.unit, settling_time: newAlert.value.settling_time,
                    state: 'off', notified_users: [], alert_message: []});
            }
            footerRef.value.setTemporalMessage(responseJSON.message,5000);
            loading.value = false;
        };

        let removeAlert = async (index) => {
            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/removealert", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({alertRemove: alerts.value[index]})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){
                alerts.value.splice(index, 1);
            }
            else{
                footerRef.value.setTemporalMessage(responseJSON.message, 5000);
            }
            loading.value = false;
        };

        let updateAlert = async (index) => {
            // If any of the inputs is wrong or empty it will stop the execution of updateAlert.
            if(!validateAlert(alerts.value[index])) return;

            loading.value = true;
            alerts.value[index].state = 'off';
            alerts.value[index].notified_users = [];
            alerts.value[index].alert_message = [];

            const response = await fetch("http://rpi4id0.mooo.com:5000/api/updatealert", {
                method: "PUT",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({
                    alertUpdate: alerts.value[index],
                    index: index,
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

        onBeforeUnmount(() => {

        });

        return{
            user,
            isAuthenticated,
            loading,
            footerRef,
            sensorsAvailable,
            alerts,
            newAlert,
            addAlert,
            removeAlert,
            updateAlert,
        };
    }
};
</script>
<style>
    .width-alert-items{
        width: 260px !important;
    }
    .placeholder-width-alert-items{
        width: 125px !important;
    }
    hr{
        margin: 5px 0 !important;
        border-top: 1px solid #777;
        border-radius: 5px;
    }
</style>