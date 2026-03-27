<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { ref } from 'vue'

const app = useAppStore()
const isWorking = ref()
const error = ref()

async function confirm() {
  if (isWorking.value) return
  error.value = null
  isWorking.value = true
  try {
    await app.confirmation!.action()
    app.confirmation = null
    error.value = null
  } catch (err: any) {
    error.value = err.message
  }
  isWorking.value = false
}

function cancel() {
  app.confirmation = null
  error.value = null
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="app.confirmation"
      class="modal"
    >
      <div
        class="p2"
        style="max-width: 600px"
      >
        {{ app.confirmation.message || $t('areYouSure') }}
        <p
          v-if="error"
          class="error-text"
          v-text="error"
        />
        <div class="flex-row g2 mt1">
          <button
            :class="['flex-1', isWorking ? 'spin' : '']"
            @click="confirm"
          >
            {{ error ? $t('retry') : $t('confirm') }}
          </button>
          <button
            class="flex-1"
            :disabled="isWorking"
            @click="cancel"
          >
            {{ $t('cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
