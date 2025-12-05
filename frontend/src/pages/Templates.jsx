import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Edit2, Copy, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { templateApi, emailSettingsApi } from '../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
  });

  // Header/Footer for live preview
  const [emailHeader, setEmailHeader] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const previewIframeRef = useRef(null);

  useEffect(() => {
    loadTemplates();
    loadEmailSettings();
  }, []);

  // Compute live preview HTML
  const livePreviewHtml = useMemo(() => {
    return `${emailHeader}${formData.body}${emailFooter}`;
  }, [emailHeader, emailFooter, formData.body]);

  const loadTemplates = async () => {
    try {
      const res = await templateApi.getAll();
      setTemplates(res.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailSettings = async () => {
    try {
      const res = await emailSettingsApi.getAll();
      setEmailHeader(res.data.email_header || '');
      setEmailFooter(res.data.email_footer || '');
    } catch (error) {
      console.error('Failed to load email settings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await templateApi.update(editingTemplate.id, formData);
        toast.success('Template updated');
      } else {
        await templateApi.create(formData);
        toast.success('Template created');
      }
      setShowModal(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', body: '' });
      loadTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await templateApi.delete(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await templateApi.duplicate(id);
      toast.success('Template duplicated');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const handlePreview = async (id) => {
    try {
      const res = await templateApi.preview(id, {});
      setPreviewContent(res.data);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to preview template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setFormData({ name: '', subject: '', body: '' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No templates yet. Create your first email template.</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                <p className="text-sm text-gray-500 truncate mt-1">{template.subject}</p>
              </div>
              <div className="p-4 bg-gray-50 h-32 overflow-hidden">
                <div
                  className="text-sm text-gray-600 line-clamp-4"
                  dangerouslySetInnerHTML={{ __html: template.body.substring(0, 200) }}
                />
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(template.created_at).toLocaleDateString()}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handlePreview(template.id)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="p-1.5 text-gray-400 hover:text-green-600"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal with Live Preview */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left side - Editor */}
                <div className="flex-1 flex flex-col overflow-y-auto pr-2">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Welcome Email"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Welcome to our service, {{firstName}}!"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Body (HTML)
                      </label>
                      <textarea
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        rows={14}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="<h1>Hello {{firstName}},</h1><p>Welcome to our service!</p>"
                        required
                      />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Available variables:</strong> {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}, {"{{company}}"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your email will be wrapped with the header and footer from Settings.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Live Preview */}
                <div className="flex-1 flex flex-col border-l pl-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Live Preview
                    </label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Updates as you type
                    </span>
                  </div>
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      ref={previewIframeRef}
                      srcDoc={livePreviewHtml}
                      className="w-full h-full bg-white"
                      title="Live Email Preview"
                      sandbox="allow-same-origin"
                      style={{ minHeight: '400px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4">Template Preview</h2>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <span className="text-sm font-medium text-gray-500">Subject:</span>
                <p className="text-gray-900 mt-1 font-medium">{previewContent.subject}</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <span className="text-sm font-medium text-gray-500">Email Preview:</span>
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-gray-100" style={{ height: '450px' }}>
                  <iframe
                    srcDoc={previewContent.body}
                    className="w-full h-full bg-white"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
