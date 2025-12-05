import { useState } from 'react';
import { CheckCircle, XCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailApi, healthCheck } from '../services/api';

export default function Settings() {
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const checkSMTP = async () => {
    setLoading(true);
    try {
      const res = await emailApi.verifySMTP();
      setSmtpStatus(res.data);
      if (res.data.success) {
        toast.success('SMTP connection verified');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      setSmtpStatus({ success: false, message: error.message });
      toast.error('Failed to verify SMTP');
    } finally {
      setLoading(false);
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

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }
    setLoading(true);
    try {
      await emailApi.sendTest({
        to: testEmail,
        subject: 'Test Email from Email Blaster',
        body: `
          <h1>Test Email</h1>
          <p>This is a test email from your Email Blaster service.</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        `,
      });
      toast.success('Test email sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
          <div className="space-y-4">
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

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {smtpStatus === null ? (
                  <div className="h-5 w-5 rounded-full bg-gray-300 mr-3"></div>
                ) : smtpStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mr-3" />
                )}
                <div>
                  <p className="font-medium">SMTP Server</p>
                  <p className="text-sm text-gray-500">
                    {smtpStatus ? (smtpStatus.success ? 'Connected' : smtpStatus.message) : 'Not checked'}
                  </p>
                </div>
              </div>
              <button
                onClick={checkSMTP}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>
        </div>

        {/* Send Test Email */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Send Test Email</h2>
          <p className="text-gray-600 mb-4">
            Send a test email to verify your SMTP configuration is working correctly.
          </p>
          <div className="flex space-x-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendTestEmail}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-5 w-5 mr-2" />
              Send Test
            </button>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <p className="text-gray-600 mb-4">
            Configure the following environment variables in your <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2">
            <p><span className="text-indigo-600">DATABASE_URL</span>=postgresql://user:pass@host:5432/dbname</p>
            <p><span className="text-indigo-600">SMTP_HOST</span>=smtp.gmail.com</p>
            <p><span className="text-indigo-600">SMTP_PORT</span>=587</p>
            <p><span className="text-indigo-600">SMTP_USER</span>=your-email@gmail.com</p>
            <p><span className="text-indigo-600">SMTP_PASS</span>=your-app-password</p>
            <p><span className="text-indigo-600">SMTP_FROM</span>=Your Name &lt;your-email@gmail.com&gt;</p>
          </div>
        </div>

        {/* Template Variables */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Template Variables</h2>
          <p className="text-gray-600 mb-4">
            Use these variables in your email templates for personalization:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}
