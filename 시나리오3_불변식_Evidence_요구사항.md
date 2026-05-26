# 팀원 전달용: 시나리오 3 불변식 Evidence 요구사항

> 범위 메모: 이 문서는 시나리오 3 중 계정, 인증, 권한, 감사 로그, 탐지, 네트워크 정찰, Git secret scan, 상관관계 evidence만 다룬다. 이 범위를 벗어나는 세부 contract는 제외한다.

## 1. 시나리오 기본 정보

| 항목 | 내용 |
|---|---|
| 시나리오 번호 | 3 |
| 한 줄 설명 | 유출된 분석/운영 계정 credential로 VPN 및 Admin API에 접근한 뒤, 계정 통제와 tenant 경계를 우회해 민감 분석 데이터 접근으로 이어지는 흐름 |
| 주요 자산/서비스 | `argos-admin`, `argos-was`, `argos-db`, `argos-wazuh-manager`, OpenVPN, Admin API JWT, staff/account DB |
| 주요 데이터 흐름 | VPN 인증 로그 -> Admin API 로그인/JWT 발급 -> Admin API 권한 판단 -> DB query/audit -> Wazuh/SIEM 탐지 -> AI1 불변식 판정 -> AI2 체인 추론 |
| 정상 상태 판단 조건 | MFA 또는 승인된 접속 조건을 만족한 계정이 승인된 role/scope로 담당 tenant 또는 승인된 tenant 범위만 접근하며, 인증/권한/DB query/탐지 로그가 공통 key로 연결되고 보존됨 |
| 위반 상태 판단 조건 | MFA/접속 위치 통제 실패, 만료/유출 의심 credential 사용, 퇴사/비활성 계정 로그인, tenant scope 우회, 비정상 로그인 직후 대량 query 미탐지, 로그 trace 단절 또는 삭제/보존 실패 |

---

## 2. 필요한 불변식 후보

