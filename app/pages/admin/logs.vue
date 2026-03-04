<script setup lang="ts">
definePageMeta({
  middleware: ['admin'],
})

const logs = ref([] as any[])
const day = 24 * 60 * 60 * 1000
const offset = new Date().getTimezoneOffset() * 60 * 1000
const from = ref(new Date(Date.now() - 7 * day - offset).toISOString().substring(0, 16))
const to = ref(new Date(Date.now() - offset).toISOString().substring(0, 16))
const type = ref('all')

function toUTC(datetimeLocal: string) {
  return new Date(datetimeLocal).toISOString()
}

function formatDateTime(utcTimestamp: string) {
  return new Date(utcTimestamp).toLocaleString(undefined, {
    year: 'numeric',
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
      type: type.value,
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
      class="p-input"
    >
      Type
    </label>
    <select
      id="type"
      v-model="type"
      class="flex-1 m0"
      @change="getLogs"
    >
      <option value="all">All</option>
      <option value="info">Info</option>
      <option value="error">Error</option>
    </select>
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
    <label :for="log.id">
      <div class="float-right">{{ formatDateTime(log.timestamp) }}</div>
      {{ log.type }} {{ log.method }} {{ log.path }}
    </label>
    <input
      :id="log.id"
      type="checkbox"
    />
    <div>
      <div>User: {{ log.auth?.email }}, ID: {{ log.userId }}, IP: {{ log.ipAddress }}</div>
      <small>User Agent: {{ log.userAgent }}</small>
      <div>Info: {{ log.info }}</div>
    </div>
  </div>
</template>
