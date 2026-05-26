# 팀원 Agent 전달 지침: 시나리오 2/3/4 불변식 및 Evidence 요구사항 정리

## 목적

시나리오 2, 3, 4에 대해 대시보드/AI가 판단해야 할 불변식과, 그 판단을 위해 collector가 실제로 수집해야 하는 evidence를 정리한다.

이 문서는 구현 요청이 아니다. 팀원 agent는 코드 수정, DB 입력, 임의 evidence 생성, AI 판단 로직 변경을 하지 말고, 아래 양식대로 필요한 항목만 정리해서 전달한다. 실제 구축은 우리 쪽에서 진행한다.

## 절대 원칙

1. Evidence를 사람이 직접 넣는 방식으로 설계하지 않는다.
2. 흐름은 반드시 `시스템 상태/동작 트리거 -> collector 관측 -> normalizer 표준 evidence 생성 -> AI1 불변식 판정 -> AI2 체인 도출`이다.
3. AI1/AI2가 사전에 구체화한 시나리오 내용을 직접 알면 안 된다.
4. AI는 “시나리오명”을 보고 맞히는 것이 아니라, 수집된 evidence에서 불변식 위반을 찾고 그 위반 조합으로 체인을 도출해야 한다.
5. Evidence에는 원문 민감값을 넣지 말고, 필요한 경우 hash/ref/profile 형태로 표준화한다.
6. `검증 불가`가 나오지 않도록 required evidence type과 required field를 빠짐없이 제안한다.
7. 구현 가능성 없는 이상적인 항목보다, 실제 collector가 관측 가능한 로그/DB/API/파일 상태를 우선한다.

## 산출물 형식

각 시나리오별로 아래 섹션을 그대로 채워서 Markdown으로 제출한다.

---

## 1. 시나리오 기본 정보

| 항목 | 내용 |
|---|---|
| 시나리오 번호 | 2 / 3 / 4 중 하나 |
| 한 줄 설명 | AI에 넣을 문장이 아니라 팀 내부 이해용 요약 |
| 주요 자산/서비스 | 예: argos-deploy, argos-signing, argos-data 등 |
| 주요 데이터 흐름 | 시스템 관측 기준으로 작성 |
| 정상 상태 핵심 조건 | 위반 없음으로 판단돼야 할 조건 |
| 위반 상태 핵심 조건 | collector가 관측 가능해야 할 위반 조건 |

---

## 2. 필요한 불변식 후보

아래 표에 불변식별로 작성한다. 기존 불변식이 있으면 기존 ID를 쓰고, 신규가 필요하면 `INV-ARG-S{번호}-NN` 형태로 임시 ID를 제안한다.

| invariant_id | 분류 | 불변식 문장 | 정상 판단 조건 | 위반 판단 조건 | required evidence types | required fields | 비고 |
|---|---|---|---|---|---|---|---|
| 예: INV-ARG-S2-01 | CRED/API/AUD/SYS/ENV/ACC | ... must ... | ... | ... | firmware_signing_event, key_management_state | observed.key_exposed, control.signing_workflow_enforcement_active | 신규/기존 여부 |

분류 기준:

- `ACC`: 계정, 권한, 역할, 소유자/테넌트 검증
- `API`: API 인가, scope, endpoint 접근제어
- `AUD`: 탐지, 감사, 추적성, 로그 보존
- `CRED`: 키, 토큰, 서명재료, secret 관리
- `ENV`: 네트워크, 배포환경, 경계/egress
- `SYS`: 시스템 무결성, 파일/프로세스/중요 시스템 접근

---

## 3. Evidence Contract 설계

불변식 판단에 필요한 evidence type별로 작성한다.

| evidence_type | collector 위치/소스 | 실제 관측 대상 | 정상 예시 필드 | 위반 예시 필드 | correlation key | 민감정보 처리 | 비고 |
|---|---|---|---|---|---|---|---|
| 예: firmware_signing_event | argos-signing API/log | signing 요청/결과 | observed.signing_result=signed | observed.key_exposed=true | trace_id, firmware_id, artifact_id | raw key 금지, fingerprint/hash만 | |

