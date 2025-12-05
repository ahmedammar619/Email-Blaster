import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Send, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignApi, templateApi, contactApi } from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    contact_ids: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
        campaignApi.getAll(),
        templateApi.getAll(),
        contactApi.getAll({ limit: 1000 }),
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data.contacts);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await campaignApi.create(formData);
      toast.success('Campaign created');
      setShowModal(false);
      setFormData({ name: '', template_id: '', contact_ids: [] });
      loadData();
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignApi.delete(id);
      toast.success('Campaign deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleSend = async (id) => {
    if (!confirm('Are you sure you want to send this campaign?')) return;
    try {
      const res = await campaignApi.send(id);
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send campaign');
    }
  };

  const toggleContact = (contactId) => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter((id) => id !== contactId)
        : [...prev.contact_ids, contactId],
    }));
  };

  const selectAllContacts = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: contacts.map((c) => c.id),
    }));
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
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent/Failed</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No campaigns yet. Create your first campaign to get started.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {campaign.template_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {campaign.total_recipients}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    <span className="text-green-600">{campaign.sent_count}</span>
                    {' / '}
                    <span className="text-red-600">{campaign.failed_count}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-2">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleSend(campaign.id)}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Send"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Campaign</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Template
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Recipients ({formData.contact_ids.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={selectAllContacts}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.contact_ids.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                          className="h-4 w-4 text-indigo-600 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          {contact.email}
                          {contact.first_name && ` (${contact.first_name} ${contact.last_name || ''})`}
                        </span>
                      </label>
                    ))}
                  </div>
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
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
