"""
db.py — MySQL connection & SQL analysis queries
Scholastic Result Analysis — Demo Project (Both Methods)
"""
import mysql.connector
import time

# ─── Database Configuration ─────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",
    "password": "",
    "database": "paradigm_result",
}


def get_connection():
    """Return a fresh MySQL connection."""
    return mysql.connector.connect(**DB_CONFIG)


def run_query(query, params=(), fetch=False):
    """
    Execute a SQL query.
    fetch=True  → returns list of dicts
    fetch=False → commits and returns rowcount
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        if fetch:
            return cursor.fetchall()
        else:
            conn.commit()
            return {"rowcount": cursor.rowcount}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()



# INSERT FUNCTIONS (Add data)

def insert_student(roll_no, name, seat_no, category, year, semester):
    """Insert or update a student record."""
    q = """
        INSERT INTO Student (roll_no, name, seat_no, category, year, semester)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name=VALUES(name), seat_no=VALUES(seat_no),
            category=VALUES(category), year=VALUES(year), semester=VALUES(semester)
    """
    return run_query(q, (roll_no, name, seat_no, category, year, semester))


def insert_subject(subject_id, subject_name, credits, semester):
    """Insert or update a subject record."""
    q = """
        INSERT INTO Subject (subject_id, subject_name, credits, semester)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            subject_name=VALUES(subject_name), credits=VALUES(credits), semester=VALUES(semester)
    """
    return run_query(q, (subject_id, subject_name, credits, semester))


def insert_component(subject_id, component_name, max_marks, passing_marks=0):
    """Insert a new component for a subject."""
    q = """
        INSERT INTO Component (subject_id, component_name, max_marks, passing_marks)
        VALUES (%s, %s, %s, %s)
    """
    return run_query(q, (subject_id, component_name, max_marks, passing_marks))


def insert_marks_batch(roll_no, semester, marks_list, credits_earned):
    """
    Insert marks for multiple components at once.
    marks_list: [{ component_id, obtained_marks }, ...]
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        for m in marks_list:
            cursor.execute("""
                INSERT INTO Marks (roll_no, component_id, semester, obtained_marks, credits_earned)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    obtained_marks=VALUES(obtained_marks), credits_earned=VALUES(credits_earned)
            """, (roll_no, int(m["component_id"]), semester, int(m["obtained_marks"]), credits_earned))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


# UPDATE FUNCTIONS (Edit data)

def update_student(roll_no, name, seat_no, category, year, semester):
    """Update an existing student record."""
    q = """
        UPDATE Student SET name=%s, seat_no=%s, category=%s, year=%s, semester=%s
        WHERE roll_no=%s
    """
    return run_query(q, (name, seat_no, category, year, semester, roll_no))


def update_subject(subject_id, subject_name, credits, semester):
    """Update an existing subject record."""
    q = """
        UPDATE Subject SET subject_name=%s, credits=%s, semester=%s
        WHERE subject_id=%s
    """
    return run_query(q, (subject_name, credits, semester, subject_id))


def update_component(component_id, component_name, max_marks, passing_marks):
    """Update an existing component record."""
    q = """
        UPDATE Component SET component_name=%s, max_marks=%s, passing_marks=%s
        WHERE component_id=%s
    """
    return run_query(q, (component_name, max_marks, passing_marks, component_id))


def update_mark(mark_id, obtained_marks, credits_earned):
    """Update an existing marks record."""
    q = """
        UPDATE Marks SET obtained_marks=%s, credits_earned=%s
        WHERE mark_id=%s
    """
    return run_query(q, (obtained_marks, credits_earned, mark_id))


# DELETE FUNCTIONS (Remove data)

def delete_student(roll_no):
    """Delete a student record (cascades to marks)."""
    return run_query("DELETE FROM Student WHERE roll_no=%s", (roll_no,))


def delete_subject(subject_id):
    """Delete a subject record (cascades to components and marks)."""
    return run_query("DELETE FROM Subject WHERE subject_id=%s", (subject_id,))


