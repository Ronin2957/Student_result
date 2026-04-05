"""
prolog_bridge.py — Handles:
  1. Auto-generating Prolog facts from DB and writing to knowledge_base.pl
  2. Running SWI-Prolog queries via subprocess and parsing results
"""
import os
import re
import subprocess
from db import get_students_for_prolog, get_subjects_for_prolog, get_marks_for_prolog

# Absolute path to the knowledge base file (same directory as this script)
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base.pl")

# ─── Fact Generation ────────────────────────────────────────────────────────

def _sanitize(val):
    """Escape single quotes in Prolog string atoms."""
    return str(val).replace("'", "\\'")


def generate_facts() -> str:
    """Build the facts section as a Prolog string from DB data."""
    students = get_students_for_prolog()
    subjects = get_subjects_for_prolog()
    marks    = get_marks_for_prolog()

    lines = []
    lines.append("% --- Auto-generated facts ---")

    for s in students:
        name = _sanitize(s["name"])
        seat = _sanitize(s["seat_no"])
        cat  = _sanitize(s["category"])
        lines.append(
            f"student({s['roll_no']}, '{name}', '{seat}', '{cat}', {s['year']}, {s['semester']})."
        )

    lines.append("")
    for sub in subjects:
        sname = _sanitize(sub["subject_name"])
        lines.append(
            f"subject('{sub['subject_id']}', '{sname}', {sub['credits']})."
        )

    lines.append("")
    for m in marks:
        lines.append(
            f"marks({m['roll_no']}, '{m['subject_id']}', {m['semester']}, "
            f"{m['cie_marks']}, {m['ese_marks']}, {m['total_marks']})."
        )

    return "\n".join(lines)


RULES_MARKER = "% ============================================================\n% SECTION 2: RULES"


def regenerate_kb():
    """
    Read the existing knowledge_base.pl, replace Section 1 (facts) with
    freshly generated facts, and write it back.
    """
    with open(KB_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the boundary between Section 1 and Section 2
    marker_idx = content.find(RULES_MARKER)
    if marker_idx == -1:
        raise RuntimeError("Could not find Section 2 marker in knowledge_base.pl")

    # Preserve the header comment (everything before Section 1 facts comment)
    header_marker = "% ============================================================\n% SECTION 1"
    header_idx = content.find(header_marker)
    if header_idx == -1:
        header_idx = 0

    header = content[:header_idx]

    new_content = (
        header
        + header_marker + " (auto-generated — replaced by Python)\n"
        + "% ============================================================\n"
        + generate_facts()
        + "\n\n"
        + content[marker_idx:]
    )

    with open(KB_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True


# ─── Query Runner ───────────────────────────────────────────────────────────

QUERY_TEMPLATES = {
    "sgpa": (
        "sgpa({roll_no}, {semester}, X), "
        "format('RESULT:~2f', [X]), nl, halt."
    ),
    "total_credits": (
        "total_credits({roll_no}, {semester}, X), "
        "format('RESULT:~w', [X]), nl, halt."
    ),
    "grace_used": (
        "grace_used({roll_no}, {semester}, X), "
        "format('RESULT:~w', [X]), nl, halt."
    ),
    "result_status": (
        "result_status({roll_no}, {semester}, X), "
        "format('RESULT:~w', [X]), nl, halt."
    ),
    "number_of_backlogs": (
        "number_of_backlogs({roll_no}, {semester}, X), "
        "format('RESULT:~w', [X]), nl, halt."
    ),
}


def run_prolog_query(query_type: str, roll_no: int, semester: int):
    """
    Run a SWI-Prolog query and return the extracted result value.
    Returns dict: { "value": <parsed_value>, "raw": <raw_output> }
    """
    if query_type not in QUERY_TEMPLATES:
        raise ValueError(f"Unknown query type: {query_type}")

    goal_template = QUERY_TEMPLATES[query_type]
    goal = goal_template.format(roll_no=roll_no, semester=semester)

    # Build swipl command
    cmd = [
        "swipl",
        "-q",                          # quiet (suppress banner)
        "-g", f"consult('{KB_PATH.replace(chr(92), '/')}'), {goal}",
        "-t", "halt(1)",               # halt with error if goal fails
    ]

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
        raw_out = proc.stdout.strip()
        raw_err = proc.stderr.strip()

        # Extract value after "RESULT:" marker
        match = re.search(r"RESULT:(.+)", raw_out)
        if match:
            raw_value = match.group(1).strip()
            # Parse numeric
            try:
                value = float(raw_value)
                if value == int(value):
                    value = int(value)
            except ValueError:
                value = raw_value  # keep as string (e.g. "PASS")

            return {"success": True, "value": value, "raw": raw_out}
        else:
            return {
                "success": False,
                "value": None,
                "raw": raw_out,
                "error": raw_err or "Prolog goal failed / no facts found for this student+semester."
            }

    except subprocess.TimeoutExpired:
        return {"success": False, "value": None, "error": "Prolog query timed out."}
    except FileNotFoundError:
        return {
            "success": False,
            "value": None,
            "error": "swipl not found. Make sure SWI-Prolog is installed and on your PATH."
        }
