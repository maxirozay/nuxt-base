<script setup lang="ts">
definePageMeta({
  middleware: ['admin'],
})

const logs = ref([] as any[])
const day = 24 * 60 * 60 * 1000
const offset = new Date().getTimezoneOffset() * 60 * 1000 - 60000
const from = ref(new Date(Date.now() - 7 * day - offset).toISOString().substring(0, 16))
const to = ref(new Date(Date.now() - offset).toISOString().substring(0, 16))
const search = ref('')

function toUTC(datetimeLocal: string) {
  return new Date(datetimeLocal).toISOString()
}

function formatDateTime(utcTimestamp: string) {
  return new Date(utcTimestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function getLogs() {
  logs.value = await $fetch<any>('/api/admin/logs', {
    query: {
      from: toUTC(from.value),
      to: toUTC(to.value),
      search: search.value,
    },
  })
}

onMounted(() => {
  getLogs()
})
</script>

<template>
  <form
    @submit.prevent="getLogs"
    class="flex-row flex-center group fg mb1"
  >
    <label
      for="type"
      class="flex-center p-input"
    >
      <Icon name="uil:search" />
    </label>
    <input
      type="text"
      class="m0 flex-1"
      v-model="search"
    />
    <label
      for="from"
      class="p-input"
    >
      From
    </label>
    <input
      id="from"
      type="datetime-local"
      class="m0 flex-1"
      v-model="from"
    />
    <label
      for="to"
      class="p-input"
    >
      To
    </label>
    <input
      id="to"
      type="datetime-local"
      class="m0 flex-1"
      v-model="to"
    />
    <button
      type="submit"
      class="flex-1"
    >
      Get Logs
    </button>
  </form>
  <div
    v-for="log in logs"
    :key="log.id"
    class="accordion fg p2 mb1"
  >
    <label
      :for="log.id"
      class="flex-row"
    >
      <div class="flex-1">{{ log.type }}</div>
      <div class="flex-4">{{ log.summary }}</div>
      <div class="flex-4">{{ log.origin }}</div>
      <div class="flex-1">{{ formatDateTime(log.time) }}</div>
    </label>
    <input
      :id="log.id"
      type="checkbox"
    />
    <div>
      <h4>Data</h4>
      <DataExplorer :data="undefined" />
      <h4>User</h4>
      <div>{{ log.auth?.email }}, ID: {{ log.userId }}, IP: {{ log.ipAddress }}</div>
      <small>User Agent: {{ log.userAgent }}</small>
    </div>
  </div>
</template>
