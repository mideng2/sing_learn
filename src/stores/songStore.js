import { defineStore } from "pinia";
import { ref, watch } from "vue";

const s_p = "/songs/";
const ins_p = "/instruments/";
const lyr_p = "/lyrics/";
const LYRIC_FIELDS_KEY = "sing_learn_lyric_fields";

const defaultLyricFields = [
  { key: "jp", label: "原歌词", visible: true },
  { key: "jm", label: "假名", visible: true },
  { key: "zh", label: "中文翻译", visible: true },
  { key: "rm", label: "罗马音", visible: false },
];

function normalizeLyricFields(saved) {
  if (!Array.isArray(saved)) return [...defaultLyricFields];
  const mapDefault = new Map(defaultLyricFields.map((f) => [f.key, f]));
  const result = [];
  const usedKeys = new Set();

  saved.forEach((item) => {
    const base = mapDefault.get(item.key);
    if (!base) return;
    result.push({
      ...base,
      visible: typeof item.visible === "boolean" ? item.visible : base.visible,
    });
    usedKeys.add(item.key);
  });

  defaultLyricFields.forEach((base) => {
    if (!usedKeys.has(base.key)) {
      result.push({ ...base });
    }
  });

  return result;
}

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
    {
      id: "honglianhua",
      name: "红莲华",
      duration: 234,
      singer: "LiSA",
      src: `${s_p}honglianhua.m4a`,
      instrument: `${ins_p}honglianhua.m4a`,
      lyrics: `${lyr_p}honglianhua.json`,
    },
  ]);

  function getInitialLyricFields() {
    if (typeof window === "undefined") return [...defaultLyricFields];
    try {
      const saved = window.localStorage.getItem(LYRIC_FIELDS_KEY);
      if (!saved) return [...defaultLyricFields];
      return normalizeLyricFields(JSON.parse(saved));
    } catch {
      return [...defaultLyricFields];
    }
  }

  const lyricFields = ref(getInitialLyricFields());

  watch(
    lyricFields,
    (val) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LYRIC_FIELDS_KEY, JSON.stringify(val));
        }
      } catch {
        // ignore persist error
      }
    },
    { deep: true }
  );

  function setLyricFields(fields) {
    lyricFields.value = normalizeLyricFields(fields);
  }

  function getSongById(id) {
    return songs.value.find((s) => s.id === id);
  }

  return {
    songs,
    lyricFields,
    setLyricFields,
    getSongById,
  };
});
