<template>
    <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex justify-content-between list-group-item align-items-center"
            :class="{'active-alert': toggleActiveAlertClass}" style="width: 275px; border-radius: 4px; height: 35px; margin: 2px 0; font-size: 13px">
            <input class="form-check-input" type="checkbox" aria-label="1.." v-model="checked" @change="emiterCheckboxStatus" style="padding: 10px 10px">
            {{ sensor.sensor_name }}
        </div>
        <button v-if="alert !== undefined" class="btn btn-danger btn-sm"
            type="button" style="width: 88px; height: 35px; font-size: 13px" :disabled="alert.state === 'off'" @click="stopAlertFunction(alert.id)">
            <!--<div style="border-radius: 2px; width: 15px; height: 15px; border-style: solid; border-color: #eeeeee; border-width: 3px; background: transparent;"></div>-->
            Parar alerta
        </button>
    </div>
</template>

<script>
import { ref, watch, onBeforeUnmount } from 'vue';


export default {
    name: 'CheckboxSensorAlert',
    components: {},
    props: ['sensor', 'alert', 'checked','stopAlertFunction'],
    emits: ['emitCheckboxStatus'],
    setup(props, { emit }){
        let toggleActiveAlertClass = ref(false);
        let toggleActiveAlertClassInterval = false;
        //let checked = ref(false);

        //console.log(props.alert)
        // If alert state is 'on', start toggling background color.
        if(props.alert !== undefined){
            if(props.alert.state === 'on'){
                toggleActiveAlertClassInterval = setInterval(() => {
                    toggleActiveAlertClass.value = !toggleActiveAlertClass.value;
                    // If alert state change to 'off', stop toggling background color.
                    if(props.alert.state === 'off'){
                        clearInterval(toggleActiveAlertClassInterval);
                        toggleActiveAlertClass.value = false;
                        return;
                    }
                }, 2000);
            }
        }

        // Emit to Monitor the status of the sensor checkbox.
        let emiterCheckboxStatus = () => {
            emit('emitCheckboxStatus', {sensor_name: props.sensor.sensor_name, value: props.checked});
        }
        onBeforeUnmount(() => {
            //clearInterval(toggleActiveAlertClassInterval);
            toggleActiveAlertClass.value = false;
        });

        return {
            toggleActiveAlertClass,
            emiterCheckboxStatus,
        }
    }
}
</script>

<style scoped>
    .active-alert{
        color: white !important;
        background-color: #dc3545 !important;
        border-color: #dc3545 !important;
        transition: color 2s, background-color 2s !important;
    }
    .form-check-input:checked{
        background-color: #555555 !important;
        border-color: #555555 !important;
    }
    .btn:disabled{
        opacity: 0.45 !important;
    }
</style>
