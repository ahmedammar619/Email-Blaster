import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, Search, Edit2, Filter, X, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { contactApi } from '../services/api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
  });

  // Filters
  const [filters, setFilters] = useState({
    subscribed: '',
    company: '',
  });
  const [companies, setCompanies] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadContacts();
  }, [search, filters]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadContacts = async () => {
    try {
      const params = { search, limit: 100 };
      if (filters.subscribed !== '') params.subscribed = filters.subscribed;
      if (filters.company) params.company = filters.company;

      const res = await contactApi.getAll(params);
      setContacts(res.data.contacts);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await contactApi.getCompanies();
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to load companies');
    }
  };

  const clearFilters = () => {
    setFilters({ subscribed: '', company: '' });
  };

  const hasActiveFilters = filters.subscribed !== '' || filters.company !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactApi.update(editingContact.id, formData);
        toast.success('Contact updated');
      } else {
        await contactApi.create(formData);
        toast.success('Contact created');
      }
      setShowModal(false);
      setEditingContact(null);
      setFormData({ email: '', first_name: '', last_name: '', company: '' });
      loadContacts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      email: contact.email,
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      company: contact.company || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactApi.delete(id);
      toast.success('Contact deleted');
      loadContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await contactApi.import(file);
      toast.success(`Imported ${res.data.imported} contacts, ${res.data.skipped} skipped`);
      loadContacts();
      loadCompanies();
      setShowImportModal(false);
    } catch (error) {
      toast.error('Failed to import contacts');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleCSV = () => {
    const csvContent = `email,first_name,last_name,company
john@example.com,John,Doe,Acme Inc
jane@example.com,Jane,Smith,Tech Corp
bob@example.com,Bob,Johnson,Global Ltd`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
        <h1 className="text-2xl font-bold text-gray-900">Contacts ({total})</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="h-5 w-5 mr-2 text-gray-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingContact(null);
              setFormData({ email: '', first_name: '', last_name: '', company: '' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center px-4 py-2 border rounded-lg ${
            hasActiveFilters
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
              {(filters.subscribed !== '' ? 1 : 0) + (filters.company ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Filter Contacts</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Status
              </label>
              <select
                value={filters.subscribed}
                onChange={(e) => setFilters({ ...filters, subscribed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="true">Subscribed</option>
                <option value="false">Unsubscribed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No contacts found. Add your first contact or import from CSV.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {contact.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {contact.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      contact.subscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {contact.subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
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
                  {editingContact ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Import Contacts from CSV</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* CSV Format Guide */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">CSV Format Requirements</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your CSV file should have a header row with the following columns:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-mono text-sm">
                  <div className="text-gray-500 mb-2">Header row (required):</div>
                  <div className="bg-white p-2 rounded border border-gray-200 text-indigo-600">
                    email,first_name,last_name,company
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-28">email</span>
                  <span className="text-gray-600">Required - Contact's email address</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-28">first_name</span>
                  <span className="text-gray-600">Optional - Contact's first name</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-28">last_name</span>
                  <span className="text-gray-600">Optional - Contact's last name</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 w-28">company</span>
                  <span className="text-gray-600">Optional - Contact's company name</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The column names are case-insensitive. Variations like
                  "Email", "firstName", "LastName", "Company" are also accepted.
                  Duplicate emails will update existing contacts.
                </p>
              </div>
            </div>

            {/* Sample CSV */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Example CSV</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
{`email,first_name,last_name,company
john@example.com,John,Doe,Acme Inc
jane@example.com,Jane,Smith,Tech Corp
bob@example.com,Bob,Johnson,Global Ltd`}
                </pre>
              </div>
              <button
                onClick={downloadSampleCSV}
                className="mt-2 flex items-center text-sm text-indigo-600 hover:text-indigo-800"
              >
                <Download className="h-4 w-4 mr-1" />
                Download sample CSV
              </button>
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">
                Drag and drop your CSV file here, or click to browse
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Choose File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
