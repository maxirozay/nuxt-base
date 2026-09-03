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
      class="loading spin bottom left shadow"
    />
  </transition>
</template>

<style scoped>
.loading {
  position: fixed;
  z-index: 999999;
  backdrop-filter: blur(3px);
  border-radius: 50%;
  height: 2em;
  aspect-ratio: 1;
  margin: 8px;
}

.loading-enter-active,
.loading-leave-active {
  transition: all 0.3s ease-in-out;
}

.loading-enter-from {
  transform: translateY(120%);
}

.loading-leave-to {
  transform: translateX(-100%);
}
</style>