def delete_component(component_id):
    """Delete a component record (cascades to marks)."""
    return run_query("DELETE FROM Component WHERE component_id=%s", (component_id,))


def delete_mark(mark_id):
    """Delete a marks record."""
    return run_query("DELETE FROM Marks WHERE mark_id=%s", (mark_id,))


# FETCH FUNCTIONS (Show data)

def get_all_students():
    return run_query("SELECT * FROM Student ORDER BY roll_no", fetch=True)


def get_all_subjects():
    return run_query("SELECT * FROM Subject ORDER BY semester, subject_id", fetch=True)


def get_subjects_by_semester(semester):
    return run_query(
        "SELECT * FROM Subject WHERE semester = %s ORDER BY subject_id",
        (semester,), fetch=True
    )


def get_all_components():
    q = """
        SELECT c.component_id, c.subject_id, s.subject_name,
               c.component_name, c.max_marks, c.passing_marks
        FROM Component c
        JOIN Subject s ON c.subject_id = s.subject_id
        ORDER BY c.subject_id, c.component_id
    """
    return run_query(q, fetch=True)


def get_components_by_subject(subject_id):
    return run_query(
        "SELECT * FROM Component WHERE subject_id = %s ORDER BY component_id",
        (subject_id,), fetch=True
    )


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
    return run_query(q, fetch=True)


# ANALYSIS FUNCTIONS — Core SQL Queries
# Each returns { "value": ..., "execution_time_ms": ... }

def calculate_sgpa(roll_no, semester):
    """
    SGPA = Sum(GradePoints * Credits) / Sum(Credits)
    Grade points based on percentage of total marks per subject.
    """
    start = time.perf_counter()

    # SQL query to get grade points and credits per subject
    q = """
        SELECT
            c.subject_id,
            s.credits,
            SUM(m.obtained_marks) AS total_obtained,
            SUM(c.max_marks) AS total_max,
            ROUND((SUM(m.obtained_marks) / SUM(c.max_marks)) * 100, 2) AS percentage,
            CASE
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 91 THEN 10
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 81 THEN 9
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 71 THEN 8
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 61 THEN 7
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 55 THEN 6
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 50 THEN 5
                WHEN (SUM(m.obtained_marks) / SUM(c.max_marks)) * 100 >= 40 THEN 4
                ELSE 0
            END AS grade_points
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        JOIN Subject s ON c.subject_id = s.subject_id
        WHERE m.roll_no = %s AND m.semester = %s
        GROUP BY c.subject_id, s.credits
    """
    rows = run_query(q, (roll_no, semester), fetch=True)

    if not rows:
        elapsed = (time.perf_counter() - start) * 1000
        return {"value": None, "execution_time_ms": round(elapsed, 3), "error": "No data found"}

    # Calculate SGPA from the SQL results
    total_weighted = sum(r["grade_points"] * r["credits"] for r in rows)
    total_credits = sum(r["credits"] for r in rows)
    sgpa = round(total_weighted / total_credits, 2) if total_credits > 0 else 0

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": sgpa, "execution_time_ms": round(elapsed, 3)}


def calculate_cgpa(roll_no, semester):
    """
    CGPA = Average of SGPA of current semester and the previous (odd) semester.
    Only valid for even semesters (2, 4, 6, 8).
    """
    start = time.perf_counter()

    if int(semester) % 2 != 0:
        elapsed = (time.perf_counter() - start) * 1000
        return {"value": None, "execution_time_ms": round(elapsed, 3), "error": "CGPA is only available for even semesters"}

    odd_sem = int(semester) - 1
    even_sem = int(semester)

    # Get SGPA for odd semester
    sgpa_odd = calculate_sgpa(roll_no, odd_sem)
    # Get SGPA for even semester
    sgpa_even = calculate_sgpa(roll_no, even_sem)

    if sgpa_odd.get("error") or sgpa_even.get("error"):
        elapsed = (time.perf_counter() - start) * 1000
        missing = []
        if sgpa_odd.get("error"):
            missing.append("Sem " + str(odd_sem))
        if sgpa_even.get("error"):
            missing.append("Sem " + str(even_sem))
        return {"value": None, "execution_time_ms": round(elapsed, 3),
                "error": "No data for: " + ", ".join(missing)}

    cgpa = round((sgpa_odd["value"] + sgpa_even["value"]) / 2, 2)

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": cgpa, "execution_time_ms": round(elapsed, 3),
            "details": {"sgpa_sem_" + str(odd_sem): sgpa_odd["value"],
                        "sgpa_sem_" + str(even_sem): sgpa_even["value"]}}


