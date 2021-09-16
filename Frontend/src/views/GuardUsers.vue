<template>
    <Spinner v-if="loading"></Spinner>

    <div class="container-sm">
        <div class="mt-3 mb-3">
            <h3>Lista de usuarios guardias</h3>
        </div>
        <ul class="list-group">
            <div class="d-flex align-items-center align-self-center" v-for="(guard, index) in guardUsers">
                <li class="list-group-item mx-1" style="width: 300px">{{ guard }}</li>
                <button class="btn btn-danger" @click="removeGuardUser(index)">Borrar</button>
            </div>
        </ul>
        <div class="d-inline-flex mt-4">
            <input class="form-control mx-1" style="width: 300px" v-model="newGuardUser" id="new-guard-user" placeholder="nuevo email"/>
            <button class="btn btn-secondary" @click.prevent="addGuardUser">Agregar</button>
        </div>
    </div>
    <Footer ref="footerRef"></Footer>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';
import Spinner from '../components/Spinner.vue';
import Footer from '../components/Footer.vue';

export default {
    components: { Spinner, Footer },
    setup(){
        const store = useStore();
        let loading = ref(false);
        let footerRef = ref();
        let guardUsers = ref([]);
        let newGuardUser = ref('');

        const user = computed(() => store.getters.getUser);
        const isAuthenticated = computed(() => store.getters.getAuthenticated);
        const token = computed(() => store.getters.getToken);

        async function getGuardUsers(){
            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/getguardusers", {
                method: "GET",
                headers: {"Authorization": `Bearer ${token.value}`},
            });
            //console.log(token.value);
            if(response.status == 200){
                // Return array of all guard users stored on server.
                guardUsers.value = await response.json();
            }
            else{
                footerRef.value.setTemporalMessage('Usuarios guardia no recuperados del servidor.', 5000);
            }
            loading.value = false;
        }

        let validateEmail = (email) => {
            if(!email){
                footerRef.value.setTemporalMessage('Email requerido.', 5000);
                return false;
            }
            let re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if (!re.test(email)) {
                footerRef.value.setTemporalMessage('Ingrese un mail valido.', 5000);
                return false;
            }

            return true;
        };

        let addGuardUser = async () => {
            // Validate user email.
            if(!validateEmail(newGuardUser.value)) return;  // Do not add any user if email is invalid.

            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/addguarduser", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({newGuardUser: newGuardUser.value})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){
                guardUsers.value.push(newGuardUser.value);
                newGuardUser.value = '';
            }
            else{
                footerRef.value.setTemporalMessage(responseJSON, 5000);
            }
            loading.value = false;
        };

        let removeGuardUser = async (index) => {
            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/removeguarduser", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({guardUserRemove: guardUsers.value[index]})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){
                guardUsers.value.splice(index, 1);
            }
            else{
                footerRef.value.setTemporalMessage(responseJSON, 5000);
            }
            loading.value = false;
        };

        onBeforeMount(() => {
            getGuardUsers();
        });

        onBeforeUnmount(() => {

        });

        return {
            user,
            isAuthenticated,
            loading,
            footerRef,
            guardUsers,
            newGuardUser,
            addGuardUser,
            removeGuardUser,
        };
    }
};
</script>
<style>
  
</style>