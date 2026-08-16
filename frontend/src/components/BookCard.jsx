import { HiOutlineBookOpen, HiOutlineLocationMarker } from 'react-icons/hi';

const BookCard = ({ book, onEdit, onDelete }) => {
  const isAvailable = book.availableCopies > 0;

  return (
    <div className="glass-card-hover p-5 flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <HiOutlineBookOpen className="w-6 h-6 text-primary-600" />
        </div>
        <span className={isAvailable ? 'badge-success' : 'badge-danger'}>
          {isAvailable ? `${book.availableCopies} Available` : 'Out of Stock'}
        </span>
      </div>

      {/* Info */}
      <div>
        <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2">{book.title}</h3>
        <p className="text-gray-500 text-xs mt-1">by {book.author}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mt-auto">
        <span className="badge-info">{book.category}</span>
        {book.shelfLocation && (
          <span className="badge-neutral flex items-center gap-1">
            <HiOutlineLocationMarker className="w-3 h-3" />
            {book.shelfLocation}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
        <span>ISBN: {book.isbn}</span>
        <span>{book.totalCopies} total</span>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 pt-2">
          {onEdit && (
            <button onClick={() => onEdit(book)} className="flex-1 btn-secondary text-xs py-2">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(book)} className="btn-danger text-xs py-2 px-4">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookCard;
