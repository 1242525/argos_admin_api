// ────────────────────────────────────────────────────────────
// SAMPLE DATA
// ────────────────────────────────────────────────────────────
const DATA = {
  tenants: [
    { tenant_id: "tenant-a", name: "Tenant A", customer_count: 1, device_count: 1, status: "active" },
    { tenant_id: "tenant-b", name: "Tenant B", customer_count: 1, device_count: 1, status: "active" },
  ],
  customers: [
    {
      tenant_id: "tenant-a", customer_id: "CUST-001", username: "customer_a",
      email: "customer_a@tenanta.io", account_status: "active",
      owned_device_count: 1, shared_device_count: 0,
      last_login_at: "2025-07-14 09:12:44", last_access_ip: "203.0.113.10",
    },
    {
      tenant_id: "tenant-b", customer_id: "CUST-002", username: "customer_b",
      email: "customer_b@tenantb.io", account_status: "active",
      owned_device_count: 1, shared_device_count: 0,
      last_login_at: "2025-07-14 08:55:03", last_access_ip: "198.51.100.22",
    },
  ],
  devices: [
    {
      device_id: "DEV-0001", serial_number: "SN-CAM-001", tenant_id: "tenant-a",
      owner_id: "customer_a", firmware_version: "v2.3.1", device_status: "online",
      last_seen_at: "2025-07-14 09:14:00", installation_location_status: "indoor / floor-2",
    },
    {
      device_id: "DEV-0002", serial_number: "SN-CAM-002", tenant_id: "tenant-b",
      owner_id: "customer_b", firmware_version: "v2.3.1", device_status: "online",
      last_seen_at: "2025-07-14 09:13:55", installation_location_status: "outdoor / entrance",
    },
  ],
  mediaEvents: [
    {
      event_id: "EVT-M001", tenant_id: "tenant-a", owner_id: "customer_a", device_id: "DEV-0001",
      event_type: "motion_detected", event_time: "2025-07-14 09:01:22",
      minio_object_key: "tenant-a/DEV-0001/20250714_090122.mp4",
      thumbnail_status: "available", video_url_status: "signed",
    },
    {
      event_id: "EVT-M002", tenant_id: "tenant-b", owner_id: "customer_b", device_id: "DEV-0002",
      event_type: "motion_detected", event_time: "2025-07-14 09:03:47",
      minio_object_key: "tenant-b/DEV-0002/20250714_090347.mp4",
      thumbnail_status: "available", video_url_status: "signed",
    },
    {
      event_id: "EVT-M003", tenant_id: "tenant-a", owner_id: "customer_a", device_id: "DEV-0001",
      event_type: "tamper_alert", event_time: "2025-07-14 08:44:11",
      minio_object_key: "tenant-a/DEV-0001/20250714_084411.mp4",
      thumbnail_status: "available", video_url_status: "blocked",
    },
  ],
  ota: [
    {
      firmware_version: "v2.3.2", deployment_group: "canary-01",
      target_device_count: 2, update_status: "in_progress",
      signed_status: "signed", signed_by: "ops01",
      created_at: "2025-07-13 14:00:00", approved_by: "dev01",
    },
    {
      firmware_version: "v2.3.1", deployment_group: "prod-all",
      target_device_count: 2, update_status: "completed",
      signed_status: "signed", signed_by: "ops01",
      created_at: "2025-07-01 10:00:00", approved_by: "dev01",
    },
  ],
  staffAccounts: [
    {
      user_id: "UID-001", username: "dev01", role: "developer", department: "Engineering",
      employment_status: "active", account_status: "active", credential_status: "valid",
      last_login_at: "2025-07-14 08:30:00", last_permission_review_at: "2025-06-01",
    },
    {
      user_id: "UID-002", username: "ops01", role: "operator", department: "Operations",
      employment_status: "active", account_status: "active", credential_status: "valid",
      last_login_at: "2025-07-14 09:00:00", last_permission_review_at: "2025-06-01",
    },
    {
      user_id: "UID-003", username: "exuser1", role: "retired_developer", department: "Engineering",
      employment_status: "retired", account_status: "disabled", credential_status: "revoked",
      last_login_at: "2025-07-14 07:55:18", last_permission_review_at: "2025-01-15",
    },
  ],
  accessLogs: [
    {
      timestamp: "2025-07-14 09:14:02", request_id: "REQ-8821", actor_id: "customer_a",
      actor_role: "customer", token_id: "TKN-AA1", source_ip: "203.0.113.10",
      endpoint: "GET /api/v1/devices/DEV-0002/media", action: "READ",
      resource_type: "media", resource_id: "EVT-M002", resource_owner_id: "customer_b",
      tenant_id: "tenant-a", authorization_result: "DENIED", response_status: 403,
    },
    {
      timestamp: "2025-07-14 09:12:44", request_id: "REQ-8810", actor_id: "customer_a",
      actor_role: "customer", token_id: "TKN-AA1", source_ip: "203.0.113.10",
      endpoint: "GET /api/v1/devices/DEV-0001/media", action: "READ",
      resource_type: "media", resource_id: "EVT-M001", resource_owner_id: "customer_a",
      tenant_id: "tenant-a", authorization_result: "ALLOWED", response_status: 200,
    },
    {
      timestamp: "2025-07-14 07:55:18", request_id: "REQ-8791", actor_id: "exuser1",
      actor_role: "retired_developer", token_id: "TKN-EX3", source_ip: "10.0.99.5",
      endpoint: "POST /auth/login", action: "AUTH",
      resource_type: "auth", resource_id: "exuser1", resource_owner_id: "exuser1",
      tenant_id: "-", authorization_result: "DENIED", response_status: 401,
    },
    {
      timestamp: "2025-07-14 09:05:00", request_id: "REQ-8800", actor_id: "customer_a",
      actor_role: "customer", token_id: "TKN-FAKE", source_ip: "203.0.113.10",
      endpoint: "GET /api/v1/devices", action: "LIST",
      resource_type: "device", resource_id: "*", resource_owner_id: "*",
      tenant_id: "tenant-a", authorization_result: "DENIED", response_status: 401,
    },
    {
      timestamp: "2025-07-14 09:08:30", request_id: "REQ-8805", actor_id: "customer_a",
      actor_role: "customer", token_id: "TKN-AA1", source_ip: "203.0.113.10",
      endpoint: "GET /api/v1/media/events", action: "LIST",
      resource_type: "media", resource_id: "*", resource_owner_id: "*",
      tenant_id: "tenant-a", authorization_result: "ALLOWED", response_status: 200,
    },
  ],
  alerts: [
    {
      alert_id: "ALT-001", severity: "critical", event_type: "disabled_account_login_attempt",
      actor_id: "exuser1", source_ip: "10.0.99.5", target_service: "argos-was",
      target_resource: "auth/login", status: "open",
      created_at: "2025-07-14 07:55:18", linked_request_id: "REQ-8791",
    },
    {
      alert_id: "ALT-002", severity: "high", event_type: "cross_owner_access_attempt",
      actor_id: "customer_a", source_ip: "203.0.113.10", target_service: "argos-was",
      target_resource: "DEV-0002/media", status: "open",
      created_at: "2025-07-14 09:14:02", linked_request_id: "REQ-8821",
    },
    {
      alert_id: "ALT-003", severity: "high", event_type: "invalid_token_usage",
      actor_id: "customer_a", source_ip: "203.0.113.10", target_service: "argos-was",
      target_resource: "/api/v1/devices", status: "investigating",
      created_at: "2025-07-14 09:05:00", linked_request_id: "REQ-8800",
    },
    {
      alert_id: "ALT-004", severity: "warning", event_type: "mass_object_access",
      actor_id: "customer_a", source_ip: "203.0.113.10", target_service: "argos-minio",
      target_resource: "tenant-a/*", status: "open",
      created_at: "2025-07-14 09:08:30", linked_request_id: "REQ-8805",
    },
    {
      alert_id: "ALT-005", severity: "warning", event_type: "log_deletion_attempt",
      actor_id: "dev01", source_ip: "10.0.0.5", target_service: "argos-wazuh-manager",
      target_resource: "audit_log_2025_07", status: "resolved",
      created_at: "2025-07-13 22:10:00", linked_request_id: "REQ-8700",
    },
    {
      alert_id: "ALT-006", severity: "warning", event_type: "unauthorized_ota_lookup",
      actor_id: "customer_a", source_ip: "203.0.113.10", target_service: "argos-ota",
      target_resource: "/ota/targets", status: "open",
      created_at: "2025-07-14 08:30:00", linked_request_id: "REQ-8780",
    },
  ],
  services: [
    { service_id: "SVC-01", service_name: "argos-waf",           vm_name: "vm-dmz-01",    zone: "DMZ",        ip: "10.0.1.10", port: 443,  exposure: "external", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-02", service_name: "argos-was",           vm_name: "vm-ops-01",    zone: "Operations", ip: "10.0.2.10", port: 8080, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-03", service_name: "argos-admin",         vm_name: "vm-ops-02",    zone: "Operations", ip: "10.0.2.11", port: 8081, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-04", service_name: "argos-db",            vm_name: "vm-data-01",   zone: "Data",       ip: "10.0.3.10", port: 5432, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-05", service_name: "argos-minio",         vm_name: "vm-data-02",   zone: "Data",       ip: "10.0.3.11", port: 9000, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-06", service_name: "argos-ad",            vm_name: "vm-mgmt-01",   zone: "Management", ip: "10.0.7.10", port: 389,  exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-07", service_name: "argos-ota",           vm_name: "vm-deploy-01", zone: "Deploy",     ip: "10.0.4.10", port: 8082, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-08", service_name: "argos-signing",       vm_name: "vm-sign-01",   zone: "Signing",    ip: "10.0.5.10", port: 8443, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-09", service_name: "argos-mqtt",          vm_name: "vm-iot-01",    zone: "IoT",        ip: "10.0.6.10", port: 1883, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
    { service_id: "SVC-10", service_name: "argos-wazuh-manager", vm_name: "vm-sec-01",    zone: "Security",   ip: "10.0.8.10", port: 1514, exposure: "internal", health_status: "healthy", dependency_status: "ok" },
  ],
  auditLog: [
    {
      change_id: "CHG-001", timestamp: "2025-07-14 07:56:00", actor_id: "ops01",
      action_type: "account_disabled", target_type: "staff_account", target_id: "exuser1",
      before_value: "active", after_value: "disabled", reason: "retirement offboarding",
      approval_id: "APR-001",
    },
    {
      change_id: "CHG-002", timestamp: "2025-07-13 14:01:00", actor_id: "dev01",
      action_type: "ota_deployment_created", target_type: "firmware", target_id: "v2.3.2",
      before_value: "-", after_value: "in_progress", reason: "scheduled patch",
      approval_id: "APR-002",
    },
    {
      change_id: "CHG-003", timestamp: "2025-07-10 10:00:00", actor_id: "ops01",
      action_type: "permission_revoked", target_type: "credential", target_id: "exuser1/api-key",
      before_value: "valid", after_value: "revoked", reason: "offboarding - key rotation",
      approval_id: "APR-003",
    },
    {
      change_id: "CHG-004", timestamp: "2025-07-01 09:00:00", actor_id: "dev01",
      action_type: "ota_firmware_approved", target_type: "firmware", target_id: "v2.3.1",
      before_value: "pending", after_value: "approved", reason: "QA passed",
      approval_id: "APR-004",
    },
  ],
};

export default DATA;
