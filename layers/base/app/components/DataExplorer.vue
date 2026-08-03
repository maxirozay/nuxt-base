<script setup lang="ts">
const AsyncDataExplorer = defineAsyncComponent(() => import('./DataExplorer.vue'))

defineProps<{
  data: any
}>()

const openKeys = ref(new Set<string | number>())

function toggle(key: string | number) {
  if (openKeys.value.has(key)) openKeys.value.delete(key)
  else openKeys.value.add(key)
}
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
        @click="toggle(key)"
      >
        {{ key }}:
        <span v-if="!openKeys.has(key) || typeof value !== 'object'">{{ value }}</span>
      </div>
      <AsyncDataExplorer
        v-if="typeof value === 'object' && openKeys.has(key)"
        :data="value"
        class="bl pl1"
      />
    </div>
  </div>
  <span v-else>{{ data }}</span>
</template>
