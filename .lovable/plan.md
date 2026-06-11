## 문제
`ToppingTubScene`은 xl 화면에서 고정 높이 `720px`를 가지지만(`src/components/confesta/ToppingTubScene.tsx:113`), 부모 그리드가 `xl:h-[calc(100vh-160px)]`로 뷰포트 높이에 묶여 있어 카드가 720px보다 작아지면 토핑 애니메이션이 카드 밖으로 오버플로우됩니다.

## 변경
`src/routes/presenter.tsx` (line 408)

- `xl:h-[calc(100vh-160px)]` 제거 → 그리드가 콘텐츠 자연 높이로 늘어남
- 좌측 컬럼의 토핑 카드가 720px 씬을 온전히 감싸도록 확장
- 그리드의 기본 `align-items: stretch` 덕분에 우측 컬럼(질문 목록 카드)도 동일한 라인까지 늘어남 → 이전 요청("질문 목록 카드 끝 라인 맞추기")도 함께 해결

```
- <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:h-[calc(100vh-160px)]">
+ <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
```

다른 코드/로직 변경 없음.
