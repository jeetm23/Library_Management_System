const IssueTable = ({ issues, onReturn, showActions = false }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ISSUED':
        return <span className="badge-info">Issued</span>;
      case 'RETURNED':
        return <span className="badge-success">Returned</span>;
      case 'OVERDUE':
        return <span className="badge-danger">Overdue</span>;
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  if (!issues || issues.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-500">No issue records found.</p>
      </div>
    );
  }

  return (
    <div className="table-container overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            <th className="px-5 py-3 text-left">Student</th>
            <th className="px-5 py-3 text-left">Book</th>
            <th className="px-5 py-3 text-left">Issue Date</th>
            <th className="px-5 py-3 text-left">Due Date</th>
            <th className="px-5 py-3 text-left">Return Date</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-right">Fine</th>
            {showActions && <th className="px-5 py-3 text-center">Action</th>}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} className="table-row">
              <td className="px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900 font-medium">{issue.student?.name || '-'}</p>
                  <p className="text-xs text-gray-500">{issue.student?.enrollmentNo || ''}</p>
                </div>
              </td>
              <td className="px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900 font-medium">{issue.book?.title || '-'}</p>
                  <p className="text-xs text-gray-500">{issue.book?.author || ''}</p>
                </div>
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {new Date(issue.issueDate).toLocaleDateString()}
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {new Date(issue.dueDate).toLocaleDateString()}
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-5 py-3">{getStatusBadge(issue.status)}</td>
              <td className="px-5 py-3 text-sm text-right">
                {issue.fineAmount > 0 ? (
                  <span className="text-red-600 font-semibold">₹{issue.fineAmount.toFixed(2)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              {showActions && (
                <td className="px-5 py-3 text-center">
                  {(issue.status === 'ISSUED' || issue.status === 'OVERDUE') && (
                    <button
                      onClick={() => onReturn?.(issue)}
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Return
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

export default IssueTable;
