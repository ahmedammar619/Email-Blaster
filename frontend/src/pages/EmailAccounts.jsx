import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Star, Send, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailAccountApi } from '../services/api';

export default function EmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: false,
    is_default: false,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await emailAccountApi.getAll();
      setAccounts(res.data);
    } catch (error) {
      toast.error('Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await emailAccountApi.update(editingAccount.id, formData);
        toast.success('Email account updated');
      } else {
        await emailAccountApi.create(formData);
        toast.success('Email account created');
      }
      setShowModal(false);
      setEditingAccount(null);
      resetForm();
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save email account');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      smtp_secure: false,
      is_default: false,
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      email: account.email,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_user: account.smtp_user,
      smtp_pass: '', // Don't populate password for security
      smtp_secure: account.smtp_secure,
      is_default: account.is_default,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this email account?')) return;
    try {
      await emailAccountApi.delete(id);
      toast.success('Email account deleted');
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete email account');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await emailAccountApi.setDefault(id);
      toast.success('Default account updated');
      loadAccounts();
    } catch (error) {
      toast.error('Failed to set default account');
    }
  };

  const handleTest = async (id) => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setTestingId(id);
    try {
      const res = await emailAccountApi.test(id, testEmail);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.error);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const presetConfigs = [
    { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
    { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, secure: false },
    { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
  ];

  const applyPreset = (preset) => {
    setFormData({
      ...formData,
      smtp_host: preset.host,
      smtp_port: preset.port,
      smtp_secure: preset.secure,
    });
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
        <h1 className="text-2xl font-bold text-gray-900">Email Accounts</h1>
        <button
          onClick={() => {
            setEditingAccount(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Account
        </button>
      </div>

      {/* Test Email Input */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Email Address (for testing connections)
        </label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Enter email to receive test messages"
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No email accounts configured. Add your first email account to start sending campaigns.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className={`bg-white rounded-lg shadow overflow-hidden ${account.is_default ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  {account.is_default && (
                    <span className="flex items-center text-xs text-indigo-600 font-medium">
                      <Star className="h-4 w-4 mr-1 fill-current" />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{account.email}</p>
              </div>
              <div className="p-4 bg-gray-50 text-sm">
                <p><span className="text-gray-500">Host:</span> {account.smtp_host}</p>
                <p><span className="text-gray-500">Port:</span> {account.smtp_port}</p>
                <p><span className="text-gray-500">User:</span> {account.smtp_user}</p>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => handleTest(account.id)}
                  disabled={testingId === account.id}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  {testingId === account.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Test
                    </>
                  )}
                </button>
                <div className="flex space-x-1">
                  {!account.is_default && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-500"
                      title="Set as Default"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingAccount ? 'Edit Email Account' : 'Add Email Account'}
            </h2>

            {/* Presets */}
            {!editingAccount && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Setup
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetConfigs.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Marketing Email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="sender@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={formData.smtp_host}
                      onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="smtp.example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_user}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="username or email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Password {editingAccount && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.smtp_pass}
                    onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    required={!editingAccount}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.smtp_secure}
                      onChange={(e) => setFormData({ ...formData, smtp_secure: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Use SSL/TLS</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Set as default</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
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
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
