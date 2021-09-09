<template>
    <div class="container-sm">
        <div class="mt-3 mb-4">
            <h3>Alert Definitions</h3>
        </div>
        <!--<div class="row align-items-center" style="margin-bottom: -25px">
            <p class="col">Sensors</p>
            <p class="col">Criteria</p>
            <p class="col">Settling Time (s)</p>
            <p class="col">Value</p>
        </div>-->
        <div class="d-inline-flex justify-content-center align-items-center mb-4" v-for="(alert, index) in alerts" :key="index">
            <div class="d-flex flex-column align-items-center">
                <button class="btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" :id="`sensorDropdown${index}`">{{alert.sensor}}</button>
                <ul class="dropdown-menu" :aria-labelledby="`sensorDropdown${index}`">
                    <li v-for="(sensor, indexSensor) in sensors" :key="indexSensor"><a class="dropdown-item" href="#" @click="alert.sensor=sensor">{{sensor}}</a></li>
                </ul>
                <button class="sm-text btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" id="dropdownMenuCriterias">{{alert.criteria}}</button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuCriterias">
                    <li><a class="dropdown-item" href="#" @click="alert.criteria=`menor`">menor</a></li>
                    <li><a class="dropdown-item" href="#" @click="alert.criteria=`menor o igual`">menor o igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="alert.criteria=`igual`">igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="alert.criteria=`mayor o igual`">mayor o igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="alert.criteria=`mayor`">mayor</a></li>
                </ul>
                <div class="form-floating mb-1">
                    <input v-model="alert.value" type="user" class="form-control width-alert-items" style="height: 55px" id="floatingInput" placeholder="Valor (m)">
                    <label for="floatingInput">Valor (m)</label>
                </div>
                <div class="form-floating">
                    <input v-model="alert.settlingTime" type="user" class="form-control width-alert-items" style="height: 55px" id="floatingInput" placeholder="Tiempo estabilization (s)">
                    <label for="floatingInput">Tiempo estabilization (s)</label>
                </div>
            </div>
            <button class="sm-text btn btn-danger ms-3 me-5" style="width: 85px" @click="removeAlert(index)">Borrar</button>
        </div>
        <hr>
        <div class="d-inline-flex justify-content-center align-items-center">
            <div class="d-flex flex-column align-items-center mt-4">
                <button class="btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" id="dropdownMenuSensors">{{sensorDropdown}}</button>
                <ul class="dropdown-menu" :aria-labelledby="`sensorDropdown${index}`">
                    <li v-for="(sensor, indexSensor) in sensors" :key="indexSensor"><a class="dropdown-item" href="#" @click="sensorDropdown=sensor">{{sensor}}</a></li>
                </ul>
                <button class="sm-text btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" id="dropdownMenuCriterias">{{criteriaDropdown}}</button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuCriterias">
                    <li><a class="dropdown-item" href="#" @click="criteriaDropdown=`menor`">menor</a></li>
                    <li><a class="dropdown-item" href="#" @click="criteriaDropdown=`menor o igual`">menor o igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="criteriaDropdown=`igual`">igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="criteriaDropdown=`mayor o igual`">mayor o igual</a></li>
                    <li><a class="dropdown-item" href="#" @click="criteriaDropdown=`mayor`">mayor</a></li>
                </ul>
                <div class="form-floating mb-1">
                    <input v-model="username" type="user" class="form-control width-alert-items" style="height: 50px" id="floatingInput" placeholder="Valor (m)">
                    <label for="floatingInput">Valor (m)</label>
                </div>
                <div class="form-floating">
                    <input v-model="username" type="user" class="form-control width-alert-items h-25" style="height: 50px" id="floatingInput" placeholder="Tiempo estabilization (s)">
                    <label for="floatingInput">Tiempo estabilization (s)</label>
                </div>
            </div>
            <button class="sm-text btn btn-secondary ms-3 me-5" style="width: 85px" @click="addAlert(index)">Agregar</button>
        </div>
    </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';

export default {
  setup(){
    const store = useStore();
    let sensors = ref(['Corriente bomba 1', 'Voltaje bomba 1', 'Caudal bomba 1']);
    let alerts = ref([{sensor: 'Voltaje bomba 1', criteria: 'mayor o igual', value: 23, settlingTime: 10},
        {sensor: 'Caudal bomba 1', criteria: 'menor', value: 23, settlingTime: 10}]);
    let newAlert = ref({});
    let sensorDropdown = ref('Sensor');
    let criteriaDropdown = ref('Criterio');

    const user = computed(() => store.getters.getUser);
    const isAuthenticated = computed(() => store.getters.getAuthenticated);
    const token = computed(() => store.getters.getToken);

    let selectSensor = (selectSensor) => {
        sensorDropdown.value = selectSensor;
    }
    let selectCriteria = (selectCriteria) => {
        criteriaDropdown.value = selectCriteria;
    }

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
        const response = await fetch("http://rpi4id0.mooo.com:5000/api/addguarduser", {
            method: "POST",
            headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
            body: JSON.stringify({newGuardUser: newGuardUser.value})
        });
        const message = await response.json();
        if(response.status == 200 || response.status == 201){
            guardUsers.value.push(newAlert.value);
            newGuardUser.value = '';
        }
        console.log(message);
    };

    let removeAlert = async (index) => {
        const response = await fetch("http://rpi4id0.mooo.com:5000/api/removeguarduser", {
            method: "POST",
            headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
            body: JSON.stringify({guardUserRemove: guardUsers.value[index]})
        });
        const message = await response.json();
        if(response.status == 200 || response.status == 201){
            guardUsers.value.splice(index, 1);
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
        sensorDropdown,
        criteriaDropdown,
        selectSensor,
        selectCriteria,
        newAlert,
        addAlert,
        removeAlert,
    };
  }
};
</script>
<style>
    .width-alert-items{
        width: 230px !important;
    }
    div.div-label{
        width: 140px;
    }
    button.sm-text{
        font-size: 10 !important;
    }
    hr{
        margin: 5px 0 !important;
        border-top: 1px solid #777;
        border-radius: 5px;
    }
</style>