def get_total_credits(roll_no, semester):
    """
    Total credits = sum of credits for subjects where student passed ALL components.
    A component is passed if obtained_marks >= passing_marks (when passing_marks > 0).
    """
    start = time.perf_counter()

    # SQL: Get credits for subjects with NO failed components
    q = """
        SELECT IFNULL(SUM(s.credits), 0) AS total_credits
        FROM Subject s
        WHERE s.subject_id IN (
            SELECT DISTINCT c2.subject_id
            FROM Marks m2
            JOIN Component c2 ON m2.component_id = c2.component_id
            WHERE m2.roll_no = %s AND m2.semester = %s
        )
        AND s.subject_id NOT IN (
            SELECT DISTINCT c3.subject_id
            FROM Marks m3
            JOIN Component c3 ON m3.component_id = c3.component_id
            WHERE m3.roll_no = %s AND m3.semester = %s
            AND c3.passing_marks > 0
            AND m3.obtained_marks < c3.passing_marks
        )
    """
    rows = run_query(q, (roll_no, semester, roll_no, semester), fetch=True)

    elapsed = (time.perf_counter() - start) * 1000
    value = rows[0]["total_credits"] if rows else 0
    return {"value": int(value), "execution_time_ms": round(elapsed, 3)}


def get_backlogs(roll_no, semester):
    """
    Number of backlogs = count of subjects where at least one component is failed.
    """
    start = time.perf_counter()

    q = """
        SELECT COUNT(DISTINCT c.subject_id) AS backlogs
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        WHERE m.roll_no = %s AND m.semester = %s
        AND c.passing_marks > 0
        AND m.obtained_marks < c.passing_marks
    """
    rows = run_query(q, (roll_no, semester), fetch=True)

    elapsed = (time.perf_counter() - start) * 1000
    value = rows[0]["backlogs"] if rows else 0
    return {"value": int(value), "execution_time_ms": round(elapsed, 3)}


def get_grace_marks(roll_no, semester):
    """
    Grace marks: If exactly 1 subject failed and total marks needed <= 6, grace = marks needed.
    """
    start = time.perf_counter()

    # Step 1: Count failed subjects
    backlogs_q = """
        SELECT COUNT(DISTINCT c.subject_id) AS cnt
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        WHERE m.roll_no = %s AND m.semester = %s
        AND c.passing_marks > 0
        AND m.obtained_marks < c.passing_marks
    """
    backlog_rows = run_query(backlogs_q, (roll_no, semester), fetch=True)
    backlog_count = backlog_rows[0]["cnt"] if backlog_rows else 0

    grace = 0
    if backlog_count == 1:
        # Step 2: Calculate total marks needed to pass
        grace_q = """
            SELECT SUM(c.passing_marks - m.obtained_marks) AS needed
            FROM Marks m
            JOIN Component c ON m.component_id = c.component_id
            WHERE m.roll_no = %s AND m.semester = %s
            AND c.passing_marks > 0
            AND m.obtained_marks < c.passing_marks
        """
        grace_rows = run_query(grace_q, (roll_no, semester), fetch=True)
        needed = grace_rows[0]["needed"] if grace_rows and grace_rows[0]["needed"] else 0
        if needed <= 6:
            grace = int(needed)

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": grace, "execution_time_ms": round(elapsed, 3)}


def _get_overall_percentage(roll_no, semester):
    """Helper: Calculate overall percentage for a student in a semester."""
    q = """
        SELECT SUM(m.obtained_marks) AS total_obtained,
               SUM(c.max_marks) AS total_max
        FROM Marks m
        JOIN Component c ON m.component_id = c.component_id
        WHERE m.roll_no = %s AND m.semester = %s
    """
    rows = run_query(q, (roll_no, semester), fetch=True)
    if not rows or not rows[0]["total_max"] or rows[0]["total_max"] == 0:
        return None
    return (rows[0]["total_obtained"] / rows[0]["total_max"]) * 100


