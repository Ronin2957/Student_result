"""
app.py — Flask API server (backend bridge)
Start with: python app.py
Runs on http://localhost:5000
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import db
import prolog_bridge

app = Flask(__name__)
CORS(app)  # Allow React dev server (port 5173) to call this API


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


# ════════════════════════════════════════════════════════════════════════════
# SUBJECT endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/subject", methods=["POST"])
def add_subject():
    data = request.get_json()
    required = ["subject_id", "subject_name", "credits"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.insert_subject(data["subject_id"], data["subject_name"], int(data["credits"]))
        prolog_bridge.regenerate_kb()
        return jsonify({"message": "Subject added and Prolog KB updated."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    try:
        return jsonify(db.get_all_subjects())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════
# MARKS endpoints
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/marks", methods=["POST"])
def add_marks():
    data = request.get_json()
    required = ["roll_no", "subject_id", "semester", "cie_marks", "ese_marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    cie = int(data["cie_marks"])
    ese = int(data["ese_marks"])
    if not (0 <= cie <= 40):
        return jsonify({"error": "CIE marks must be between 0 and 40"}), 400
    if not (0 <= ese <= 60):
        return jsonify({"error": "ESE marks must be between 0 and 60"}), 400

    try:
        db.insert_marks(
            int(data["roll_no"]), data["subject_id"],
            int(data["semester"]), cie, ese
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
    Body: { "query_type": "sgpa"|"total_credits"|"grace_used"|"result_status"|"number_of_backlogs",
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
        # Persist result to DB by running all 5 queries together then upserting
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
        pass  # Non-critical — result display still works from in-memory query


if __name__ == "__main__":
    print("🚀 Paradigm Backend starting on http://localhost:5000")
    app.run(debug=True, port=5000)
