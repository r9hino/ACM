<template>
    <div class="d-inline-flex justify-content-center align-items-center mt-4 mb-3 mx-4">
        <div class="d-flex flex-column align-items-center">
            <button class="btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" :id="`sensorDropdown${indexAlert}`">{{alert.sensor_name}}</button>
            <ul class="dropdown-menu" :aria-labelledby="`sensorDropdown${indexAlert}`">
                <li v-for="(sensor, indexSensor) in sensorsAvailable" :key="indexSensor">
                    <a class="dropdown-item" href="#" @click.prevent="alert.sensor_name=sensor.sensor_name; alert.unit=sensor.unit">{{sensor.sensor_name}}</a>
                </li>
            </ul>
            <button class="btn btn-outline-secondary width-alert-items dropdown-toggle mb-1" type="button" data-bs-toggle="dropdown" :id="`dropdownCriterias${indexAlert}`">{{alert.criteria}}</button>
            <ul class="dropdown-menu" :aria-labelledby="`dropdownCriterias${indexAlert}`">
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`menor`">menor</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`menor o igual`">menor o igual</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`igual`">igual</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`mayor o igual`">mayor o igual</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`mayor`">mayor</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`entre el rango`">entre el rango</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="alert.criteria=`fuera del rango`">fuera del rango</a></li>
            </ul>
            <div class="d-flex justify-content-between width-alert-items">
                <div class="form-floating mb-1">
                    <input v-model="alert.value" type="user" class="form-control" 
                        :class="{'placeholder-width-alert-items': alert.criteria == 'entre el rango' || alert.criteria == 'fuera del rango', 'width-alert-items': alert.criteria != 'entre el rango' && alert.criteria != 'fuera del rango'}"
                    style="height: 55px" id="floatingInput" :placeholder="alert.unit">
                    <label for="floatingInput">{{alert.unit}}</label>
                </div>
                <div class="form-floating mb-1" v-if="alert.criteria == 'entre el rango' || alert.criteria == 'fuera del rango'">
                    <input v-model="alert.value_aux" type="user" class="form-control placeholder-width-alert-items" style="height: 55px" id="floatingInput" :placeholder="alert.unit">
                    <label for="floatingInput">{{alert.unit}}</label>
                </div>
            </div>
            <div class="form-floating">
                <input v-model="alert.settling_time" type="user" class="form-control width-alert-items" style="height: 55px" id="floatingInput" placeholder="Tiempo estabilization (s)">
                <label for="floatingInput">Tiempo estabilization (s)</label>
            </div>
        </div>
        <div class="d-flex flex-column align-items-center">
            <button class="btn mb-1 ms-2" :class="{'btn-danger': colorEndFunction=='btn-danger', 'btn-secondary': colorEndFunction=='btn-secondary'}"
                style="width: 85px" @click="endFunction(indexAlert)">{{ textEndFunction }}
            </button>
            <button class="btn btn-secondary ms-2" v-if="colorEndFunction == 'btn-danger'"
                style="width: 85px" @click="updateFunction(indexAlert)">Guardar
            </button>
        </div>
    </div>
</template>

<script>
export default {
    props: ['alert', 'indexAlert', 'sensorsAvailable', 'endFunction', 'textEndFunction', 'colorEndFunction', 'updateFunction'],
    methods: {

    }
}
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