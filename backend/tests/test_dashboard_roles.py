import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.db_models import BusinessDB, BusinessUserDB


client = TestClient(app)


def _register_user(email_prefix: str = "user", password: str = "StrongPass!1"):
    email = f"{email_prefix}-{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post("/v1/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 200
    login = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return email, password, login.json()


def _ensure_membership(business_id: str, user_id: str, role: str) -> None:
    session = SessionLocal()
    try:
        business = session.get(BusinessDB, business_id)
        if not business:
            business = BusinessDB(  # type: ignore[call-arg]
                id=business_id,
                name=f"{business_id}-name",
                api_key=f"key-{business_id}",
                calendar_id="primary",
                status="ACTIVE",
            )
            session.add(business)
        existing = (
            session.query(BusinessUserDB)
            .filter(
                BusinessUserDB.business_id == business_id,
                BusinessUserDB.user_id == user_id,
            )
            .one_or_none()
        )
        if not existing:
            session.add(
                BusinessUserDB(  # type: ignore[call-arg]
                    id=uuid.uuid4().hex,
                    business_id=business_id,
                    user_id=user_id,
                    role=role,
                )
            )
        session.commit()
    finally:
        session.close()


def test_staff_cannot_manage_invites_or_roles_and_audit_logs_owner_actions():
    _, _, owner_tokens = _register_user("owner")
    owner_access = owner_tokens["access_token"]

    staff_email = f"staff-{uuid.uuid4().hex[:6]}@example.com"
    invite = client.post(
        "/v1/owner/invites",
        headers={"Authorization": f"Bearer {owner_access}"},
        json={"email": staff_email, "role": "staff"},
    )
    assert invite.status_code == 201
    invite_token = invite.json().get("invite_token")
    assert invite_token

    accept = client.post(
        "/v1/auth/invite/accept",
        json={"token": invite_token, "password": "StaffPass!2", "name": "Staffer"},
    )
    assert accept.status_code == 200
    staff_access = accept.json()["access_token"]

    staff_invite = client.post(
        "/v1/owner/invites",
        headers={"Authorization": f"Bearer {staff_access}"},
        json={"email": f"noop-{uuid.uuid4().hex[:4]}@example.com", "role": "viewer"},
    )
    assert staff_invite.status_code == 403

    role_change = client.patch(
        f"/v1/owner/users/{owner_tokens['user']['id']}",
        headers={"Authorization": f"Bearer {staff_access}"},
        json={"role": "viewer"},
    )
    assert role_change.status_code == 403

    audit = client.get(
        "/v1/owner/audit",
        headers={"Authorization": f"Bearer {owner_access}"},
    )
    assert audit.status_code == 200
    events = audit.json()
    assert any("/v1/owner/invites" in ev.get("path", "") for ev in events)


def test_active_business_patch_updates_roles_and_persists():
    _, _, tokens = _register_user("multi")
    user_id = tokens["user"]["id"]
    access = tokens["access_token"]
    new_business_id = f"biz_{uuid.uuid4().hex[:6]}"

    _ensure_membership(new_business_id, user_id, role="staff")

    patch = client.patch(
        "/v1/auth/active-business",
        headers={"Authorization": f"Bearer {access}"},
        json={"business_id": new_business_id},
    )
    assert patch.status_code == 200
    body = patch.json()
    assert body["user"]["active_business_id"] == new_business_id
    assert body["user"]["roles"] == ["staff"]
    new_access = body["access_token"]

    me = client.get(
        "/v1/auth/me",
        headers={
            "Authorization": f"Bearer {new_access}",
            "X-Business-ID": new_business_id,
        },
    )
    assert me.status_code == 200
    assert me.json()["active_business_id"] == new_business_id
    assert me.json()["roles"] == ["staff"]
