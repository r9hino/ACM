<template>
    <div class="backdrop" @click.self="emitCloseModal">
        <div class="modal flex-column">
            <h3>Horarios</h3>
            <div class="d-flex justify-content-between align-items-center mt-4 mb-2">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;"><b>Dia</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
                <div><div class="d-flex justify-content-center align-items-center" style="width: 110px !important;"><b>&nbsp;&nbsp;&nbsp;&nbsp;On</b></div></div>
                <div><div class="d-flex justify-content-center align-items-center" style="width: 110px !important;"><b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Off</b></div></div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">L</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckMonday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" data-date-format="HH:mm" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" data-date-format="HH:mm" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">M</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">M</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">J</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">V</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">S</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div><div class="d-flex justify-content-center align-items-center" style="width: 15px !important;">D</div></div>
                <input class="form-check-input mx-2" type="checkbox" value="" v-model="checked" @change="emiterCheckboxStatus" id="flexCheckTuesday" style="padding: 10px 10px">
                <input class="timepicker form-control mx-2" type="time" id="auto-on">
                <input class="timepicker form-control mx-2" type="time" id="auto-off">
            </div>

            <button @click="emitCloseModal">
                Close
            </button>
        </div>
    </div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue';

export default {
    name: 'ModalSchedule',
    props: ['relay'],
    emits: ['closeModal'],
    setup(props, { emit }){
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
        background: rgba(0,0,0,0.5);
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