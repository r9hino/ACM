<template>
<div class="backdrop" @click.self="$emit('closeModal')">
    <div class="modal flex-column">
        <h3>Horarios</h3>
        <!-- Title -->
        <div class="d-flex justify-content-between align-items-center mt-4 mb-2">
            <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;"><b>Dia</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
            <div><div class="d-flex justify-content-center align-items-center" style="width: 110px !important;"><b>&nbsp;&nbsp;&nbsp;&nbsp;On</b></div></div>
            <div><div class="d-flex justify-content-center align-items-center" style="width: 110px !important;"><b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Off</b></div></div>
        </div>
        <!-- Schedule for each day of the week -->
        <div v-for="(day, index) in relay.schedule" :key="index" class="d-flex justify-content-between align-items-center">
            <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">{{ day.dayLetter }}</div></div>
            <input class="form-check-input mx-2" type="checkbox" value="" v-model="day.checked" @change="emiterCheckboxStatus" id="flexCheckMonday" style="padding: 10px 10px">
            <input class="timepicker form-control mx-2" data-date-format="HH:mm" v-model="day.on" type="time" id="auto-on">
            <input class="timepicker form-control mx-2" data-date-format="HH:mm" v-model="day.off" type="time" id="auto-off">
        </div>
        <!-- Save or close -->
        <div class="d-flex mt-4">
            <button class="btn btn-danger mx-2" style="width: 80px" @click="$emit('closeModal')">Cerrar</button>
            <button class="btn btn-secondary mx-2" style="width: 80px" @click="$emit('saveRelaySchedule', relay)">Guardar</button>
        </div>
    </div>
</div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue';

export default {
    name: 'ModalSchedule',
    props: ['relay'],
    emits: ['closeModal', 'saveRelaySchedule'],
    setup(props, { emit }){
        // This is an example for how to use and emit on setup.
        const emitCloseModal = () => {
            emit('closeModal');
        }
        return {
            emitCloseModal,
        }
    },

}
</script>

<style scoped>
    .modal {
        position: relative !important;
        width: 380px;
        height: 450px;
        padding: 20px;
        margin: 50px auto;
        background: white;
        border-radius: 10px;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }
    .backdrop {
        top: 0;
        position: fixed;
        background: rgba(0,0,0,0.2);
        width: 100%;
        height: 100%;
    }
    .timepicker{
        width: 110px;
        height: 35px;
        padding: .175rem .25rem;
    }
    .modal h1 {
        color: #03cfb4;
        border: none;
        padding: 0;
    }
    .modal p {
        font-style: normal;
    }
</style>