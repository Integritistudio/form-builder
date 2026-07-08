import { submissionPreview } from "../SubmissionDetailModal";

function SubmissionRow({ sub, schema, onView, onFormClick, showForm }) {
  const preview = submissionPreview(schema || sub.formSchema, sub.payload, sub.files);
  const thumb = sub.files?.[0];

  return (
    <tr>
      <td>
        <div className="app-stack-tight">
          <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
          <span className="app-subdued" style={{ fontSize: 12 }}>
            {new Date(sub.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </td>
      {showForm && (
        <td>
          <button
            type="button"
            className="app-link"
            onClick={() => onFormClick?.(sub.formId)}
          >
            {sub.formName}
          </button>
        </td>
      )}
      <td>
        <div className="app-flex-center" style={{ alignItems: "flex-start" }}>
          {thumb?.publicUrl && thumb.mimeType?.startsWith("image/") && (
            <img
              src={thumb.publicUrl}
              alt=""
              className="app-thumb-sm"
            />
          )}
          <div className="app-stack-tight">
            <span style={{ fontSize: 14 }}>{preview}</span>
            {sub.files?.length > 0 && (
              <span className="app-badge-inline">
                {sub.files.length} attachment{sub.files.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="app-text-right">
        <button type="button" className="app-btn-outline" onClick={() => onView(sub)}>
          View
        </button>
      </td>
    </tr>
  );
}

export default function SubmissionsTable({
  submissions,
  loading,
  showForm = false,
  onView,
  onFormClick,
  schema,
  emptyHeading = "No submissions yet",
  emptyText = "Submissions from your storefront forms will appear here.",
}) {
  if (loading) {
    return (
      <div className="app-panel">
        <div className="app-panel-body">
          <div className="app-skeleton" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (!submissions.length) {
    return (
      <div className="app-panel">
        <div className="app-empty">
          <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{emptyHeading}</h3>
          <p className="app-subdued">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel">
      <div style={{ overflowX: "auto" }}>
        <table className="app-table">
          <thead>
            <tr>
              <th>Date</th>
              {showForm && <th>Form</th>}
              <th>Preview</th>
              <th className="app-text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <SubmissionRow
                key={sub.id}
                sub={sub}
                schema={schema}
                showForm={showForm}
                onView={onView}
                onFormClick={onFormClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
