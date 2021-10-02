import { createStore } from "vuex";

export default createStore({
    state: {
        user: null,
        accessToken: null,
        influxToken: null,
        authenticated: false,
    },
    mutations: {
        setUser(state, user) {
            state.user = user;
        },
        setAccessToken(state, accessToken) {
            state.accessToken = accessToken;
        },
        setInfluxToken(state, influxToken) {
            state.influxToken = influxToken;
        },
        setAuthenticated(state, isAuthenticated) {
            state.authenticated = isAuthenticated;
        },
    },
    actions: {},
    getters: {
        getUser: (state) => state.user,
        getAccessToken: (state) => state.accessToken,
        getInfluxToken: (state) => state.influxToken,
        getAuthenticated: (state) => state.authenticated,
    },
});