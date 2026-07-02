# Apex Button 🔘

*단 하나의 클릭, 단 한 명의 지배자.*

Apex Button은 전 세계 단 한 명만이 누를 수 있는 버튼을 두고 벌이는 실시간 인터랙티브 경쟁 서비스입니다. 찰나의 순간에 버튼을 눌러 전 세계의 '지배자(Sovereign)'가 되어보세요.

## 🚀 핵심 기능

*   **극한의 희소성**: 버튼은 전 세계에서 단 한 명만 누를 수 있습니다.
*   **원자적 동시성 제어**: Redis Lua Script를 활용하여 수만 명의 동시 요청 속에서도 가장 먼저 도착한 단 한 명의 승자만을 정확히 가려냅니다.
*   **명예의 전당 (Hall of Fame)**: 역대 지배자들의 기록과 반응 속도를 영구적으로 아카이빙합니다.
*   **압도적 몰입감 (High-Tension UX)**: Next.js와 Framer Motion으로 구현된 미니멀하고 강렬한 인터페이스가 극도의 긴장감을 선사합니다.

## ⚙️ 기술 스택

*   **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Socket.io-client
*   **Backend**: Node.js, Fastify, Socket.io
*   **Database/Cache**: Redis (상태 관리 및 원자적 승자 판정)

## 🛠 실행 방법

### 사전 요구 사항

*   Node.js (v20+)
*   Redis 서버

### 설치 및 실행

1.  **저장소 클론**:
    ```bash
    git clone git@github.com:sonic240612/apex-button.git
    cd apex-button
    ```

2.  **Redis 실행**:
    로컬 환경에서 Redis 서버가 6379 포트로 실행 중이어야 합니다.
    ```bash
    # Redis가 설치된 경우
    redis-server
    ```

3.  **백엔드 실행**:
    ```bash
    cd backend
    npm install
    npm start
    ```

4.  **프론트엔드 실행**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

5.  **접속**:
    브라우저에서 `http://localhost:3000`에 접속하여 전 세계 유저들과 경쟁을 시작하세요.

## 📜 라이선스
이 프로젝트는 오픈 소스로 제공됩니다.
