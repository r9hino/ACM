<template>
    <div class="container-fluid">
        <div class="mt-3 mb-1">
            <h3>Definicion de Alertas</h3>
        </div>
        <!--UI for editing and deleting alerts already defined.-->
        <InputAlertGroup v-for="(alert, index) in alerts" :key="index" 
            :alert="alert" :indexAlert="index" :sensors="sensors" :endFunction="removeAlert" textEndFunction="Borrar" colorEndFunction="btn-danger">
        </InputAlertGroup>
        <hr>
        <!--UI for adding alerts.-->
        <InputAlertGroup :alert="newAlert" :indexAlert="alerts.length" :sensors="sensors" :endFunction="addAlert" textEndFunction="Agregar" colorEndFunction="btn-secondary"></InputAlertGroup>
    </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';
import InputAlertGroup from '../components/InputAlertGroup.vue'

export default {
    components: { InputAlertGroup },
    setup(){
        const store = useStore();
        let sensors = ref([
            {sensor: 'Corriente bomba 1', unit: 'Corriente [A]'},
            {sensor: 'Voltaje bomba 1', unit: 'Voltaje[v]'},
            {sensor: 'Caudal bomba 1', unit: 'Caudal [L/s]'}
        ]);
        let alerts = ref([
            {sensor: 'Voltaje bomba 1', criteria: 'entre el rango', value: 23, value_aux: 25, unit: 'Voltaje [v]', settling_time: 10},
            {sensor: 'Caudal bomba 1', criteria: 'menor', value: 23, value_aux: null, unit: 'Caudal [L/s]', settling_time: 10},
            {sensor: 'Corriente bomba 1', criteria: 'mayor o igual', value_aux: null, value: 23, unit: 'Corriente [A]', settling_time: 10},
            {sensor: 'Caudal bomba 1', criteria: 'menor', value: 23, value_aux: null, unit: 'Caudal [L/s]', settling_time: 10}
        ]);
        let newAlert = ref({sensor: 'Sensor', criteria: 'Criterio', value: null, value_aux: null, unit: 'Unidad', settling_time: null});

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);
        const token = computed(() => store.getters.getToken);

        async function getAlerts(){
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/getalerts", {
                method: "GET",
                headers: {"Authorization": `Bearer ${token.value}`},
            });
            //console.log(token.value);
            if(response.status == 200){
                // Return array of all guard users stored on server.
                alerts.value = await response.json();
            }
            else{
                console.log('Alerts not retrieved from server.');
            }
        }

        let addAlert = async () => {
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/addalert", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({newAlert: newAlert.value})
            });
            const message = await response.json();
            if(response.status == 200 || response.status == 201){
                alerts.value.push({sensor: newAlert.value.sensor, criteria: newAlert.value.criteria, value: newAlert.value.value, value_aux: newAlert.value.value_aux, unit: newAlert.value.unit, settling_time: newAlert.value.sttling_time});
            }
            console.log(message);
        };

        let removeAlert = async (index) => {
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/removealert", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({alertRemove: alerts.value[index]})
            });
            const message = await response.json();
            if(response.status == 200 || response.status == 201){
                alerts.value.splice(index, 1);
            }
            console.log(message);
        };


        onBeforeMount(() => {
            getAlerts();
        });

        onBeforeUnmount(() => {

        });

        return{
            user,
            isAuthenticated,
            sensors,
            alerts,
            newAlert,
            addAlert,
            removeAlert,
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