<template>
  <div class="d-flex justify-content-around align-items-center my-3">
    <h5 class="mt-2">Sensores</h5>
    <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown"
      :id="`time-windows`" style="width: 100px">{{ timeWindows }}</button>
    <ul class="dropdown-menu" :aria-labelledby="`time-windows`">
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`5 minutos`">5 minutos</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`15 minutos`">15 minutos</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`1 hora`">1 hora</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`3 horas`">3 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`6 horas`">6 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`12 horas`">12 horas</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`1 dia`">1 dia</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`2 dias`">2 dias</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`7 dias`">7 dias</a></li>
        <li><a class="dropdown-item" href="#" @click.prevent="timeWindows=`30 dias`">30 dias</a></li>
    </ul>
  </div>
  <!-- Graficos -->
  <div>

  </div>
  <Footer></Footer>
</template>
<script>
import { ref, watch, onBeforeUnmount } from 'vue';

import Spinner from '../components/Spinner.vue';
import Footer from '../components/Footer.vue';

export default {
    name: 'Monitor',
    components: { Spinner, Footer },
    props: [],
    setup(){
      let timeWindows = ref('5 minutos');
      
      return{
        timeWindows
      }
    }
}
</script>

<style>

</style>