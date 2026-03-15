import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const currentSong = ref(null)
  const isPlaying = ref(false)
  const playbackRate = ref(1)

  return {
    currentSong,
    isPlaying,
    playbackRate
  }
})
