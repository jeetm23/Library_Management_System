import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineBookOpen, HiOutlineUserGroup, HiOutlineCalendar, HiOutlineCheck, HiOutlineStatusOnline } from 'react-icons/hi';

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

  // RFID states
  const [rfidUid, setRfidUid] = useState('');
  const [rfidScanning, setRfidScanning] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // ★ SSE: Listen for real-time RFID scans from ESP32
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource('/api/rfid/esp32/stream');

      eventSource.onopen = () => {
        setSseConnected(true);
        console.log('📡 Connected to RFID scan stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'student_scanned' && data.student) {
            // ★ Student card scanned — auto-fill student
            console.log('📡 Student scanned:', data.student.name);
            setRfidUid(data.rfidUid);
            autoLookupRfid(data.rfidUid);
          }

          if (data.type === 'book_issued') {
            // ★ Book issued automatically via ESP32!
            toast.success(
              `📚 "${data.book.title}" issued to ${data.student.name}!`,
              { duration: 5000 }
            );
            // Reset form
            setSelectedStudent(null);
            setSelectedBook(null);
            setStudentSearch('');
            setBookSearch('');
            setRfidUid('');
          }

          if (data.type === 'book_scan_no_student') {
            toast.error('Scan a student card first, then scan the book!', { icon: '⚠️' });
          }

          if (data.type === 'book_unavailable') {
            toast.error(`No copies available for "${data.book.title}"`, { icon: '📕' });
          }

          if (data.type === 'book_already_issued') {
            toast.error(`${data.student.name} already has "${data.book.title}"`, { icon: '⚠️' });
          }

          // Legacy: simple rfid_scan event
          if (data.type === 'rfid_scan' && data.rfidUid) {
            setRfidUid(data.rfidUid);
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
        console.log('📡 RFID stream disconnected, reconnecting...');
      };
    } catch (e) {
      console.error('SSE not supported:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  /**
   * Auto-lookup student when SSE delivers an RFID UID
   */
  const autoLookupRfid = async (uid) => {
    try {
      setRfidScanning(true);
      const { data } = await API.get(`/students/rfid/${uid}`);

      if (data.success && data.data) {
        setSelectedStudent(data.data);
        setStudentSearch(data.data.name);
        setShowStudentDropdown(false);
        toast.success(`📡 Student found: ${data.data.name}`);

        if (data.data.issues && data.data.issues.length > 0) {
          toast(`${data.data.name} has ${data.data.issues.length} active book(s)`, { icon: '📚' });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Student not found with this RFID card');
      setSelectedStudent(null);
    } finally {
      setRfidScanning(false);
    }
  };

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

  /**
   * RFID Scan — Look up student by RFID UID
   */
  const handleRfidScan = async (e) => {
    e.preventDefault();
    if (!rfidUid.trim()) return;

    try {
      setRfidScanning(true);
      const { data } = await API.get(`/students/rfid/${rfidUid.trim()}`);
      
      if (data.success && data.data) {
        setSelectedStudent(data.data);
        setStudentSearch(data.data.name);
        setShowStudentDropdown(false);
        toast.success(`Student found: ${data.data.name}`);

        // Show active issues warning if any
        if (data.data.issues && data.data.issues.length > 0) {
          toast(`${data.data.name} has ${data.data.issues.length} active book(s)`, { icon: '📚' });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Student not found with this RFID card');
      setSelectedStudent(null);
    } finally {
      setRfidScanning(false);
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
      setRfidUid('');
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

          {/* RFID Scan Section */}
          <div className="glass-card p-5 border-2 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <HiOutlineStatusOnline className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold text-sm">Scan RFID Card</h3>
                <p className="text-gray-500 text-xs">Scan student's card to auto-fill details</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`} />
                <span className={`text-xs ${sseConnected ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {sseConnected ? 'Live — ESP32 Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
            <form onSubmit={handleRfidScan} className="flex gap-3">
              <input
                type="text"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
                placeholder="Enter or scan RFID UID (e.g., E06AEE5F)"
                className="input-field flex-1"
                autoFocus
                disabled={rfidScanning}
              />
              <button
                type="submit"
                disabled={!rfidUid.trim() || rfidScanning}
                className="btn-primary whitespace-nowrap flex items-center gap-2"
              >
                {rfidScanning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlineStatusOnline className="w-4 h-4" />
                )}
                Scan
              </button>
            </form>
            {selectedStudent && (
              <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-3">
                <HiOutlineCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-emerald-800 font-semibold">{selectedStudent.name}</p>
                  <p className="text-xs text-emerald-600">{selectedStudent.enrollmentNo} • {selectedStudent.department}</p>
                </div>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR SEARCH MANUALLY</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* Student Selection (manual search) */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <HiOutlineUserGroup className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <h3 className="text-gray-900 font-semibold text-sm">Search Student</h3>
            </div>
            <div className="relative">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                onFocus={() => students.length > 0 && setShowStudentDropdown(true)}
                placeholder="Search by name or enrollment..."
                className="input-field pl-11"
              />
              {showStudentDropdown && students.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentSearch(s.name);
                        setShowStudentDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.enrollmentNo} • {s.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Book Selection */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <HiOutlineBookOpen className="w-4.5 h-4.5 text-primary-600" />
              </div>
              <h3 className="text-gray-900 font-semibold text-sm">Select Book</h3>
            </div>
            <div className="relative">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => { setBookSearch(e.target.value); setSelectedBook(null); }}
                onFocus={() => books.length > 0 && setShowBookDropdown(true)}
                placeholder="Search by title, author, ISBN..."
                className="input-field pl-11"
              />
              {showBookDropdown && books.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {books.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBook(b);
                        setBookSearch(b.title);
                        setShowBookDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-gray-900">{b.title}</p>
                        <p className="text-xs text-gray-500">{b.author} • ISBN: {b.isbn}</p>
                      </div>
                      <span className="badge-success text-[10px]">{b.availableCopies} avail.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBook && (
              <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-3">
                <HiOutlineCheck className="w-4 h-4 text-primary-600" />
                <p className="text-sm text-primary-600">
                  <span className="font-semibold">{selectedBook.title}</span> — {selectedBook.availableCopies} available
                </p>
              </div>
            )}
          </div>

          {/* Due Days */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <HiOutlineCalendar className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <h3 className="text-gray-900 font-semibold text-sm">Due Period</h3>
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
              <span className="text-gray-500 text-sm">
                days — Due: <span className="text-gray-900 font-medium">{dueDate.toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="text-gray-900 font-semibold mb-4">Issue Preview</h3>
          {selectedStudent && selectedBook ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-100/50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Student</span>
                  <span className="text-gray-900 font-medium">{selectedStudent.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Enrollment</span>
                  <span className="text-gray-900">{selectedStudent.enrollmentNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Department</span>
                  <span className="text-gray-900">{selectedStudent.department}</span>
                </div>
                {selectedStudent.rfidUid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">RFID Card</span>
                    <span className="text-emerald-600 font-mono text-xs">{selectedStudent.rfidUid}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Book</span>
                  <span className="text-gray-900 font-medium">{selectedBook.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Author</span>
                  <span className="text-gray-900">{selectedBook.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ISBN</span>
                  <span className="text-gray-900">{selectedBook.isbn}</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issue Date</span>
                  <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-amber-600 font-semibold">{dueDate.toLocaleDateString()}</span>
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
              <HiOutlineBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a student and a book to preview the issue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueBook;
