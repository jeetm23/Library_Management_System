import { HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineIdentification } from 'react-icons/hi';

const StudentCard = ({ student, onClick }) => {
  return (
    <div
      className="glass-card-hover p-5 cursor-pointer animate-fade-in"
      onClick={() => onClick?.(student)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-sm">
              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{student.name}</h3>
            <p className="text-dark-400 text-xs">{student.department}</p>
          </div>
        </div>
        <span className={student.isActive ? 'badge-success' : 'badge-danger'}>
          {student.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs text-dark-400">
        <div className="flex items-center gap-2">
          <HiOutlineIdentification className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{student.enrollmentNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <HiOutlineMail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{student.email}</span>
        </div>
        {student.phone && (
          <div className="flex items-center gap-2">
            <HiOutlinePhone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{student.phone}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700/50">
        <span className="text-xs text-dark-500">
          RFID: {student.rfidUid || 'Not assigned'}
        </span>
        {student._count && (
          <span className="badge-info text-[10px]">
            {student._count.issues} issues
          </span>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
