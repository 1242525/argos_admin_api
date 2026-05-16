# MinIO 설정 — 작업 내역 및 개념 정리

---

## MinIO란

S3 호환 오브젝트 스토리지. 파일을 저장하고 URL로 접근할 수 있게 해주는 서버.

```
파일 저장 → http://10.10.4.2:9000/exports/customers.csv
URL만 알면 누구든 다운로드 가능 (public 버킷)
```

---

## 왜 위험한가

### API 다운로드 vs MinIO 비교

```
API 다운로드 (/admin/export/download/{filename}):
- argos-ops 서버가 켜져 있어야 함
- uvicorn 프로세스가 살아있어야 함
- /tmp/argos-exports/ 파일이 남아있어야 함
- 세션이 끊기면 재호출 필요

MinIO (http://10.10.4.2:9000/exports/...):
- argos-ops 상태와 무관
- URL 하나로 언제든 접근 가능
- 여러 명이 URL 공유 가능
- 삭제하지 않으면 영구 보관
- public 버킷이라 인증 불필요
```

### 실제 공격에서의 의미

```
Red Team이 export 수행
→ MinIO에 customers.csv 자동 업로드
→ URL 확보: http://10.10.4.2:9000/exports/customers.csv

이후 Red Team이 VPN 끊겨도:
→ 다시 VPN 접속만 하면 URL로 바로 접근 가능
→ export API 재호출 불필요
→ 팀원들과 URL 공유해서 동시 접근 가능
→ 버킷이 public이라 별도 인증 없이 다운로드
```

### 한 줄 요약

> export API는 데이터를 **한 번** 꺼내는 행위, MinIO는 꺼낸 데이터를 **영구적으로 보관**하는 거점.

---

### 실무와의 차이 (의도적 취약점)

| 항목 | 안전한 실무 | 현재 (취약점) |
|---|---|---|
| 버킷 접근 | Private + Presigned URL (5분 만료) | Public (영구 공개) |
| URL 유효기간 | 시간 제한 있음 | 무제한 |
| 접근 인증 | 서명된 URL만 가능 | URL만 알면 누구나 가능 |

---

## 공격 시나리오에서의 역할

```
⑧ 대량 export 수행  → export API 호출로 데이터 획득
⑨ MinIO 유출       → 내부망 MinIO에 영구 복사본 확보
                      VPN 재접속만으로 언제든 재접근 가능
```

MinIO가 만약 외부망에 노출된 서버였다면 VPN 없이도 인터넷에서 직접 접근 가능한 완전한 외부 유출이 됨.  
현재는 내부망(10.10.4.2)에 있어서 VPN 접속이 필요한 상태.

---

## 수행한 작업

### argos-data (10.10.4.2)

**확인한 것**
- MinIO가 Docker 컨테이너(`argos-minio`)로 이미 실행 중이었음
- 포트: 9000 (API), 9001 (Console)
- 팀원이 사전 구성한 상태

**MinIO credentials**
```
MINIO_ROOT_USER=argos-admin
MINIO_ROOT_PASSWORD=minio_password123
```

**기존 버킷 목록 (팀원이 생성)**
```
argos-firmware/
argos-sensor-logs/
argos-videos/
```

**신규 생성한 버킷**
```
exports/   ← export 기능용, public 접근 허용
```

**버킷 생성 명령어**
```bash
mc alias set local http://localhost:9000 argos-admin minio_password123
mc mb local/exports
mc anonymous set public local/exports
```

---

### argos-ops (10.10.3.2)

**`.env` 추가 항목**
```
MINIO_ENDPOINT=http://10.10.4.2:9000
MINIO_ACCESS_KEY=argos-admin
MINIO_SECRET_KEY=minio_password123
MINIO_BUCKET=exports
```

**export 시 동작 흐름**
```
POST /admin/export/customers
→ DB 조회
→ /tmp/argos-exports/ 에 파일 저장 (로컬)
→ MinIO exports/ 버킷에 업로드
→ 응답: { record_count, filename, minio_url, download_url }
```

---

## 현재 확인 가능한 사항

### export API 동작 확인 (argos-ops)
```bash
curl -X POST "http://localhost:8001/admin/export/customers?fmt=csv"
# → 200 OK, minio_url 포함 응답 반환
```

### MinIO 업로드 확인 (argos-data)
```bash
mc ls local/exports
# → export된 파일 목록 확인 가능
```

### MinIO URL 접근
```
내부망(VPN 접속 후): http://10.10.4.2:9000/exports/xxx.csv 직접 접근 가능
외부(VPN 없음):      접근 불가 (내부망 IP)
```

---

## 이후 해야 할 내용

| 항목 | 설명 | 상태 |
|---|---|---|
| PostgreSQL seed 데이터 삽입 | 가짜 고객/디바이스 데이터 넣기 | 미완 |
| OpenVPN 구성 (argos-dmz) | MFA 차등 설정, VPN 로그 활성화 | 미완 |
| GitHub/Gitea credential 노출 | VPN credential을 git log에 의도적 노출 | 미완 |
| Wazuh export 탐지 룰 | MinIO 대량 업로드 이벤트 탐지 설정 | 미완 |
| Red Team 리허설 | 전체 공격 체인 직접 수행 및 검증 | 미완 |
