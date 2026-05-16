# RBAC 설정 및 DB Seed 작업 내역

---

## 1. 계정별 역할 및 권한

### staff_accounts 계정 목록

| 계정 | 비밀번호 | role | 비고 |
|---|---|---|---|
| admin | (기존) | admin | 원래 있던 계정 |
| firmware-admin | firmware123! | admin | 낚시용 (VPN MFA로 막힘) |
| deploy-bot | deploy123! | operator | 핵심 공격 대상 계정 |
| ops-monitor | monitor123! | viewer | 읽기 전용 |

---

### role별 가능한 것

| 기능 | admin | operator | viewer | 인증 없음 |
|---|---|---|---|---|
| Admin API 로그인 | O | O | O | X (401) |
| 전체 조회 GET | O | O | O | X (401) |
| export (CSV/JSON) | O | O | X (403) | X (401) |
| alert 수정 PATCH | O | O | O | X (401) |
| OTA 배포 POST | O | O | O | X (401) |

---

### 공격 시나리오 기준 계정별 흐름

```
dev01, dev02:
→ VPN MFA로 막힘 → 공격 실패 (낚시용)

firmware-admin:
→ VPN MFA로 막힘 → 공격 실패 (낚시용)

ops-monitor:
→ VPN 성공 (MFA 없음)
→ Admin 로그인 가능 (role: viewer)
→ 조회만 가능, export 불가 (403)

deploy-bot:
→ VPN 성공 (MFA 없음)          ← GitHub credential 탈취
→ Admin 로그인 가능 (role: operator)
→ export 가능
→ tenant_id 없이 요청 → 전체 테넌트 데이터 유출  ← 취약점
```

---

## 2. 취약점 구조

### 공격 흐름

```
① GitHub git log에서 deploy-bot credential 발견
   VPN_USER=deploy-bot / VPN_PASS=deploy123!

② VPN 로그인 성공 (MFA 없음)
   → 내부망 진입

③ 10.10.3.2:8001/docs 접근
   → export 엔드포인트 발견

④ /auth/admin/login 으로 JWT 발급
   → role: operator

⑤ POST /admin/export/customers (tenant_id 없음)
   → tenant 검증 없음
   → tenant-a + tenant-b 전체 데이터 한 번에 export

⑥ MinIO에 파일 저장
   → http://10.10.4.2:9000/exports/customers_xxx.csv
   → VPN 접속 후 언제든 재접근 가능
```

### 취약점 분류

```
OWASP A01: Broken Access Control
→ operator 계정이 전체 테넌트 데이터 export 가능
→ 테넌트 간 데이터 격리 없음
→ tenant_id 소유권 검증 없음
```

---

## 3. 백엔드 변경사항

### middleware/auth.py

```python
# 변경 전
["admin", "operator", "developer"]

# 변경 후 (viewer 추가)
["admin", "operator", "developer", "viewer"]
```

### routers/export.py

```
인증:    JWT 필요 (없으면 401)
role 체크: operator, admin만 export 가능 (viewer는 403)
취약점:  tenant_id 소유권 검증 없음 → 전체 데이터 export 가능
MinIO:   export 시 자동 업로드, 공개 URL 반환
```

---

## 4. DB Seed 데이터

### 현재 데이터 현황

| 테이블 | 건수 |
|---|---|
| customers | 101명 |
| devices | 62개 |
| media_events | 303개 |
| tenants | 2개 (tenant-a, tenant-b) |
| staff_accounts | 4개 |

### 테넌트별 분포

```
tenant-a: customers 50명, devices 30개
tenant-b: customers 50명, devices 30개
```

### seed 데이터 특징

```
customers:
- 한국 이름 기반 username
- gmail/naver/kakao 등 이메일
- account_status: active(80%), locked/disabled(20%)
- 비밀번호: password123 (bcrypt 해시)

devices:
- 펌웨어 버전: v2.1.0 ~ v3.0.0
- device_status: online/offline/error
- 설치 위치: 서울/부산/인천 등 실제 지역

media_events:
- event_type: motion_detected, door_opened 등
- 최근 90일 내 랜덤 시간
- MinIO object key 포함
```

---

## 5. 남은 작업

| 항목 | 담당 | 상태 |
|---|---|---|
| OpenVPN 구성 + MFA 차등 설정 (argos-dmz) | 팀원 | 미완 |
| GitHub/Gitea VPN credential 의도적 노출 | 팀원 | 완료 |
| Wazuh export 탐지 룰 | 팀원 | 미완 |
| Red Team 리허설 | 전체 | 미완 |
