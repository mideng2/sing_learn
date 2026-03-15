import { Capacitor } from "@capacitor/core";
import { createCapAudioEngine } from "./capAudioEngine";
import { createWebAudioEngine } from "./webAudioEngine";

export function createAudioEngine() {
  if (Capacitor.isNativePlatform()) {
    return createCapAudioEngine();
  }
  return createWebAudioEngine();
}
