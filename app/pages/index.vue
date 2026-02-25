<script setup lang="ts">
import FileDelete from '~/components/storage/FileDelete.vue'
import FileUpload from '~/components/storage/FileUpload.vue'

definePageMeta({
  middleware: ['authenticated'],
})
</script>

<template>
  <div class="portrait">
    <h2>File Management</h2>
    <FileUpload
      path="test"
      @uploaded="(response) => console.log('File uploaded', response)"
    />
    <FileDelete path="test/file.png" />
  </div>
</template>
