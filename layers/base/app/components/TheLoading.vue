<script setup lang="ts">
const appStore = useAppStore()
</script>

<template>
  <transition
    name="loading"
    mode="out-in"
  >
    <div
      v-if="appStore.isLoading"
      class="loading primary spin bottom left shadow"
    />
  </transition>
</template>

<style scoped>
.loading {
  position: fixed;
  z-index: 999999;
  border-radius: 50%;
  height: 2em;
  aspect-ratio: 1;
  margin: 8px;
}

.loading-enter-active,
.loading-leave-active {
  transition: all 0.3s ease-out;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}
</style>
