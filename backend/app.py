"""
app.py — Flask API server (backend bridge)
Component-Based Marks System
Start with: python app.py
Runs on http://localhost:5000
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import db
import prolog_bridge

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API


# ─── Health check ───────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Paradigm backend is running"})


# ════════════════════════════════════════════════════════════════════════════
# STUDENT endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/student", methods=["POST"])
def add_student():
    data = request.get_json()
    required = ["roll_no", "name", "seat_no", "category", "year", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.insert_student(
            int(data["roll_no"]), data["name"], data["seat_no"],
            data["category"], int(data["year"]), int(data["semester"])
        )
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Student added and Prolog KB updated."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["GET"])
def get_students():
    try:
        return jsonify(db.get_all_students())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/<int:roll_no>", methods=["DELETE"])
def delete_student(roll_no):
    try:
        db.delete_student(roll_no)
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Student {roll_no} deleted and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/<int:roll_no>", methods=["PUT"])
def update_student(roll_no):
    data = request.get_json()
    required = ["name", "seat_no", "category", "year", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_student(
            roll_no, data["name"], data["seat_no"],
            data["category"], int(data["year"]), int(data["semester"])
        )
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Student {roll_no} updated and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# SUBJECT endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/subject", methods=["POST"])
def add_subject():
    data = request.get_json()
    required = ["subject_id", "subject_name", "credits", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.insert_subject(data["subject_id"], data["subject_name"], int(data["credits"]), int(data["semester"]))
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Subject added and Prolog KB updated."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    try:
        semester = request.args.get("semester")
        if semester:
            return jsonify(db.get_subjects_by_semester(int(semester)))
        return jsonify(db.get_all_subjects())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/subject/<subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    try:
        db.delete_subject(subject_id)
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Subject {subject_id} deleted and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/subject/<subject_id>", methods=["PUT"])
def update_subject(subject_id):
    data = request.get_json()
    required = ["subject_name", "credits", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_subject(subject_id, data["subject_name"], int(data["credits"]), int(data["semester"]))
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Subject {subject_id} updated and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# COMPONENT endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/component", methods=["POST"])
def add_component():
    data = request.get_json()
    required = ["subject_id", "component_name", "max_marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        passing = int(data.get("passing_marks", 0))
        db.insert_component(data["subject_id"], data["component_name"], int(data["max_marks"]), passing)
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Component added and Prolog KB updated."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/components/<subject_id>", methods=["GET"])
def get_components(subject_id):
    """Return all components for a given subject."""
    try:
        return jsonify(db.get_components_by_subject(subject_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/components", methods=["GET"])
def get_all_components():
    """Return all components with subject info."""
    try:
        return jsonify(db.get_all_components())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/component/<int:component_id>", methods=["DELETE"])
def delete_component(component_id):
    try:
        db.delete_component(component_id)
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Component {component_id} deleted and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/component/<int:component_id>", methods=["PUT"])
def update_component(component_id):
    data = request.get_json()
    required = ["component_name", "max_marks", "passing_marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_component(component_id, data["component_name"], int(data["max_marks"]), int(data["passing_marks"]))
        prolog_bridge.regenerate_kb()
        return jsonify({"message": f"Component {component_id} updated and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# MARKS endpoints (Component-Based)
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/marks", methods=["POST"])
def add_marks():
    """
    Accept dynamic component-based marks.
    Body: {
        roll_no, subject_id, semester, credits_earned,
        marks: [ { component_id, obtained_marks }, ... ]
    }
    """
    data = request.get_json()
    required = ["roll_no", "subject_id", "semester", "credits_earned", "marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    marks_list = data["marks"]
    if not isinstance(marks_list, list) or len(marks_list) == 0:
        return jsonify({"error": "marks must be a non-empty array of { component_id, obtained_marks }"}), 400

    # Validate each component's marks against max
    components = db.get_components_by_subject(data["subject_id"])
    comp_map = {c["component_id"]: c for c in components}

    for m in marks_list:
        cid = int(m["component_id"])
        obtained = int(m["obtained_marks"])
        if cid not in comp_map:
            return jsonify({"error": f"Component ID {cid} does not belong to subject {data['subject_id']}"}), 400
        if not (0 <= obtained <= comp_map[cid]["max_marks"]):
            return jsonify({"error": f"Marks for {comp_map[cid]['component_name']} must be between 0 and {comp_map[cid]['max_marks']}"}), 400

    try:
        db.insert_marks_batch(
            int(data["roll_no"]),
            int(data["semester"]),
            marks_list,
            int(data["credits_earned"])
        )
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Marks added and Prolog KB updated."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/marks", methods=["GET"])
def get_marks():
    try:
        return jsonify(db.get_all_marks())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/marks/<int:roll_no>/<subject_id>/<int:semester>", methods=["DELETE"])
def delete_marks(roll_no, subject_id, semester):
    try:
        db.delete_marks_by_subject(roll_no, subject_id, semester)
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Marks deleted and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/marks/<int:roll_no>/<subject_id>/<int:semester>", methods=["PUT"])
def update_marks(roll_no, subject_id, semester):
    """
    Update marks for a student+subject+semester.
    Body: { credits_earned, marks: [ { component_id, obtained_marks }, ... ] }
    """
    data = request.get_json()
    required = ["credits_earned", "marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    marks_list = data["marks"]
    components = db.get_components_by_subject(subject_id)
    comp_map = {c["component_id"]: c for c in components}

    for m in marks_list:
        cid = int(m["component_id"])
        obtained = int(m["obtained_marks"])
        if cid not in comp_map:
            return jsonify({"error": f"Component ID {cid} does not belong to subject {subject_id}"}), 400
        if not (0 <= obtained <= comp_map[cid]["max_marks"]):
            return jsonify({"error": f"Marks for {comp_map[cid]['component_name']} must be between 0 and {comp_map[cid]['max_marks']}"}), 400

    try:
        # Delete existing then re-insert
        db.delete_marks_by_subject(roll_no, subject_id, semester)
        db.insert_marks_batch(roll_no, semester, marks_list, int(data["credits_earned"]))
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Marks updated and Prolog KB updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# RESULT endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/results", methods=["GET"])
def get_results():
    try:
        return jsonify(db.get_all_results())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# PROLOG endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/prolog/regenerate", methods=["POST"])
def regenerate_prolog():
    """Manually trigger KB regeneration (usually auto-triggered on inserts)."""
    try:
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Knowledge base regenerated successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/prolog/query", methods=["POST"])
def prolog_query():
    """
    Run a Prolog query for a student+semester.
    Body: { "query_type": "sgpa"|"total_credits"|"grace_used"|"result_status"|"number_of_backlogs"|"cgpa",
            "roll_no": 101, "semester": 3 }
    """
    data = request.get_json()
    required = ["query_type", "roll_no", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    query_type = data["query_type"]
    roll_no    = int(data["roll_no"])
    semester   = int(data["semester"])

    result = prolog_bridge.run_prolog_query(query_type, roll_no, semester)

    if result["success"]:
        _maybe_persist_result(roll_no, semester, query_type, result["value"])

    return jsonify({
        "query_type": query_type,
        "roll_no":    roll_no,
        "semester":   semester,
        "result":     result,
    })


def _maybe_persist_result(roll_no: int, semester: int, just_queried: str, value):
    """
    After any query, try to compute all 5 fields and upsert into Result table.
    If a query fails (no data), keeps existing value from DB.
    """
    try:
        queries = ["sgpa", "total_credits", "grace_used", "result_status", "number_of_backlogs"]
        results = {}
        for q in queries:
            r = prolog_bridge.run_prolog_query(q, roll_no, semester)
            results[q] = r["value"] if r["success"] else None

        if any(v is not None for v in results.values()):
            db.upsert_result(
                roll_no, semester,
                results.get("sgpa"),
                results.get("total_credits"),
                results.get("grace_used", 0),
                results.get("result_status"),
                results.get("number_of_backlogs", 0),
            )
    except Exception:
        pass


# ════════════════════════════════════════════════════════════════════════════
# ANALYSIS / CGPA / HISTORY endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/student/<int:roll_no>/analysis", methods=["GET"])
def student_analysis(roll_no):
    """Return per-subject analysis with pass/fail reasoning."""
    semester = request.args.get("semester")
    if not semester:
        return jsonify({"error": "Query parameter 'semester' is required."}), 400
    try:
        return jsonify(db.get_subject_analysis(roll_no, int(semester)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/<int:roll_no>/cgpa", methods=["GET"])
def student_cgpa(roll_no):
    """Return computed CGPA for a student (from persisted Result rows)."""
    try:
        return jsonify(db.get_cgpa(roll_no))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/<int:roll_no>/history", methods=["GET"])
def student_history(roll_no):
    """Return semester-wise SGPA / credits / grace history."""
    try:
        return jsonify(db.get_semester_history(roll_no))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("🚀 Paradigm Backend starting on http://localhost:5000")
    app.run(debug=True, port=5000)