def get_result_status(roll_no, semester):
    """
    Result status based on backlogs, grace, and class:
    0 backlogs → PASS with class (Distinction, First Class, etc.)
    1 backlog + grace applicable → PASS (Grace) with class
    1 backlog + no grace → ATKT
    2+ backlogs → FAIL

    Class classification (NEP-2020):
    >= 75% → First Class with Distinction
    >= 60% → First Class
    >= 50% → Second Class (Higher Second)
    >= 40% → Pass Class
    """
    start = time.perf_counter()

    backlogs = get_backlogs(roll_no, semester)["value"]
    grace = get_grace_marks(roll_no, semester)["value"]

    if backlogs == 0:
        pct = _get_overall_percentage(roll_no, semester)
        class_label = _get_class_label(pct)
        status = "PASS - " + class_label if class_label else "PASS"
    elif backlogs == 1 and grace > 0:
        pct = _get_overall_percentage(roll_no, semester)
        class_label = _get_class_label(pct)
        status = "PASS (Grace) - " + class_label if class_label else "PASS (Grace)"
    elif backlogs == 1:
        status = "ATKT"
    else:
        status = "FAIL"

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": status, "execution_time_ms": round(elapsed, 3)}


def _get_class_label(percentage):
    """Return class label based on overall percentage (NEP-2020 scheme)."""
    if percentage is None:
        return ""
    if percentage >= 75:
        return "First Class with Distinction"
    elif percentage >= 60:
        return "First Class"
    elif percentage >= 50:
        return "Second Class"
    elif percentage >= 40:
        return "Pass Class"
    else:
        return ""


def get_next_year_eligibility(roll_no, semester):
    """
    Next year eligibility (NEP-2020 Engineering):
    Only applicable for even semesters (end of academic year).
    Criteria:
    - Maximum 3 backlogs across both semesters of the year
    - Minimum 34 credits earned across both semesters of the year
    """
    start = time.perf_counter()

    if int(semester) % 2 != 0:
        elapsed = (time.perf_counter() - start) * 1000
        return {"value": None, "execution_time_ms": round(elapsed, 3),
                "error": "Next year eligibility is only checked at even semesters (end of year)"}

    odd_sem = int(semester) - 1
    even_sem = int(semester)

    # Get backlogs for both semesters
    backlogs_odd = get_backlogs(roll_no, odd_sem)["value"]
    backlogs_even = get_backlogs(roll_no, even_sem)["value"]
    total_backlogs = backlogs_odd + backlogs_even

    # Get credits earned for both semesters
    credits_odd = get_total_credits(roll_no, odd_sem)["value"]
    credits_even = get_total_credits(roll_no, even_sem)["value"]
    total_credits = credits_odd + credits_even

    max_backlogs_allowed = 3
    min_credits_required = 34

    eligible = total_backlogs <= max_backlogs_allowed and total_credits >= min_credits_required

    if eligible:
        result_val = "ELIGIBLE"
    else:
        reasons = []
        if total_backlogs > max_backlogs_allowed:
            reasons.append("Backlogs: " + str(total_backlogs) + " (max " + str(max_backlogs_allowed) + ")")
        if total_credits < min_credits_required:
            reasons.append("Credits: " + str(total_credits) + " (min " + str(min_credits_required) + ")")
        result_val = "NOT ELIGIBLE — " + "; ".join(reasons)

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": result_val, "execution_time_ms": round(elapsed, 3),
            "details": {
                "total_backlogs": total_backlogs,
                "total_credits": total_credits,
                "backlogs_sem_" + str(odd_sem): backlogs_odd,
                "backlogs_sem_" + str(even_sem): backlogs_even,
                "credits_sem_" + str(odd_sem): credits_odd,
                "credits_sem_" + str(even_sem): credits_even,
            }}
