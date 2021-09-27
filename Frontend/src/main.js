import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

import Highcharts from "highcharts";
import HighchartsVue from "highcharts-vue";
import boost from "highcharts/modules/boost";

boost(Highcharts);

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

createApp(App).use(router)
              .use(store)
              .use(HighchartsVue)
              .mount('#app');
