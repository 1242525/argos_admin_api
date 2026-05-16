# Export 기능 구현 — 작업 내역

Purple Team 시나리오 ⑥⑦⑧⑨ 단계 구현.  
VPN 진입 후 인증 없이 고객/디바이스 데이터를 대량 export할 수 있는 취약한 엔드포인트를 의도적으로 구성.

---

## 공격 시나리오에서의 역할

```
① GitHub credential leak
② VPN 로그인 성공 (MFA 없는 계정)
③ 내부망 접근
④ 관리자 페이지 접근
⑤ Swagger(/docs) 로 API 구조 확인
⑥ 고객 데이터 export 기능 발견         ← 이 기능
⑦ 관리자 권한 검증 미흡 확인           ← 의도적 취약점
⑧ 대량 export 수행                     ← 이 기능
⑨ MinIO/외부 저장소 유출               ← 이 기능
```

---

## 백엔드 변경사항 (argos-ops: /home/DBmanager/argos-api/)

### 1. 신규 파일: `routers/export.py`

**왜 만들었나**  
기존 `routers/admin.py`는 모든 엔드포인트에 `verify_admin_token` 인증이 걸려 있음.  
export는 **의도적으로 인증 없이** 접근 가능하게 별도 라우터로 분리.

**엔드포인트 3개**

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/admin/export/customers` | 고객 데이터 export |
| POST | `/admin/export/devices` | 디바이스 데이터 export |
| GET | `/admin/export/download/{filename}` | export된 파일 다운로드 |

**쿼리 파라미터**

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `tenant_id` | null | 특정 테넌트 필터. 없으면 전체 |
| `fmt` | csv | `csv` 또는 `json` |

**응답 예시**
```json
{
  "record_count": 4821,
  "filename": "customers_20260516_073934.csv",
  "minio_url": "http://10.10.4.2:9000/exports/customers_20260516_073934.csv",
  "download_url": "/admin/export/download/customers_20260516_073934.csv"
}
```

**의도적 취약점 목록**

| 취약점 | 설명 |
|---|---|
| **인증 없음** | JWT 없이 누구나 호출 가능. VPN만 들어오면 바로 사용 가능 |
| **IDOR** | `tenant_id` 파라미터 소유권 검증 없음. 다른 테넌트 데이터 조회 가능 |
| **레코드 수 제한 없음** | `tenant_id` 없으면 전체 DB를 한 번에 export |
| **rate limit 없음** | 반복 호출로 대량 연속 export 가능 |
| **MinIO 공개 URL** | Presigned URL 없이 영구 공개 URL 반환. URL만 알면 인증 없이 접근 가능 |
| **path traversal** | `/export/download/{filename:path}` — 경로 검증 없음 |

**파일 저장 위치**: `/tmp/argos-exports/` (argos-ops 로컬)  
**MinIO 업로드**: `http://10.10.4.2:9000/exports/` 버킷 (설정된 경우)

---

### 2. 수정 파일: `main.py`

**변경 내용**: export 라우터 등록

```python
# 추가된 줄
from routers import auth, admin, export
app.include_router(export.router, prefix="/admin", tags=["export"])
```

**왜**: FastAPI는 라우터를 main.py에 등록해야 엔드포인트가 활성화됨.

---

### 3. 패키지 설치

```bash
pip install minio
```

MinIO Python 클라이언트. MinIO가 구성되지 않아도 export 자체는 동작하며 `minio_url`이 null로 반환됨.

---

### 백엔드 재현 방법 (처음 구축 시)

```bash
ssh argos-ops
sudo su - DBmanager
cd ~/argos-api
source venv/bin/activate

# 패키지 설치
pip install minio

# export.py 생성 (파일 내용은 아래 참고)
# main.py 라우터 등록
sed -i 's/from routers import auth, admin/from routers import auth, admin, export/' ~/argos-api/main.py
sed -i '/app.include_router(admin.router/a app.include_router(export.router, prefix="/admin", tags=["export"])' ~/argos-api/main.py

# 서버 재시작
sudo fuser -k 8001/tcp
uvicorn main:app --host 0.0.0.0 --port 8001 &
```

---

### `routers/export.py` 전체 코드

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from db import get_conn, release_conn
from middleware.auth import verify_admin_token
import csv, io, json, os
from datetime import datetime

# 의도적 취약점: 인증 없음 (VPN 접속만으로 사용 가능)
router = APIRouter()

MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT",   "http://10.10.4.2:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET     = "exports"
EXPORT_DIR       = "/tmp/argos-exports"

def query(sql, params=None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params or ())
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        release_conn(conn)

def to_csv(rows):
    if not rows:
        return ""
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()

def upload_minio(filename, content, content_type="text/csv"):
    try:
        from minio import Minio
        host = MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
        client = Minio(host, access_key=MINIO_ACCESS_KEY,
                       secret_key=MINIO_SECRET_KEY, secure=False)
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
        data = content.encode("utf-8")
        client.put_object(MINIO_BUCKET, filename,
                          io.BytesIO(data), len(data), content_type=content_type)
        # 의도적 취약점: Presigned URL 없이 영구 공개 URL 반환
        return f"{MINIO_ENDPOINT}/{MINIO_BUCKET}/{filename}"
    except Exception:
        return None

