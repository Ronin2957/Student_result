
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


@app.route("/api/student/<int:roll_no>", methods=["PUT"])
def edit_student(roll_no):
    data = request.get_json()
    required = ["name", "seat_no", "category", "year", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_student(roll_no, data["name"], data["seat_no"],
                          data["category"], int(data["year"]), int(data["semester"]))
        # Re-add to Prolog KB (replaces existing fact)
        prolog_engine.add_student(roll_no, data["name"], data["seat_no"],
                                  data["category"], int(data["year"]), int(data["semester"]))
        return jsonify({"message": "Student updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/<int:roll_no>", methods=["DELETE"])
def remove_student(roll_no):
    try:
        db.delete_student(roll_no)
        prolog_engine.delete_student(roll_no)
        return jsonify({"message": "Student deleted."})
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


@app.route("/api/subject/<subject_id>", methods=["PUT"])
def edit_subject(subject_id):
    data = request.get_json()
    required = ["subject_name", "credits", "semester"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_subject(subject_id, data["subject_name"], int(data["credits"]), int(data["semester"]))
        prolog_engine.add_subject(subject_id, data["subject_name"], int(data["credits"]), int(data["semester"]))
        return jsonify({"message": "Subject updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/subject/<subject_id>", methods=["DELETE"])
def remove_subject(subject_id):
    try:
        db.delete_subject(subject_id)
        prolog_engine.delete_subject(subject_id)
        return jsonify({"message": "Subject deleted."})
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


@app.route("/api/component/<int:component_id>", methods=["PUT"])
def edit_component(component_id):
    data = request.get_json()
    required = ["component_name", "max_marks", "passing_marks"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_component(component_id, data["component_name"],
                            int(data["max_marks"]), int(data["passing_marks"]))
        # Prolog KB components are matched by subject_id + component_name so re-add
        return jsonify({"message": "Component updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/component/<int:component_id>", methods=["DELETE"])
def remove_component(component_id):
    try:
        db.delete_component(component_id)
        return jsonify({"message": "Component deleted."})
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


@app.route("/api/mark/<int:mark_id>", methods=["PUT"])
def edit_mark(mark_id):
    data = request.get_json()
    required = ["obtained_marks", "credits_earned"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400
    try:
        db.update_mark(mark_id, int(data["obtained_marks"]), int(data["credits_earned"]))
        return jsonify({"message": "Mark updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/mark/<int:mark_id>", methods=["DELETE"])
def remove_mark(mark_id):
    try:
        db.delete_mark(mark_id)
        return jsonify({"message": "Mark deleted."})
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
        "cgpa": db.calculate_cgpa,
        "total_credits": db.get_total_credits,
        "backlogs": db.get_backlogs,
        "grace_marks": db.get_grace_marks,
        "result_status": db.get_result_status,
        "next_year_eligibility": db.get_next_year_eligibility,
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
