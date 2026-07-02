# Apex Button 🔘

> **실시간 라이브 데모**: [https://apex-button.vercel.app](https://apex-button.vercel.app)

*단 하나의 클릭, 단 한 명의 지배자.*

Apex Button은 전 세계 단 한 명만이 누를 수 있는 버튼을 두고 벌이는 실시간 인터랙티브 경쟁 서비스입니다. 찰나의 순간에 버튼을 눌러 전 세계의 '지배자(Sovereign)'가 되어보세요.

본 프로젝트는 **100% Vercel Serverless 및 Vercel KV(Upstash Redis) 환경에 최적화**되어 별도의 상시 가동 서버 유지 비용 없이 영구 무료로 고성능 배포가 가능하도록 설계되었습니다.

---

## 🚀 핵심 기능

*   **극강의 희소성**: 버튼은 전 세계에서 단 한 명만 누를 수 있습니다.
*   **서버리스 아키텍처 (Serverless)**: 상시 구동 서버가 필요 없는 Stateless API 구조로 배포 비용이 0원입니다.
*   **원자적 트랜잭션 제어**: Redis Lua Script를 활용하여 수만 명의 동시 클릭 요청 속에서도 물리적으로 가장 먼저 도달한 단 한 명의 승자만을 정확히 가려냅니다.
*   **명예의 전당 (Hall of Fame)**: 역대 지배자들의 기록과 반응 속도(ms)를 영구적으로 기록하고 아카이빙합니다.
*   **현대적인 몰입감 (Modern Dark Mode UI)**: Next.js와 Framer Motion으로 구현된 세련된 인터페이스와 부드러운 애니메이션이 극도의 긴장감을 제공합니다.

## ⚙️ 기술 스택

*   **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
*   **Backend**: Node.js (Vercel Serverless Functions)
*   **Database/Cache**: Upstash Redis / Vercel KV (상태 계산 및 원자적 승자 판정)

## 🛠 아키텍처 원리 (How it works)

Vercel Serverless 환경은 백그라운드에서 `setInterval` 타이머를 돌릴 수 없습니다. 이를 극복하기 위해 본 프로젝트는 다음과 같이 작동합니다.

1.  **시간 동적 계산**: 타이머 값을 매초 깎는 대신, 다음 버튼 활성화 시각(`target_active_time`)을 Redis에 타임스탬프로 기록합니다.
2.  **Stateless Polling**: 클라이언트가 매초 `/state` API를 호출하면, 서버는 현재 시각과 `target_active_time`을 비교하여 남은 시간을 동적으로 계산해 반환합니다.
3.  **원자적 승자 독식**: 버튼이 활성화된 순간 클릭 요청이 들어오면, Redis Lua Script가 실행되어 최초 1등만 기록하고 상태를 즉시 `decision`으로 잠금 처리하여 동시성 문제를 완벽히 방어합니다.

---

## 💻 실행 및 배포 방법

### 1. 로컬 개발 환경 실행

#### 사전 요구 사항
*   Node.js (v20+)
*   로컬 Redis 서버 실행 중 (`redis-server`)

#### 실행 순서
1.  **저장소 클론**:
    ```bash
    git clone git@github.com:sonic240612/apex-button.git
    cd apex-button
    ```
2.  **백엔드 로컬 실행**:
    ```bash
    cd backend
    npm install
    # 로컬 Redis에 연결 (기본값 localhost:6379)
    npm start
    ```
3.  **프론트엔드 로컬 실행**:
    ```bash
    cd apex-button
    npm install
    npm run dev
    ```
4.  `http://localhost:3000`에서 로컬 작동을 테스트합니다.

---

### 2. Vercel로 100% 무료 배포하기 (Production)

본 프로젝트는 Vercel과 Upstash Redis를 사용하여 완전 무료로 즉시 배포가 가능합니다.

#### 1단계: Upstash Redis 데이터베이스 준비
1.  [Upstash](https://upstash.com/)에 가입하고 무료 Redis DB를 하나 생성합니다. (리전은 `Seoul` 권장)
2.  제공되는 `redis://default:...` 형태의 **Connection String (REDIS_URL)**을 복사합니다.

#### 2단계: 백엔드 배포 (`apex-backend`)
1.  Vercel에서 새 프로젝트를 생성하고 저장소를 연결합니다.
2.  **Root Directory**를 `backend`로 설정합니다.
3.  **Environment Variables**에 다음을 추가합니다.
    *   `REDIS_URL` = `1단계에서 복사한 Upstash Redis 주소`
4.  배포를 완료하고 발급된 백엔드 도메인 주소(예: `https://your-backend.vercel.app`)를 복사합니다.

#### 3단계: 프론트엔드 배포 (`apex-button`)
1.  Vercel에서 또 하나의 새 프로젝트를 생성하고 동일한 저장소를 연결합니다.
2.  **Root Directory**를 `apex-button`으로 설정합니다.
3.  **Environment Variables**에 다음을 추가합니다.
    *   `NEXT_PUBLIC_API_URL` = `2단계에서 복사한 백엔드 도메인 주소`
4.  배포를 완료하면 나만의 **Apex Button** 서비스가 시작됩니다!

## 📜 라이선스
이 프로젝트는 오픈 소스로 제공됩니다.
