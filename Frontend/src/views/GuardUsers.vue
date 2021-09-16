<template>
    <Spinner v-if="loading"></Spinner>

    <div class="container-sm">
        <div class="mt-3 mb-3">
            <h3>Lista de usuarios guardias</h3>
        </div>
        <ul class="list-group">
            <div class="d-flex align-items-center align-self-center" v-for="(guard, index) in guardUsers">
                <div class="d-flex flex-column mb-2">
                    <li class="list-group-item mx-2" style="width: 300px">{{ guard.email }}</li>
                    <li class="list-group-item mx-2" style="width: 300px">{{ guard.phone }}</li>
                </div>
                <button class="btn btn-danger" style="width: 85px" @click="removeGuardUser(index)">Borrar</button>
            </div>
        </ul>

        <!-- Add Guard User -->
        <div class="d-inline-flex mt-4">
            <div class="d-flex flex-column align-items-center">
                <div class="input-group mb-1 mx-2" style="width: 300px">
                    <div class="input-group-prepend">
                        <span class="input-group-text" id="basic-addon1">@</span>
                    </div>
                    <input type="text" class="form-control" v-model="newGuardUser.email" placeholder="email" aria-label="Email" aria-describedby="basic-addon1">
                </div>
                <div class="input-group mx-2" style="width: 300px">
                    <div class="input-group-prepend">
                        <span class="input-group-text" id="basic-addon1">+56</span>
                    </div>
                    <input type="text" class="form-control" v-model="newGuardUser.phone" placeholder="celular (9 digitos)" aria-label="Celular" aria-describedby="basic-addon1">
                </div>
            </div>
            <div class="d-flex flex-column justify-content-center align-items-center">
                <button class="btn btn-secondary" style="width: 85px" @click.prevent="addGuardUser">Agregar</button>
            </div>
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
        let newGuardUser = ref({email: '', phone: ''});

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
                footerRef.value.setTemporalMessage('Usuarios guardias no recuperados del servidor.', 5000);
            }
            loading.value = false;
        }

        let validateEmail = (email) => {
            if(!email){
                footerRef.value.setTemporalMessage('Email requerido.', 5000);
                return false;
            }
            let re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if(!re.test(email)){
                footerRef.value.setTemporalMessage('Ingrese un mail valido.', 5000);
                return false;
            }
            return true;
        };

        let validatePhone = (phone) => {
            console.log(typeof phone);
            console.log(phone);
            if(!phone){
                footerRef.value.setTemporalMessage('Celular requerido.', 5000);
                return false;
            }

            if(phone.length !== 9 || phone.match(/^[0-9]+$/) == null){
                footerRef.value.setTemporalMessage('Numero debe contener 9 digitos.', 5000);
                return false;
            }
            return true;
        };

        let addGuardUser = async () => {
            // Validate user email.
            if(!validateEmail(newGuardUser.value.email)) return;  // Do not add any user if email is invalid.
            if(!validatePhone(newGuardUser.value.phone)) return;  // Do not add any user if phone is invalid.

            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/addguarduser", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({newGuardUser: newGuardUser.value})
            });
            const responseJSON = await response.json();
            if(response.status == 200 || response.status == 201){
                guardUsers.value.push({email: newGuardUser.value.email, phone: newGuardUser.value.phone});
                newGuardUser.value.email = '';
                newGuardUser.value.phone = '';
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