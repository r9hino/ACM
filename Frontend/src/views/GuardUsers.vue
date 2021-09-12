<template>
    <Spinner v-if="loading"></Spinner>

    <div class="container-sm">
        <div class="mt-3 mb-3">
            <h3>Guard users list</h3>
        </div>
        <ul class="list-group">
            <div class="d-flex align-items-center align-self-center" v-for="(guard, index) in guardUsers">
                <li class="list-group-item mx-1" style="width: 300px">{{ guard }}</li>
                <button class="btn btn-danger btn-sm" @click="removeGuardUser(index)">Remove</button>
            </div>
        </ul>
        <div class="d-inline-flex mt-4">
            <input class="form-control mx-1" style="width: 300px" v-model="newGuardUser" id="new-guard-user" placeholder="new guard email"/>
            <button class="btn btn-secondary" @click.prevent="addGuardUser">Add</button>
        </div>
    </div>
    <Footer :message="footerMessage"></Footer>
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
        let footerMessage = ref();
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
                footerMessage.value = 'Guard users not retrieved from server.';
            }
            loading.value = false;
        }

        let addGuardUser = async () => {
            loading.value = true;
            const response = await fetch("http://rpi4id0.mooo.com:5000/api/addguarduser", {
                method: "POST",
                headers: {"Authorization": `Bearer ${token.value}`, "Content-Type": "application/json"},
                body: JSON.stringify({newGuardUser: newGuardUser.value})
            });
            const message = await response.json();
            if(response.status == 200 || response.status == 201){
                guardUsers.value.push(newGuardUser.value);
                newGuardUser.value = '';
            }
            else{
                footerMessage.value = message
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
            const message = await response.json();
            if(response.status == 200 || response.status == 201){
                guardUsers.value.splice(index, 1);
            }
            else{
                footerMessage.value = message
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
            footerMessage,
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