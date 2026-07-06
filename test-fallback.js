import { isFallbackActive, getLocalDbPath } from './src/db/index.ts';
console.log("Fallback active?", isFallbackActive(), "Path:", getLocalDbPath());
