# My Portfolio

React + Vite 기반 포트폴리오 사이트입니다.

- 배포: GitHub Pages
- 글 CMS: Firebase Authentication + Cloud Firestore
- Notion 대표 작업: `src/data/posts.json`
- Notion 학습 지도: `src/data/knowledge.json` + `src/data/knowledge-current.json`
- 학습노트 본문: `public/knowledge-content.json` + `public/knowledge-content-current.json`
- 방문자 모니터링 실험: `exposurewatch-backend`

## 콘텐츠 구조

Notion에서 관리하는 프로젝트와 학습 기록을 포트폴리오에서 바로 탐색할 수 있도록 구성합니다.

- **Selected Work**: 공개 프로젝트·분석·실습을 사이트 내부 Case Study로 제공
- **Knowledge Atlas**: 기존 학습기록을 보존하면서 최신 Notion 스냅샷을 병합해 표시
- **Latest study snapshot**: 2026-08-24
- **Study Notes**: 76개
- **Learning Domains**: 10개

Knowledge Atlas의 현재 주요 분야:

- Cloud, IAM & DevSecOps
- Governance & Human Risk
- Incident Response & CTI
- Web & Application Security
- Systems & Network
- Container & Cloud Native
- **3-1학기 · 보안통계학**
- **3-1학기 · 사이버보안**
- **3-1학기 · 산업보안범죄**
- **화이트햇 · AI 오픈소스 / Open Source Supply Chain**

3-1학기에서는 Pandas·EDA·가설검정·ANOVA·회귀분석, 시스템·네트워크·웹 보안, 산업보안범죄와 인간행동·억제·사회학 이론을 정리합니다. 화이트햇 학습기록은 Cloud/DevSecOps·컨테이너·침해사고 대응·CTI·생성형 AI에 더해 Open Source Supply Chain과 Dependency Risk까지 확장합니다.

### 최신 데이터 병합 방식

기존 스냅샷을 삭제하지 않고 최신 데이터를 Overlay합니다.

1. `src/data/knowledge.json`: 기존 Knowledge Atlas 데이터
2. `src/data/knowledge-current.json`: 최신 Notion 인덱스와 3-1학기·AI 오픈소스 항목
3. `public/knowledge-content.json`: 기존 학습노트 본문
4. `public/knowledge-content-current.json`: 최신 본문

동일한 노트 ID가 두 데이터에 존재하면 **최신 데이터와 본문을 우선**합니다. 기존 기록은 그대로 fallback으로 사용할 수 있습니다.

## 자동 배포

`main` 브랜치에 변경 사항이 push되면 GitHub Actions가 의존성을 설치하고 `npm run build`를 실행한 뒤 `dist`를 GitHub Pages에 배포합니다.

Vite `base`는 저장소명 기준인 `/my_portpolio/`를 사용합니다.

## Firebase CMS

사이트의 `ADMIN` 메뉴에서 본인 Firebase 계정으로 로그인하면 글을 직접 작성, 수정, 삭제할 수 있습니다.

지원 필드:

- 제목
- slug
- 분류
- 요약
- Markdown 본문과 미리보기
- 대표 이미지 URL
- 외부 글 URL
- 태그
- 공개/비공개
- 작성일/수정일

일반 방문자는 공개 글만 읽을 수 있고, 관리자 UID와 일치하는 계정만 쓰기 작업을 할 수 있습니다.

### 1. Firebase 프로젝트 설정

1. Firebase Console에서 프로젝트를 생성합니다.
2. Web App을 등록하고 Firebase 설정값을 복사합니다.
3. Authentication에서 `Email/Password` 로그인을 활성화합니다.
4. 관리자용 이메일 사용자를 1명 생성합니다.
5. Authentication 사용자 목록에서 해당 사용자의 UID를 복사합니다.
6. Firestore Database를 생성합니다.
7. `firestore.rules`의 `PASTE_YOUR_FIREBASE_AUTH_UID`를 실제 UID로 바꾼 뒤 Firestore Rules에 배포합니다.

### 2. 로컬 환경변수

`.env.example`을 `.env`로 복사하고 값을 채웁니다.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_OWNER_UID=
```

### 3. GitHub Pages 배포용 Secrets

GitHub 저장소의 `Settings → Secrets and variables → Actions`에서 다음 Repository secrets를 만듭니다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_OWNER_UID
```

필요하면 `VITE_EXPOSUREWATCH_API_URL`도 같은 방식으로 추가합니다.

Secrets를 저장한 뒤 GitHub Actions의 `Deploy to GitHub Pages` workflow를 다시 실행하면 Firebase 설정이 포함된 사이트가 배포됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
```

## ExposureWatch Backend

ExposureWatch는 포트폴리오 방문 이벤트를 Spring Boot 백엔드에 저장하고 위험 점수, 트래픽 분류, 관리자 대시보드로 확인하는 별도 실험 프로젝트입니다. Firebase CMS와는 독립적입니다.

### 기술 스택

- Frontend: React + Vite
- Backend: Java 17, Spring Boot 3.x, Gradle
- Database: MySQL
- Dashboard: Thymeleaf + Chart.js

### 백엔드 실행

```powershell
cd exposurewatch-backend
.\gradlew.bat bootRun
```

기본 개발 주소:

```text
Backend: http://localhost:8080
Dashboard: http://localhost:8080/admin/dashboard
```

프런트엔드에서는 `.env`에 아래 값을 설정할 수 있습니다.

```env
VITE_EXPOSUREWATCH_API_URL=http://localhost:8080
```

백엔드가 실행되지 않아도 포트폴리오와 Firebase CMS는 독립적으로 동작합니다.
