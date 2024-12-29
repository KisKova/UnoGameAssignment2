<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// No need for any logic in App.vue since the router handles the default view.
</script>

<style>
/* Optional global styles */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
