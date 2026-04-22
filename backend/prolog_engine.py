
import os
import re
import subprocess
import time

# Path to the knowledge base file
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base.pl")

FACTS_START = "% --- facts start ---"
FACTS_END   = "% --- facts end ---"


# FACT MANAGEMENT (Read / Write to .pl file)

def _read_kb():
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return f.read()


def _get_facts_section():
    content = _read_kb()
    start = content.find(FACTS_START)
    end = content.find(FACTS_END)
    if start == -1 or end == -1:
        return ""
    return content[start + len(FACTS_START):end].strip()


def _write_facts(facts_text):
    content = _read_kb()
    start = content.find(FACTS_START)
    end = content.find(FACTS_END)
    if start == -1 or end == -1:
        raise RuntimeError("Could not find facts markers in knowledge_base.pl")
    new_content = (
        content[:start + len(FACTS_START)]
        + "\n" + facts_text + "\n"
        + content[end:]
    )
    with open(KB_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)


def _sanitize(val):
    return str(val).replace("'", "\\'")


# ─── Add Facts ──────────────────────────────────────────────

def add_student(roll_no, name, seat_no, category, year, semester):
    facts = _get_facts_section()
    pattern = re.compile(r"student\(" + str(roll_no) + r",.*?\)\.\n?")
    facts = pattern.sub("", facts)
    fact = f"student({roll_no}, '{_sanitize(name)}', '{_sanitize(seat_no)}', '{_sanitize(category)}', {year}, {semester})."
    facts = facts.strip() + "\n" + fact
    _write_facts(facts.strip())


def add_subject(subject_id, subject_name, credits, semester):
    facts = _get_facts_section()
    pattern = re.compile(r"subject\('" + re.escape(subject_id) + r"',.*?\)\.\n?")
    facts = pattern.sub("", facts)
    fact = f"subject('{_sanitize(subject_id)}', '{_sanitize(subject_name)}', {credits}, {semester})."
    facts = facts.strip() + "\n" + fact
    _write_facts(facts.strip())


def add_component(subject_id, component_name, max_marks, passing_marks=0):
    facts = _get_facts_section()
    check = f"component('{_sanitize(subject_id)}', '{_sanitize(component_name)}'"
    if check in facts:
        return
    fact = f"component('{_sanitize(subject_id)}', '{_sanitize(component_name)}', {max_marks}, {passing_marks})."
    facts = facts.strip() + "\n" + fact
    _write_facts(facts.strip())


def add_marks(roll_no, subject_id, semester, component_name, max_marks, passing_marks, obtained_marks, credits_earned):
    facts = _get_facts_section()
    pattern = re.compile(
        r"marks\(" + str(roll_no) + r",\s*'" + re.escape(subject_id) + r"',\s*" +
        str(semester) + r",\s*'" + re.escape(component_name) + r"',.*?\)\.\n?"
    )
    facts = pattern.sub("", facts)
    fact = f"marks({roll_no}, '{_sanitize(subject_id)}', {semester}, '{_sanitize(component_name)}', {max_marks}, {passing_marks}, {obtained_marks}, {credits_earned})."
    facts = facts.strip() + "\n" + fact
    _write_facts(facts.strip())


# ─── Read Facts ─────────────────────────────────────────────

def get_all_students():
    facts = _get_facts_section()
    pattern = re.compile(r"student\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)\.")
    return [{"roll_no": int(m.group(1)), "name": m.group(2), "seat_no": m.group(3),
             "category": m.group(4), "year": int(m.group(5)), "semester": int(m.group(6))}
            for m in pattern.finditer(facts)]


def get_all_subjects():
    facts = _get_facts_section()
    pattern = re.compile(r"subject\('([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)\.")
    return [{"subject_id": m.group(1), "subject_name": m.group(2),
             "credits": int(m.group(3)), "semester": int(m.group(4))}
            for m in pattern.finditer(facts)]


def get_subjects_by_semester(semester):
    return [s for s in get_all_subjects() if s["semester"] == semester]


def get_all_components():
    facts = _get_facts_section()
    pattern = re.compile(r"component\('([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)\.")
    components = []
    comp_id = 1
    for m in pattern.finditer(facts):
        components.append({"component_id": comp_id, "subject_id": m.group(1),
                           "component_name": m.group(2), "max_marks": int(m.group(3)),
                           "passing_marks": int(m.group(4))})
        comp_id += 1
    return components


def get_components_by_subject(subject_id):
    return [c for c in get_all_components() if c["subject_id"] == subject_id]


def get_all_marks():
    facts = _get_facts_section()
    pattern = re.compile(
        r"marks\((\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)\."
    )
    students = {s["roll_no"]: s["name"] for s in get_all_students()}
    subjects = {s["subject_id"]: s["subject_name"] for s in get_all_subjects()}
    marks = []
    for m in pattern.finditer(facts):
        roll_no = int(m.group(1))
        subject_id = m.group(2)
        marks.append({"roll_no": roll_no, "student_name": students.get(roll_no, "Unknown"),
                       "subject_id": subject_id, "subject_name": subjects.get(subject_id, "Unknown"),
                       "semester": int(m.group(3)), "component_name": m.group(4),
                       "max_marks": int(m.group(5)), "passing_marks": int(m.group(6)),
                       "obtained_marks": int(m.group(7)), "credits_earned": int(m.group(8))})
    return marks


# PROLOG QUERY RUNNER

QUERY_TEMPLATES = {
    "sgpa": "sgpa({roll_no}, {semester}, X), format('RESULT:~2f', [X]), nl, halt.",
    "total_credits": "total_credits({roll_no}, {semester}, X), format('RESULT:~w', [X]), nl, halt.",
    "backlogs": "number_of_backlogs({roll_no}, {semester}, X), format('RESULT:~w', [X]), nl, halt.",
    "grace_marks": "grace_used({roll_no}, {semester}, X), format('RESULT:~w', [X]), nl, halt.",
    "result_status": "result_status({roll_no}, {semester}, X), format('RESULT:~w', [X]), nl, halt.",
}


def run_prolog_query(query_type, roll_no, semester):
    if query_type not in QUERY_TEMPLATES:
        return {"value": None, "error": f"Unknown query type: {query_type}", "execution_time_ms": 0}

    goal = QUERY_TEMPLATES[query_type].format(roll_no=roll_no, semester=semester)
    kb_path = KB_PATH.replace("\\", "/")
    cmd = ["swipl", "-q", "-g", f"consult('{kb_path}'), {goal}", "-t", "halt(1)"]

    start = time.perf_counter()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        elapsed = (time.perf_counter() - start) * 1000
        raw_out = proc.stdout.strip()
        raw_err = proc.stderr.strip()

        match = re.search(r"RESULT:(.+)", raw_out)
        if match:
            raw_value = match.group(1).strip()
            try:
                value = float(raw_value)
                if value == int(value):
                    value = int(value)
            except ValueError:
                value = raw_value
            return {"value": value, "execution_time_ms": round(elapsed, 3)}
        else:
            return {"value": None, "execution_time_ms": round(elapsed, 3),
                    "error": raw_err or "Prolog goal failed — no data found for this student+semester."}
    except subprocess.TimeoutExpired:
        elapsed = (time.perf_counter() - start) * 1000
        return {"value": None, "error": "Prolog query timed out.", "execution_time_ms": round(elapsed, 3)}
    except FileNotFoundError:
        return {"value": None, "error": "swipl not found. Install SWI-Prolog and add to PATH.", "execution_time_ms": 0}
