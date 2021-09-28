import { createStore } from "vuex";

export default createStore({
    state: {
        user: null,
        apiToken: null,
        influxToken: null,
        authenticated: false,
    },
    mutations: {
        setUser(state, user) {
            state.user = user;
        },
        setApiToken(state, apiToken) {
            state.apiToken = apiToken;
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
        getApiToken: (state) => state.apiToken,
        getInfluxToken: (state) => state.influxToken,
        getAuthenticated: (state) => state.authenticated,
    },
});