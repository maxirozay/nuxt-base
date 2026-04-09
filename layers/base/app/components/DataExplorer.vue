<script setup lang="ts">
const AsyncDataExplorer = defineAsyncComponent(() => import('./DataExplorer.vue'))

const props = defineProps<{
  data: any
}>()

const isOpen = ref(false)
</script>

<template>
  <div v-if="typeof data === 'object'">
    <div
      v-for="(value, key) in data"
      :key="key"
    >
      <div
        class="line"
        style="cursor: pointer"
        @click="isOpen = !isOpen"
      >
        {{ key }}:
        <span v-if="!isOpen || typeof value !== 'object'">{{ value }}</span>
      </div>
      <AsyncDataExplorer
        v-if="typeof value === 'object' && isOpen"
        :data="value"
        class="bl pl1"
      />
    </div>
  </div>
  <span v-else>{{ data }}</span>
</template>
