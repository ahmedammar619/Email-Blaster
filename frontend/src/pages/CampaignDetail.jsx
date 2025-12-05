import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignApi } from '../services/api';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const [campaignRes, recipientsRes, statsRes] = await Promise.all([
        campaignApi.getById(id),
        campaignApi.getRecipients(id),
        campaignApi.getStats(id),
      ]);
      setCampaign(campaignRes.data);
      setRecipients(recipientsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this campaign?')) return;
    try {
      const res = await campaignApi.send(id);
      toast.success(res.data.message);
      loadCampaign();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send campaign');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) return null;

  const statCards = [
    { name: 'Total', value: stats?.total || 0, icon: Users, color: 'bg-blue-500' },
    { name: 'Sent', value: stats?.sent || 0, icon: CheckCircle, color: 'bg-green-500' },
    { name: 'Failed', value: stats?.failed || 0, icon: XCircle, color: 'bg-red-500' },
    { name: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'bg-yellow-500' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/campaigns')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500">
              Template: {campaign.template_name || 'None'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
            campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {campaign.status}
          </span>
          {campaign.status === 'draft' && (
            <button
              onClick={handleSend}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Send className="h-5 w-5 mr-2" />
              Send Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-2`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email Preview */}
      {campaign.subject && campaign.body && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-500">Subject:</span>
              <p className="text-gray-900">{campaign.subject}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Body:</span>
              <div
                className="mt-2 p-4 bg-gray-50 rounded-lg prose max-w-none"
                dangerouslySetInnerHTML={{ __html: campaign.body }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recipients ({recipients.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No recipients added to this campaign
                  </td>
                </tr>
              ) : (
                recipients.map((recipient) => (
                  <tr key={recipient.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {recipient.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {recipient.first_name} {recipient.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        recipient.status === 'sent' ? 'bg-green-100 text-green-800' :
                        recipient.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {recipient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {recipient.error_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
