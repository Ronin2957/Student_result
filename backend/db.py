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


def delete_student(roll_no):
    """Delete a student by roll_no. Cascades to Marks and Result via FK."""
    return execute_query("DELETE FROM Student WHERE roll_no = %s", (roll_no,))


def update_student(roll_no, name, seat_no, category, year, semester):
    q = """
        UPDATE Student SET name=%s, seat_no=%s, category=%s, year=%s, semester=%s
        WHERE roll_no=%s
    """
    return execute_query(q, (name, seat_no, category, year, semester, roll_no))


# ─── Subject helpers ─────────────────────────────────────────
def insert_subject(subject_id, subject_name, credits, semester):
    q = """
        INSERT INTO Subject (subject_id, subject_name, credits, semester)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            subject_name=VALUES(subject_name), credits=VALUES(credits), semester=VALUES(semester)
    """
    return execute_query(q, (subject_id, subject_name, credits, semester))


def get_all_subjects():
    return execute_query("SELECT * FROM Subject ORDER BY semester, subject_id", fetch=True)


def get_subjects_by_semester(semester):
    """Return subjects for a specific semester."""
    return execute_query(
        "SELECT subject_id, subject_name, credits, semester FROM Subject WHERE semester = %s ORDER BY subject_id",
        (semester,), fetch=True
    )


def delete_subject(subject_id):
    """Delete a subject by subject_id. Cascades to Marks via FK."""
    return execute_query("DELETE FROM Subject WHERE subject_id = %s", (subject_id,))


def update_subject(subject_id, subject_name, credits, semester):
    q = """
        UPDATE Subject SET subject_name=%s, credits=%s, semester=%s
        WHERE subject_id=%s
    """
    return execute_query(q, (subject_name, credits, semester, subject_id))


# ─── Marks helpers ───────────────────────────────────────────
def insert_marks(roll_no, subject_id, semester, cie_marks, ese_marks, credits_earned):
    q = """
        INSERT INTO Marks (roll_no, subject_id, semester, cie_marks, ese_marks, credits_earned)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            cie_marks=VALUES(cie_marks), ese_marks=VALUES(ese_marks), credits_earned=VALUES(credits_earned)
    """
    return execute_query(q, (roll_no, subject_id, semester, cie_marks, ese_marks, credits_earned))


def get_all_marks():
    q = """
        SELECT m.roll_no, s_t.name AS student_name, m.subject_id,
               sub.subject_name, m.semester, m.cie_marks, m.ese_marks, m.total_marks,
               m.credits_earned
        FROM Marks m
        JOIN Student s_t ON m.roll_no = s_t.roll_no
        JOIN Subject sub ON m.subject_id = sub.subject_id
        ORDER BY m.roll_no, m.semester
    """
    return execute_query(q, fetch=True)


def delete_marks(roll_no, subject_id, semester):
    """Delete a marks entry by composite key."""
    return execute_query(
        "DELETE FROM Marks WHERE roll_no = %s AND subject_id = %s AND semester = %s",
        (roll_no, subject_id, semester)
    )


def update_marks(roll_no, subject_id, semester, cie_marks, ese_marks, credits_earned):
    q = """
        UPDATE Marks SET cie_marks=%s, ese_marks=%s, credits_earned=%s
        WHERE roll_no=%s AND subject_id=%s AND semester=%s
    """
    return execute_query(q, (cie_marks, ese_marks, credits_earned, roll_no, subject_id, semester))


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
        "SELECT roll_no, subject_id, semester, cie_marks, ese_marks, total_marks, credits_earned FROM Marks",
        fetch=True
    )


def get_subjects_for_prolog():
    return execute_query("SELECT subject_id, subject_name, credits FROM Subject", fetch=True)


def get_students_for_prolog():
    return execute_query("SELECT roll_no, name, seat_no, category, year, semester FROM Student", fetch=True)


def get_semester_history(roll_no):
    """Return all Result rows for a student ordered by semester."""
    q = """
        SELECT r.semester, r.sgpa, r.total_credits, r.grace_used,
               r.result_status, r.number_of_backlogs
        FROM Result r
        WHERE r.roll_no = %s
        ORDER BY r.semester
    """
    return execute_query(q, (roll_no,), fetch=True)


def get_cgpa(roll_no):
    """Compute CGPA from persisted Result rows: SUM(sgpa*total_credits)/SUM(total_credits)."""
    q = """
        SELECT
            ROUND(SUM(sgpa * total_credits) / NULLIF(SUM(total_credits), 0), 4) AS cgpa,
            SUM(total_credits) AS cumulative_credits
        FROM Result
        WHERE roll_no = %s AND sgpa IS NOT NULL AND total_credits IS NOT NULL AND total_credits > 0
    """
    rows = execute_query(q, (roll_no,), fetch=True)
    if rows and rows[0]["cgpa"] is not None:
        return {"cgpa": float(rows[0]["cgpa"]), "cumulative_credits": int(rows[0]["cumulative_credits"])}
    return {"cgpa": None, "cumulative_credits": 0}


# ─── Subject-level analysis (reasoning) ─────────────────────
def get_subject_analysis(roll_no, semester):
    """
    Return per-subject breakdown for a student+semester.
    Includes pass/fail status, reasons, grade points, and grace eligibility.
    """
    q = """
        SELECT m.subject_id, sub.subject_name, sub.credits,
               m.cie_marks, m.ese_marks, m.total_marks
        FROM Marks m
        JOIN Subject sub ON m.subject_id = sub.subject_id
        WHERE m.roll_no = %s AND m.semester = %s
        ORDER BY sub.subject_id
    """
    rows = execute_query(q, (roll_no, semester), fetch=True)

    analysis = []
    for row in rows:
        cie = row["cie_marks"]
        ese = row["ese_marks"]
        total = row["total_marks"]
        credits = row["credits"]

        passes_cie = cie >= 18
        passes_ese = ese >= 24
        passed = passes_cie and passes_ese

        # Grade points (10-point scale)
        if total >= 91: gp = 10
        elif total >= 81: gp = 9
        elif total >= 71: gp = 8
        elif total >= 61: gp = 7
        elif total >= 55: gp = 6
        elif total >= 50: gp = 5
        elif total >= 40: gp = 4
        else: gp = 0

        # Build reason
        reasons = []
        if not passes_cie:
            reasons.append(f"CIE = {cie} (need ≥ 18, short by {18 - cie})")
        if not passes_ese:
            reasons.append(f"ESE = {ese} (need ≥ 24, short by {24 - ese})")

        # Grace eligibility for this subject
        grace_needed = 0
        if not passed:
            if not passes_ese:
                grace_needed = 24 - ese
            elif not passes_cie:
                grace_needed = 18 - cie
        grace_eligible = grace_needed > 0 and grace_needed <= 6

        analysis.append({
            "subject_id": row["subject_id"],
            "subject_name": row["subject_name"],
            "credits": credits,
            "cie_marks": cie,
            "ese_marks": ese,
            "total_marks": total,
            "grade_points": gp,
            "weighted_gp": gp * credits,
            "passed": passed,
            "reasons": reasons,
            "grace_needed": grace_needed if not passed else 0,
            "grace_eligible": grace_eligible,
        })

    return analysis
