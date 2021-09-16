<template>
    <footer class="bg-light fixed-bottom">
        <div class="d-flex justify-content-center align-items-center" style="height: 30px; background-color: rgba(0, 0, 0, 0.15);">
            <p class="align-items-center" @change="messageDisplayTimeout" style="margin: auto auto; font-size: 13px;">{{footerMessage}}</p>
        </div>
    </footer>
</template>

<script>
import { ref } from 'vue';

export default {
    name: 'Footer',
    props: [],
    setup(){
        let displayMessage = ref(true);
        let footerMessage = ref();

        let setTemporalMessage = (message, timeDelay) => {
            footerMessage.value = message;
            setTimeout(() => footerMessage.value = '', timeDelay);
        };

        return {
            displayMessage,
            footerMessage,
            setTemporalMessage
        }
    }
}
/*watch(() => props.footerMessage, (newValue, oldValue) => {
            displayMessage.value = true;
            setTimeout(() => displayMessage.value = false, props.timeDisplay);
        });
        */
/*watch(message, (newValue, oldValue) => {
            if(message.value == '' || message.value == undefined || message.value == null) return;

            displayMessage.value = true;
            setTimeout(() => {
                displayMessage.value = false;
                message.value = '';
                console.log('Watch message');
            }, props.timeDisplay);
        });

        watch(() => props.footerMessage, (newValue, oldValue) => {
            message.value = props.footerMessage;
            console.log('Watch footMessage');
        }); */
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>