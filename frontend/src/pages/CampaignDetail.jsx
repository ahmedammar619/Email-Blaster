import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignApi, emailSettingsApi } from '../services/api';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email settings for preview
  const [emailHeader, setEmailHeader] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [bodyBgColor, setBodyBgColor] = useState('#f5f7fa');
  const [contentBgColor, setContentBgColor] = useState('#ffffff');
  const [contentWidth, setContentWidth] = useState('550');
  const [contentPadding, setContentPadding] = useState('30');
  const [contentBorderRadius, setContentBorderRadius] = useState('8');
  const [contentMargin, setContentMargin] = useState('20');

  useEffect(() => {
    loadCampaign();
    loadEmailSettings();
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

  const loadEmailSettings = async () => {
    try {
      const res = await emailSettingsApi.getAll();
      setEmailHeader(res.data.email_header || '');
      setEmailFooter(res.data.email_footer || '');
      setBodyBgColor(res.data.body_background_color || '#f5f7fa');
      setContentBgColor(res.data.content_background_color || '#ffffff');
      setContentWidth(res.data.content_width || '550');
      setContentPadding(res.data.content_padding || '30');
      setContentBorderRadius(res.data.content_border_radius || '8');
      setContentMargin(res.data.content_margin || '20');
    } catch (error) {
      console.error('Failed to load email settings');
    }
  };

  // Sample data for preview
  const sampleData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Acme Corp'
  };

  const replaceVariables = (text) => {
    if (!text) return '';
    let result = text;
    result = result.replace(/\{\{firstName\}\}/g, sampleData.firstName);
    result = result.replace(/\{\{lastName\}\}/g, sampleData.lastName);
    result = result.replace(/\{\{email\}\}/g, sampleData.email);
    result = result.replace(/\{\{company\}\}/g, sampleData.company);
    return result;
  };

  // Generate full email preview HTML
  const previewHtml = useMemo(() => {
    if (!campaign?.body) return '';
    const previewBody = replaceVariables(campaign.body);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    h1, h2, h3 { margin-top: 0; }
    p { margin: 0 0 1em 0; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bodyBgColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bodyBgColor};">
    <tr>
      <td align="center" style="padding: ${contentMargin}px 0;">
        ${emailHeader}
        <table role="presentation" width="${contentWidth}" cellpadding="0" cellspacing="0" style="background-color: ${contentBgColor}; border-radius: ${contentBorderRadius}px;">
          <tr>
            <td style="padding: ${contentPadding}px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              ${previewBody}
            </td>
          </tr>
        </table>
        ${emailFooter}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [campaign?.body, emailHeader, emailFooter, bodyBgColor, contentBgColor, contentWidth, contentPadding, contentBorderRadius, contentMargin]);

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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Variables shown with sample data
            </span>
          </div>
          <div className="p-6">
            {/* Subject Preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase">Subject:</span>
              <p className="text-gray-900 font-medium mt-1">{replaceVariables(campaign.subject)}</p>
            </div>

            {/* Email Body Preview */}
            <div>
              <span className="text-sm font-medium text-gray-500 mb-2 block">Email Body:</span>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100" style={{ height: '500px' }}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full bg-white"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
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
