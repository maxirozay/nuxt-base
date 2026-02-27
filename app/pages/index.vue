<script setup lang="ts">
import FileDelete from '~/components/storage/FileDelete.vue'
import FileUpload from '~/components/storage/FileUpload.vue'

definePageMeta({
  middleware: ['authenticated'],
})
const { user } = useUserSession()
const path = ref('u/' + user.value!.id)
</script>

<template>
  <div class="portrait">
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
        <FileUpload
          id="upload"
          :path="path"
          @uploaded="(response) => console.log('File uploaded', response)"
        />
      </label>
      <FileDelete
        :path="path"
        class="bg"
      />
    </div>
  </div>
</template>
