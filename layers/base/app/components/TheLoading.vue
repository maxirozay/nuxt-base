<script setup lang="ts">
const appStore = useAppStore()
</script>

<template>
  <div
    v-if="appStore.isLoading"
    class="loading fixed ripple"
  />
</template>

<style scoped>
.loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999999;
}
</style>