| invariant_id | 분류 | 불변식 문장 | 정상 판단 조건 | 위반 판단 조건 | required evidence types | required fields | 비고 |
|---|---|---|---|---|---|---|---|
| INV-ARG-S3-01 | ACC/CRED/ENV | 분석 계정은 MFA와 허용된 네트워크/기기 조건을 만족하지 않으면 로그인에 성공하면 안 된다. | `identity_auth_event`에서 MFA success, approved IP/geo, trusted device가 모두 확인됨 | MFA 실패/우회, 미승인 IP/geo, untrusted device인데 로그인 success 또는 token 발급 | identity_auth_event, token_validation_event, account_state_event | actor.actor_id, actor.role, observed.auth_result, observed.mfa_result, observed.source_ip, observed.geo, observed.device_trust, token.jwt_issued, token.jti | 기존 S3 추가 불변식 |
| INV-ARG-S3-07 | AUD/SYS/ENV | 비정상 로그인 이후 대량 query 또는 민감 데이터 접근이 발생하면 Wazuh/SIEM 및 `argos-security` 탐지 파이프라인에서 탐지 또는 차단되어야 한다. | risk signal과 high-volume activity가 같은 actor/trace에서 연결되고 alert/blocked/risk_scored 상태가 있음 | new geo/asn, untrusted device, inactive account, mfa_bypass 이후 대량 query 또는 민감 데이터 접근이 있지만 alert가 없음 | identity_auth_event, aggregation_state, data_access_event, wazuh_alert_event | detection.risk_signal, observed.activity, observed.volume, detection.status, detection.alert_id, security_context.trace_id, actor.actor_id | 시나리오 3 탐지 핵심 |
| INV-ARG-S3-08 | AUD/SYS | 로그인, 권한 판단, DB query, 보안 탐지 로그는 `trace_id`, `request_id`, `actor_id` 등으로 연결 가능해야 한다. | required stage가 모두 존재하고 missing_stage=null, 공통 key가 1개 이상 존재 | auth/authz/query/detection 중 하나 이상 누락 또는 correlation key 부재 | log_trace_state, identity_auth_event, api_authorization_event, data_access_event, wazuh_alert_event | security_context.trace_id, security_context.request_id, actor.actor_id, trace.contains, trace.missing_stage, trace.common_keys | 시나리오 3 체인 추론 핵심 |
| INV-ARG-S3-09 | CRED | 서비스 계정·관리 계정은 VPN·관리자 API·DB 등 서로 다른 시스템에서 동일한 비밀번호를 사용하면 안 된다. | 계정별 시스템 credential fingerprint가 서로 다르거나 SSO/연동 인증으로 중앙 통제됨 | 동일 actor/service account의 VPN, Admin API, DB credential fingerprint가 동일함 | credential_reuse_state, account_state_event | actor.actor_id, credential.system, credential.fingerprint_hash, credential.reuse_detected, credential.rotation_required | deploy-bot VPN/Admin API 동일 비밀번호 이슈 반영 |
| INV-ARG-S3-10 | API/ACC | `staff_accounts`의 role 등 권한 관련 필드는 본인이 직접 수정할 수 없어야 하며, 변경 시 별도 관리자 승인이 필요하다. | role 변경 요청의 actor와 target이 다르고, admin 승인/감사 기록이 존재함 | `PATCH /admin/staff/me` 등 자기 계정 수정 요청에서 role 필드가 포함되고 권한 상승이 성공함 | staff_profile_update_event, api_authorization_event, audit_change_event | actor.actor_id, target.actor_id, access.endpoint, request.fields_changed, request.contains_privileged_field, approval.approval_id, approval.approved_by_admin, observed.result | self role escalation 방지 |
| INV-ARG-S3-11 | AUD/ENV | VPN 접속 후 내부망 `10.10.0.0/16` 대역에 대한 대규모 포트 스캔이 발생하면 Wazuh/SIEM 및 `argos-security` 탐지 파이프라인에서 탐지 또는 차단되어야 한다. | VPN session 이후 내부망 scan threshold 초과 시 alert/blocked/risk_scored 상태가 있음 | VPN 접속 직후 다수 내부 IP/port scan이 발생했지만 탐지/차단 이벤트가 없음 | vpn_session_event, network_scan_event, wazuh_alert_event | actor.actor_id, vpn.session_id, observed.target_cidr, observed.distinct_ip_count, observed.distinct_port_count, detection.status, detection.alert_id | 내부망 정찰 탐지 신규 |
| INV-ARG-S3-12 | CRED/ACC | 서비스 계정·봇 계정은 명시적으로 승인된 경우가 아니면 VPN 또는 관리자 콘솔에 대화형 로그인할 수 없어야 한다. | service/bot account의 interactive_login_allowed=false이고 VPN/Admin login 시도는 deny 또는 alert | `deploy-bot` 같은 service account가 VPN/Admin API에 대화형 로그인 성공 | service_account_policy_state, identity_auth_event, api_authorization_event | actor.actor_id, actor.account_type, control.interactive_login_allowed, observed.auth_result, access.endpoint | 봇 계정 오용 방지 신규 |
| INV-ARG-S3-13 | ENV/API | VPN 접속 계정은 승인된 내부 서비스·포트에만 접근할 수 있어야 하며, 관리자 API·DB 대역 접근은 role/scope 기반 네트워크 ACL로 제한되어야 한다. | VPN actor role/scope에 맞는 target service/port만 allow | VPN 접속 직후 승인되지 않은 `10.10.x.x` 관리/API/DB 포트 접근 성공 | vpn_session_event, network_access_event, network_acl_state | actor.actor_id, actor.role, vpn.session_id, observed.target_ip, observed.target_port, access.network_decision, control.allowed_service_scope | 포트스캔 탐지와 별개인 예방 통제 |
| INV-ARG-S3-14 | API/AUD | 관리자 API 문서·스키마·디버그 엔드포인트는 승인된 관리자에게만 노출되어야 하며, 일반 VPN 접속자나 낮은 권한 계정이 민감 endpoint 목록을 열람하면 안 된다. | `/docs`, `/openapi.json`, debug route 접근이 admin 승인 세션에서만 allow | viewer/operator/service account 또는 인증 없는 내부 사용자가 관리자 endpoint 목록 열람 성공 | api_documentation_access_event, api_authorization_event | actor.actor_id, actor.role, access.endpoint, observed.doc_type, access.decision, control.docs_exposure_policy | Swagger/OpenAPI 정찰 방지 신규 |
| INV-ARG-S3-15 | AUD/API | 권한 상승 가능성이 있는 role/permission 변경 시도는 성공 여부와 무관하게 보안 이벤트로 기록되고 탐지되어야 한다. | role/permission field 변경 시도에 audit_change_event와 wazuh_alert_event가 연결됨 | 자기 role 수정 또는 권한 필드 변조 시도가 있었지만 alert/audit가 없음 | staff_profile_update_event, audit_change_event, wazuh_alert_event | actor.actor_id, target.actor_id, request.privileged_fields, observed.result, detection.status, audit.change_id | self role escalation 탐지 보강 |
| INV-ARG-S3-16 | API/ACC | 관리자 API는 JWT의 role claim만 신뢰하지 말고 서버 측 계정 상태·role version·revocation 상태를 재검증해야 한다. | token role_version이 account role_version과 일치하고 account active/revoked 상태를 매 요청 확인 | role 변경/계정 비활성 이후에도 기존 JWT로 관리자 API 접근 성공 | token_validation_event, account_state_event, api_authorization_event | token.jti, token.role, token.role_version, actor.account_status, actor.role_version, access.decision | stale token 방지 |
| INV-STD-04 | CRED/ACC | 유출 의심 또는 권한 변경 대상 credential은 즉시 폐기 또는 회전되어야 한다. | credential exposed/suspected 상태이면 active=false 또는 rotated=true | 유출 의심 credential이 active 상태로 VPN/Admin API 로그인 또는 민감 데이터 접근에 사용됨 | credential_state_event, account_state_event, identity_auth_event | credential.status, credential.active, credential.rotated, actor.employment_status, observed.auth_result | 기존 표준 불변식 재사용 |
| INV-STD-10 | AUD | 인증, 권한 판단, query, 보안 이벤트 로그는 추적 가능하게 기록되어야 한다. | actor/source/token/resource/result/timestamp/trace가 로그에 존재 | 민감 데이터 접근 또는 권한 판단은 발생했지만 필수 감사 필드가 누락 | api_access_log_event, data_access_event, security_event_log | actor.actor_id, token.jti, access.endpoint, asset.tenant_id, observed.result, observed.timestamp, security_context.trace_id | 기존 표준 불변식 재사용 |
| INV-ARG-01 | API/ACC | API 요청과 분석 데이터 접근은 actor의 `staff_tenant_scope`와 resource tenant가 일치하거나 승인된 cross-tenant grant가 있어야 한다. | `staff_tenant_scope` 기준 actor 담당 tenant에 resource tenant가 포함되거나 approved cross tenant grant가 있음 | actor scope에 없는 tenant 리소스에 접근 성공했지만 approved cross tenant grant가 없음 | api_authorization_event, data_access_event, staff_tenant_scope_state | actor.actor_id, actor.allowed_tenant_ids, asset.tenant_id, access.cross_tenant_grant, access.decision, access.scope | 기존 Argos 불변식 재사용, 실제 GCP `argos` DB의 `staff_tenant_scope` 매핑 테이블 기준 |
| INV-ARG-S3-17 | API | API의 리소스 수정 요청은 서버에서 허용 필드를 명시적으로 검증해야 하며, 권한 관련 필드는 일반 사용자가 직접 수정할 수 없어야 한다. | request field allowlist가 적용되고 role/permission/status 등 privileged field는 서버에서 거부됨 | update 요청 body에 허용되지 않은 권한 필드가 포함됐는데 저장 성공함 | api_update_request_event, field_authorization_policy, audit_change_event | access.endpoint, actor.role, request.fields_submitted, request.fields_allowed, request.privileged_fields, observed.rejected_fields, observed.result | Mass Assignment 일반 표준 불변식 |
| INV-ARG-S3-18 | CRED/AUD | Git repo와 commit history에는 활성 VPN/Admin/API credential, 내부 관리자 URL, 백업 env 파일이 남아 있으면 안 되며, 탐지 시 즉시 유출 의심 credential로 전환되어야 한다. | secret scanner가 Git history를 검사하고 high-confidence finding이 없거나, 발견된 credential이 revoked/rotated 상태임 | Gitleaks 등 scanner가 `.env.bak`, `VPN_PASS`, `ADMIN_URL`, service account 단서를 탐지했는데 credential이 active 상태로 남아 있음 | secret_scan_event, credential_state_event, audit_change_event | scan.repo, scan.commit, scan.file_path, finding.rule_id, finding.secret_type, finding.confidence, finding.status, credential.status, credential.rotated | GitHub OSINT/VPN credential 발견 단계 반영 |

