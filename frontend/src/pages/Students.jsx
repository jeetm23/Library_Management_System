import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineX } from 'react-icons/hi';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentIssues, setStudentIssues] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: '', enrollmentNo: '', rfidUid: '',
  });

  useEffect(() => {
    fetchStudents();
  }, [page, search]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/students', { params: { page, limit: 12, search } });
      setStudents(data.data.items);
      setPagination(data.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editStudent) {
        await API.put(`/students/${editStudent.id}`, form);
        toast.success('Student updated!');
      } else {
        await API.post('/students', form);
        toast.success('Student added!');
      }
      closeModal();
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this student?')) return;
    try {
      await API.delete(`/students/${id}`);
      toast.success('Student deactivated');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate');
    }
  };

  const viewStudent = async (student) => {
    try {
      const { data } = await API.get(`/students/${student.id}`);
      setSelectedStudent(data.data);
      setStudentIssues(data.data.issues || []);
    } catch (error) {
      toast.error('Failed to load student details');
    }
  };

  const openEdit = (student) => {
    setEditStudent(student);
    setForm({
      name: student.name, email: student.email, phone: student.phone || '',
      department: student.department, enrollmentNo: student.enrollmentNo, rfidUid: student.rfidUid || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditStudent(null);
    setForm({ name: '', email: '', phone: '', department: '', enrollmentNo: '', rfidUid: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-header mb-0">
          <span className="gradient-text">Students</span>
        </h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name, email, Bt ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-12"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Bt ID</th>
                <th className="px-5 py-3 text-left">Department</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">RFID</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="px-5 py-3">
                    <button onClick={() => viewStudent(s)} className="text-sm text-gray-900 font-medium hover:text-primary-600 transition-colors">
                      {s.name}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{s.enrollmentNo}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{s.department}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{s.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{s.rfidUid || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={s.isActive ? 'badge-success' : 'badge-danger'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Prev</button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Student Detail Drawer */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{selectedStudent.name}</h2>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <HiOutlineX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Email:</span> <span className="text-gray-900 ml-2">{selectedStudent.email}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900 ml-2">{selectedStudent.phone || '—'}</span></div>
                <div><span className="text-gray-500">Dept:</span> <span className="text-gray-900 ml-2">{selectedStudent.department}</span></div>
                <div><span className="text-gray-500">RFID:</span> <span className="text-gray-900 ml-2">{selectedStudent.rfidUid || '—'}</span></div>
              </div>
              <h3 className="text-gray-900 font-semibold pt-4 border-t border-gray-200">Issue History</h3>
              {studentIssues.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {studentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-100/50 rounded-xl text-sm">
                      <div>
                        <p className="text-gray-900 font-medium">{issue.book?.title}</p>
                        <p className="text-xs text-gray-500">{new Date(issue.issueDate).toLocaleDateString()} → {issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : 'Not returned'}</p>
                      </div>
                      <span className={
                        issue.status === 'RETURNED' ? 'badge-success' :
                        issue.status === 'OVERDUE' ? 'badge-danger' : 'badge-info'
                      }>{issue.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No issues found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <HiOutlineX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bt ID *</label>
                  <input value={form.enrollmentNo} onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field" required>
                    <option value="">Select Branch</option>
                    <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                    <option value="Electronics and Telecommunication">Electronics and Telecommunication</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="AIDS">AIDS</option>
                    <option value="AIML">AIML</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Civil">Civil</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">RFID UID</label>
                  <input value={form.rfidUid} onChange={(e) => setForm({ ...form, rfidUid: e.target.value })} className="input-field" placeholder="e.g., RFID-001-CS" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editStudent ? 'Update' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
