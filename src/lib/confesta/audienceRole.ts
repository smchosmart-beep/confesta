// 청중 역할 분류 (토핑에 부착되어 발표자/Admin 화면에서 색상 배지로 구분 표시됨).

export type AudienceRole = "teacher" | "specialist" | "parent" | "other";

export interface AudienceRoleDef {
  key: AudienceRole;
  ko: string;
  emoji: string;
  /** Tailwind background class for badges/buttons */
  bg: string;
  /** Tailwind text class (for label-on-light contexts) */
  text: string;
}

export const AUDIENCE_ROLES: AudienceRoleDef[] = [
  { key: "teacher",    ko: "교사",     emoji: "👩‍🏫", bg: "bg-grad-mint",       text: "text-teal-700" },
  { key: "specialist", ko: "전문직",   emoji: "🎓",   bg: "bg-grad-blueberry",  text: "text-indigo-700" },
  { key: "parent",     ko: "학부모",   emoji: "🧡",   bg: "bg-grad-strawberry", text: "text-pink-700" },
  { key: "other",      ko: "기타",     emoji: "🍦",   bg: "bg-muted",           text: "text-muted-foreground" },
];

const BY_KEY = new Map<AudienceRole, AudienceRoleDef>(
  AUDIENCE_ROLES.map((r) => [r.key, r]),
);

/** Returns role def. NULL/unknown → "기타". */
export function roleDef(role: AudienceRole | null | undefined): AudienceRoleDef {
  if (!role) return BY_KEY.get("other")!;
  return BY_KEY.get(role) ?? BY_KEY.get("other")!;
}

export function roleLabel(role: AudienceRole | null | undefined): string {
  return roleDef(role).ko;
}

export const AUDIENCE_ROLE_KEYS: AudienceRole[] = AUDIENCE_ROLES.map((r) => r.key);
