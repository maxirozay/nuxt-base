<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated'],
})
const { user } = useUserSession()
const path = ref('u/' + user.value!.id)
const appStore = useAppStore()

async function sendLog() {
  await $fetch('/api/log', {
    method: 'POST',
    body: {
      summary: 'Test log ' + new Date().toISOString().substring(0, 16),
      data: { test: 1, nested: { value: 'abc' } },
      origin: useRoute().fullPath,
      type: Math.random() > 0.5 ? 'Info' : 'Error',
    },
  })
  appStore.notify('Test log sent to server')
}

const files = ref([] as any[])
async function listFiles() {
  const params = new URLSearchParams({
    path: path.value,
    isPrivate: 'true',
  }).toString()
  files.value = await $fetch<any[]>(`/api/files?${params}`)
}

function testConfirmation() {
  appStore
    .confirm('Are you sure?')
    .then(() => {
      appStore.notify('Confirmed', 'success')
    })
    .catch(() => {
      appStore.notify('Cancelled', 'error')
    })
}
</script>

<template>
  <div class="portrait">
    <div class="flex g2">
      <button @click="sendLog">Send test log</button>
      <button
        class="primary"
        @click="testConfirmation"
      >
        Show Confirmation
      </button>
    </div>
    <h1>File Management</h1>
    <label for="path">Path</label>
    <div class="flex-row group">
      <input
        type="text"
        id="path"
        v-model="path"
        class="flex-4"
      />
      <FilesDelete
        class="flex-1 bg flex-center"
        :path="path"
        :isPrivate="true"
      />
      <label
        for="upload"
        class="flex-1 label__file primary flex-row g2 flex-center"
      >
        {{ $t('upload') }}<Icon name="uil:upload" />
        <FilesUpload
          id="upload"
          :path="path"
          :isPrivate="true"
          @uploaded="(response) => console.log('File uploaded', response)"
        />
      </label>
      <button
        class="flex-1"
        @click="listFiles"
      >
        List files
      </button>
    </div>
    <div
      v-for="file in files"
      :key="file.name"
    >
      <a
        :href="file.url"
        target="_blank"
      >
        {{ file.name }}
      </a>
    </div>
  </div>
</template>
