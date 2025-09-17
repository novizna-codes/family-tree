import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { SystemSetting } from '../../types';
import { Button } from '../../components/ui/Button';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await adminService.getSettings();
        setSettings(data);
        
        // Initialize form values
        const initialValues: Record<string, any> = {};
        Object.values(data).forEach((setting) => {
          initialValues[setting.key] = setting.type === 'boolean' 
            ? setting.value === 'true' 
            : setting.value;
        });
        setValues(initialValues);
      } catch (err) {
        setError('Failed to load settings');
        console.error('Settings error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const settingsToUpdate = Object.keys(values).map((key) => ({
        key,
        value: values[key],
        type: settings[key].type,
      }));

      await adminService.updateSettings(settingsToUpdate);
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const renderSettingInput = (setting: SystemSetting) => {
    const value = values[setting.key];

    switch (setting.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleValueChange(setting.key, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );
      case 'integer':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleValueChange(setting.key, parseInt(e.target.value) || 0)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(setting.key, e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure application-wide settings
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {Object.values(settings).map((setting) => (
              <div key={setting.key} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900">
                    {setting.key.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    {setting.description}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  {renderSettingInput(setting)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Important Settings Highlight */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Important Settings
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                • <strong>Public Registration:</strong> When disabled, new users cannot register through the public signup form.
              </p>
              <p>
                • <strong>Max Trees Per User:</strong> Set to 0 for unlimited trees per user.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};