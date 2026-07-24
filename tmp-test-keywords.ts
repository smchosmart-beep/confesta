import { extractKeywords } from "./src/lib/confesta/keywords.ts";

const result = extractKeywords([
  "좋아요",
  "좋아요",
  "굿",
  "네",
  "O",
  "X",
  "좋다",
  "이해했어요",
  "빠르다",
  "빠르다",
]);

console.log(JSON.stringify(result, null, 2));