def do_export(table, tenant_id, fmt):
    # 의도적 취약점: tenant_id 소유권 검증 없음 (IDOR)
    if tenant_id:
        rows = query(f"SELECT * FROM {table} WHERE tenant_id = %s", (tenant_id,))
    else:
        # 의도적 취약점: 레코드 수 제한 없음
        rows = query(f"SELECT * FROM {table}")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    if fmt == "json":
        content = json.dumps(rows, default=str, ensure_ascii=False, indent=2)
        filename, ctype = f"{table}_{ts}.json", "application/json"
    else:
        content = to_csv(rows)
        filename, ctype = f"{table}_{ts}.csv", "text/csv"

    os.makedirs(EXPORT_DIR, exist_ok=True)
    with open(os.path.join(EXPORT_DIR, filename), "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "record_count": len(rows),
        "filename": filename,
        "minio_url": upload_minio(filename, content, ctype),
        "download_url": f"/admin/export/download/{filename}",
    }

@router.post("/export/customers")
def export_customers(
    tenant_id: str = Query(None, description="테넌트 ID (없으면 전체)"),
    fmt: str = Query("csv", description="csv | json"),
):
    return do_export("customers", tenant_id, fmt)

@router.post("/export/devices")
def export_devices(
    tenant_id: str = Query(None, description="테넌트 ID (없으면 전체)"),
    fmt: str = Query("csv", description="csv | json"),
):
    return do_export("devices", tenant_id, fmt)

# 의도적 취약점: filename 경로 검증 없음 (path traversal 가능)
@router.get("/export/download/{filename:path}")
def download_export(filename: str):
    filepath = os.path.join(EXPORT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="파일 없음")
    ext = filename.rsplit(".", 1)[-1]
    media = "application/json" if ext == "json" else "text/csv"
    def stream():
        with open(filepath, "rb") as f:
            yield from f
    return StreamingResponse(stream(), media_type=media,
                             headers={"Content-Disposition": f"attachment; filename={filename}"})
```

---

## 프론트엔드 변경사항 (로컬: argos_admin_api/)

### 1. 수정 파일: `src/api.js`

**변경 내용**: export API 호출 함수 2개 추가

```javascript
export const exportCustomers = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/customers?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};

export const exportDevices = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/devices?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};
```

**왜**: 백엔드 export 엔드포인트를 프론트에서 호출하기 위한 함수.  
`<a href>` 대신 `fetch()`를 사용하는 이유는 브라우저의 일반 링크 클릭은 Authorization 헤더를 전송하지 않기 때문.

---

### 2. 수정 파일: `src/pages/TenantsPage.jsx`

**변경 내용**
- `exportCustomers` import 추가
- `exporting`, `exportResult` state 추가
- `handleExport()` 함수 추가
- FilterBar 옆에 `↓ CSV` / `↓ JSON` 버튼 추가
- export 결과 표시 영역 추가 (레코드 수, 파일명, MinIO 링크, 다운로드 링크)

**동작**: 테넌트 필터가 선택된 상태면 해당 테넌트만, 없으면 전체 고객 데이터 export.

---

### 3. 수정 파일: `src/pages/DevicesPage.jsx`

**변경 내용**: TenantsPage와 동일 구조로 디바이스 export 버튼 추가.

---

## 현재 가능한 것

### Red Team 관점

```bash
# VPN 진입 후 JWT 없이 바로 호출 가능
curl -X POST "http://10.10.3.2:8001/admin/export/customers?fmt=csv"
curl -X POST "http://10.10.3.2:8001/admin/export/devices?fmt=json"

# 특정 테넌트 데이터만 (IDOR)
curl -X POST "http://10.10.3.2:8001/admin/export/customers?tenant_id=tenant_001"

# 다른 테넌트 데이터도 (소유권 검증 없음)
curl -X POST "http://10.10.3.2:8001/admin/export/customers?tenant_id=tenant_002"

# Swagger로 API 구조 확인
# http://10.10.3.2:8001/docs
```

### 관리자 관점

- Tenants / Devices 페이지에서 `↓ CSV`, `↓ JSON` 버튼으로 export
- 현재 필터된 테넌트 기준으로 export
- export 후 파일명, 레코드 수, MinIO 링크 표시

---

## 남은 작업

| 항목 | 담당 | 상태 |
|---|---|---|
| MinIO 설치 및 버킷 설정 (argos-data) | - | 미완 |
| PostgreSQL 테스트 데이터 seed | - | 미완 |
| OpenVPN 구성 + MFA 차등 설정 (argos-dmz) | - | 미완 |
| GitHub/Gitea에 VPN credential 의도적 노출 | - | 미완 |
| Wazuh export 이벤트 탐지 룰 | - | 미완 |
