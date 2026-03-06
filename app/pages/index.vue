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
      info: 'Test log',
      type: 'error',
    },
  })
  appStore.notify('Test log sent to server')
}
</script>

<template>
  <div class="portrait">
    <button @click="sendLog">Send test log</button>
    <h2>File Management</h2>
    <label for="path">Path</label>
    <div class="flex-row group">
      <input
        type="text"
        id="path"
        v-model="path"
      />
      <label
        for="upload"
        class="label__file primary flex-row g2"
      >
        {{ $t('upload') }}<Icon name="uil:upload" />
        <FilesUpload
          id="upload"
          :path="path"
          @uploaded="(response) => console.log('File uploaded', response)"
        />
      </label>
      <FilesDelete
        :path="path"
        class="bg"
      />
    </div>
  </div>
</template>
