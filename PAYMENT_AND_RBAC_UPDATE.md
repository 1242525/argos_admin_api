# 결제 데이터 구축 및 RBAC 업데이트

---

## 1. 결제 관련 테이블 추가 (argos-data)

### payment_info — 카드 등록 정보

```sql
CREATE TABLE payment_info (
  payment_id   VARCHAR(50) PRIMARY KEY,
  customer_id  VARCHAR(50) REFERENCES customers(customer_id),
  tenant_id    VARCHAR(50),
  card_last4   VARCHAR(4)  NOT NULL,
  card_brand   VARCHAR(30) NOT NULL,
  card_expiry  VARCHAR(10) NOT NULL,
  card_holder  VARCHAR(100),
  billing_addr TEXT,
  pg_token     VARCHAR(100),
  created_at   TIMESTAMP DEFAULT NOW()
);
```

- 고객 1명당 카드 1개 기본, 일부 고객은 2개 보유
- 총 150건 시드 데이터 삽입
- `customer_id` FK로 customers 테이블과 연결

### transactions — 결제 내역

```sql
CREATE TABLE transactions (
  transaction_id   VARCHAR(50) PRIMARY KEY,
  customer_id      VARCHAR(50) REFERENCES customers(customer_id),
  tenant_id        VARCHAR(50) REFERENCES tenants(tenant_id),
  payment_id       VARCHAR(50) REFERENCES payment_info(payment_id),
  device_id        VARCHAR(50) REFERENCES devices(device_id),
  product_type     VARCHAR(20),
  amount           INT,
  tax_amount       INT,
  discount_amount  INT DEFAULT 0,
  currency         VARCHAR(10) DEFAULT 'KRW',
  pg_name          VARCHAR(50),
  pg_tid           VARCHAR(100),
  approval_number  VARCHAR(20),
  card_last4       VARCHAR(4),
  card_brand       VARCHAR(30),
  status           VARCHAR(20),
  cancelled_at     TIMESTAMP,
  cancel_reason    VARCHAR(100),
  request_ip       VARCHAR(50),
  transaction_at   TIMESTAMP
);
```

**product_type 종류:**

| product_type | 금액 | device_id |
|---|---|---|
| device_purchase | 89,000 / 149,000 / 219,000원 | 연결됨 |
| installation | 50,000원 | 연결됨 |
| subscription | 9,900 / 19,900 / 33,000원 | NULL |
| storage | 5,500원 | NULL |

- 총 150건 시드 데이터 삽입
- `owned_device_count` 기반으로 device_purchase / installation 생성
- PG사: 토스페이먼츠, KG이니시스, NHN KCP, 카카오페이, 네이버페이

---

## 2. 백엔드 엔드포인트 추가 (argos-ops)

`routers/admin.py`에 추가:

```python
GET /admin/payment-info   # 카드 등록 정보 조회
GET /admin/transactions   # 결제 내역 조회
PATCH /admin/staff/me     # 프로필 수정 (취약점 포함)
```

### PATCH /admin/staff/me — Mass Assignment 취약점

```python
# 취약한 구현 - body 전체를 검증 없이 UPDATE
fields = ", ".join(f"{k} = %s" for k in body.keys())
values = list(body.values()) + [token["user_id"]]
cur.execute(f"UPDATE staff_accounts SET {fields} WHERE user_id = %s", values)
```

- body에 포함된 필드를 검증 없이 DB에 반영
- Burp Suite로 `"role": "admin"` 추가 시 권한 상승 가능

**공격 흐름:**
```
deploy-bot (operator) 로그인
→ 프로필 설정 → 저장
→ Burp Suite로 요청 가로채기
→ body에 "role": "admin" 추가
→ 재로그인 → admin JWT 획득
→ Payment Info / Transactions 페이지 접근
→ 결제 데이터 탈취
```

---

## 3. 프론트엔드 추가/수정

### 신규 페이지

| 페이지 | 경로 | 접근 권한 |
|---|---|---|
| Payment Info | `src/pages/PaymentInfoPage.jsx` | admin 전용 |
| Transactions | `src/pages/TransactionsPage.jsx` | admin 전용 |

- admin 이외 계정 접근 시 "접근 권한 없음" 화면 표시
- 사이드바에서도 admin만 메뉴 표시

### 프로필 설정 (Topbar)

- 우측 상단 아바타 클릭 → 드롭다운 → Settings
- username 수정 가능
- `src/components/ProfileModal.jsx` 신규 생성
- `src/components/Topbar.jsx` 드롭다운 추가

---

## 4. RBAC 업데이트

### role 변경 내역

| username | 변경 전 | 변경 후 |
|---|---|---|
| ops-monitor | viewer | developer |

### developer role 정책

| 기능 | admin | operator | developer |
|---|---|---|---|
| Admin API 로그인 | O | O | X (403) |
| 전체 조회 GET | O | O | X |
| export | O | O | X |
| alert 수정 | O | O | X |
| OTA 배포 | O | O | X |

### 백엔드 수정

**routers/auth.py** — developer 로그인 차단:
```python
if staff["role"] == "developer":
    raise HTTPException(status_code=403, detail="관리자 대시보드 접근 불가")
```

**middleware/auth.py** — 허용 role 축소:
```python
# 변경 전
["admin", "operator", "developer", "viewer"]

# 변경 후
["admin", "operator"]
```

---

## 5. 취약점 요약

| 취약점 | 내용 |
|---|---|
| Mass Assignment | PATCH /admin/staff/me에서 role 필드 검증 없음 → 권한 상승 가능 |
| admin 전용 데이터 노출 | 결제/카드 정보를 admin만 볼 수 있으나 API 직접 호출 시 role 체크 없음 |
| JWT 기반 권한 우회 | role 변경 후 재로그인으로 새 JWT 발급 → 상위 권한 획득 |
