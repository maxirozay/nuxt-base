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
    <label>
      Path
      <input
        type="text"
        v-model="path"
      />
    </label>
    <FileUpload
      :path="path"
      @uploaded="(response) => console.log('File uploaded', response)"
    />
    <FileDelete :path="path" />
  </div>
</template>
