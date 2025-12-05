import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Users, FileText, Mail, TrendingUp, AlertCircle } from 'lucide-react';
import { campaignApi, contactApi, templateApi, emailApi } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    campaigns: 0,
    contacts: 0,
    templates: 0,
    emailsSent: 0,
    emailsFailed: 0,
    last24h: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [campaignsRes, contactsRes, templatesRes, emailStatsRes] = await Promise.all([
        campaignApi.getAll(),
        contactApi.getAll({ limit: 1 }),
        templateApi.getAll(),
        emailApi.getStats(),
      ]);

      setStats({
        campaigns: campaignsRes.data.length,
        contacts: contactsRes.data.total,
        templates: templatesRes.data.length,
        emailsSent: parseInt(emailStatsRes.data.sent) || 0,
        emailsFailed: parseInt(emailStatsRes.data.failed) || 0,
        last24h: parseInt(emailStatsRes.data.last_24h) || 0,
      });

      setRecentCampaigns(campaignsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { name: 'Total Campaigns', value: stats.campaigns, icon: Send, color: 'bg-blue-500', link: '/campaigns' },
    { name: 'Total Contacts', value: stats.contacts, icon: Users, color: 'bg-green-500', link: '/contacts' },
    { name: 'Email Templates', value: stats.templates, icon: FileText, color: 'bg-purple-500', link: '/templates' },
    { name: 'Emails Sent', value: stats.emailsSent, icon: Mail, color: 'bg-indigo-500', link: '/logs' },
    { name: 'Sent (24h)', value: stats.last24h, icon: TrendingUp, color: 'bg-cyan-500', link: '/logs' },
    { name: 'Failed Emails', value: stats.emailsFailed, icon: AlertCircle, color: 'bg-red-500', link: '/logs' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentCampaigns.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No campaigns yet. <Link to="/campaigns" className="text-indigo-600 hover:underline">Create your first campaign</Link>
            </div>
          ) : (
            recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-500">
                    {campaign.template_name || 'No template'} • {campaign.total_recipients} recipients
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                  campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                  campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {campaign.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