---

## 3. Evidence Contract 설계

| evidence_type | collector 위치/소스 | 실제 관측 대상 | 정상 예시 필드 | 위반 예시 필드 | correlation key | 민감정보 처리 | 비고 |
|---|---|---|---|---|---|---|---|
| identity_auth_event | OpenVPN auth log, Admin API `/auth/admin/login` log | VPN/Admin 로그인 성공/실패, MFA, IP, geo, device trust | observed.auth_result=success, observed.mfa_result=success, observed.source_ip_class=approved | observed.auth_result=success, observed.mfa_result=none, observed.device_trust=untrusted | trace_id, request_id, actor_id, session_id | password/raw token 저장 금지, IP는 원문 또는 subnet/profile만 | INV-ARG-S3-01/07 |
| token_validation_event | Admin API middleware/auth log | JWT 발급/검증 결과, role, role_version, jti/kid, 만료, revocation | token.valid=true, role_version matches account | token.valid=true but account disabled, token revoked, or role_version mismatch | trace_id, request_id, jti, actor_id | JWT 원문 금지, jti/kid/hash만 | INV-ARG-S3-01/S3-16 |
| credential_state_event | staff account DB, secret/vault inventory, offboarding audit | credential active/revoked/rotated/leaked status | credential.active=false when suspected_leaked | credential.status=suspected_leaked AND credential.active=true | actor_id, credential_id_hash | secret 원문 금지, credential_id hash/ref만 | INV-STD-04 |
| account_state_event | `staff_accounts`, HR/offboarding table, admin audit | employment/account/role 상태 | account_status=active, employment_status=active | employment_status=retired but auth_result=success | actor_id, account_id | 개인정보 최소화, account ref 사용 | INV-ARG-S3-01/STD-04 |
| staff_tenant_scope_state | `staff_tenant_scope`, `staff_accounts`, `tenants` | staff/admin 계정이 담당하는 tenant scope | actor has assigned tenant scope for resource tenant | actor has no tenant scope and no cross-tenant grant | actor_id, tenant_id, scope_id | 계정 ref와 tenant id만 저장 | INV-ARG-01 |
| api_authorization_event | Admin API middleware, `/admin/*` access log | endpoint별 role/scope/tenant 권한 판단 | access.decision=allow, actor.role in approved_roles, access.tenant_check=passed | access.decision=allow with cross_tenant_grant=false and resource tenant not in actor scope | trace_id, request_id, actor_id, endpoint | Authorization header 원문 금지 | INV-ARG-01 |
| data_access_event | DB query audit, API application log | DB query 대상, row count, tenant count, field set profile | observed.row_count<=approved_limit, asset.tenant_count=1 | asset.tenant_count>1 or access.tenant_check=failed but query success | trace_id, query_id, actor_id, dataset_id | raw SQL 금지, normalized query profile/hash 사용 | INV-ARG-01/S3-07 |
| aggregation_state | Wazuh rule aggregation, collector window summary | 동일 actor/IP/token의 tenant/device/query count | detection.status=alerted when threshold exceeded | activity.volume>threshold AND detection.status=none | actor_id, token.jti, source_ip, time_window | 개별 원문 row 저장 금지, count만 | INV-ARG-S3-07 |
| wazuh_alert_event | Wazuh/SIEM alerts, `argos-security` alert API | 비정상 로그인, 대량 접근, log deletion, invalid token alert | detection.status in alerted/blocked/risk_scored | alert missing for correlated risk | alert_id, trace_id, linked_request_id, actor_id | rule payload의 secret/body 제거 | INV-ARG-S3-07 |
| log_trace_state | normalizer aggregation output | auth -> authz -> query -> detection stage 연결성 | trace.missing_stage=null | trace.missing_stage=data_access_event or common_keys empty | trace_id, request_id, actor_id | stage별 ref만 저장 | INV-ARG-S3-08 |
| credential_reuse_state | credential inventory, password audit job, vault metadata | 동일 계정의 시스템별 credential fingerprint 비교 결과 | credential.reuse_detected=false | credential.reuse_detected=true for vpn/admin_api/db | actor_id, credential_id_hash, system | password 원문 금지, 검증용 fingerprint/hash만 | INV-ARG-S3-09 |
| secret_scan_event | Gitleaks/secret scanning job, Git provider scan result | Git working tree와 commit history의 credential-like finding | scan.completed=true, finding.count=0 또는 credential.rotated=true | finding.secret_type in vpn_password/internal_admin_url/env_backup/service_account AND credential.active=true | repo_id, commit_sha, file_path, finding_id, credential_id_hash | secret 원문 저장 금지, rule_id/type/hash/ref만 | INV-ARG-S3-18 |
| staff_profile_update_event | Admin API update log, `staff_accounts` change audit | staff 계정 수정 요청의 actor/target/변경 필드/결과 | privileged field rejected or admin approval exists | actor_id==target_id AND role field changed AND result=success | trace_id, request_id, actor_id, target_id, change_id | request body 원문 금지, field name/profile만 | INV-ARG-S3-10 |
| api_update_request_event | API middleware/update handler log | PATCH/PUT 요청의 submitted/allowed/rejected field 목록 | rejected_fields contains privileged_fields | privileged field submitted and persisted | trace_id, request_id, actor_id, endpoint | raw body 금지, field list만 | INV-ARG-S3-17 |
| field_authorization_policy | API schema/policy config, runtime policy snapshot | endpoint별 수정 허용 필드 allowlist와 privileged field 목록 | role not in allowed writers, field rejected | role/permission/status field has no server-side deny rule | endpoint, policy_version | 정책 파일 원문은 hash/ref 가능 | INV-ARG-S3-17 |
| audit_change_event | Admin audit/change DB, application audit log | 계정/권한/정책 변경 이력, 승인자, before/after profile | role change has approval_id and admin approver | privileged field change attempt has no audit row | change_id, trace_id, request_id, actor_id, target_id | before/after 원문 값은 profile/hash/ref만 | INV-ARG-S3-10/S3-15/S3-18 |
| vpn_session_event | OpenVPN session/status log | VPN 접속 세션 시작/종료, 할당 IP, actor | vpn.session_state=established from approved actor | scan event follows suspicious session | actor_id, session_id, vpn_ip | 계정/세션 ref 중심 | INV-ARG-S3-11 |
| network_scan_event | Zeek/Suricata/Wazuh/netflow/firewall log | 내부망 대상 IP/port sweep, scan rate, target CIDR | distinct_ip_count below threshold | target_cidr=10.10.0.0/16 and distinct_ip/port threshold exceeded | actor_id, session_id, source_ip, time_window | payload 저장 금지, flow/count만 | INV-ARG-S3-11 |
| service_account_policy_state | account policy DB, IAM config, staff account metadata | 계정 유형과 대화형 로그인 허용 여부 | account_type=service_account, interactive_login_allowed=false | service_account interactive_login_allowed=true without approval | actor_id, policy_version | credential 원문 저장 금지 | INV-ARG-S3-12 |
| network_access_event | firewall/VPN gateway/flow log | VPN source가 내부 서비스·포트에 접근한 결과 | target_service in allowed_service_scope, network_decision=allow | unapproved management/API/DB port connection success | actor_id, session_id, source_ip, target_ip, target_port | payload 저장 금지, flow metadata만 | INV-ARG-S3-13 |
| network_acl_state | firewall/security group/VPN route policy | role/scope별 내부망 접근 허용 목록 | admin service allowlist exists | broad 10.10.0.0/16 allow without role restriction | policy_version, role, service_id | 정책 원문은 hash/ref 가능 | INV-ARG-S3-13 |
| api_documentation_access_event | Admin API access log, reverse proxy log | `/docs`, `/openapi.json`, debug/schema endpoint 접근 | admin actor decision=allow | non-admin or unauthenticated actor decision=allow | trace_id, request_id, actor_id, endpoint | response body 저장 금지, doc_type만 | INV-ARG-S3-14 |

