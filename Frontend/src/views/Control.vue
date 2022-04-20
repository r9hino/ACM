<template>
    <Spinner v-if="loading"></Spinner>
    <div class="container-sm flex-column mt-2">
        <h2>Control Reles</h2>
        <div class="d-flex justify-content-between align-items-center mx-2" v-for="relay in relays" :key="relay.id">
            <div class="switch-container">
                <div class="form-check form-switch">
                    <input class="form-check-input" @change="relay.state = !relay.state; onChangeRelay(relay.id)" type="checkbox" :id="relay.id" :checked="relay.state" />
                </div>
            </div>
            <div class="mx-2" style="font-size: 13px">
                {{ relay.description }}
            </div>
            <div class="d-inline-flex justify-content-center align-items-center">
                <button class="btn btn-outline-secondary dropdown-toggle input-dropdown me-1" type="button" data-bs-toggle="dropdown" :id="`dropdownCriterias`">{{ relay.trigger_type }}</button>
                <ul class="dropdown-menu input-dropdown" :aria-labelledby="`dropdownCriterias`">
                    <li><a class="dropdown-item" href="#" @click.prevent="relay.trigger_type=`Horario`; onChangeRelay(relay.id)">Horario</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="relay.trigger_type=`Custom`; onChangeRelay(relay.id)">Custom</a></li>
                </ul>
                <button class="btn btn-outline-secondary d-flex align-items-center px-1" type="button"
                    style="height: 33.5px" @click.prevent="modalRelay = relay; relay.trigger_type=='Horario' ? showModal = true : showModal = false;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
                        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <teleport to="body" v-if="showModal">
        <ModalSchedule :relay="modalRelay" @closeModal="showModal = false" @saveRelaySchedule="onChangeRelay(modalRelay.id); showModal = false;">
            
        </ModalSchedule>
    </teleport>

    <Footer :message="footerMessage"></Footer>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';
import io from 'socket.io-client';
import Spinner from '../components/Spinner.vue';
import ModalSchedule from '../components/ModalSchedule.vue';
import Footer from '../components/Footer.vue';

const socket = io('http://rpi4id0.mooo.com:5000', {autoConnect: false}) // Avoid to connect when the application start. Do it manually.

export default {
    components: { Spinner, ModalSchedule, Footer },
    setup(){
        const store = useStore();
        let loading = ref(false);
        let footerMessage = ref();
        let relays = ref([]);
        let modalRelay = ref();         // Store selected relay whose properties will be displayed on the modal.
        const showModal = ref(false);   // Handle if modal is displayed or not.

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);

        // Socket code------------------------------------------------------------------------------------------------------
        socket.on('resRelayStates', resRelays => {
            //console.log(resRelays);
            relays.value.push(...resRelays);
            loading.value = false;
        });

        // Listener in charge of updating element when other clients change it state.
        socket.on('updateClients', relay => {
            let id = relay.id;
            relays.value[id] = relay;
            //console.log('updateClients:', relays.value.[id]);
        });

        // Disconnect from server.
        socket.on('closeSocket', () => {
            socket.off('resRelayStates');
            socket.off('updateClients');
            socket.disconnect();
        });

        let onChangeRelay = (id) => {
            let relay = relays.value.find(relay => relay.id === id);
            // Do not do anything if relay is not found.
            if(relay === undefined) return;
            //relays.value[id].state = !relays.value[id].state;
            //console.log(relays.value[id]);
            socket.emit('elementChanged', relay);
        }

        onBeforeMount(() => {
            socket.connect();
            loading.value = true;
            socket.emit('reqRelayStates');  // Request to server relay states.
        });

        onBeforeUnmount(() => {
            socket.off('resRelayStates');
            socket.off('updateClients');
            socket.disconnect();
            socket.sendBuffer = []; // If it could not connect, remove all emits on buffer.
        });

        return {
            user,
            isAuthenticated,
            loading,
            footerMessage,
            relays,
            modalRelay,
            showModal,
            onChangeRelay,
        };
    }
};
</script>

<style>
    div.form-switch{
        margin: 15px 0px;
    }
    input.form-check-input{
        margin: 0px 0px;
        padding: 13px 30px;
    }
    .form-check-input:focus, .form-check-input:active {
        outline: none !important;
        box-shadow: none !important;
    }
    .input-dropdown{
        width: 95px;
        font-size: 13px !important;
    }
</style>