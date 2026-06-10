## 목표
현재 알파 PNG 마스크 기반 스쿱 카드에 **입체감(3D depth)** 을 강화. 모양/마스크는 그대로 유지.

## 변경 파일
- `src/components/confesta/ScoopCard.tsx` — 마스크 안쪽에 입체 레이어 추가
- `design.md` — 8.5 ScoopCard 섹션 입체 효과 노트 보강

## 입체감 레시피 (마스크 내부에 합성)

마스크는 box-shadow를 자르므로, **마스크 내부의 absolute 레이어들**로 라이팅을 합성한다. 위에서부터 z-stack:

1. **베이스 그라데이션** (기존) — 평면 베이스 색
2. **상단 글로시 하이라이트 (강화)** — 현재 30% 22% 위치를 키우고 밝기↑
   `radial-gradient(ellipse 70% 50% at 32% 18%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)`
3. **광택 스팟 (신규)** — 작고 선명한 specular highlight
   `radial-gradient(circle 60px at 28% 20%, rgba(255,255,255,0.9), transparent 70%)`
4. **하단 그림자/볼륨 (신규)** — 안쪽 아래를 어둡게 → 구체감
   `radial-gradient(ellipse 90% 60% at 50% 95%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 55%)`
5. **림 라이트/엣지 음영 (신규)** — 가장자리 부드러운 비네팅
   `radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)`
6. **스커트(녹는 부분) 음영 (신규)** — 본체와 스커트 경계를 진하게 → 두 덩어리로 분리되어 보임
   `linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.12) 72%, transparent 80%)`
7. 토핑 + 컨텐츠 (기존)

## 외부 drop-shadow 강화
`FLAVOR_SHADOW`를 이중 그림자로 → 가까운 sharp shadow + 멀고 부드러운 ambient shadow:
```
drop-shadow(0 6px 10px rgba(c, 0.22)) drop-shadow(0 22px 36px rgba(c, 0.30))
```

## 결과
- 위쪽에 반짝이는 하이라이트 → 광택 있는 아이스크림 느낌
- 아래쪽 안쪽 그림자 → 구(球) 볼륨감
- 본체와 흘러내린 스커트 경계 음영 → 입체적 분리
- 외부 이중 그림자 → 떠있는 듯한 깊이

마스크/실루엣은 변경 없음, 색 토큰도 그대로 유지.