---

## 4. Collector 입력원

| 입력원 종류 | 위치 | 수집 방식 | 생성 트리거 | 정상/위반 구분 가능 여부 | 비고 |
|---|---|---|---|---|---|
| VPN 인증 로그 | `argos-dmz` OpenVPN auth/status log | Wazuh agent 또는 filebeat | VPN 로그인 성공/실패 | 가능 | MFA result, source IP, account를 반드시 포함 |
| Admin API 인증 로그 | `argos-ops` FastAPI `/auth/admin/login` | application JSON log | Admin login, JWT 발급 | 가능 | raw password/JWT 저장 금지 |
| Admin API access log | `argos-ops` reverse proxy/FastAPI middleware | Wazuh/local collector | `/admin/*` 호출 | 가능 | request_id/trace_id를 응답까지 전달 |
| DB query audit | `argos-db` PostgreSQL audit 또는 app query log | DB audit collector | 민감 데이터 SELECT 실행 | 가능 | raw SQL 대신 query profile, table, tenant_count, row_count |
| Wazuh alert | `argos-wazuh-manager` alert JSON | Wazuh API/file collector | rule match, alert 생성 | 가능 | linked_request_id 또는 trace_id 필요 |
| staff/account state DB | `staff_accounts`, role/credential table | periodic collector query + change event | account/role/credential 상태 변경 | 가능 | employment_status, account_status, credential_status |
| staff tenant scope DB | `staff_tenant_scope` | collector query + change event | staff/admin 담당 tenant 부여/회수 | 가능 | 실제 GCP `argos` DB에 생성된 매핑 테이블. `actor.allowed_tenant_ids` 산출 기준 |
| audit/change log | Admin audit DB/API | collector query | permission revoke, account disable, approval change | 가능 | approval_id, actor_id, target_id, before/after |
| credential reuse audit | credential inventory/vault/password audit job | scheduled collector | credential 생성/회전/정기 점검 | 가능 | 비밀번호 원문 없이 시스템별 fingerprint 비교 |
| Git secret scan result | `argos-firmware` 등 Git repo, CI security job | Gitleaks 기본 룰 + 일반화 커스텀 룰 결과 수집 | push/merge 전 검사, 정기 Git history scan | 가능 | private repo는 read-only token 또는 GitHub App 권한 필요. token 원문 없이 token_ref, permission_scope, accessible_repo, access_check_result와 finding metadata만 저장 |
| API update request log | Admin API update middleware | application JSON log | PATCH/PUT 요청 | 가능 | submitted/allowed/rejected field list 필요 |
| field authorization policy | API schema/policy config | file/config collector | 정책 배포/변경 | 가능 | endpoint별 수정 허용 필드 목록 |
| network flow/scan log | Wazuh/Zeek/Suricata/firewall | network collector | VPN 접속 후 내부망 접근 | 가능 | source VPN IP, target CIDR, distinct IP/port count |
| service account policy | account policy DB/IAM config | collector query | 계정 정책 생성/변경 | 가능 | account_type, interactive_login_allowed, approval_id |
| network ACL state | firewall/security group/VPN route policy | config collector | ACL/route 정책 배포/변경 | 가능 | role/scope별 허용 서비스·포트 |
| API documentation access log | Admin API/reverse proxy log | Wazuh/local collector | `/docs`, `/openapi.json`, debug/schema endpoint 접근 | 가능 | doc response body 수집 금지 |

---

## 5. Normalizer 매핑 요구사항

```yaml
evidence_type: staff_tenant_scope_state
source_fields:
  - id
  - user_id
  - tenant_id
  - scope
  - created_at
normalized_fields:
  actor:
    actor_id: staff account id
    allowed_tenant_ids: tenant ids assigned to the staff account
  access:
    scope: read|operator|admin
  asset:
    tenant_id: tenant allowed by this mapping row
  observed:
    created_at: assignment timestamp
correlation:
  - actor_id
  - tenant_id
  - id
privacy:
  raw_secret_allowed: false
  raw_body_allowed: false
  allowed_representation: ref|profile|tenant_id
```

