/**
 * `virtual:minwon-content` 는 vite.config.ts 의 `chungju-minwon-content` 플러그인이
 * 빌드 채널에 따라 걸러서 주입하는 가상 모듈이다.
 */
declare module 'virtual:minwon-content' {
  import type { MinwonDataset, MinwonItem } from './index.ts';

  export const dataset: MinwonDataset;
  export const items: MinwonItem[];
}
