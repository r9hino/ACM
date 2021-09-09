<template>
    <!-- Checked disabled switch -->
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
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';

export default {
  setup(){
    const store = useStore();
    let guardUsers = ref([]);
    let newGuardUser = ref('');

    const user = computed(() => store.getters.getUser);
    const isAuthenticated = computed(() => store.getters.getAuthenticated);
    const token = computed(() => store.getters.getToken);

    async function getGuardUsers(){
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
            console.log('Guard users not retrieved from server.');
        }
    }

    let addGuardUser = async () => {
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
        console.log(message);
    };

    let removeGuardUser = async (index) => {
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
        getGuardUsers();
    });

    onBeforeUnmount(() => {

    });

    return {
      user,
      isAuthenticated,
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