# My Portfolio

React + Vite 기반 포트폴리오 사이트입니다.

## 자동 배포

`main` 브랜치에 변경 사항이 push되면 GitHub Actions가 자동으로 의존성을 설치하고, `npm run build`를 실행한 뒤 `dist` 결과물을 GitHub Pages에 배포합니다.

Vite `base` 설정은 저장소명 기준인 `/my_portpolio/`를 사용합니다.

로컬에서 `npm run deploy`를 직접 실행하는 스크립트는 남아 있지만, 기본 배포 방식은 GitHub Actions 자동 배포입니다.

## 글 추가 방법

1. `src/data/posts.json` 열기
2. 새 글 객체 추가
3. `main`에 commit
4. GitHub Actions가 자동 배포

예시:

```json
{
  "id": 203,
  "title": "새 글 제목",
  "url": "https://example.com/post",
  "desc": "글 설명"
}
```

## 프로젝트 추가 방법

1. `src/data/projects.json` 열기
2. 새 프로젝트 객체 추가
3. `main`에 commit
4. 자동 배포

예시:

```json
{
  "id": 103,
  "title": "새 프로젝트 제목",
  "desc": "프로젝트 설명"
}
```

## Admin 영역

사이트의 공개 글과 프로젝트는 `src/data` 아래 JSON 파일을 기준으로 렌더링됩니다.

Admin 영역의 글 입력은 브라우저 임시 미리보기용 `Local Draft Only` 기능이며, 실제 배포 데이터에는 영향을 주지 않습니다.

## ExposureWatch Backend

ExposureWatch extends this portfolio with a Spring Boot based monitoring backend. The portfolio sends lightweight visitor events to the backend, where requests are stored, risk-scored, classified, and visualized in a real-time admin dashboard.

ExposureWatch monitors automated scanners, crawlers, and suspicious HTTP request patterns commonly observed on internet-facing web services. It does not claim that someone is personally attacking this portfolio.

```text
[Portfolio Frontend]
      |
      | POST /api/collect
      v
[Spring Boot ExposureWatch Backend]
      |
      v
[MySQL]
      |
      v
[Admin Dashboard /admin/dashboard]
```

### Tech Stack

- Portfolio frontend: existing React + Vite app
- Backend: Java 17, Spring Boot 3.x, Gradle
- Backend modules: Spring Web, Spring Data JPA, MySQL Driver, Spring Security, Spring WebSocket/STOMP, Thymeleaf
- Dashboard: Thymeleaf, Chart.js, minimal JavaScript
- Database: MySQL

### Run the Portfolio

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` and set:

```bash
VITE_EXPOSUREWATCH_API_URL=http://localhost:8080
```

The portfolio calls `sendExposureEvent()` on initial load. If the backend is unavailable, the request fails silently and the portfolio remains usable.

### MySQL Setup

```sql
CREATE DATABASE exposurewatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'exposurewatch'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON exposurewatch.* TO 'exposurewatch'@'localhost';
FLUSH PRIVILEGES;
```

### Run the Backend

```powershell
cd exposurewatch-backend
.\gradlew.bat bootRun
```

If `gradlew.bat` reports that Gradle is not installed, install Gradle and run the same command again.

Default development settings:

```text
Backend URL: http://localhost:8080
Dashboard: http://localhost:8080/admin/dashboard
Admin username: admin
Admin password: change-me
Allowed portfolio origin: http://localhost:5173
```

To change CORS for a deployed portfolio, set:

```bash
EXPOSUREWATCH_ALLOWED_ORIGIN=https://your-portfolio-domain.example
```

### Test Suspicious Paths

Request these local backend paths while the backend is running:

```text
http://localhost:8080/wp-admin
http://localhost:8080/.env
http://localhost:8080/.git/config
http://localhost:8080/phpmyadmin
```

These should create HIGH or CRITICAL scanner/suspicious logs.

### Safety Notes

- No exploit code is included.
- No external targets are scanned.
- No attacks are automated.
- No offensive security features are implemented.
- No real IP blocking is implemented in v1.
- Admin actions only store review decisions: SAFE, WATCH, or BLOCK_CANDIDATE.
