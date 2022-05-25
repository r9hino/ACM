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
            let yAxisArr = [];      // Store multi y-axis structure.
            let isOppositeAxis = false;

            // Check that sensorData is not null or empty.
            if(props.sensorData.length > 0){
                // Generate multi y-axis structure.
                for(let idx = 0; idx < props.sensorData.length; idx++){
                    //console.log(props.sensorData[idx]);
                    // Generate y-axis structure once for each unit.
                    yAxisArr[idx] = {
                        labels: {
                            format: '{value}',
                            style: { color: Highcharts.getOptions().colors[props.sensorData[idx].yAxis] }
                        },
                        title: {
                            text: props.sensorData[idx].unit,
                            style: { color: Highcharts.getOptions().colors[props.sensorData[idx].yAxis] }
                        },
                        opposite: isOppositeAxis
                    };

                    isOppositeAxis = !isOppositeAxis;

                    // Add unit to name and associate each time series with it y-axis.
                    props.sensorData[idx].name = props.sensorData[idx].name + ' [' + props.sensorData[idx].unit + ']';
                };
            };
            //console.log(yAxisArr);
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