```yaml
evidence_type: api_authorization_event
source_fields:
  - endpoint
  - method
  - actor_id
  - role
  - resource_tenant_id
  - scope
  - authz_result
  - request_id
normalized_fields:
  actor:
    actor_id: requesting account
    role: admin|operator|viewer|developer|service_account
    allowed_tenant_ids: from staff_tenant_scope_state
  access:
    endpoint: normalized endpoint pattern
    decision: allow|deny
    scope: normalized permission scope
    tenant_check: passed|failed|not_performed
    cross_tenant_grant: true|false
  asset:
    tenant_id: resource tenant id
  security_context:
    trace_id: propagated trace id
    request_id: API request id
correlation:
  - trace_id
  - request_id
  - actor_id
privacy:
  raw_secret_allowed: false
  raw_body_allowed: false
  allowed_representation: hash/ref/profile
```

```yaml
evidence_type: data_access_event
source_fields:
  - actor_id
  - query_id
  - dataset
  - table
  - row_count
  - tenant_count
  - resource_tenant_ids
  - query_profile
  - field_profile
normalized_fields:
  actor:
    actor_id: account id
  asset:
    dataset_id: dataset or table ref
    tenant_id: single tenant id when applicable
    tenant_count: number of tenants touched
    sensitivity: pii|device_identifier|video_metadata|tenant_analytics|payment|unknown
  observed:
    activity: query|bulk_query|sensitive_read
    row_count: number
    volume: normalized volume score
  access:
    tenant_check: passed|failed|not_performed
  security_context:
    trace_id: propagated trace id
    query_id: query id
correlation:
  - trace_id
  - query_id
  - actor_id
privacy:
  raw_secret_allowed: false
  raw_body_allowed: false
  allowed_representation: query_profile_hash|field_profile|count
```

```yaml
evidence_type: secret_scan_event
source_fields:
  - repo_full_name
  - scan_tool
  - scan_command_ref
  - scan_config_ref
  - scan_token_ref
  - permission_scope
  - accessible_repo
  - access_check_result
  - commit_sha
  - file_path
  - line_number
  - rule_id
  - finding_fingerprint
  - secret_type
  - scanner_result
  - checked_at
normalized_fields:
  asset:
    repo_id: normalized repository id
    repo_full_name: repository owner/name
    commit_sha: commit containing the finding
    file_path: path containing the finding
  observed:
    scan_tool: gitleaks|github_secret_scanning|other
    scan_command_ref: CI job or collector command reference, not raw shell output
    scan_config_ref: default ruleset or custom ruleset version
    scan_token_ref: read-only token or GitHub App installation ref
    permission_scope: contents:read or equivalent minimum permission
    accessible_repo: repo allowed to be scanned
    access_check_result: success|failure
    scan_scope: working_tree|git_history|pull_request
    finding_present: true|false
    finding_count: number
  detection:
    rule_id: scanner rule id
    secret_type: vpn_password|vpn_user|internal_admin_url|env_backup|service_account|generic_secret|unknown
    confidence: high|medium|low
    status: detected|triaged|false_positive|resolved
  credential:
    credential_id_hash: linked credential ref when matchable
    status: active|rotated|revoked|suspected_leaked|unknown
    rotation_required: true|false
  security_context:
    finding_id: stable scanner fingerprint
    checked_at: timestamp
correlation:
  - repo_id
  - commit_sha
  - file_path
  - finding_id
  - credential_id_hash
privacy:
  raw_secret_allowed: false
  raw_token_allowed: false
  raw_body_allowed: false
  allowed_representation: rule_id|type|hash|ref|file_path|commit_sha|token_ref|permission_scope
```

추가 normalizer 요구사항:
- 인증, token, Wazuh, update request, network evidence는 위 표의 required fields를 같은 이름으로 표준화한다.
- raw password, raw JWT, raw SQL, request body, secret value, scanner token 원문은 저장하지 않는다.
- `staff_tenant_scope`는 실제 최소 테이블 구조인 `id`, `user_id`, `tenant_id`, `scope`, `created_at`만 전제로 한다.

---

## 6. 정상/위반 트리거 제안

| 모드 | 필요한 시스템 상태/동작 | collector가 봐야 하는 결과 | AI 기대 판정 |
|---|---|---|---|
| baseline | active `admin/operator`가 MFA success, approved IP, trusted device로 로그인 | `identity_auth_event.auth_result=success`, `mfa_result=success`, `source_ip_class=approved`, `device_trust=trusted` | 위반 없음 |
| violation | `deploy-bot` 또는 유출 의심 계정이 MFA none/bypass 상태로 Admin API token 발급 | `identity_auth_event.auth_result=success`, `mfa_result in none/bypass`, `token.jwt_issued=true` | INV-ARG-S3-01 위반 |
| baseline | 민감 데이터 query가 `staff_tenant_scope`에 포함된 tenant 범위에서 승인된 role/scope로 수행 | `api_authorization_event.decision=allow`, `asset.tenant_id in actor.allowed_tenant_ids`, `data_access_event.asset.tenant_count=1` | 위반 없음 |
| violation | resource tenant가 actor의 `staff_tenant_scope`에 없지만 cross-tenant grant 없이 query success | `access.decision=allow`, `asset.tenant_id not in actor.allowed_tenant_ids`, `cross_tenant_grant=false` | INV-ARG-01 위반 |
| baseline | 비정상 로그인 직후 대량 query가 Wazuh에서 alert 또는 block | `wazuh_alert_event.status in alerted/blocked/risk_scored`, `linked_request_id`가 trace와 연결 | 위반 없음 |
| violation | new_geo/untrusted_device 로그인 후 대량 query 또는 민감 데이터 접근이 있는데 alert 없음 | `detection.risk_signal exists`, `activity.volume>threshold`, `detection.status=none` | INV-ARG-S3-07 위반 |
| violation | Git history scan에서 VPN/Admin credential 또는 내부 관리자 URL 단서가 발견됐지만 credential 회전/폐기 기록이 없음 | `secret_scan_event.finding_present=true`, `secret_type in vpn_password/internal_admin_url/env_backup`, `credential.status=active OR rotated=false` | INV-ARG-S3-18 및 INV-STD-04 위반 |
| violation | 동일 service/admin 계정이 VPN과 Admin API에서 같은 credential fingerprint 사용 | `credential.reuse_detected=true`, `credential.system in vpn/admin_api/db` | INV-ARG-S3-09 위반 |
| violation | 자기 자신의 staff profile 수정 요청에 `role` 필드가 포함되고 저장 성공 | `actor.actor_id=target.actor_id`, `contains_privileged_field=true`, `observed.result=success`, `approved_by_admin=false` | INV-ARG-S3-10 및 INV-ARG-S3-17 위반 |
| violation | VPN 접속 직후 `10.10.0.0/16`에 대한 내부망 포트 스캔 발생, alert 없음 | `network_scan_event.threshold_exceeded=true`, `wazuh_alert_event.status=none` | INV-ARG-S3-11 위반 |
| violation | service/bot 계정이 별도 승인 없이 VPN 또는 Admin API 대화형 로그인 성공 | `account_type=service_account`, `interactive_login_allowed=false`, `auth_result=success` | INV-ARG-S3-12 위반 |
| violation | VPN 계정이 승인 범위 밖의 내부 관리/API/DB 포트에 연결 성공 | `network_decision=allow`, `target_service not in allowed_service_scope` | INV-ARG-S3-13 위반 |
| violation | 낮은 권한 계정 또는 인증 없는 내부 사용자가 관리자 API 문서/스키마 열람 성공 | `doc_type in swagger/openapi/debug`, `actor.role not admin`, `access.decision=allow` | INV-ARG-S3-14 위반 |
| violation | role/permission 변경 시도 이벤트가 있는데 audit 또는 alert가 없음 | `contains_privileged_field=true`, `audit.change_id missing OR detection.status=none` | INV-ARG-S3-15 위반 |
| violation | 계정 비활성/role 변경 후에도 기존 JWT로 관리자 API 접근 성공 | `token.role_version != actor.role_version OR account_status!=active`, `access.decision=allow` | INV-ARG-S3-16 위반 |

