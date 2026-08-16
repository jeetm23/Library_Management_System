const FineTable = ({ fines, onPay }) => {
  if (!fines || fines.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-500">No fines found.</p>
      </div>
    );
  }

  return (
    <div className="table-container overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            <th className="px-5 py-3 text-left">ID</th>
            <th className="px-5 py-3 text-left">Student</th>
            <th className="px-5 py-3 text-left">Book</th>
            <th className="px-5 py-3 text-left">Reason</th>
            <th className="px-5 py-3 text-right">Amount</th>
            <th className="px-5 py-3 text-center">Status</th>
            <th className="px-5 py-3 text-left">Date</th>
            {onPay && <th className="px-5 py-3 text-center">Action</th>}
          </tr>
        </thead>
        <tbody>
          {fines.map((fine) => (
            <tr key={fine.id} className="table-row">
              <td className="px-5 py-3 text-sm text-gray-500">#{fine.id}</td>
              <td className="px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900 font-medium">
                    {fine.issue?.student?.name || '-'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fine.issue?.student?.enrollmentNo || ''}
                  </p>
                </div>
              </td>
              <td className="px-5 py-3">
                <p className="text-sm text-gray-900">{fine.issue?.book?.title || '-'}</p>
              </td>
              <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                {fine.reason}
              </td>
              <td className="px-5 py-3 text-right">
                <span className="text-red-600 font-bold text-sm">₹{fine.amount.toFixed(2)}</span>
              </td>
              <td className="px-5 py-3 text-center">
                {fine.isPaid ? (
                  <span className="badge-success">Paid</span>
                ) : (
                  <span className="badge-danger">Unpaid</span>
                )}
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {new Date(fine.createdAt).toLocaleDateString()}
              </td>
              {onPay && (
                <td className="px-5 py-3 text-center">
                  {!fine.isPaid && (
                    <button
                      onClick={() => onPay(fine)}
                      className="btn-success text-xs py-1.5 px-4"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FineTable;
