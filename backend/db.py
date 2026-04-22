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


def get_result_status(roll_no, semester):
    """
    Result status based on backlogs and grace:
    0 backlogs → PASS
    1 backlog + grace applicable → PASS (Grace)
    1 backlog + no grace → ATKT
    2+ backlogs → FAIL
    """
    start = time.perf_counter()

    backlogs = get_backlogs(roll_no, semester)["value"]
    grace = get_grace_marks(roll_no, semester)["value"]

    if backlogs == 0:
        status = "PASS"
    elif backlogs == 1 and grace > 0:
        status = "PASS (Grace)"
    elif backlogs == 1:
        status = "ATKT"
    else:
        status = "FAIL"

    elapsed = (time.perf_counter() - start) * 1000
    return {"value": status, "execution_time_ms": round(elapsed, 3)}
