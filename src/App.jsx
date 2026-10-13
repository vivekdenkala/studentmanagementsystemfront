
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8082/api/students";
const ATTENDANCE_URL = "http://localhost:8082/api/attendance";

function App() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    rollNumber: "",
    fullName: "",
    section: "A",
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStudents() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Could not load students");
      setStudents(await response.json());
    } catch {
      setMessage("Cannot connect to backend. Check that Spring Boot is running on port 8082.");
    }
  }

  async function loadAttendance() {
    try {
      const response = await fetch(
        `${ATTENDANCE_URL}?date=${encodeURIComponent(date)}`
      );
      if (!response.ok) throw new Error("Could not load attendance");
      setAttendance(await response.json());
    } catch {
      setMessage("Could not load attendance. Check the backend and selected date.");
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [date]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function saveStudent(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text() || "Unable to save student");
      }

      setForm({ rollNumber: "", fullName: "", section: "A" });
      setEditingId(null);
      setMessage(editingId ? "Student updated successfully." : "Student added successfully.");
      await loadStudents();
    } catch (error) {
      setMessage(error.message || "Unable to save student.");
    } finally {
      setLoading(false);
    }
  }

  function editStudent(student) {
    setEditingId(student.id);
    setForm({
      rollNumber: student.rollNumber ?? "",
      fullName: student.fullName ?? "",
      section: student.section ?? "A",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteStudent(id) {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete student");
      setMessage("Student deleted successfully.");
      await loadStudents();
      await loadAttendance();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function getAttendance(studentId) {
    return attendance.find((record) => record.studentId === studentId);
  }

  async function saveAttendance(studentId, status) {
    const existing = getAttendance(studentId);

    try {
      const response = await fetch(
        existing
          ? `${ATTENDANCE_URL}/${existing.id}`
          : ATTENDANCE_URL,
        {
          method: existing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            existing
              ? { status }
              : { studentId, date, status }
          ),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text() || "Unable to save attendance");
      }

      setMessage(`Attendance saved: ${status}.`);
      await loadAttendance();
    } catch (error) {
      setMessage(error.message || "Unable to save attendance.");
    }
  }

  const presentCount = students.filter(
    (student) => getAttendance(student.id)?.status === "PRESENT"
  ).length;

  const absentCount = students.filter(
    (student) => getAttendance(student.id)?.status === "ABSENT"
  ).length;

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Teacher Attendance System</h1>
          <p>Manage students and daily attendance</p>
        </div>
        <span className="live-label">● Dashboard</span>
      </header>

      {message && (
        <div className="message" role="status">
          {message}
          <button className="dismiss" onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <main>
        <section className="stats">
          <article className="stat-card">
            <span>Total Students</span>
            <strong>{students.length}</strong>
          </article>
          <article className="stat-card">
            <span>Present Today</span>
            <strong>{presentCount}</strong>
          </article>
          <article className="stat-card">
            <span>Absent Today</span>
            <strong>{absentCount}</strong>
          </article>
        </section>

        <section className="panel">
          <h2>{editingId ? "Edit Student" : "Add New Student"}</h2>
          <form className="student-form" onSubmit={saveStudent}>
            <label>
              Roll Number
              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="e.g. STU002"
                required
              />
            </label>
            <label>
              Student Name
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </label>
            <label>
              Section
              <select name="section" value={form.section} onChange={handleChange}>
                {["A", "B", "C", "D"].map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="primary" disabled={loading} type="submit">
                {loading ? "Saving..." : editingId ? "Update Student" : "Add Student"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ rollNumber: "", fullName: "", section: "A" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Student Records</h2>
            <button className="secondary" onClick={loadStudents}>Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll Number</th><th>Student Name</th><th>Section</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.rollNumber}</td>
                    <td>{student.fullName}</td>
                    <td>{student.section}</td>
                    <td className="actions">
                      <button className="edit" onClick={() => editStudent(student)}>Edit</button>
                      <button className="delete" onClick={() => deleteStudent(student.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan="4" className="empty">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Daily Attendance</h2>
              <p className="muted">Select a date, then mark each student's status.</p>
            </div>
            <label className="date-label">
              Attendance Date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>

          <div className="attendance-summary">
            <span>Present: <strong>{presentCount}</strong></span>
            <span>Absent: <strong>{absentCount}</strong></span>
            <span>Not marked: <strong>{students.length - presentCount - absentCount}</strong></span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll Number</th><th>Student Name</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const record = getAttendance(student.id);
                  return (
                    <tr key={student.id}>
                      <td>{student.rollNumber}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <span className={`status ${record?.status?.toLowerCase() || "unmarked"}`}>
                          {record?.status || "Not marked"}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="present" onClick={() => saveAttendance(student.id, "PRESENT")}>Present</button>
                        <button className="delete" onClick={() => saveAttendance(student.id, "ABSENT")}>Absent</button>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr><td colSpan="4" className="empty">Add students before taking attendance.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer>Teacher Attendance System · React</footer>
    </div>
  );
}

export default App;
