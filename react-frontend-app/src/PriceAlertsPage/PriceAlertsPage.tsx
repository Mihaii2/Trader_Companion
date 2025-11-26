import React, { useEffect, useState } from 'react';
import { Alert, AlarmSettings, CreateAlertData } from './types';
import { priceAlertsAPI } from './services/priceAlertsAPI';
import { AlertForm } from './components/AlertForm';
import { AlertsTable } from './components/AlertsTable';
import { AlarmSettingsForm } from './components/AlarmSettingsForm';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export const PriceAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 1 second to show updated prices from backend
    const interval = setInterval(() => {
      loadAlerts();
    }, 1000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([loadAlerts(), loadAlarmSettings()]);
    } catch (err) {
      setError('Failed to load data. Please refresh the page.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await priceAlertsAPI.getAlerts();
      setAlerts(response.data);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const loadAlarmSettings = async () => {
    try {
      const response = await priceAlertsAPI.getAlarmSettings();
      setAlarmSettings(response.data);
    } catch (err) {
      console.error('Error loading alarm settings:', err);
    }
  };

  const handleCreateAlert = async (data: CreateAlertData) => {
    setIsCreating(true);
    try {
      const response = await priceAlertsAPI.createAlert(data);
      setAlerts(prev => [response.data, ...prev]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create alert';
      alert(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    // Optimistic update - disable button immediately
    setAlerts(prev =>
      prev.map(alert => 
        alert.id === id 
          ? { ...alert, is_active: isActive, triggered: false }
          : alert
      )
    );

    try {
      const response = await priceAlertsAPI.updateAlert(id, { is_active: isActive });
      // Update with server response
      setAlerts(prev =>
        prev.map(alert => (alert.id === id ? response.data : alert))
      );
    } catch (err: any) {
      console.error('Error updating alert:', err);
      const message = err.response?.data?.error || 'Failed to update alert.';
      alert(message);
      // Revert optimistic update on error
      setAlerts(prev =>
        prev.map(alert => 
          alert.id === id 
            ? { ...alert, is_active: !isActive }
            : alert
        )
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await priceAlertsAPI.deleteAlert(id);
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (err: any) {
      console.error('Error deleting alert:', err);
      const message = err.response?.data?.error || 'Failed to delete alert.';
      alert(message);
    }
  };

  const handleUpdateSettings = async (data: Partial<AlarmSettings>) => {
    if (!alarmSettings) return;

    try {
      const response = await priceAlertsAPI.updateAlarmSettings(data);
      setAlarmSettings(response.data);
    } catch (err) {
      console.error('Error updating settings:', err);
      alert('Failed to update settings. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <div className="max-w-[95vw] mx-auto">
        {error && (
          <AlertComponent variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </AlertComponent>
        )}

        <div className="space-y-6">
          {/* Show alerts at the top */}
          <AlertsTable
            alerts={alerts}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <AlertForm onSubmit={handleCreateAlert} isLoading={isCreating} />
            {alarmSettings && (
              <AlarmSettingsForm
                settings={alarmSettings}
                onUpdate={handleUpdateSettings}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

