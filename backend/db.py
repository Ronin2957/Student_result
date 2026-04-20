"""
db.py — MySQL connection & helper utilities (Component-Based Marks System)
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
    """Delete a subject by subject_id. Cascades to Components and Marks via FK."""
    return execute_query("DELETE FROM Subject WHERE subject_id = %s", (subject_id,))


def update_subject(subject_id, subject_name, credits, semester):
    q = """
        UPDATE Subject SET subject_name=%s, credits=%s, semester=%s
        WHERE subject_id=%s
    """
    return execute_query(q, (subject_name, credits, semester, subject_id))


# ─── Component helpers ──────────────────────────────────────
def insert_component(subject_id, component_name, max_marks, passing_marks=0):
    q = """
        INSERT INTO Component (subject_id, component_name, max_marks, passing_marks)
        VALUES (%s, %s, %s, %s)
    """
    return execute_query(q, (subject_id, component_name, max_marks, passing_marks))


def get_components_by_subject(subject_id):
    """Return all components for a given subject."""
    return execute_query(
        "SELECT component_id, subject_id, component_name, max_marks, passing_marks FROM Component WHERE subject_id = %s ORDER BY component_id",
        (subject_id,), fetch=True
    )


def get_all_components():
    """Return all components with subject info."""
    q = """
        SELECT c.component_id, c.subject_id, s.subject_name, c.component_name, c.max_marks, c.passing_marks
        FROM Component c
        JOIN Subject s ON c.subject_id = s.subject_id
        ORDER BY c.subject_id, c.component_id
    """
    return execute_query(q, fetch=True)


def delete_component(component_id):
    """Delete a component. Cascades to Marks via FK."""
    return execute_query("DELETE FROM Component WHERE component_id = %s", (component_id,))


def update_component(component_id, component_name, max_marks, passing_marks):
    q = """
        UPDATE Component SET component_name=%s, max_marks=%s, passing_marks=%s
        WHERE component_id=%s
    """
    return execute_query(q, (component_name, max_marks, passing_marks, component_id))


# ─── Marks helpers ───────────────────────────────────────────
def insert_marks(roll_no, component_id, semester, obtained_marks, credits_earned):
    q = """
        INSERT INTO Marks (roll_no, component_id, semester, obtained_marks, credits_earned)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            obtained_marks=VALUES(obtained_marks), credits_earned=VALUES(credits_earned)
    """
    return execute_query(q, (roll_no, component_id, semester, obtained_marks, credits_earned))


def insert_marks_batch(roll_no, semester, marks_list, credits_earned):
    """
    Insert marks for multiple components at once.
    marks_list: [{ component_id, obtained_marks }, ...]
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        for m in marks_list:
            cursor.execute("""
                INSERT INTO Marks (roll_no, component_id, semester, obtained_marks, credits_earned)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    obtained_marks=VALUES(obtained_marks), credits_earned=VALUES(credits_earned)
            """, (roll_no, int(m["component_id"]), semester, int(m["obtained_marks"]), credits_earned))
        conn.commit()
        return {"rowcount": len(marks_list)}
    except Error as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def get_all_marks():
    q = """
        SELECT m.mark_id, m.roll_no, st.name AS student_name,
               c.subject_id, sub.subject_name,
               c.component_id, c.component_name, c.max_marks,
               m.semester, m.obtained_marks, m.credits_earned
        FROM Marks m
        JOIN Student st ON m.roll_no = st.roll_no
        JOIN Component c ON m.component_id = c.component_id
        JOIN Subject sub ON c.subject_id = sub.subject_id
        ORDER BY m.roll_no, m.semester, c.subject_id, c.component_id
    """
    return execute_query(q, fetch=True)


def get_marks_by_subject(roll_no, subject_id, semester):
    """Return all component marks for a student in a given subject and semester."""
    q = """
        SELECT m.mark_id, m.roll_no, c.component_id, c.component_name, c.max_marks,
               m.obtained_marks, m.credits_earned, c.passing_marks
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        WHERE m.roll_no = %s AND c.subject_id = %s AND m.semester = %s
        ORDER BY c.component_id
    """
    return execute_query(q, (roll_no, subject_id, semester), fetch=True)


