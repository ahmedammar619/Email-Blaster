import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Send, Eye, CheckCircle, XCircle, Clock, Copy, RotateCcw, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignApi, templateApi, contactApi, emailAccountApi } from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(null);
  const [sendProgress, setSendProgress] = useState(null);
  const [selectedEmailAccount, setSelectedEmailAccount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    contact_ids: [],
    email_account_id: '',
  });

  // Contact filtering
  const [companies, setCompanies] = useState([]);
  const [contactFilter, setContactFilter] = useState({
    search: '',
    subscribed: 'all',
    company: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Poll for progress when sending
  useEffect(() => {
    let interval;
    if (sendingCampaign && sendProgress && !sendProgress.is_complete) {
      interval = setInterval(async () => {
        try {
          const res = await campaignApi.getProgress(sendingCampaign);
          setSendProgress(res.data);
          if (res.data.is_complete) {
            toast.success('Campaign sent successfully!');
            loadData();
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sendingCampaign, sendProgress?.is_complete]);

  const loadData = async () => {
    try {
      const [campaignsRes, templatesRes, contactsRes, accountsRes, companiesRes] = await Promise.all([
        campaignApi.getAll(),
        templateApi.getAll(),
        contactApi.getAll({ limit: 1000 }),
        emailAccountApi.getAll(),
        contactApi.getCompanies(),
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data.contacts);
      setEmailAccounts(accountsRes.data);
      setCompanies(companiesRes.data || []);

      // Set default email account
      const defaultAccount = accountsRes.data.find(a => a.is_default);
      if (defaultAccount) {
        setSelectedEmailAccount(defaultAccount.id.toString());
        setFormData(prev => ({ ...prev, email_account_id: defaultAccount.id.toString() }));
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts based on criteria
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      if (contactFilter.search) {
        const search = contactFilter.search.toLowerCase();
        const matchesSearch =
          contact.email?.toLowerCase().includes(search) ||
          contact.first_name?.toLowerCase().includes(search) ||
          contact.last_name?.toLowerCase().includes(search) ||
          contact.company?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Subscription filter
      if (contactFilter.subscribed !== 'all') {
        if (contactFilter.subscribed === 'subscribed' && !contact.subscribed) return false;
        if (contactFilter.subscribed === 'unsubscribed' && contact.subscribed) return false;
      }

      // Company filter
      if (contactFilter.company && contact.company !== contactFilter.company) {
        return false;
      }

      return true;
    });
  }, [contacts, contactFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await campaignApi.create(formData);
      toast.success('Campaign created');
      setShowModal(false);
      setFormData({ name: '', template_id: '', contact_ids: [], email_account_id: '' });
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

  const handleDuplicate = async (id) => {
    try {
      await campaignApi.duplicate(id);
      toast.success('Campaign duplicated');
      loadData();
    } catch (error) {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleReset = async (id) => {
    if (!confirm('Are you sure you want to reset this campaign to draft? This will allow you to resend it.')) return;
    try {
      await campaignApi.reset(id);
      toast.success('Campaign reset to draft');
      loadData();
    } catch (error) {
      toast.error('Failed to reset campaign');
    }
  };

  const selectFilteredContacts = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: [...new Set([...prev.contact_ids, ...filteredContacts.map(c => c.id)])],
    }));
  };

  const clearContactSelection = () => {
    setFormData((prev) => ({
      ...prev,
      contact_ids: [],
    }));
  };

  const openSendModal = (campaign) => {
    setSendingCampaign(campaign.id);
    setSendProgress(null);
    setShowSendModal(true);
    // Set default email account or campaign's assigned account
    if (campaign.email_account_id) {
      setSelectedEmailAccount(campaign.email_account_id.toString());
    } else {
      const defaultAccount = emailAccounts.find(a => a.is_default);
      setSelectedEmailAccount(defaultAccount ? defaultAccount.id.toString() : '');
    }
  };

  const handleSend = async () => {
    if (!selectedEmailAccount && emailAccounts.length > 0) {
      toast.error('Please select an email account');
      return;
    }

    try {
      const res = await campaignApi.send(sendingCampaign, selectedEmailAccount || null);
      toast.success(res.data.message);

      // Start polling for progress
      setSendProgress({
        status: 'sending',
        total: res.data.recipientCount,
        sent: 0,
        failed: 0,
        pending: res.data.recipientCount,
        progress: 0,
        is_complete: false,
        recent_recipients: [],
        email_account: res.data.emailAccount?.name || 'Default'
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send campaign');
      setShowSendModal(false);
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

      {/* Warning if no email accounts */}
      {emailAccounts.length === 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No email accounts configured. <Link to="/email-accounts" className="text-indigo-600 hover:underline">Add an email account</Link> to send campaigns.
          </p>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent/Failed</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
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
                    {campaign.email_account_name || campaign.from_email || '-'}
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
                    <div className="flex justify-end space-x-1">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => openSendModal(campaign)}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Send"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      )}
                      {campaign.status === 'sent' && (
                        <button
                          onClick={() => handleReset(campaign.id)}
                          className="p-2 text-gray-400 hover:text-orange-600"
                          title="Reset to Draft (Resend)"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(campaign.id)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Duplicate"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send From (Email Account)
                  </label>
                  <select
                    value={formData.email_account_id}
                    onChange={(e) => setFormData({ ...formData, email_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select when sending</option>
                    {emailAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email}) {a.is_default && '- Default'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Recipients ({formData.contact_ids.length} selected)
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center text-sm px-2 py-1 rounded ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        <Filter className="h-4 w-4 mr-1" />
                        Filter
                      </button>
                      <button
                        type="button"
                        onClick={selectFilteredContacts}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Add Filtered ({filteredContacts.length})
                      </button>
                      <button
                        type="button"
                        onClick={selectAllContacts}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Select All
                      </button>
                      {formData.contact_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={clearContactSelection}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Panel */}
                  {showFilters && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                          <input
                            type="text"
                            value={contactFilter.search}
                            onChange={(e) => setContactFilter({...contactFilter, search: e.target.value})}
                            placeholder="Email, name, company..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                          <select
                            value={contactFilter.subscribed}
                            onChange={(e) => setContactFilter({...contactFilter, subscribed: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="all">All</option>
                            <option value="subscribed">Subscribed</option>
                            <option value="unsubscribed">Unsubscribed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                          <select
                            value={contactFilter.company}
                            onChange={(e) => setContactFilter({...contactFilter, company: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">All Companies</option>
                            {companies.map((company) => (
                              <option key={company} value={company}>{company}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {(contactFilter.search || contactFilter.subscribed !== 'all' || contactFilter.company) && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Showing {filteredContacts.length} of {contacts.length} contacts
                          </span>
                          <button
                            type="button"
                            onClick={() => setContactFilter({ search: '', subscribed: 'all', company: '' })}
                            className="text-xs text-red-600 hover:underline flex items-center"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear filters
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        No contacts match the current filters
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
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
                          <span className="ml-3 text-sm text-gray-700 flex-1">
                            {contact.email}
                            {contact.first_name && ` (${contact.first_name} ${contact.last_name || ''})`}
                          </span>
                          {contact.company && (
                            <span className="text-xs text-gray-400 ml-2">{contact.company}</span>
                          )}
                          {!contact.subscribed && (
                            <span className="text-xs bg-red-100 text-red-600 px-1 rounded ml-2">unsubscribed</span>
                          )}
                        </label>
                      ))
                    )}
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

      {/* Send Campaign Modal with Progress */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {sendProgress ? 'Sending Campaign' : 'Send Campaign'}
            </h2>

            {!sendProgress ? (
              // Email Account Selection
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Email Account
                  </label>
                  <select
                    value={selectedEmailAccount}
                    onChange={(e) => setSelectedEmailAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choose an email account</option>
                    {emailAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email}) {a.is_default && '- Default'}
                      </option>
                    ))}
                  </select>
                </div>

                {emailAccounts.length === 0 && (
                  <p className="text-sm text-gray-500 mb-4">
                    No email accounts configured. <Link to="/email-accounts" className="text-indigo-600">Add one first</Link>.
                  </p>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSendModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!selectedEmailAccount && emailAccounts.length > 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Start Sending
                  </button>
                </div>
              </div>
            ) : (
              // Progress View
              <div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress: {sendProgress.progress}%</span>
                    <span>
                      {sendProgress.sent + sendProgress.failed} / {sendProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${sendProgress.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="bg-green-50 rounded-lg p-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{sendProgress.sent}</p>
                    <p className="text-xs text-green-600">Sent</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-600">{sendProgress.failed}</p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Clock className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-600">{sendProgress.pending}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                  </div>
                </div>

                {/* Recent Recipients */}
                {sendProgress.recent_recipients && sendProgress.recent_recipients.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {sendProgress.recent_recipients.map((r, i) => (
                        <div key={i} className="flex items-center text-sm">
                          {r.status === 'sent' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                          )}
                          <span className="truncate">{r.email}</span>
                          {r.error_message && (
                            <span className="ml-2 text-xs text-red-500 truncate">({r.error_message})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowSendModal(false);
                      setSendProgress(null);
                      setSendingCampaign(null);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      sendProgress.is_complete
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {sendProgress.is_complete ? 'Done' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
