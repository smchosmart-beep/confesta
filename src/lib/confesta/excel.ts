import { roleLabel, type AudienceRole } from "./audienceRole";
import { CATEGORIES } from "./mockData";

export type ExcelTopping = {
  sessionId: string;
  text: string;
  kind: "question" | "answer";
  promptId: string | null;
  promptText?: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  role: AudienceRole | null;
  createdAt: number;
};

export type ExcelPrompt = {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
};

export type SessionMeta = {
  title: string;
  category: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function safeFileNamePart(s: string): string {
  return (s || "무제").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

const categoryLabel = (key: string | null | undefined) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? "";

type Cell = { value: string | number | null; type?: unknown; fontWeight?: "bold" };

const H = (labels: string[]): Cell[] =>
  labels.map((v) => ({ value: v, fontWeight: "bold" as const }));

const T = (v: string | null | undefined): Cell => ({ value: v ?? "", type: String });
const N = (v: number): Cell => ({ value: v, type: Number });

export interface WorkbookInput {
  fileName: string;
  toppings: ExcelTopping[];
  prompts?: ExcelPrompt[];
  /** sessionId → 제목/카테고리 */
  meta?: Map<string, SessionMeta>;
}

/** 질문 / 키워드응답 / 발문목록 3개 시트를 담은 xlsx를 브라우저에서 다운로드. */
export async function downloadToppingsWorkbook({
  fileName,
  toppings,
  prompts = [],
  meta,
}: WorkbookInput) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const titleOf = (sid: string) => meta?.get(sid)?.title || sid;
  const catOf = (sid: string) => categoryLabel(meta?.get(sid)?.category);

  const promptTextById = new Map<string, string>();
  for (const p of prompts) promptTextById.set(p.id, p.text);
  for (const t of toppings) {
    if (t.promptId && t.promptText && !promptTextById.has(t.promptId)) {
      promptTextById.set(t.promptId, t.promptText);
    }
  }

  const questions = toppings
    .filter((t) => t.kind === "question")
    .sort((a, b) => a.createdAt - b.createdAt);
  const answers = toppings
    .filter((t) => t.kind === "answer")
    .sort((a, b) => a.createdAt - b.createdAt);

  const answerCountByPrompt = new Map<string, number>();
  for (const a of answers) {
    if (!a.promptId) continue;
    answerCountByPrompt.set(a.promptId, (answerCountByPrompt.get(a.promptId) ?? 0) + 1);
  }

  const sheet1: Cell[][] = [
    H(["세션", "카테고리", "작성일시", "역할", "질문 내용", "좋아요", "고정", "답변완료"]),
    ...questions.map((q) => [
      T(titleOf(q.sessionId)),
      T(catOf(q.sessionId)),
      T(fmtDateTime(q.createdAt)),
      T(roleLabel(q.role)),
      T(q.text),
      N(q.likes),
      T(q.pinned ? "O" : ""),
      T(q.addressed ? "O" : ""),
    ]),
  ];

  const sheet2: Cell[][] = [
    H(["세션", "카테고리", "작성일시", "역할", "발문", "응답 내용"]),
    ...answers.map((a) => [
      T(titleOf(a.sessionId)),
      T(catOf(a.sessionId)),
      T(fmtDateTime(a.createdAt)),
      T(roleLabel(a.role)),
      T(a.promptId ? promptTextById.get(a.promptId) ?? "" : "(분류 없음)"),
      T(a.text),
    ]),
  ];

  const sheet3: Cell[][] = [
    H(["세션", "카테고리", "발문", "생성일시", "응답 수"]),
    ...prompts
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((p) => [
        T(titleOf(p.sessionId)),
        T(catOf(p.sessionId)),
        T(p.text),
        T(fmtDateTime(p.createdAt)),
        N(answerCountByPrompt.get(p.id) ?? 0),
      ]),
  ];

  const widths = (ws: number[]) => ws.map((width) => ({ width }));

  await writeXlsxFile([sheet1, sheet2, sheet3] as never, {
    sheets: ["질문", "키워드응답", "발문목록"],
    columns: [
      widths([28, 16, 18, 10, 60, 9, 7, 10]),
      widths([28, 16, 18, 10, 40, 40]),
      widths([28, 16, 50, 18, 10]),
    ],
    fileName,
  });
}