주의: evidence JSON을 사람이 직접 만들지 않는다. 위 상태를 실제 인증 로그, API access log, DB audit row, Wazuh alert로 발생시킨 뒤 collector가 수집해야 한다.

---

## 7. AI 판단 기준

| invariant_id | clear violation 조건 | applied 조건 | not_testable 방지 조건 |
|---|---|---|---|
| INV-ARG-S3-01 | `observed.auth_result=success` AND (`observed.mfa_result!=success` OR `observed.source_ip_class!=approved` OR `observed.device_trust=untrusted`) | identity_auth_event와 token_validation_event가 같은 actor/session/trace로 존재 | auth_result, mfa_result, source_ip/source_ip_class, device_trust, actor.role 필수 |
| INV-ARG-S3-07 | risk_signal exists AND activity in bulk_query/sensitive_read AND volume>threshold AND detection.status not in alerted/blocked/risk_scored | login risk evidence, aggregation_state, Wazuh alert status가 같은 actor/time_window로 연결 | risk_signal, activity, volume, threshold, detection.status 필수 |
| INV-ARG-S3-08 | required trace stage missing OR common correlation key empty | log_trace_state가 auth/authz/query/detection stage 목록과 missing_stage를 제공 | trace.contains, trace.missing_stage, common_keys, actor_id 또는 trace_id 필수 |
| INV-ARG-S3-09 | same actor has same credential.fingerprint_hash across two or more systems in vpn/admin_api/db | credential_reuse_state가 시스템별 fingerprint 비교 결과를 제공 | actor_id, credential.system, credential.fingerprint_hash, credential.reuse_detected 필수 |
| INV-ARG-S3-10 | actor.actor_id == target.actor_id AND request.contains_privileged_field=true AND observed.result=success AND approval.approved_by_admin=false | staff_profile_update_event와 audit_change_event가 같은 request/change로 연결 | actor_id, target_actor_id, fields_changed, contains_privileged_field, result, approval 필수 |
| INV-ARG-S3-11 | VPN session exists AND network_scan_event target_cidr=10.10.0.0/16 AND threshold_exceeded=true AND detection.status not in alerted/blocked/risk_scored | vpn_session_event, network_scan_event, wazuh_alert_event가 actor/session/time_window로 연결 | session_id, target_cidr, distinct_ip_count, distinct_port_count, threshold, detection.status 필수 |
| INV-ARG-S3-12 | actor.account_type in service_account/bot AND control.interactive_login_allowed=false AND observed.auth_result=success | service_account_policy_state와 identity_auth_event가 actor_id로 연결 | actor_id, account_type, interactive_login_allowed, auth_result 필수 |
| INV-ARG-S3-13 | VPN session exists AND network_decision=allow AND target_service not in allowed_service_scope | vpn_session_event, network_access_event, network_acl_state가 actor/session/role로 연결 | session_id, target_service, target_port, network_decision, allowed_service_scope 필수 |
| INV-ARG-S3-14 | doc_type in swagger/openapi/debug/schema AND actor.role not in admin/approved_security_admin AND access.decision=allow | api_documentation_access_event와 api_authorization_event가 request_id로 연결 | actor_id, role, endpoint, doc_type, decision, docs_exposure_policy 필수 |
| INV-ARG-S3-15 | privileged field change attempt exists AND audit_change_event missing OR detection.status=none | staff_profile_update_event, audit_change_event, wazuh_alert_event가 request/change로 연결 | privileged_fields, result, audit.change_id, detection.status 필수 |
| INV-ARG-S3-16 | token.role_version != actor.role_version OR actor.account_status!=active OR token.revoked=true, and access.decision=allow | token_validation_event, account_state_event, api_authorization_event가 actor/token으로 연결 | token.jti, token.role_version, actor.role_version, account_status, access.decision 필수 |
| INV-STD-04 | credential.status in suspected_leaked/infostealer_exposed AND credential.active=true AND auth success | credential_state_event와 auth event가 actor/credential ref로 연결 | credential.status, credential.active, credential.rotated, actor_id 필수 |
| INV-STD-10 | 민감 데이터 접근 또는 권한 판단 event가 있는데 audit 필수 필드 중 actor/token/resource/result/timestamp/trace 누락 | api_access_log_event/data_access_event/security_event_log 존재 | actor_id, token.jti or token_ref, endpoint, result, timestamp, trace_id/request_id 필수 |
| INV-ARG-01 | asset.tenant_id not in actor.allowed_tenant_ids AND cross_tenant_grant=false AND access/query success | authz/data event와 `staff_tenant_scope_state`에서 actor tenant scope, resource tenant, grant, decision 확인 가능 | actor.actor_id, actor.allowed_tenant_ids, asset.tenant_id, access.decision, cross_tenant_grant 필수 |
| INV-ARG-S3-17 | request.fields_submitted intersects privileged_fields AND privileged field not in fields_allowed AND observed.result=success | api_update_request_event와 field_authorization_policy가 endpoint/policy_version으로 연결 | endpoint, fields_submitted, fields_allowed, privileged_fields, rejected_fields, result 필수 |
| INV-ARG-S3-18 | secret_scan_event.finding_present=true AND finding.secret_type in vpn_password/internal_admin_url/env_backup/service_account AND linked credential status is active or not rotated | secret_scan_event와 credential_state_event/audit_change_event가 finding_id 또는 credential_id_hash로 연결 | repo_id, commit_sha, file_path, rule_id, secret_type, finding_id, credential.status, credential.rotated 필수 |

