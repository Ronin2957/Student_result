# Student Result Analysis System - Project Report

## 1. Project Overview

**Project Name:** Scholastic Result Analysis System  
**Project Type:** Full-Stack Web Application  
**Purpose:** A comprehensive student result management and analysis system that stores and manages student data using both SQL (MySQL) and Prolog knowledge base simultaneously.

---

## 2. Project Purpose & Key Features

### Main Objectives:
- Manage student academic records across multiple semesters
- Track subject enrollment, components (internal/external assessments), and marks obtained
- Store data redundantly in both MySQL database and Prolog knowledge base for dual-method analysis
- Provide REST API for data operations
- Display student results and analysis through a web interface

### Key Features:
✅ **Student Management** - Add, retrieve, and manage student records  
✅ **Subject Management** - Organize subjects by semester with credit information  
✅ **Component Tracking** - Define assessment components (Internal, External, Test, Oral, etc.) with marks allocation  
✅ **Marks Recording** - Record student marks for each component and semester  
✅ **Dual Storage** - Simultaneous synchronization with MySQL and Prolog KB  
✅ **REST API** - Complete API endpoints for all CRUD operations  
✅ **Web Interface** - User-friendly frontend for data entry and viewing  

---

## 3. Project Architecture

```
Student_result/
├── backend/
│   ├── app.py                    # Flask REST API server
│   ├── db.py                     # MySQL database functions
│   ├── prolog_engine.py          # Prolog knowledge base management
│   ├── knowledge_base.pl         # Prolog facts and rules
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── index.html               # Main UI (Data input forms)
│   ├── script.js                # JavaScript logic for API calls
│   └── style.css                # Styling
├── sql/
│   └── schema.sql               # MySQL database schema and sample data
└── PROJECT_REPORT.md            # This report
```

---

## 4. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend Framework** | Flask | 3.0.3 |
| **CORS Support** | Flask-CORS | 4.0.1 |
| **Database** | MySQL | (via mysql-connector-python 9.0.0) |
| **Knowledge Base** | Prolog | (SWI-Prolog via subprocess) |
| **Frontend** | HTML5, CSS3, JavaScript | Vanilla JS |
| **Server Port** | 5000 (Flask default) | - |

---

## 5. Database Schema

### **Tables:**

#### **Student Table**
```sql
Student (
  roll_no     INT (PK),
  name        VARCHAR(100),
  seat_no     VARCHAR(20),
  category    VARCHAR(30),    -- General, OBC, SC, ST, EWS
  year        INT,            -- Academic year
  semester    INT             -- Semester number
)
```

#### **Subject Table**
```sql
Subject (
  subject_id   VARCHAR(20) (PK),
  subject_name VARCHAR(100),
  credits      INT,
  semester     INT
)
```

#### **Component Table**
```sql
Component (
  component_id   INT (PK, Auto-increment),
  subject_id     VARCHAR(20) (FK),
  component_name VARCHAR(10),     -- I1, E1, T1, O1, etc.
  max_marks      INT,
  passing_marks  INT
)
```

#### **Marks Table**
```sql
Marks (
  mark_id        INT (PK, Auto-increment),
  roll_no        INT (FK),
  component_id   INT (FK),
  semester       INT,
  obtained_marks INT,
  credits_earned INT
  -- UNIQUE constraint on (roll_no, component_id, semester)
)
```

### **Key Relationships:**
- Subject → Component (One-to-Many)
- Student → Marks (One-to-Many)
- Component → Marks (One-to-Many)

---

## 6. Backend API Endpoints

### **Base URL:** `http://localhost:5000/api`

#### **Health Check**
```
GET /api/health
Response: {"status": "ok", "method": "Both (SQL + Prolog)"}
```

#### **Student Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student` | Add new student |
| GET | `/api/students` | Retrieve all students |

**POST /api/student** - Request Body:
```json
{
  "roll_no": 2502610,
  "name": "Ronit Patil",
  "seat_no": "1",
  "category": "OBC",
  "year": 2,
  "semester": 3
}
```

#### **Subject Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subject` | Add new subject |
| GET | `/api/subjects` | Get all/filtered subjects |

**GET /api/subjects?semester=3** - Retrieves subjects for specific semester

#### **Component Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/component` | Add assessment component |
| GET | `/api/components` | Retrieve all components |

#### **Marks Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/marks` | Record student marks |
| GET | `/api/marks` | Retrieve marks |

---

## 7. Frontend Structure

### **Main Features:**
- **Tabbed Interface** - Separate tabs for Student, Subject, Component, and Marks entry
- **Form Validation** - Client-side validation for required fields
- **Data Display** - Tables showing all records
- **Real-time Alerts** - Success/Error notifications for API calls
- **Responsive Design** - CSS grid layout for multi-column forms

### **Key Form Sections:**
1. **Student Form** - Roll Number, Name, Seat Number, Category, Year, Semester
2. **Subject Form** - Subject ID, Subject Name, Credits, Semester
3. **Component Form** - Subject ID, Component Name, Max Marks, Passing Marks
4. **Marks Form** - Roll Number, Component ID, Semester, Marks Obtained

