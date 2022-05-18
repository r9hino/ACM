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
import accessibility from "highcharts/modules/accessibility";

exporting(Highcharts);
boost(Highcharts);
accessibility(Highcharts);

export default {
    name: 'Chart',
    components: { },
    props: ['sensorData'],
    setup(props){
        let chartOptions = computed(() => {
            let unitArr = [];       // Store units, only one for each, no duplication.
            let yAxisArr = [];      // Store multi y-axis structure.
            let isOppositeAxis = false;

            // Check that sensorData is not null or empty.
            if(props.sensorData.length > 0){
                // Generate multi y-axis structure.
                for (let idx = 0; idx < props.sensorData.length; idx++) {
                    let sensor = props.sensorData[idx];
                    // Generate y-axis structure once for each unit.
                    if(unitArr.indexOf(sensor.unit) === -1){
                        unitArr.push(sensor.unit);      // [°C, m3/hr]

                        yAxisArr[unitArr.indexOf(props.sensorData[idx].unit)] = {
                            labels: {
                                format: '{value}',
                                style: { color: Highcharts.getOptions().colors[unitArr.indexOf(props.sensorData[idx].unit)] }
                            },
                            title: {
                                text: sensor.unit,
                                style: { color: Highcharts.getOptions().colors[unitArr.indexOf(props.sensorData[idx].unit)] }
                            },
                            opposite: isOppositeAxis
                        };
                    }

                    isOppositeAxis = !isOppositeAxis;

                    // Add unit to name and associate each time series with it y-axis.
                    props.sensorData[idx].name = props.sensorData[idx].name + ' [' + props.sensorData[idx].unit + ']';
                    props.sensorData[idx].yAxis = unitArr.indexOf(props.sensorData[idx].unit);
                };
            };
            //console.log(yAxisArr, props.sensorData);
            return{
                title: { text: '' },
                chart: {
                    type: "line",
                    redraw: true,
                    animation: false,
                    zoomType: "x",
                    panning: false,
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