---

## 8. 구축 필요 항목 요약

### 신규/수정 필요 불변식

- 이 문서 담당 범위: `INV-ARG-S3-01`, `INV-ARG-S3-07`, `INV-ARG-S3-08`, `INV-ARG-S3-09`, `INV-ARG-S3-10`, `INV-ARG-S3-11`, `INV-ARG-S3-12`, `INV-ARG-S3-13`, `INV-ARG-S3-14`, `INV-ARG-S3-15`, `INV-ARG-S3-16`, `INV-ARG-S3-17`, `INV-ARG-S3-18`, `INV-STD-04`, `INV-STD-10`, `INV-ARG-01`.
- 이 문서 범위를 벗어나는 기능별 세부 불변식은 담당자 문서에서 별도 보강한다.

### 신규/수정 필요 collector

- OpenVPN/Admin API 인증 collector: MFA, IP/geo, device trust, JWT 발급 여부 수집.
- Admin API authorization collector: `/admin/*` 권한 판단, tenant scope, endpoint, role, decision 수집.
- Staff tenant scope collector: 실제 `argos` DB의 `staff_tenant_scope(id, user_id, tenant_id, scope, created_at)`를 읽어 `actor.allowed_tenant_ids` 생성.
- DB query audit collector: query의 table, tenant_count, row_count, query_profile_hash 수집.
- Wazuh alert collector: invalid token, disabled account, log deletion, abnormal login after sensitive query alert와 linked_request_id 수집.
- Account/credential state collector: 퇴사/비활성/유출 의심/회전 여부 수집.
- Credential reuse collector: VPN/Admin API/DB credential fingerprint 재사용 여부 수집.
- Git secret scan collector: Gitleaks 기본 룰과 일반화 커스텀 룰로 Git history의 credential-like finding을 수집.
- Service account policy collector: service/bot 계정의 대화형 로그인 허용 여부 수집.
- API field authorization collector: PATCH/PUT 요청의 submitted/allowed/rejected field와 privileged field 여부 수집.
- Network scan collector: VPN session 이후 내부망 `10.10.0.0/16` 대상 IP/port sweep count 수집.
- Network ACL collector: VPN role/scope별 내부 서비스·포트 접근 허용 목록 수집.
- API documentation access collector: `/docs`, `/openapi.json`, debug/schema endpoint 접근 결과 수집.

### normalizer 매핑 필요

- `trace_id`, `request_id`, `actor_id`, `query_id`, `linked_request_id`, `session_id`, `policy_version`를 공통 correlation key로 표준화.
- `staff_tenant_scope` 매핑 테이블 기준으로 `actor.allowed_tenant_ids`, `access.scope`를 표준화한다.
- raw password, raw JWT, raw SQL, request body, secret value는 저장하지 않는다.
- DB query는 query profile/hash, dataset/table ref, tenant_count, row_count, sensitivity profile만 남긴다.
- password reuse 검증은 원문 비밀번호 없이 non-reversible fingerprint/hash 비교 결과만 남긴다.
- secret scan 결과는 secret 원문과 scanner token 원문 없이 rule_id, secret_type, finding fingerprint, commit, file path, credential 상태, token_ref, permission_scope, access_check_result만 남긴다.
- update request 검증은 request body 원문이 아니라 field list와 allow/deny 결과만 남긴다.
- network evidence는 packet payload 없이 flow metadata, target service profile, count만 남긴다.

### AI1 판정 로직/contract 필요

- AI1은 시나리오 설명을 직접 보지 않고 evidence field만 보고 위반 여부를 판단해야 한다.
- `not_testable`을 피하려면 각 invariant별 required evidence type과 required field가 모두 들어와야 한다.
- `INV-ARG-01`은 `staff_tenant_scope_state`가 없으면 `actor.allowed_tenant_ids`를 만들 수 없어 판정 불가가 된다.
- 특히 S3-07은 단일 이벤트가 아니라 로그인 risk + activity volume + detection status의 시간창 correlation이 필요하다.

### 대시보드 표시/DB 저장 영향

- Access Logs에는 `trace_id`, `request_id`, `actor_id`, `token_ref`, `tenant_id`, `authorization_result`, `response_status` 표시가 필요하다.
- Staff/Identity 또는 Tenant 관리 화면에는 staff별 담당 tenant scope를 조회할 수 있어야 한다.
- Audit/Change에는 `approval_id`, `actor_id`, `target_id`, `before/after`, `reason` 표시가 필요하다.
- Alerts에는 `linked_request_id`, `trace_id`, `risk_signal`, `detection.status`, `severity` 표시가 필요하다.

### DB/저장 스키마 후보

아래는 실제 구현 DDL이 아니라 collector/normalizer가 저장해야 하는 최소 row 단위 contract다. 이미 존재하는 테이블이 있으면 같은 의미의 컬럼으로 매핑하고, 없으면 별도 evidence table 또는 view로 제공하면 된다.

