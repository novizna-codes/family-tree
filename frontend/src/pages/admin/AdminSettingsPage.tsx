import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { SystemSetting } from '../../types';
import { Button } from '../../components/ui/Button';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

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
        showErrorToast('Failed to load settings. Please refresh the page.');
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
      showSuccessToast('Settings saved successfully! 🎉');
    } catch (err) {
      showErrorToast('Failed to save settings. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getSettingHelpText = (setting: SystemSetting) => {
    const helpTexts: Record<string, string> = {
      'public_registration_enabled': 'When disabled, new users cannot register through the public signup form.',
      'max_trees_per_user': 'Set to 0 for unlimited trees per user.',
      'max_tree_size': 'Set to 0 for unlimited people per family tree.',
      'privacy_default': 'Controls the default visibility of new family trees: private (only creator), family (shared with family), or public (visible to all).',
      'session_timeout': 'Users will be automatically logged out after this period of inactivity.',
      'max_file_upload_size': 'Maximum size for photos and documents. Server limits may also apply.',
      'maintenance_mode': 'When enabled, only administrators can access the application.',
      'backup_frequency': 'How often automatic backups are created. Manual backups can be created anytime.',
      'enable_email_notifications': 'Controls whether the system sends email notifications for important events like invitations and updates.',
      'default_language': 'Language used for new users and as fallback when user preference is not set.',
    };
    
    return helpTexts[setting.key] || null;
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

    // Special cases for specific settings
    if (setting.key === 'privacy_default') {
      return (
        <select
          value={value || 'private'}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="private">Private</option>
          <option value="family">Family</option>
          <option value="public">Public</option>
        </select>
      );
    }

    if (setting.key === 'backup_frequency') {
      return (
        <select
          value={value || 'weekly'}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      );
    }

    if (setting.key === 'default_language') {
      return (
        <select
          value={value || 'en'}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="en">English</option>
          <option value="ur">اردو (Urdu)</option>
        </select>
      );
    }

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
            min="0"
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => {
              const numValue = e.target.value === '' ? 0 : parseInt(e.target.value);
              handleValueChange(setting.key, isNaN(numValue) ? 0 : numValue);
            }}
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
            {Object.values(settings).map((setting) => {
              const helpText = getSettingHelpText(setting);
              return (
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
                    {helpText && (
                      <p className="mt-2 text-sm text-gray-600 border-l-2 border-blue-400 pl-3">
                        {helpText}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};