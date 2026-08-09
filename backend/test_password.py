import requests

BASE_URL = "http://127.0.0.1:8000/api"

# 1. Register a user
email = "testpw@example.com"
password = "oldpassword123"
print(f"Registering {email}...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Test User",
    "email": email,
    "phone": "9999988888",
    "password": password,
    "role": "BUYER",
    "city": "Chennai"
})
print("Register:", r.status_code, r.text)

# 2. Login
print(f"Logging in...")
r = requests.post(f"{BASE_URL}/auth/login", json={
    "email": email,
    "password": password
})
print("Login:", r.status_code, r.text)
if r.status_code != 200:
    exit(1)
token = r.json().get("access_token")

# 3. Change password
new_password = "newpassword456"
print(f"Changing password to {new_password}...")
r = requests.post(f"{BASE_URL}/auth/change-password", json={
    "current_password": password,
    "new_password": new_password
}, headers={"Authorization": f"Bearer {token}"})
print("Change Password:", r.status_code, r.text)

# 4. Login with new password
print(f"Logging in with NEW password...")
r = requests.post(f"{BASE_URL}/auth/login", json={
    "email": email,
    "password": new_password
})
print("Login 2:", r.status_code, r.text)
