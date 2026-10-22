# 🩸 Blood Donation Platform - How to Run

## 📋 Prerequisites (One-Time Setup)

### 1. Install Required Software

Before running the platform, make sure you have these installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)

### 2. Install Dependencies (First Time Only)

Open **Command Prompt** or **PowerShell** in the `BloodPlatform` folder and run:

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install AI service dependencies
cd ai-service
pip install -r requirements.txt
cd ..
```

### 3. Setup Environment Variables

Create a `.env` file in the `backend` folder:

```
backend/.env
```

With this content:
```
MONGODB_URI=mongodb://localhost:27017/blood-donation
JWT_SECRET=your-secret-key-here
PORT=5000
AI_SERVICE_URL=http://localhost:8000
```

### 4. Start MongoDB Service

**Option A - Windows Service (Recommended):**
- MongoDB should auto-start if installed as Windows Service
- Check in Services: Press `Win + R` → Type `services.msc` → Look for "MongoDB"

**Option B - Manual Start:**
```bash
net start MongoDB
```

---

## 🚀 How to Run the Platform

### **METHOD 1: Easy Way (Double-Click)**

1. Navigate to `BloodPlatform` folder
2. **Double-click** `START_ALL_SERVICES.bat`
3. Wait for all three windows to open
4. Open browser → `http://localhost:3000`

### **METHOD 2: Manual Way (Command Line)**

Open **three separate** Command Prompt/PowerShell windows:

**Window 1 - AI Service:**
```bash
cd BloodPlatform/ai-service
python app.py
```

**Window 2 - Backend:**
```bash
cd BloodPlatform/backend
npm run dev
```

**Window 3 - Frontend:**
```bash
cd BloodPlatform/frontend
npm start
```

---

## 🛑 How to Stop All Services

### **METHOD 1: Easy Way**
- **Double-click** `STOP_ALL_SERVICES.bat`

### **METHOD 2: Manual Way**
- Close all command prompt windows
- Or press `Ctrl + C` in each window

---

## 🌐 Access the Platform

Once all services are running:

- **Frontend (User Interface):** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **AI Service:** http://localhost:8000

---

## 👥 Test Accounts

### Donor Account
- **Email:** donor@test.com
- **Password:** donor123

### Hospital Account
- **Email:** hospital@test.com
- **Password:** hospital123

### Admin Account
- **Email:** admin@test.com
- **Password:** admin123

---

## ✅ Service Status Check

### Check if MongoDB is running:
```bash
tasklist | findstr mongod
```

### Check if Backend is running:
```bash
netstat -ano | findstr :5000
```

### Check if Frontend is running:
```bash
netstat -ano | findstr :3000
```

### Check if AI Service is running:
```bash
netstat -ano | findstr :8000
```

---

## 🐛 Troubleshooting

### Problem: MongoDB not starting
**Solution:**
```bash
# Start MongoDB service
net start MongoDB
```

### Problem: Port already in use (5000/3000/8000)
**Solution:**
```bash
# Find process using the port (example: port 3000)
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /F /PID <PID>
```

### Problem: "Module not found" errors
**Solution:**
```bash
# Reinstall dependencies
cd backend
npm install

cd ../frontend
npm install

cd ../ai-service
pip install -r requirements.txt
```

### Problem: Cannot connect to MongoDB
**Solution:**
1. Check MongoDB is running: `net start MongoDB`
2. Check connection string in `backend/.env`
3. Default should be: `mongodb://localhost:27017/blood-donation`

### Problem: Frontend won't compile
**Solution:**
```bash
cd frontend
# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
npm start
```

---

## 📁 Project Structure

```
BloodPlatform/
├── ai-service/          # Python Flask AI service
│   ├── app.py
│   └── requirements.txt
├── backend/             # Node.js Express API
│   ├── src/
│   ├── package.json
│   └── .env
├── frontend/            # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── START_ALL_SERVICES.bat    # Quick start script
├── STOP_ALL_SERVICES.bat     # Quick stop script
└── README_HOW_TO_RUN.md      # This file
```

---

## 🎯 Development Workflow

1. **Start services** using `START_ALL_SERVICES.bat`
2. **Make code changes** in your preferred editor
3. **Auto-reload:** Frontend and Backend will auto-reload on save
4. **Test changes** in browser at `http://localhost:3000`
5. **Stop services** using `STOP_ALL_SERVICES.bat` when done

---

## 📝 Important Notes

- **Keep all three terminal windows open** while using the app
- **Don't close** MongoDB service while platform is running
- **Frontend takes 30-60 seconds** to compile on first start
- **Backend connects to MongoDB** - ensure MongoDB is running first
- **Default ports:** AI:8000, Backend:5000, Frontend:3000

---

## 🔄 Create New Test Accounts

To create fresh test accounts:

```bash
cd backend
node createTestAccounts.js
```

---

## 📊 View Database

To view MongoDB data:

1. Install **MongoDB Compass** (GUI tool)
2. Connect to: `mongodb://localhost:27017`
3. Database: `blood-donation`

---

## 🚀 For Production Deployment

See `DEPLOYMENT.md` (if available) for production setup instructions.

---

## 💡 Quick Tips

- **Use Ctrl+C** to stop individual services
- **Check terminal output** for errors if something isn't working
- **Clear browser cache** if UI doesn't update
- **Restart services** if changes aren't reflecting

---

## 📞 Need Help?

If services won't start:
1. Check MongoDB is running
2. Check all dependencies are installed
3. Check ports 3000, 5000, 8000 are free
4. Check `.env` file exists in backend folder

---

**Happy Coding! 🩸**
