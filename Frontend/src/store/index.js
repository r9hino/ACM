import { createStore } from "vuex";

export default createStore({
    state: {
        user: null,
        influxToken: null,
        authenticated: false,
    },
    mutations: {
        setUser(state, user) {
            state.user = user;
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
        getInfluxToken: (state) => state.influxToken,
        getAuthenticated: (state) => state.authenticated,
    },
});