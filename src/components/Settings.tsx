import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AppSettings {
    model: string;
    device: string;

}

const MODELS = ["tiny", "base", "small", "medium"];
const DEVICES = ["cpu", "cuda"];

export const Settings = () => {
    const [settings, setSettings] = useState<AppSettings>({
        model: "base",
        device: "cpu",

    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        invoke<AppSettings>('get_settings')
            .then(s => {
                setSettings(s);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load settings", err);
                setLoading(false);
            });
    }, []);

    const handleChange = (key: keyof AppSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await invoke('save_settings', { settings });
            // Optionally close window or show success
            // For now, just show saved state
            setTimeout(() => setSaving(false), 1000);
        } catch (error) {
            console.error("Failed to save", error);
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-white">Loading...</div>;

    return (
        <div className="h-full w-full bg-gray-900 text-white p-6 flex flex-col gap-6 select-none">
            <h1 className="text-2xl font-bold mb-2">Settings</h1>
            
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Model Size</label>
                <select 
                    value={settings.model} 
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                >
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <p className="text-xs text-gray-500">Larger models are more accurate but slower.</p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Device</label>
                <select 
                    value={settings.device} 
                    onChange={(e) => handleChange('device', e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                >
                    {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="text-xs text-gray-500">Use CUDA only if you have an NVIDIA GPU.</p>
            </div>



            <div className="mt-auto pt-4 border-t border-gray-800">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className={`
                        w-full py-2 px-4 rounded font-medium transition-all
                        ${saving ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'}
                    `}
                >
                    {saving ? 'Saved & Restarting...' : 'Save & Restart'}
                </button>
            </div>
        </div>
    );
};
