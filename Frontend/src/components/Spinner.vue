<template>
  <div class="overlay">
        <div class="d-flex justify-content-center">  
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem; z-index: 20;">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
  name: 'Spinner',
  props: {
    msg: String
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .overlay {
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 1000;
    top: 40%;
    left: 0px;
    opacity: 0.5;
    filter: alpha(opacity=50);
  }
</style>
