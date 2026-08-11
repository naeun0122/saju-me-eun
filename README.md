# 사주 입력 (saju-me)

이름·생년월일·태어난 시간·성별·양력/음력을 입력하면 **Gemini**가 사주 기본 차트(성격·기질·재능)를 한국어로 해석해 주는 웹 서비스입니다.

## 주요 기능

- 사주 입력 폼 (이름, 생년월일, 시간, 성별, 양력/음력)
- Gemini Interactions API (`gemini-3.6-flash`)로 해석 요청
- **스트리밍** 응답: 글자가 나오는 대로 표시
- 로딩 중 **스켈레톤 UI**
- 마크다운 결과 렌더링 (`react-markdown`)

## 기술 스택

- React 19 + Vite 8
- `@google/genai` (Gemini Interactions API)
- `react-markdown`

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정

[Google AI Studio](https://aistudio.google.com/apikey)에서 Gemini API 키를 발급한 뒤, 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

`.env` 내용:

```env
VITE_GEMINI_API_KEY=여기에_발급받은_키
```

> `.env`는 Git에 올리지 마세요. (`.gitignore`에 포함되어 있습니다.)

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

### 4. 빌드

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```
src/
  App.jsx      # 입력 폼 + 결과 화면
  App.css      # UI 스타일
  gemini.js    # Gemini 스트리밍 호출 / 프롬프트
  main.jsx     # 앱 진입점
  index.css    # 전역 스타일
```

## 사용 방법

1. 이름, 생년월일, 성별, 양력/음력을 입력합니다. (태어난 시간은 선택)
2. **사주 해석하기**를 누릅니다.
3. 잠시 스켈레톤이 보인 뒤, 해석 문구가 스트리밍으로 채워집니다.

## 주의사항

- API 키는 `VITE_` 접두사로 Vite에 노출되므로, **학습/개인 용도**에 적합합니다. 공개 배포 시에는 서버 측으로 키를 옮기는 것을 권장합니다.
- 해석 결과는 AI 생성 콘텐츠이며, 참고용입니다.
