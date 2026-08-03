import { roleLabel, type AudienceRole } from "./audienceRole";
import { CATEGORIES } from "./mockData";

export type ExcelTopping = {
  id?: string;
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

export type ExcelComment = {
  id: string;
  toppingId: string;
  sessionId: string;
  text: string;
  role: AudienceRole | null;
  authorKind: "audience" | "presenter";
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
  comments?: ExcelComment[];
  /** sessionId → 제목/카테고리 */
  meta?: Map<string, SessionMeta>;
}

/** 질문 / 키워드응답 / 댓글 / 발문목록 시트를 담은 xlsx를 브라우저에서 다운로드. */
export async function downloadToppingsWorkbook({
  fileName,
  toppings,
  prompts = [],
  comments = [],
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

  const commentCountByTopping = new Map<string, number>();
  for (const c of comments) {
    commentCountByTopping.set(c.toppingId, (commentCountByTopping.get(c.toppingId) ?? 0) + 1);
  }
  const questionTextById = new Map<string, string>();
  for (const q of questions) if (q.id) questionTextById.set(q.id, q.text);

  const sheet1: Cell[][] = [
    H([
      "세션",
      "카테고리",
      "작성일시",
      "역할",
      "질문 내용",
      "좋아요",
      "고정",
      "답변완료",
      "댓글 수",
    ]),
    ...questions.map((q) => [
      T(titleOf(q.sessionId)),
      T(catOf(q.sessionId)),
      T(fmtDateTime(q.createdAt)),
      T(roleLabel(q.role)),
      T(q.text),
      N(q.likes),
      T(q.pinned ? "O" : ""),
      T(q.addressed ? "O" : ""),
      N(q.id ? commentCountByTopping.get(q.id) ?? 0 : 0),
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

  const questionOrder = new Map<string, number>();
  questions.forEach((q, i) => {
    if (q.id) questionOrder.set(q.id, i);
  });

  const sheetComments: Cell[][] = [
    H(["세션", "카테고리", "작성일시", "작성자", "역할", "질문 내용", "댓글 내용"]),
    ...comments
      .slice()
      .sort(
        (a, b) =>
          (questionOrder.get(a.toppingId) ?? Number.MAX_SAFE_INTEGER) -
            (questionOrder.get(b.toppingId) ?? Number.MAX_SAFE_INTEGER) ||
          a.createdAt - b.createdAt,
      )
      .map((c) => [
        T(titleOf(c.sessionId)),
        T(catOf(c.sessionId)),
        T(fmtDateTime(c.createdAt)),
        T(c.authorKind === "presenter" ? "발표자" : "청중"),
        T(c.authorKind === "presenter" ? "" : roleLabel(c.role)),
        T(questionTextById.get(c.toppingId) ?? ""),
        T(c.text),
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

  await writeXlsxFile([
    { sheet: "질문", data: sheet1 as never, columns: widths([28, 16, 18, 10, 60, 9, 7, 10, 9]) },
    { sheet: "키워드응답", data: sheet2 as never, columns: widths([28, 16, 18, 10, 40, 40]) },
    { sheet: "댓글", data: sheetComments as never, columns: widths([28, 16, 18, 10, 10, 50, 50]) },
    { sheet: "발문목록", data: sheet3 as never, columns: widths([28, 16, 50, 18, 10]) },
  ]).toFile(fileName);
}

