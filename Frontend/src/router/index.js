import { createRouter, createWebHistory } from 'vue-router';
import store from '../store/index';

import Login from '../views/Login.vue';
import Home from '../views/Home.vue';
import Monitor from '../views/Monitor.vue';
import Process from '../views/Process.vue';
import Calibration from '../views/Calibration.vue';
import SystemInfo from '../views/SystemInfo.vue';
import GuardUsers from '../views/GuardUsers.vue';
import Alerts from '../views/Alerts.vue';
import Logs from '../views/Logs.vue';

const routes = [
    {
        path: "/login",
        name: "login",
        component: Login,
        meta: { requiresAuth: false },
    },
    {
        path: '/',
        name: 'home',
        component: Home,
        meta: { requiresAuth: true },
    },
    {
        path: '/monitor',
        name: 'monitor',
        component: Monitor,
        meta: { requiresAuth: true },
    },
    {
        path: '/process',
        name: 'process',
        component: Process,
        meta: { requiresAuth: true },
    },
    {
        path: '/calibration',
        name: 'calibration',
        component: Calibration,
        meta: { requiresAuth: true },
    },
    {
        path: '/systeminfo',
        name: 'systeminfo',
        component: SystemInfo,
        props: true,
        meta: { requiresAuth: true },
    },
    {
        path: '/guardusers',
        name: 'guardusers',
        component: GuardUsers,
        meta: { requiresAuth: true },
    },
    {
        path: '/alerts',
        name: 'alerts',
        component: Alerts,
        meta: { requiresAuth: true },
    },
    {
        path: '/logs',
        name: 'logs',
        component: Logs,
        props: true,
        meta: { requiresAuth: true },
    },
]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

router.beforeEach(async (to, from, next) => {
    // If page require been authenticated.
    if(to.matched.some((record) => record.meta.requiresAuth)){
        // If it is already authenticated go to next page.
        if(store.getters.getAuthenticated){
            next();
            return;
        }

        // Send request for new refresh token if and only if the actual refresh token is valid.
        const response = await fetch("http://rpi4id0.mooo.com:5000/validaterefreshtoken", {
            method: "GET",
            headers: {"Content-Type": "application/json"},
            credentials: 'include',		// Necessary to receive cookies from server (and send cookies to server).
        });

        // If the refresh token is still valid, a new access and refresh token are returned.
        if(response.status == 200){
            const {user, accessToken, influxToken} = await response.json();
            store.commit('setUser', user);
            store.commit('setAccessToken', accessToken);
            store.commit('setInfluxToken', influxToken);
            store.commit('setAuthenticated', true);
            next();
            return;
        }

        // If is not authenticated and have not a valid refresh token, go to login page.
        next("/login");
    }
    // For pages that do not require been authenticated.
    else next();
});

export default router
