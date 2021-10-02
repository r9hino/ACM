<template>
    <NavBar v-if="isAuthenticated"/>
    <router-view/>
</template>

<script>
import { computed, onBeforeMount } from 'vue';
import { useStore } from 'vuex';
import NavBar from './components/NavBar.vue';

export default{
    components: { NavBar },
    setup(){
        const store = useStore();
        const isAuthenticated = computed(() => store.getters.getAuthenticated);

        onBeforeMount(() => {
            // Load stored data from browser.
            if(localStorage.getItem("accessToken") === null) return;

            
        });

        return {isAuthenticated}
    }
}
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}
</style>
