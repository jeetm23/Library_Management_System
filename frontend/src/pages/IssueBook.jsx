import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineBookOpen, HiOutlineUserGroup, HiOutlineCalendar, HiOutlineCheck } from 'react-icons/hi';

const IssueBook = () => {
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDays, setDueDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  useEffect(() => {
    if (studentSearch.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [studentSearch]);

  useEffect(() => {
    if (bookSearch.length >= 2) {
      searchBooks();
    } else {
      setBooks([]);
    }
  }, [bookSearch]);

  const searchStudents = async () => {
    try {
      const { data } = await API.get('/students', { params: { search: studentSearch, limit: 10 } });
      setStudents(data.data.items.filter((s) => s.isActive));
      setShowStudentDropdown(true);
    } catch (error) {
      console.error(error);
    }
  };

  const searchBooks = async () => {
    try {
      const { data } = await API.get('/books', { params: { search: bookSearch, limit: 10, available: 'true' } });
      setBooks(data.data.items);
      setShowBookDropdown(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleIssue = async () => {
    if (!selectedStudent || !selectedBook) {
      toast.error('Please select both student and book');
      return;
    }
    try {
      setLoading(true);
      await API.post('/issues', {
        studentId: selectedStudent.id,
        bookId: selectedBook.id,
        dueDays: parseInt(dueDays),
      });
      toast.success(`"${selectedBook.title}" issued to ${selectedStudent.name}!`);
      setSelectedStudent(null);
      setSelectedBook(null);
      setStudentSearch('');
      setBookSearch('');
      setDueDays(14);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue book');
    } finally {
      setLoading(false);
    }
  };

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + parseInt(dueDays));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Issue Book</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selection Form */}
        <div className="space-y-5">
          {/* Student Selection */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <HiOutlineUserGroup className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">Select Student</h3>
            </div>
            <div className="relative">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                onFocus={() => students.length > 0 && setShowStudentDropdown(true)}
                placeholder="Search by name or enrollment..."
                className="input-field pl-11"
              />
              {showStudentDropdown && students.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentSearch(s.name);
                        setShowStudentDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-dark-700/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-white">{s.name}</p>
                        <p className="text-xs text-dark-400">{s.enrollmentNo} • {s.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStudent && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                <HiOutlineCheck className="w-4 h-4 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                  <span className="font-semibold">{selectedStudent.name}</span> — {selectedStudent.enrollmentNo}
                </p>
              </div>
            )}
          </div>

          {/* Book Selection */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
                <HiOutlineBookOpen className="w-4.5 h-4.5 text-primary-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">Select Book</h3>
            </div>
            <div className="relative">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => { setBookSearch(e.target.value); setSelectedBook(null); }}
                onFocus={() => books.length > 0 && setShowBookDropdown(true)}
                placeholder="Search by title, author, ISBN..."
                className="input-field pl-11"
              />
              {showBookDropdown && books.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {books.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBook(b);
                        setBookSearch(b.title);
                        setShowBookDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-dark-700/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-white">{b.title}</p>
                        <p className="text-xs text-dark-400">{b.author} • ISBN: {b.isbn}</p>
                      </div>
                      <span className="badge-success text-[10px]">{b.availableCopies} avail.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBook && (
              <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center gap-3">
                <HiOutlineCheck className="w-4 h-4 text-primary-400" />
                <p className="text-sm text-primary-300">
                  <span className="font-semibold">{selectedBook.title}</span> — {selectedBook.availableCopies} available
                </p>
              </div>
            )}
          </div>

          {/* Due Days */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <HiOutlineCalendar className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">Due Period</h3>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                max="365"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                className="input-field w-24 text-center"
              />
              <span className="text-dark-400 text-sm">
                days — Due: <span className="text-white font-medium">{dueDate.toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="text-white font-semibold mb-4">Issue Preview</h3>
          {selectedStudent && selectedBook ? (
            <div className="space-y-4">
              <div className="p-4 bg-dark-900/50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Student</span>
                  <span className="text-white font-medium">{selectedStudent.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Enrollment</span>
                  <span className="text-white">{selectedStudent.enrollmentNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Department</span>
                  <span className="text-white">{selectedStudent.department}</span>
                </div>
                <hr className="border-dark-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Book</span>
                  <span className="text-white font-medium">{selectedBook.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Author</span>
                  <span className="text-white">{selectedBook.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">ISBN</span>
                  <span className="text-white">{selectedBook.isbn}</span>
                </div>
                <hr className="border-dark-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Issue Date</span>
                  <span className="text-white">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Due Date</span>
                  <span className="text-amber-400 font-semibold">{dueDate.toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={handleIssue}
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <HiOutlineBookOpen className="w-5 h-5" />
                    Confirm Issue
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <HiOutlineBookOpen className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">Select a student and a book to preview the issue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueBook;
