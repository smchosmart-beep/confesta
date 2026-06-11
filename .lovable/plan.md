## 작업
`src/routes/presenter.tsx`의 두 영역(토핑 키워드 응답, 질문 목록)을 "청중 토핑 입력 제어(ToppingGateControl)" 카드와 동일한 카드 스타일로 감쌉니다.

## 변경 내용 (lines 438-456)

**현재**: 제목/설명/내용이 그리드 컬럼 안에 그냥 나열되어 있음.

**변경 후**: 각 섹션을 카드 컨테이너로 감쌈
- 카드 스타일: `bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream` (상단 "잠금 해제됨" 카드 및 ToppingGateControl과 동일한 톤)
- 카드는 컬럼 높이를 채우도록 `flex flex-col min-h-0 flex-1` 적용
- 헤더(h2 제목 + 설명 문구)를 카드 안쪽 상단에 두고, 그 아래에 콘텐츠(AnswerPromptTabs / QuestionStream)를 스크롤 영역으로 배치

### 좌측 컬럼 (토핑 키워드)
```
<div className="bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream flex-1 min-h-0 flex flex-col gap-2">
  <h2>토핑 키워드 (응답)</h2>
  <p>청중이 보낸 키워드 응답 토핑이 실시간으로 반영됩니다.</p>
  <div className="flex-1 min-h-0 flex flex-col">
    <AnswerPromptTabs sessionId={sessionId} />
  </div>
</div>
```

### 우측 컬럼 (질문 목록)
ToppingGateControl 카드는 그대로 두고, 그 아래 질문 목록만 카드로 감쌈:
```
<div className="bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream flex-1 min-h-0 flex flex-col gap-2">
  <h2>질문 목록</h2>
  <div className="flex-1 min-h-0 overflow-y-auto">
    <QuestionStream sessionId={sessionId} />
  </div>
</div>
```

다른 동작/로직 변경 없음, 순수 UI 래핑만 수행.
