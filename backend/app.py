
from flask import Flask, request, jsonify
from flask_cors import CORS
import db
import prolog_engine

app = Flask(__name__)
CORS(app)


# ─── Health Check ───────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "method": "Both (SQL + Prolog)"})



# STUDENT endpoints

@app.route("/api/student", methods=["POST"])
def add_student():
    data = request.get_json()
    required = ["roll_no", "name", "seat_no", "category", "year", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        # Write to MySQL
        db.insert_student(
            int(data["roll_no"]), data["name"], data["seat_no"],
            data["category"], int(data["year"]), int(data["semester"])
        )
        # Write to Prolog KB
        prolog_engine.add_student(
            int(data["roll_no"]), data["name"], data["seat_no"],
            data["category"], int(data["year"]), int(data["semester"])
        )
        return jsonify({"message": "Student added to both DB and Prolog KB."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["GET"])
def get_students():
    try:
        return jsonify(db.get_all_students())
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# SUBJECT endpoints

@app.route("/api/subject", methods=["POST"])
def add_subject():
    data = request.get_json()
    required = ["subject_id", "subject_name", "credits", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.insert_subject(data["subject_id"], data["subject_name"], int(data["credits"]), int(data["semester"]))
        prolog_engine.add_subject(data["subject_id"], data["subject_name"], int(data["credits"]), int(data["semester"]))
        return jsonify({"message": "Subject added to both DB and Prolog KB."}), 201
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



# COMPONENT endpoints


@app.route("/api/component", methods=["POST"])
def add_component():
    data = request.get_json()
    required = ["subject_id", "component_name", "max_marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        passing = int(data.get("passing_marks", 0))
        db.insert_component(data["subject_id"], data["component_name"], int(data["max_marks"]), passing)
        prolog_engine.add_component(data["subject_id"], data["component_name"], int(data["max_marks"]), passing)
        return jsonify({"message": "Component added to both DB and Prolog KB."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/components", methods=["GET"])
def get_all_components():
    try:
        return jsonify(db.get_all_components())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/components/<subject_id>", methods=["GET"])
def get_components(subject_id):
    try:
        return jsonify(db.get_components_by_subject(subject_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# MARKS endpoints


@app.route("/api/marks", methods=["POST"])
def add_marks():
    data = request.get_json()
    required = ["roll_no", "subject_id", "semester", "credits_earned", "marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    marks_list = data["marks"]
    if not isinstance(marks_list, list) or len(marks_list) == 0:
        return jsonify({"error": "marks must be a non-empty array"}), 400

    try:
        # Write to MySQL
        db.insert_marks_batch(
            int(data["roll_no"]), int(data["semester"]),
            marks_list, int(data["credits_earned"])
        )

        # Write to Prolog KB — resolve component_id to component details
        components = db.get_components_by_subject(data["subject_id"])
        comp_map = {c["component_id"]: c for c in components}

        for m in marks_list:
            comp_id = int(m["component_id"])
            comp = comp_map.get(comp_id)
            if comp:
                prolog_engine.add_marks(
                    int(data["roll_no"]),
                    data["subject_id"],
                    int(data["semester"]),
                    comp["component_name"],
                    comp["max_marks"],
                    comp["passing_marks"],
                    int(m["obtained_marks"]),
                    int(data["credits_earned"])
                )

        return jsonify({"message": "Marks added to both DB and Prolog KB."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/marks", methods=["GET"])
def get_marks():
    try:
        return jsonify(db.get_all_marks())
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ANALYSIS endpoints — SQL Queries


@app.route("/api/query/sql", methods=["POST"])
def run_sql_query():
    data = request.get_json()
    required = ["query_type", "roll_no", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    query_type = data["query_type"]
    roll_no = int(data["roll_no"])
    semester = int(data["semester"])

    query_functions = {
        "sgpa": db.calculate_sgpa,
        "total_credits": db.get_total_credits,
        "backlogs": db.get_backlogs,
        "grace_marks": db.get_grace_marks,
        "result_status": db.get_result_status,
    }

    if query_type not in query_functions:
        return jsonify({"error": f"Unknown query type: {query_type}"}), 400

    try:
        result = query_functions[query_type](roll_no, semester)
        return jsonify({
            "query_type": query_type,
            "roll_no": roll_no,
            "semester": semester,
            "result": result,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ANALYSIS endpoints — Prolog Queries


@app.route("/api/query/prolog", methods=["POST"])
def run_prolog_query():
    data = request.get_json()
    required = ["query_type", "roll_no", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    query_type = data["query_type"]
    roll_no = int(data["roll_no"])
    semester = int(data["semester"])

    try:
        result = prolog_engine.run_prolog_query(query_type, roll_no, semester)
        return jsonify({
            "query_type": query_type,
            "roll_no": roll_no,
            "semester": semester,
            "result": result,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("🚀 Demo Project Backend starting on http://localhost:5000")
    app.run(debug=True, port=5000)
