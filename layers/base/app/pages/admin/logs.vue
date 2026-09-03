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
const hideDuplicates = ref(true)
const duplicateMap = ref({} as Record<string, any[]>)

const filteredLogs = computed(() => {
  let filteredLogs = logs.value
  if (hideDuplicates.value) {
    filteredLogs = filteredLogs.filter((log) => {
      if (log.duplicates.length === 1) return true
      const duplicateId = log.summary + log.origin
      return duplicateMap.value[duplicateId] && duplicateMap.value[duplicateId][0]?.id === log.id
    })
  }
  if (!search.value) return filteredLogs
  const searchLower = search.value.toLowerCase()
  return filteredLogs.filter(
    (log) =>
      log.type.toLowerCase().includes(searchLower) ||
      log.summary.toLowerCase().includes(searchLower) ||
      log.origin.toLowerCase().includes(searchLower) ||
      log.auth?.email.toLowerCase().includes(searchLower),
  )
})

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
  duplicateMap.value = {}
  logs.value.forEach((log) => {
    const duplicateId = log.summary + log.origin
    if (!duplicateMap.value[duplicateId]) {
      duplicateMap.value[duplicateId] = []
    }
    duplicateMap.value[duplicateId]?.push(log)
    log.duplicates = duplicateMap.value[duplicateId]
  })
}

onMounted(() => {
  getLogs()
})
</script>

<template>
  <div class="portrait px2">
    <form
      @submit.prevent="getLogs"
      class="flex my2"
    >
      <div class="flex-row group fg flex-1">
        <label
          for="search"
          class="flex-center p-input"
        >
          <Icon
            name="uil:search"
            class="mr"
          />
        </label>
        <input
          id="search"
          type="text"
          class="m0 flex-4"
          v-model="search"
        />
      </div>
      <div class="flex group fg flex-1">
        <label
          for="from"
          class="p-input"
        >
          From
        </label>
        <input
          id="from"
          type="datetime-local"
          class="m0 flex-4"
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
          class="m0 flex-4"
          v-model="to"
        />
      </div>
      <button
        type="submit"
        class="flex-1"
      >
        Get Logs
      </button>
    </form>
    <label>
      Hide duplicates
      <input
        type="checkbox"
        class="ml1"
        v-model="hideDuplicates"
      />
    </label>
    <div
      v-for="log in filteredLogs"
      :key="log.id"
      class="accordion fg p2 mt1"
    >
      <label :for="log.id">
        <div class="flex g1">
          <div class="flex-1 mr line">
            {{ log.duplicates.length }} {{ log.type }} @
            <a
              :href="log.origin"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ log.origin }}
            </a>
          </div>
          <div>{{ formatDateTime(log.time) }}</div>
        </div>
        <small style="word-wrap: break-word">{{ log.summary }}</small>
      </label>
      <input
        :id="log.id"
        type="checkbox"
      />
      <div>
        <ul>
          <li
            v-for="duplicate in log.duplicates"
            :key="duplicate.id"
            class="mb1"
          >
            <small>
              <div class="flex g1">
                <div class="mr">
                  <b>User:</b> IP: {{ duplicate.ipAddress }}
                  <span v-if="duplicate.auth">
                    {{ duplicate.auth.email }} (ID: {{ duplicate.userId }})
                  </span>
                </div>
                <div>{{ formatDateTime(duplicate.time) }}</div>
              </div>
              <b>User Agent:</b> {{ duplicate.userAgent }}
              <div
                v-if="duplicate.data && Object.keys(duplicate.data).length"
                class=""
              >
                <b>Data:</b>
                <button
                  class="fg fg-border p0 ml1"
                  @click="copyToClipboard(JSON.stringify(duplicate.data))"
                >
                  <Icon
                    name="uil:copy"
                    class="mr"
                  />
                </button>
                <DataExplorer
                  :data="duplicate.data"
                  class="bl pl1"
                />
              </div>
            </small>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
