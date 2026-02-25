<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const appStore = useAppStore()
</script>

<template>
  <div class="notifications flex-column fixed bottom right g2 m1">
    <div
      v-for="notification in appStore.notifications"
      :key="notification.id"
      :class="['pl2', notification.type]"
    >
      {{ notification.message }}
      <button
        :class="[notification.type, notification.type + '-border']"
        @click="appStore.removeNotification(notification.id)"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
        >
          <line
            x1="0"
            y1="0"
            x2="10"
            y2="10"
            stroke="currentColor"
            stroke-width="2"
          />
          <line
            x1="0"
            y1="10"
            x2="10"
            y2="0"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.notifications {
  z-index: 999999;
  max-width: 400px;
}
</style>
