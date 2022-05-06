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
            let yAxisArr = [];      // Store multi y-axis structure.
            let unitArr = [];       // Store units, only one for each, no duplication.

            // Check that sensorData is not null or empty.
            if(props.sensorData.length > 0){
                // Generate multi y-axis structure.
                for (let idx = 0; idx < props.sensorData.length; idx++) {
                    let sensor = props.sensorData[idx];
                    // Generate y-axis structure once for each unit.
                    if(unitArr.indexOf(sensor.unit) === -1){
                        unitArr.push(sensor.unit);      // [°C, m3/hr]

                        yAxisArr[unitArr.length-1] = {
                            labels: {
                                format: '{value}',
                                style: { color: Highcharts.getOptions().colors[unitArr.length-1] }
                            },
                            title: {
                                text: sensor.unit,
                                style: { color: Highcharts.getOptions().colors[unitArr.length-1] }
                            }
                        };
                    }

                    // Add unit to name and associate each time series with it y-axis.
                    props.sensorData[idx].name = props.sensorData[idx].name + ' [' + props.sensorData[idx].unit + ']';
                    props.sensorData[idx].yAxis = unitArr.indexOf(props.sensorData[idx].unit);
                };
            };

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
                xAxis: {
                    type: 'datetime',
                    title: { text: '' }
                },
                yAxis: yAxisArr,
                tooltip: {},
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom'
                },
                series: props.sensorData,
            }
        });
        //console.log(props.sensorData);
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