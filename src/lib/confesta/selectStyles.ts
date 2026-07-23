// 앱 톤(핑크/크림, 둥근) 통일된 shadcn Select 스타일 상수
export const selectTriggerCls =
  "rounded-full bg-card/90 border border-white/70 shadow-cream text-sm font-bold h-auto px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-300 hover:bg-card transition cursor-pointer";

export const selectContentCls =
  "rounded-2xl border border-white/70 bg-card/95 backdrop-blur shadow-cream p-1";

export const selectItemCls =
  "rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer focus:bg-grad-sunset-soft focus:text-pink-700 data-[state=checked]:bg-grad-strawberry data-[state=checked]:text-white";

// 세션명이 긴 경우 줄바꿈되어 오른쪽이 잘리지 않도록 audience 세션 선택 전용 스타일
export const sessionSelectTriggerCls =
  `${selectTriggerCls} whitespace-normal text-left min-h-9 leading-snug [&>span]:block [&>span]:whitespace-normal [&>span]:break-words`;

export const sessionSelectContentCls =
  `${selectContentCls} max-w-[calc(100vw-2rem)] overflow-x-hidden`;

export const sessionSelectItemCls =
  `${selectItemCls} whitespace-normal text-left h-auto break-words leading-snug pr-8`;