필수로 검토할 필드 그룹:

- `observed`: collector가 직접 관측한 상태/행위
- `control`: 정책/통제 적용 여부
- `detection`: 탐지/집계/알림 여부
- `actor`: 행위 주체
- `token`: JWT, service account, scope, jti, kid 등
- `access`: endpoint, decision, owner/tenant check 등
- `asset`: 자산, 서비스, 리소스 식별자
- `security_context`: trace_id, request_id, event_chain_id

---

## 4. Collector 입력원

아래 항목을 “실제 운영 방식처럼” 작성한다.

| 입력원 종류 | 위치 | 수집 방식 | 생성 트리거 | 정상/위반 구분 가능 여부 | 비고 |
|---|---|---|---|---|---|
| API log | `/var/log/...` | Wazuh/local collector | 실제 API 호출 | 가능/불가능 | |
| DB row | database/table | collector query | 실제 서비스 동작 후 row 생성 | 가능/불가능 | |
| 설정 파일 | `/etc/argos/...json` | file collector | baseline/violation 상태 적용 | 가능/불가능 | |
| 시스템 상태 | process/file/package | local-system-security collector | 서비스/파일 상태 변화 | 가능/불가능 | |

---

## 5. Normalizer 매핑 요구사항

collector 원천 이벤트가 표준 evidence로 바뀔 때 필요한 매핑을 적는다.

```yaml
evidence_type: 예시_event_type
source_fields:
  - 원천 필드명
normalized_fields:
  observed:
    field_name: 설명
  control:
    field_name: 설명
  detection:
    field_name: 설명
correlation:
  - trace_id
  - request_id
  - event_chain_id
privacy:
  raw_secret_allowed: false
  raw_body_allowed: false
  allowed_representation: hash/ref/profile
```

---

## 6. 정상/위반 트리거 제안

구축팀이 실제로 실행할 수 있도록 정상 상태와 위반 상태를 분리해서 적는다.

| 모드 | 필요한 시스템 상태/동작 | collector가 봐야 하는 결과 | AI 기대 판정 |
|---|---|---|---|
| baseline | ... | ... | 위반 없음 |
| violation | ... | ... | 위반 |

주의: 여기서도 evidence JSON을 직접 만들라고 쓰면 안 된다. 반드시 실제 설정/서비스 동작/로그/DB/collector 기준으로 작성한다.

---

## 7. AI 판단 기준

AI가 어떤 필드를 보고 `위반` 또는 `위반 없음`으로 판단해야 하는지 정리한다.

| invariant_id | clear violation 조건 | applied 조건 | not_testable 방지 조건 |
|---|---|---|---|
| ... | ... | ... | required evidence/field가 모두 있어야 함 |

---

## 8. 구축 필요 항목 요약

마지막에 아래 형식으로 정리한다.

```markdown
### 신규/수정 필요 불변식
- ...

### 신규/수정 필요 collector
- ...

### normalizer 매핑 필요
- ...

### AI1 판정 로직/contract 필요
- ...

### 대시보드 표시/DB 저장 영향
- ...

### 확인해야 할 리스크
- ...
```

## 제출 전 체크리스트

- [ ] 사람이 evidence를 직접 넣는 방식이 아닌가?
- [ ] collector가 실제로 관측 가능한 입력원인가?
- [ ] normalizer가 만들 표준 field가 명확한가?
- [ ] `required evidence type`과 `required field`가 빠짐없는가?
- [ ] 정상 상태와 위반 상태가 둘 다 정의되어 있는가?
- [ ] AI가 시나리오 내용을 몰라도 evidence만 보고 위반을 판단할 수 있는가?
- [ ] 민감정보 원문 저장을 피했는가?
- [ ] `검증 불가` 방지를 위한 필드가 정의되어 있는가?