---

## 8. Dual Data Storage Approach

### **Hybrid Architecture:**
The system maintains data consistency across two storage mechanisms:

```
Data Input
    ↓
Flask API (app.py)
    ├─→ MySQL (db.py)
    │   └─→ Persistent relational storage
    │       Queries: SELECT, JOIN, aggregations
    │
    └─→ Prolog KB (prolog_engine.py)
        └─→ knowledge_base.pl
            Facts-based knowledge representation
            Logical inference and rule-based queries
```

### **Advantages:**
✅ **Redundancy** - Data persists in both systems  
✅ **Dual Analysis** - SQL for complex queries, Prolog for logical inference  
✅ **Learning Purpose** - Demonstrates both relational and logic programming paradigms  
✅ **Consistency** - Every insert/update writes to both systems simultaneously  

### **Implementation:**
- When a student is added: `db.insert_student()` AND `prolog_engine.add_student()` called
- When a subject is added: `db.insert_subject()` AND `prolog_engine.add_subject()` called
- Similar pattern for components and marks

---

## 9. Sample Data Included

### **Students (Semester 3):**
- **Ronit Patil** (Roll: 2502610, OBC Category)
- **Omkar Pawar** (Roll: 2502611, General Category)
- **Yash Palde** (Roll: 2502624, General Category)

### **Subjects (Semester 3):**
- Applied Mathematics (2343111) - 3 credits
- Advanced Data Structures (2343112) - 3 credits
- Database Management System (2343113) - 3 credits
- Automata Theory (2343114) - 3 credits
- ADSA Lab (2343115) - 1 credit
- SQL Lab (2343116) - 1 credit
- Mini Project (2343611) - 2 credits
- Entrepreneurship Development (2993511) - 2 credits
- Environmental Science (2993512) - 2 credits

### **Component Structure:**
- **Theory Subjects:** Internal (I1, 40 marks), External (E1, 60 marks), Test (T1, 25 marks)
- **Lab Subjects:** Test (T1, 25 marks), Oral (O1, 25 marks)
- **Projects:** Test (T1, 50 marks), Oral (O1, 25 marks)

### **Pass Criteria:**
- Internal: 16/40 marks
- External: 24/60 marks
- Test/Oral: 10/25 marks

---

## 10. Installation & Setup

### **Prerequisites:**
- Python 3.8+
- MySQL Server running on localhost:3306
- SWI-Prolog installed (for Prolog engine)
- Node.js/npm (optional, for serving frontend)

### **Setup Steps:**

#### **1. Database Setup:**
```bash
mysql -u root -p < sql/schema.sql
```
This creates:
- Database: `paradigm_result`
- Tables with sample data

#### **2. Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Server runs on: `http://localhost:5000`

#### **3. Frontend Setup:**
```bash
# Option A: Use Python's built-in server
cd frontend
python -m http.server 8000

# Option B: Use Node.js http-server
npx http-server frontend -p 8000
```
Access: `http://localhost:8000`

---

## 11. Key Files Description

| File | Purpose |
|------|---------|
| `app.py` | Flask REST API - defines all endpoints |
| `db.py` | Database functions for MySQL CRUD operations |
| `prolog_engine.py` | Manages Prolog KB - reads/writes facts |
| `knowledge_base.pl` | Prolog facts and inference rules |
| `requirements.txt` | Python package dependencies |
| `schema.sql` | MySQL schema and initial data |
| `index.html` | Main UI structure |
| `script.js` | API client logic and form handling |
| `style.css` | Styling and layout |

---

## 12. Current Status

✅ **Completed:**
- Database schema with proper relationships
- Backend REST API with all CRUD operations
- Frontend data entry forms
- Dual storage implementation (SQL + Prolog)
- Sample data for testing

⚠️ **Potential Enhancements:**
- Result calculation and analysis queries
- Student grade report generation
- Prolog-based inference rules for pass/fail determination
- Advanced analytics and charts
- Authentication and authorization
- Data validation and error handling improvements
- Unit tests and integration tests

---

## 13. Testing & Validation

### **Manual Testing Flow:**
1. Start MySQL server
2. Run `schema.sql` to initialize database
3. Start backend server: `python app.py`
4. Open frontend in browser
5. Add sample student/subject/marks via forms
6. Verify data appears in both MySQL and Prolog KB
7. Check API responses via Postman/curl

### **Expected Response:**
```json
{
  "message": "Student added to both DB and Prolog KB."
}
```

---

## 14. Summary

The **Student Result Analysis System** is a comprehensive full-stack application demonstrating:
- Modern web development practices (REST API, responsive UI)
- Dual database paradigms (SQL for structured data, Prolog for logical inference)
- Scalable architecture with proper separation of concerns
- Real-world academic record management use case

It serves as both a functional application and an educational project showcasing integration of relational databases with logic programming.

---

*Report Generated: April 23, 2026*  
*Project Version: 1.0*
