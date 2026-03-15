import { defineStore } from "pinia";
import { ref } from "vue";

const s_p = "/songs/";
const ins_p = "/instruments/";
const lyr_p = "/lyrics/";

export const useSongStore = defineStore("song", () => {
  const songs = ref([
    { id: "dagai", name: "たぶん", duration: 219, singer: "YOASOBI", src: `${s_p}dagai.m4a`, instrument: `${ins_p}dagai.m4a`, lyrics: `${lyr_p}dagai.json` },
    { id: "guaiwu", name: "怪物", duration: 206, singer: "YOASOBI", src: `${s_p}guaiwu.m4a`, instrument: `${ins_p}guaiwu.m4a`, lyrics: `${lyr_p}guaiwu.json` },
    { id: "lemon", name: "Lemon", duration: 256, singer: "米津玄師", src: `${s_p}lemon.m4a`, instrument: `${ins_p}lemon.m4a`, lyrics: `${lyr_p}lemon.json` },
    {
      id: "yewan",
      name: "夜に駆ける",
      duration: 261,
      singer: "YOASOBI",
      src: `${s_p}yewan.m4a`,
      instrument: `${ins_p}yewan.m4a`,
      lyrics: `${lyr_p}yewan.json`,
    },
  ]);

  function getSongById(id) {
    return songs.value.find((s) => s.id === id);
  }

  return {
    songs,
    getSongById,
  };
});
