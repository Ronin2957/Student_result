"""
db.py — MySQL connection & helper utilities
Uses mysql-connector-python.
Ensure XAMPP MySQL is running on port 3306.
"""
import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": "",          # Default XAMPP password is empty
    "database": "paradigm_result",
}


def get_connection():
    """Return a fresh MySQL connection."""
    return mysql.connector.connect(**DB_CONFIG)


def execute_query(query: str, params: tuple = (), fetch: bool = False):
    """
    Execute a query.
    If fetch=True  → returns list of dicts.
    If fetch=False → commits and returns lastrowid / rowcount.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        if fetch:
            result = cursor.fetchall()
            return result
        else:
            conn.commit()
            return {"lastrowid": cursor.lastrowid, "rowcount": cursor.rowcount}
    except Error as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


# ─── Student helpers ────────────────────────────────────────
def insert_student(roll_no, name, seat_no, category, year, semester):
    q = """
        INSERT INTO Student (roll_no, name, seat_no, category, year, semester)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name=VALUES(name), seat_no=VALUES(seat_no),
            category=VALUES(category), year=VALUES(year), semester=VALUES(semester)
    """
    return execute_query(q, (roll_no, name, seat_no, category, year, semester))


def get_all_students():
    return execute_query("SELECT * FROM Student ORDER BY roll_no", fetch=True)


# ─── Subject helpers ─────────────────────────────────────────
def insert_subject(subject_id, subject_name, credits):
    q = """
        INSERT INTO Subject (subject_id, subject_name, credits)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            subject_name=VALUES(subject_name), credits=VALUES(credits)
    """
    return execute_query(q, (subject_id, subject_name, credits))


def get_all_subjects():
    return execute_query("SELECT * FROM Subject ORDER BY subject_id", fetch=True)


# ─── Marks helpers ───────────────────────────────────────────
def insert_marks(roll_no, subject_id, semester, cie_marks, ese_marks):
    q = """
        INSERT INTO Marks (roll_no, subject_id, semester, cie_marks, ese_marks)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            cie_marks=VALUES(cie_marks), ese_marks=VALUES(ese_marks)
    """
    return execute_query(q, (roll_no, subject_id, semester, cie_marks, ese_marks))


def get_all_marks():
    q = """
        SELECT m.roll_no, s_t.name AS student_name, m.subject_id,
               sub.subject_name, m.semester, m.cie_marks, m.ese_marks, m.total_marks
        FROM Marks m
        JOIN Student s_t ON m.roll_no = s_t.roll_no
        JOIN Subject sub ON m.subject_id = sub.subject_id
        ORDER BY m.roll_no, m.semester
    """
    return execute_query(q, fetch=True)


# ─── Result helpers ──────────────────────────────────────────
def upsert_result(roll_no, semester, sgpa, total_credits, grace_used, result_status, number_of_backlogs):
    q = """
        INSERT INTO Result (roll_no, semester, sgpa, total_credits, grace_used, result_status, number_of_backlogs)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            sgpa=VALUES(sgpa), total_credits=VALUES(total_credits),
            grace_used=VALUES(grace_used), result_status=VALUES(result_status),
            number_of_backlogs=VALUES(number_of_backlogs)
    """
    return execute_query(q, (roll_no, semester, sgpa, total_credits, grace_used, result_status, number_of_backlogs))


def get_all_results():
    q = """
        SELECT r.*, s.name AS student_name
        FROM Result r
        JOIN Student s ON r.roll_no = s.roll_no
        ORDER BY r.roll_no, r.semester
    """
    return execute_query(q, fetch=True)


def get_marks_for_prolog():
    """Raw marks rows for Prolog fact generation."""
    return execute_query(
        "SELECT roll_no, subject_id, semester, cie_marks, ese_marks, total_marks FROM Marks",
        fetch=True
    )


def get_subjects_for_prolog():
    return execute_query("SELECT subject_id, subject_name, credits FROM Subject", fetch=True)


def get_students_for_prolog():
    return execute_query("SELECT roll_no, name, seat_no, category, year, semester FROM Student", fetch=True)
