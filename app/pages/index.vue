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
      summary: 'Test log',
      data: { test: 1 },
      origin: useRoute().fullPath,
      type: 'Test',
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
  appStore.confirmation = {
    message: 'Are you sure?',
    action: () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.5) {
            resolve(true)
          } else {
            reject(new Error('Random failure'))
          }
        }, 1000)
      }),
  }
}
</script>

<template>
  <div class="portrait">
    <button @click="sendLog">Send test log</button>
    <h1>File Management</h1>
    <label for="path">Path</label>
    <div class="flex-row group">
      <input
        type="text"
        id="path"
        v-model="path"
        class="flex-4"
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
      <FilesDelete
        class="flex-1 bg flex-center"
        :path="path"
        :isPrivate="true"
      />
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
    <div>
      <h2>Confirmation Test</h2>
      <button
        class="primary"
        @click="testConfirmation"
      >
        Show Confirmation
      </button>
    </div>
  </div>
</template>
