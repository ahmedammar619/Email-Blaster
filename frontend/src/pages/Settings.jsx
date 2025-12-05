import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Send, Plus, Trash2, Edit2, Star, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailApi, healthCheck, emailAccountApi, emailSettingsApi } from '../services/api';

export default function Settings() {
  const [apiStatus, setApiStatus] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Email Accounts
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
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

  // Email Header/Footer Settings
  const [emailHeader, setEmailHeader] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [bodyBgColor, setBodyBgColor] = useState('#f5f7fa');
  const [contentBgColor, setContentBgColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#1a73e8');
  // Body styling options
  const [contentWidth, setContentWidth] = useState('550');
  const [contentPadding, setContentPadding] = useState('30');
  const [contentBorderRadius, setContentBorderRadius] = useState('8');
  const [contentMargin, setContentMargin] = useState('20');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showHeaderFooterPreview, setShowHeaderFooterPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewIframeRef = useRef(null);

  useEffect(() => {
    loadAccounts();
    loadEmailSettings();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await emailAccountApi.getAll();
      setAccounts(res.data);
    } catch (error) {
      console.error('Failed to load email accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadEmailSettings = async () => {
    try {
      const res = await emailSettingsApi.getAll();
      setEmailHeader(res.data.email_header || '');
      setEmailFooter(res.data.email_footer || '');
      setBodyBgColor(res.data.body_background_color || '#f5f7fa');
      setContentBgColor(res.data.content_background_color || '#ffffff');
      setAccentColor(res.data.accent_color || '#1a73e8');
      setContentWidth(res.data.content_width || '550');
      setContentPadding(res.data.content_padding || '30');
      setContentBorderRadius(res.data.content_border_radius || '8');
      setContentMargin(res.data.content_margin || '20');
    } catch (error) {
      console.error('Failed to load email settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveEmailSettings = async () => {
    setSavingSettings(true);
    try {
      await emailSettingsApi.updateMultiple({
        email_header: emailHeader,
        email_footer: emailFooter,
        body_background_color: bodyBgColor,
        content_background_color: contentBgColor,
        accent_color: accentColor,
        content_width: contentWidth,
        content_padding: contentPadding,
        content_border_radius: contentBorderRadius,
        content_margin: contentMargin,
      });
      toast.success('Email settings saved');
    } catch (error) {
      toast.error('Failed to save email settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetEmailSettings = async () => {
    if (!confirm('Are you sure you want to reset email settings to defaults?')) return;
    try {
      const res = await emailSettingsApi.reset();
      setEmailHeader(res.data.email_header);
      setBodyBgColor(res.data.body_background_color || '#f5f7fa');
      setContentBgColor(res.data.content_background_color || '#ffffff');
      setAccentColor(res.data.accent_color || '#1a73e8');
      setContentWidth(res.data.content_width || '550');
      setContentPadding(res.data.content_padding || '30');
      setContentBorderRadius(res.data.content_border_radius || '8');
      setContentMargin(res.data.content_margin || '20');
      setEmailFooter(res.data.email_footer);
      toast.success('Reset to defaults');
    } catch (error) {
      toast.error('Failed to reset settings');
    }
  };

  const previewHeaderFooter = async () => {
    try {
      const sampleBody = '<p>This is a sample email body content. It will be wrapped with your header and footer.</p>';
      const res = await emailSettingsApi.preview(sampleBody, true);
      setPreviewHtml(res.data.html);
      setShowHeaderFooterPreview(true);
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const checkAPI = async () => {
    try {
      const res = await healthCheck();
      setApiStatus({ success: true, timestamp: res.data.timestamp });
      toast.success('API is healthy');
    } catch (error) {
      setApiStatus({ success: false, message: error.message });
      toast.error('API health check failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
    } finally {
      setLoading(false);
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
      smtp_pass: '',
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
      toast.error('Please enter a test email address first');
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Email Accounts Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Email Accounts</h2>
            <button
              onClick={() => {
                setEditingAccount(null);
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </button>
          </div>

          {/* Test Email Input */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to receive test messages"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {loadingAccounts ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No email accounts configured yet.</p>
              <p className="text-sm mt-1">Add an email account to start sending campaigns.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    account.is_default ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    {account.is_default && (
                      <Star className="h-5 w-5 text-indigo-600 fill-current mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">{account.email}</p>
                      <p className="text-xs text-gray-400">{account.smtp_host}:{account.smtp_port}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTest(account.id)}
                      disabled={testingId === account.id}
                      className="p-2 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
                      title="Test"
                    >
                      {testingId === account.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                    {!account.is_default && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        className="p-2 text-gray-400 hover:text-yellow-500"
                        title="Set as Default"
                      >
                        <Star className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Header/Footer Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Email Header & Footer</h2>
            <div className="flex space-x-2">
              <button
                onClick={previewHeaderFooter}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </button>
              <button
                onClick={resetEmailSettings}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </button>
              <button
                onClick={saveEmailSettings}
                disabled={savingSettings}
                className="flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Configure the default HTML header and footer that wraps all your email templates.
          </p>

          {loadingSettings ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Header (HTML)
                </label>
                <textarea
                  value={emailHeader}
                  onChange={(e) => setEmailHeader(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="<!DOCTYPE html><html>..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include opening HTML tags, styles, and header content
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Footer (HTML)
                </label>
                <textarea
                  value={emailFooter}
                  onChange={(e) => setEmailFooter(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="</div></body></html>"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include closing tags, footer content, and unsubscribe links
                </p>
              </div>

              {/* Color Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Email Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Body Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bodyBgColor}
                        onChange={(e) => setBodyBgColor(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bodyBgColor}
                        onChange={(e) => setBodyBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="#f5f7fa"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Outer background color</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={contentBgColor}
                        onChange={(e) => setContentBgColor(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={contentBgColor}
                        onChange={(e) => setContentBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email content area</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder="#1a73e8"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Links and buttons</p>
                  </div>
                </div>
              </div>

              {/* Body Styling Options */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Content Area Styling</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={contentWidth}
                      onChange={(e) => setContentWidth(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="300"
                      max="800"
                    />
                    <p className="text-xs text-gray-500 mt-1">300-800px</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding (px)
                    </label>
                    <input
                      type="number"
                      value={contentPadding}
                      onChange={(e) => setContentPadding(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Inner spacing</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Border Radius (px)
                    </label>
                    <input
                      type="number"
                      value={contentBorderRadius}
                      onChange={(e) => setContentBorderRadius(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                      max="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Rounded corners</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Margin (px)
                    </label>
                    <input
                      type="number"
                      value={contentMargin}
                      onChange={(e) => setContentMargin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Outer spacing</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {apiStatus === null ? (
                <div className="h-5 w-5 rounded-full bg-gray-300 mr-3"></div>
              ) : apiStatus.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-3" />
              )}
              <div>
                <p className="font-medium">API Server</p>
                <p className="text-sm text-gray-500">
                  {apiStatus ? (apiStatus.success ? `Connected - ${apiStatus.timestamp}` : apiStatus.message) : 'Not checked'}
                </p>
              </div>
            </div>
            <button
              onClick={checkAPI}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Check
            </button>
          </div>
        </div>

        {/* Template Variables */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Template Variables</h2>
          <p className="text-gray-600 mb-4">
            Use these variables in your email templates for personalization:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <code className="text-indigo-600">{"{{firstName}}"}</code>
              <p className="text-sm text-gray-500 mt-1">First name</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <code className="text-indigo-600">{"{{lastName}}"}</code>
              <p className="text-sm text-gray-500 mt-1">Last name</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <code className="text-indigo-600">{"{{email}}"}</code>
              <p className="text-sm text-gray-500 mt-1">Email address</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <code className="text-indigo-600">{"{{company}}"}</code>
              <p className="text-sm text-gray-500 mt-1">Company name</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <code className="text-indigo-600 text-xs">{"{{unsubscribeUrl}}"}</code>
              <p className="text-sm text-gray-500 mt-1">Unsubscribe link</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Note: An unsubscribe link is automatically added to emails if not present in your footer.
          </p>
        </div>
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
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header/Footer Preview Modal */}
      {showHeaderFooterPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4">Email Preview</h2>
            <p className="text-sm text-gray-600 mb-4">
              This is how your emails will look with the current header and footer.
            </p>
            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
              <iframe
                ref={previewIframeRef}
                srcDoc={previewHtml}
                className="w-full h-96 bg-white"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowHeaderFooterPreview(false)}
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