def delete_marks_by_subject(roll_no, subject_id, semester):
    """Delete all marks for a student+subject+semester."""
    q = """
        DELETE m FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        WHERE m.roll_no = %s AND c.subject_id = %s AND m.semester = %s
    """
    return execute_query(q, (roll_no, subject_id, semester))


def delete_marks(mark_id):
    """Delete a single marks entry by mark_id."""
    return execute_query("DELETE FROM Marks WHERE mark_id = %s", (mark_id,))


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
    """Raw marks rows for Prolog fact generation — component-based."""
    q = """
        SELECT m.roll_no, c.subject_id, m.semester,
               c.component_name, c.max_marks, c.passing_marks,
               m.obtained_marks, m.credits_earned
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        ORDER BY m.roll_no, c.subject_id, c.component_id
    """
    return execute_query(q, fetch=True)


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


# ─── Subject-level analysis (reasoning) — Component-Based ───
def get_subject_analysis(roll_no, semester):
    """
    Return per-subject breakdown for a student+semester.
    Aggregates all component marks per subject, computes total and max,
    determines pass/fail per component and overall.
    """
    # Get all marks with component info for this student+semester
    q = """
        SELECT c.subject_id, sub.subject_name, sub.credits,
               c.component_id, c.component_name, c.max_marks, c.passing_marks,
               m.obtained_marks
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        JOIN Subject sub ON c.subject_id = sub.subject_id
        WHERE m.roll_no = %s AND m.semester = %s
        ORDER BY c.subject_id, c.component_id
    """
    rows = execute_query(q, (roll_no, semester), fetch=True)

    # Group by subject
    subjects = {}
    for row in rows:
        sid = row["subject_id"]
        if sid not in subjects:
            subjects[sid] = {
                "subject_id": sid,
                "subject_name": row["subject_name"],
                "credits": row["credits"],
                "components": [],
                "total_obtained": 0,
                "total_max": 0,
            }
        subjects[sid]["components"].append({
            "component_name": row["component_name"],
            "max_marks": row["max_marks"],
            "passing_marks": row["passing_marks"],
            "obtained_marks": row["obtained_marks"],
        })
        subjects[sid]["total_obtained"] += row["obtained_marks"]
        subjects[sid]["total_max"] += row["max_marks"]

    analysis = []
    for sid, s in subjects.items():
        total = s["total_obtained"]
        total_max = s["total_max"]
        credits = s["credits"]

        # Check per-component passing
        failed_components = []
        for comp in s["components"]:
            if comp["passing_marks"] > 0 and comp["obtained_marks"] < comp["passing_marks"]:
                failed_components.append(comp)

        passed = len(failed_components) == 0

        # Compute percentage for grade points (normalize to 100 scale)
        if total_max > 0:
            pct = (total / total_max) * 100
        else:
            pct = 0

        # Grade points (10-point scale based on percentage)
        if pct >= 91: gp = 10
        elif pct >= 81: gp = 9
        elif pct >= 71: gp = 8
        elif pct >= 61: gp = 7
        elif pct >= 55: gp = 6
        elif pct >= 50: gp = 5
        elif pct >= 40: gp = 4
        else: gp = 0

        # Build reasons
        reasons = []
        for comp in failed_components:
            short = comp["passing_marks"] - comp["obtained_marks"]
            reasons.append(
                f"{comp['component_name']} = {comp['obtained_marks']} (need ≥ {comp['passing_marks']}, short by {short})"
            )

        # Grace eligibility: if only 1 component failed and needs <= 6 marks
        grace_needed = 0
        if not passed and len(failed_components) == 1:
            grace_needed = failed_components[0]["passing_marks"] - failed_components[0]["obtained_marks"]
        grace_eligible = grace_needed > 0 and grace_needed <= 6

        analysis.append({
            "subject_id": sid,
            "subject_name": s["subject_name"],
            "credits": credits,
            "components": s["components"],
            "total_marks": total,
            "max_marks": total_max,
            "percentage": round(pct, 2),
            "grade_points": gp,
            "weighted_gp": gp * credits,
            "passed": passed,
            "reasons": reasons,
            "grace_needed": grace_needed if not passed else 0,
            "grace_eligible": grace_eligible,
        })

    return analysis
