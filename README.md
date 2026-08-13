# Saju Me · 사주 해석

이름·생년월일·태어난 시간·성별·양력/음력을 입력하면 **음뽀쨔무**가 **Gemini**로 사주 명식(성격·기질·재능)을 한국어로 읽어 주는 웹 서비스입니다.

로그인 없이도 해석을 받을 수 있고, 비회원은 앞부분만 미리 봅니다. Google로 로그인하면 전체 해석과 기록이 저장됩니다.

## 주요 기능

- 사주 입력 폼 (이름, 생년월일, 시간, 성별, 양력/음력)
- Gemini Interactions API (`gemini-3.6-flash`) 스트리밍 해석
- 로딩 스켈레톤 + 음뽀 마스코트 애니메이션
- 마크다운 결과 렌더링 (`react-markdown`)
- **비회원 미리보기**: 해석의 약 절반만 공개, 로그인하면 나머지 공개
- **Google 로그인** (Supabase Auth, PKCE)
- 프로필 온보딩/수정 (`users`)
- 해석 기록 저장·조회·삭제 (`saju_readings`)
- 같은 사주(이름·생일·시간·성별·양/음력)는 다시 요청하지 않고 기존 기록을 재사용
- 비회원 입력/결과는 `sessionStorage`에 잠깐 보관했다가, 로그인 후 자동 저장
- Google Analytics 이벤트 (로그인, 해석, 저장, 삭제 등)

## 기술 스택

- React 19 + Vite 8
- `@google/genai` (Gemini Interactions API)
- `@supabase/supabase-js` (Auth + Postgres)
- `react-markdown`
- Vercel 배포

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env`를 만듭니다.

```bash
cp .env.example .env
```

`.env` 내용:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```

| 변수 | 설명 |
| --- | --- |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable(anon) 키 |

> `.env`는 Git에 올리지 마세요. (`.gitignore`에 포함되어 있습니다.)

### 3. Supabase 준비

Google 로그인을 쓰려면 Supabase에서 다음이 필요합니다.

- Authentication → Google provider 활성화
- Redirect URL에 로컬(`http://localhost:5173`)과 배포 도메인 등록
- `users`, `saju_readings` 테이블과 RLS 정책

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

### 5. 빌드

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```
src/
  App.jsx                 # 화면 조립
  main.jsx                # 앱 진입점
  index.css               # 전역 토큰/배경
  api/                    # Supabase 프로필·해석 CRUD
  components/
    auth/                 # Google 로그인 패널
    common/               # 토스트, 에러 배너
    profile/              # 프로필 필드·모달
    readings/             # 사이드바, 기록 목록
    saju/                 # 헤더, 입력 폼, 결과, 로딩 마스코트
  hooks/                  # 앱 상태와 비즈니스 로직
  lib/                    # supabase, gemini, analytics
  utils/                  # 게스트 저장, 마크다운, 포맷
  constants/              # 마스코트/스토리지 키
  styles/                 # 기능별 CSS
public/assets/            # 음뽀 이미지
```

## 사용 방법

1. 이름, 생년월일, 성별, 양력/음력을 입력합니다. (태어난 시간은 선택)
2. **해석해주겠다쨔무**를 누릅니다.
3. 잠시 스켈레톤이 보인 뒤, 해석 문구가 스트리밍으로 채워집니다.
4. 비회원이면 앞부분만 보이고, Google 로그인 후 전체 해석과 기록이 저장됩니다.
5. 로그인한 사용자는 왼쪽 **음뽀쨔무의 기록**에서 이전 해석을 다시 보거나 지울 수 있습니다.

## 주의사항

- `VITE_` 환경 변수는 브라우저에 노출됩니다. Gemini 키는 **학습/개인 용도**에 적합하고, 공개 배포 시에는 서버 측으로 옮기는 것을 권장합니다.
- 해석 결과는 AI 생성 콘텐츠이며, 참고용입니다.
- 비회원 미리보기와 입력값은 탭을 닫으면 사라질 수 있습니다. 저장이 필요하면 로그인하세요.
