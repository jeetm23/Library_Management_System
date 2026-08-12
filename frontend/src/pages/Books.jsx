import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import BookCard from '../components/BookCard';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineX, HiOutlineFilter } from 'react-icons/hi';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', category: '', publisher: '', totalCopies: 1, shelfLocation: '',
  });

  useEffect(() => {
    fetchBooks();
  }, [page, search, category]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12, search };
      if (category) params.category = category;
      const { data } = await API.get('/books', { params });
      setBooks(data.data.items);
      setPagination(data.data.pagination);

      // Extract unique categories
      if (categories.length === 0) {
        const allBooks = await API.get('/books', { params: { limit: 100 } });
        const uniqueCats = [...new Set(allBooks.data.data.items.map((b) => b.category))];
        setCategories(uniqueCats);
      }
    } catch (error) {
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, totalCopies: parseInt(form.totalCopies) || 1 };
      if (editBook) {
        await API.put(`/books/${editBook.id}`, payload);
        toast.success('Book updated!');
      } else {
        await API.post('/books', payload);
        toast.success('Book added!');
      }
      closeModal();
      fetchBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await API.delete(`/books/${book.id}`);
      toast.success('Book deleted');
      fetchBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const openEdit = (book) => {
    setEditBook(book);
    setForm({
      title: book.title, author: book.author, isbn: book.isbn,
      category: book.category, publisher: book.publisher || '',
      totalCopies: book.totalCopies, shelfLocation: book.shelfLocation || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditBook(null);
    setForm({ title: '', author: '', isbn: '', category: '', publisher: '', totalCopies: 1, shelfLocation: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-header mb-0">
          <span className="gradient-text">Books</span>
        </h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Book
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search by title, author, ISBN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-12"
          />
        </div>
        <div className="relative">
          <HiOutlineFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="select-field pl-10 pr-10 min-w-[180px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          {books.length === 0 && (
            <div className="col-span-full glass-card p-8 text-center">
              <p className="text-dark-400">No books found.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Prev</button>
          <span className="text-sm text-dark-400">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">{editBook ? 'Edit Book' : 'Add Book'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                <HiOutlineX className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Author *</label>
                  <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">ISBN *</label>
                  <input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Category *</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Publisher</label>
                  <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Total Copies</label>
                  <input type="number" min="1" value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Shelf Location</label>
                  <input value={form.shelfLocation} onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })} className="input-field" placeholder="e.g., A1-01" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editBook ? 'Update' : 'Add Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
