<template>
    <div>
        <highcharts class="hc d-flex justify-content-center" :options="chartOptions" ref="chart"></highcharts>
    </div>
</template>

<script>
import { computed } from 'vue';
import Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import boost from 'highcharts/modules/boost';

exporting(Highcharts);
boost(Highcharts);

export default {
    name: 'Chart',
    components: { },
    props: ['sensorData'],
    setup(props){
        let chartOptions = computed(() => {
            return{
                title: { text: '' },
                chart: {
                    type: "line",
                    redraw: true,
                    animation: false,
                    zoomType: "x",
                    panning: true,
                    panKey: "shift"
                },
                boost: { enabled: true },
                yAxis: {
                    title: { text: 'Temperature °C' }
                },
                xAxis: {
                    type: 'datetime',
                    title: { text: '' }
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom'
                },
                series: props.sensorData,
            }
        });

        return{
            chartOptions
        }
    }
}
</script>

<style scoped>
    .hc{
        width: 100%;
        min-width: 360px; 
        max-width: 800px;
        margin: 5px auto;
    }
</style>