# Fix "Token Invalid or Expired" Error

## 🔍 Root Causes:

1. **Old token in localStorage** (most common - 90% of cases)
2. **JWT_SECRET mismatch** between sessions
3. **Token expired** (after 7 days)
4. **CORS issues** preventing token from being sent
5. **Browser cache issues**

---

## ✅ Solution 1: Clear Browser Storage (RECOMMENDED)

### Method A: Browser Console
1. Open http://localhost:3000
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Paste and run:
```javascript
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Method B: Application Tab
1. Press **F12** (Developer Tools)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage** → Click `http://localhost:3000`
4. Right-click → **Clear**
5. Do the same for **Session Storage**
6. Refresh page (**Ctrl+F5** or **Cmd+Shift+R**)

### Method C: Incognito/Private Window
1. Open a new **Incognito/Private** browser window
2. Go to http://localhost:3000
3. Try logging in fresh

---

## ✅ Solution 2: Restart Backend Server

Sometimes the JWT_SECRET changes on restart. Let's ensure consistency:

### Windows (PowerShell):
```powershell
cd BloodPlatform/backend
npm start
```

### Verify .env file has JWT_SECRET:
Check that `backend/.env` contains:
```
JWT_SECRET=bloodplatform_secret_key_nnm23is_2026
```

---

## ✅ Solution 3: Re-create Test Accounts

If tokens are completely corrupted, recreate accounts:

### Run this in backend directory:
```bash
cd BloodPlatform/backend
node createTestAccounts.js
```

Then try logging in with:
- **Admin:** admin@test.com / admin123
- **Hospital:** hospital@test.com / hospital123
- **Donor:** donor@test.com / donor123

---

## ✅ Solution 4: Check Backend Logs

Look at the terminal where backend is running. If you see:
- `JsonWebTokenError: invalid signature` → JWT_SECRET mismatch
- `TokenExpiredError: jwt expired` → Token is older than 7 days
- `Not authorized, no token` → Token not being sent from frontend

---

## 🔧 Prevention Tips:

1. **Auto-logout on token expiry** - The frontend should detect expired tokens
2. **Token refresh** - Implement refresh token mechanism
3. **Clear storage on logout** - Already implemented in AuthContext
4. **Consistent JWT_SECRET** - Never change it in production

---

## 📋 Quick Checklist:

- [ ] Clear browser localStorage (Solution 1)
- [ ] Refresh the page with Ctrl+F5
- [ ] Try logging in again
- [ ] Check backend terminal for errors
- [ ] Verify backend is running on port 5000
- [ ] Check MongoDB is connected
- [ ] Try incognito/private window
- [ ] Re-create test accounts if needed

---

## 🆘 Still Not Working?

If none of the above work, run the diagnostic script below.