| 저장 단위 | 필수 key | 필수 상태/판단 필드 | 민감정보 처리 |
|---|---|---|---|
| `staff_accounts` 또는 account view | `actor_id` | `role`, `role_version`, `account_status`, `employment_status`, `account_type` | 개인식별 상세값은 account ref/profile 사용 |
| `staff_tenant_scope` | `id`, `user_id`, `tenant_id` | `scope`, `created_at` | staff와 tenant의 매핑 ref만 저장, 실제 GCP `argos` DB 최소 테이블 구조 기준 |
| `credential_inventory` 또는 vault view | `actor_id`, `credential_id_hash`, `system` | `credential_status`, `active`, `rotated`, `fingerprint_hash`, `reuse_group_id`, `last_rotated_at` | password/secret 원문 저장 금지, non-reversible fingerprint만 |
| `source_secret_scan_findings` | `finding_id`, `repo_id`, `commit_sha`, `file_path` | `scan_tool`, `scan_scope`, `rule_id`, `secret_type`, `confidence`, `status`, `credential_id_hash`, `checked_at`, `scan_token_ref`, `permission_scope`, `accessible_repo`, `access_check_result` | secret/token 원문 저장 금지, scanner fingerprint/hash/ref만 |
| `account_policy` | `actor_id`, `policy_version` | `interactive_login_allowed`, `allowed_login_targets`, `approval_id`, `approved_by`, `effective_from` | 정책 본문은 hash/ref 가능 |
| `token_validation_log` | `trace_id`, `request_id`, `jti` | `actor_id`, `token_role`, `token_role_version`, `account_role_version`, `account_status`, `token_revoked`, `validation_result` | JWT 원문 저장 금지, `jti`/`kid`/hash만 |
| `api_authorization_log` | `trace_id`, `request_id` | `actor_id`, `endpoint`, `method`, `decision`, `scope`, `tenant_check`, `cross_tenant_grant`, `resource_tenant_id` | Authorization header 원문 저장 금지 |
| `api_update_request_log` | `trace_id`, `request_id` | `actor_id`, `endpoint`, `fields_submitted`, `fields_allowed`, `privileged_fields`, `rejected_fields`, `persisted_fields`, `result`, `policy_version` | request body 원문 저장 금지, field list만 |
| `audit_change_log` | `change_id`, `trace_id`, `request_id` | `actor_id`, `target_actor_id`, `target_type`, `fields_changed`, `approval_id`, `approved_by`, `before_profile`, `after_profile` | before/after 원문 값 대신 profile/hash/ref |
| `db_query_audit` | `trace_id`, `query_id` | `actor_id`, `dataset_id`, `table_ref`, `tenant_count`, `row_count`, `query_profile_hash`, `sensitivity` | raw SQL/body 저장 금지 |
| `vpn_session_log` | `session_id`, `actor_id` | `source_ip`, `assigned_vpn_ip`, `session_state`, `started_at`, `ended_at`, `mfa_result` | 계정/세션 ref 중심 |
| `network_flow_summary` | `session_id`, `time_window`, `source_ip` | `target_cidr`, `target_service`, `target_port`, `distinct_ip_count`, `distinct_port_count`, `network_decision`, `volume` | packet payload 저장 금지 |
| `network_acl_policy` | `policy_version`, `role` | `allowed_service_scope`, `allowed_cidr`, `allowed_ports`, `policy_hash` | 정책 원문 대신 hash/ref 가능 |
| `security_alerts` | `alert_id` | `trace_id`, `linked_request_id`, `actor_id`, `risk_signal`, `severity`, `detection.status`, `rule_id` | alert payload에서 secret/body 제거 |
| `log_trace_state` | `trace_id` | `contains`, `missing_stage`, `common_keys`, `actor_id`, `request_id`, `query_id`, `alert_id` | stage별 evidence ref만 저장 |

필수 DB 관계:
- `actor_id`는 account, credential, auth, token, API, DB query, alert evidence를 연결하는 기본 key다.
- `staff_tenant_scope.user_id`와 `staff_tenant_scope.tenant_id`는 actor가 접근 가능한 resource tenant 범위를 판정하는 key다.
- `credential_id_hash`는 source secret scan finding과 credential inventory를 연결하는 key다.
- `trace_id`/`request_id`는 API 요청 단위 상관관계 key다.
- `session_id`는 VPN session과 network scan/access evidence를 연결하는 key다.
- `policy_version`은 update request와 field/network/account policy snapshot을 연결하는 key다.
- `change_id`/`approval_id`는 권한 변경 시도와 감사/승인 evidence를 연결하는 key다.

### 확인해야 할 리스크

- OpenVPN MFA 결과와 Admin API 로그인 결과가 같은 actor/session으로 연결되는지 확인.
- 실제 `argos` DB의 `staff_tenant_scope`에서 staff/admin별 담당 tenant와 scope를 조회할 수 있는지 확인.
- Gitleaks 또는 동등한 secret scanner가 Git history scan 결과를 `secret_scan_event`로 남길 수 있는지 확인.
- private repo scan credential이 대상 repo에 대한 최소 read-only 권한을 갖고 있으며, token 원문 없이 token_ref와 접근성 검증 결과만 남기는지 확인.
- Wazuh rule이 `invalid_token_usage`, `disabled_account_login_attempt`, `log_deletion_attempt`, `abnormal_sensitive_query_after_risky_login`을 생성하는지 확인.
- Wazuh/Zeek/Suricata/firewall 중 하나가 VPN source IP의 내부망 포트스캔을 actor/session과 연결할 수 있는지 확인.
- VPN ACL 또는 firewall/security group 정책에서 role/scope별 허용 내부 서비스가 표현되는지 확인.
- service/bot 계정의 interactive login 허용 여부를 account policy로 조회할 수 있는지 확인.
- API 문서/스키마 endpoint 접근 로그가 actor/role/decision과 함께 남는지 확인.
- JWT role_version/account_status 재검증 결과가 token validation evidence로 남는지 확인.
- DB query audit에서 raw SQL/body 대신 query profile과 tenant_count/row_count만 남기는지 확인.
- Admin API 권한 판단 로그에 tenant check 결과와 cross-tenant grant 여부가 남는지 확인.
- 퇴사/비활성/유출 의심 계정 상태와 인증 이벤트가 actor_id로 연결되는지 확인.
- `PATCH /admin/staff/me` 등 자기 계정 수정 API에서 role/permission 필드가 submitted/blocked/persisted 중 어떤 상태였는지 로그로 남는지 확인.

## 제출 전 체크리스트

- [x] 사람이 evidence를 직접 넣는 방식이 아닌가?
- [x] collector가 실제로 관측 가능한 입력원인가?
- [x] normalizer가 만들 표준 field가 명확한가?
- [x] `required evidence type`과 `required field`가 비어 있지 않은가?
- [x] 정상 상태와 위반 상태가 모두 정의되어 있는가?
- [x] AI가 시나리오 내용을 몰라도 evidence만 보고 위반을 판단할 수 있는가?
- [x] 민감정보 원문 저장을 피했는가?
- [x] `검증 불가` 방지를 위한 필드가 정의되어 있는가?
