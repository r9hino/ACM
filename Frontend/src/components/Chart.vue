<template>
    <div>
        <highcharts class="hc" :options="chartOptions" ref="chart"></highcharts>
    </div>
</template>
<script>
import { ref, watch, onBeforeUnmount } from 'vue';
import Highcharts from 'highcharts';
import exportingInit from 'highcharts/modules/exporting';

exportingInit(Highcharts);

export default {
    name: 'Chart',
    components: { },
    props: ['sensorData'],
    setup(props){
        
      
        return{
            chartOptions: {
                series: [{data: [1, 2, 3]}]
            }
        }
    }
}
</script>

<style scoped>
    .hc {
        min-width: 360px; 
        max-width: 800px;
        margin: 1em auto;
    }
</style>