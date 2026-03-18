import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

interface AppSettings {
    model: string;
    device: string;
    realtime: boolean;
    language: string;
    theme: string;
    show_splash: boolean;
}

const MODELS = ["tiny", "base", "small", "medium"];
const DEVICES = ["cpu", "cuda"];
const LANGUAGES = [
    { value: "", label: "Auto-detect" },
    { value: "es", label: "Spanish (es)" },
    { value: "en", label: "English (en)" },
    { value: "fr", label: "French (fr)" },
    { value: "de", label: "German (de)" },
    { value: "it", label: "Italian (it)" },
    { value: "pt", label: "Portuguese (pt)" },
    { value: "nl", label: "Dutch (nl)" },
    { value: "ru", label: "Russian (ru)" },
    { value: "zh", label: "Chinese (zh)" },
    { value: "ja", label: "Japanese (ja)" },
    { value: "ko", label: "Korean (ko)" },
    { value: "ar", label: "Arabic (ar)" },
];

const DARK = {
    bg: '#0f1117', border: '#1e2536', border2: '#2a3347',
    text: '#d1d9e6', textMuted: '#4e5d73', sectionLabel: '#38465a',
    selectBg: '#161b27', tabBg: '#161b27', tabActiveBg: '#0f1117',
    accent: '#00bcd4', accentGrad: 'linear-gradient(135deg,#0097a7 0%,#00616b 100%)',
    toggleOff: '#252f42', savedBg: '#1b3d1b', savedText: '#7ec87e',
    helpBg: '#11161f', helpBorder: '#1e2a3a', helpText: '#6b7d96',
    helpCode: '#2a3550', linkColor: '#00bcd4',
};
const LIGHT = {
    bg: '#f5f7fa', border: '#e4e9f0', border2: '#cdd5e0',
    text: '#1a2233', textMuted: '#7a8ba0', sectionLabel: '#a0b0c0',
    selectBg: '#ffffff', tabBg: '#e8edf5', tabActiveBg: '#f5f7fa',
    accent: '#0097a7', accentGrad: 'linear-gradient(135deg,#0097a7 0%,#00616b 100%)',
    toggleOff: '#c8d4e0', savedBg: '#1b3d1b', savedText: '#7ec87e',
    helpBg: '#edf1f7', helpBorder: '#d8e2ee', helpText: '#6b7d96',
    helpCode: '#dde5f0', linkColor: '#0097a7',
};

type P = typeof DARK;
const GITHUB_URL = 'https://github.com/aralde/local-whisper';

export const Settings = () => {
    const [settings, setSettings] = useState<AppSettings>({
        model: "base", device: "cpu", realtime: false,
        language: "", theme: "dark", show_splash: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'settings' | 'help'>('settings');

    useEffect(() => {
        invoke<AppSettings>('get_settings')
            .then(s => { setSettings(s); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const p = settings.theme === 'light' ? LIGHT : DARK;
    const set = (key: keyof AppSettings, v: string | boolean) =>
        setSettings(prev => ({ ...prev, [key]: v }));

    const handleSave = async () => {
        setSaving(true);
        try { await invoke('save_settings', { settings }); }
        catch (e) { console.error(e); }
        setTimeout(() => setSaving(false), 1200);
    };

    if (loading) return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#4e5d73', fontFamily: 'system-ui' }}>
            Loading…
        </div>
    );

    return (
        <div onContextMenu={e => e.preventDefault()} style={{ height: '100%', width: '100%', background: p.bg, color: p.text, display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", userSelect: 'none', overflow: 'hidden', transition: 'background .25s,color .25s' }}>

            {/* ── Tab bar ── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${p.border}`, background: p.tabBg }}>
                {(['settings', 'help'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer', fontSize: 12,
                        fontWeight: 600, letterSpacing: '0.2px',
                        background: tab === t ? p.tabActiveBg : 'transparent',
                        color: tab === t ? p.accent : p.textMuted,
                        borderBottom: tab === t ? `2px solid ${p.accent}` : '2px solid transparent',
                        transition: 'color .2s,border-color .2s,background .2s',
                    }}>
                        {t === 'settings' ? '⚙️  Settings' : '❓  Help'}
                    </button>
                ))}
                {/* GitHub small icon on the right */}
                <button
                    onClick={() => openUrl(GITHUB_URL)}
                    title="Open on GitHub"
                    style={{ padding: '0 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.4, transition: 'opacity .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                >
                    <GithubIcon color={p.text} size={15} />
                </button>
            </div>

            {/* ── SETTINGS TAB ── */}
            {tab === 'settings' && (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>

                        <Group label="Model" p={p}>
                            <Row label="Model size" hint="Larger = more accurate, slower" p={p}>
                                <Sel value={settings.model} onChange={v => set('model', v)} opts={MODELS.map(m => ({ v: m, l: m }))} p={p} />
                            </Row>
                            <Row label="Device" hint="CUDA requires NVIDIA GPU" p={p}>
                                <Sel value={settings.device} onChange={v => set('device', v)} opts={DEVICES.map(d => ({ v: d, l: d }))} p={p} />
                            </Row>
                        </Group>

                        <Group label="Language" p={p}>
                            <Row label="Language" hint="Forces recognition language" p={p}>
                                <Sel value={settings.language} onChange={v => set('language', v)} opts={LANGUAGES.map(l => ({ v: l.value, l: l.label }))} p={p} />
                            </Row>
                        </Group>

                        <Group label="Transcription" p={p}>
                            <Row label="Real-time" hint="Silero VAD — types as you speak" p={p}>
                                <Tog checked={settings.realtime} onChange={v => set('realtime', v)} p={p} />
                            </Row>
                        </Group>

                        <Group label="Appearance" p={p}>
                            <Row label="Theme" p={p}>
                                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${p.border2}` }}>
                                    {(['dark', 'light'] as const).map(t => (
                                        <button key={t} onClick={() => set('theme', t)} style={{
                                            padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                            background: settings.theme === t ? p.accent : 'transparent',
                                            color: settings.theme === t ? '#fff' : p.textMuted,
                                            transition: 'background .2s,color .2s',
                                        }}>
                                            {t === 'dark' ? '🌙' : '☀️'} {t[0].toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </Row>
                            <Row label="Startup screen" hint="Show splash on launch" p={p}>
                                <Tog checked={settings.show_splash} onChange={v => set('show_splash', v)} p={p} />
                            </Row>
                        </Group>

                    </div>

                    {/* Footer */}
                    <div style={{ padding: '10px 14px 12px', borderTop: `1px solid ${p.border}` }}>
                        <button onClick={handleSave} disabled={saving} style={{
                            width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                            fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                            transition: 'opacity .2s', letterSpacing: '0.1px',
                            background: saving ? p.savedBg : p.accentGrad,
                            color: saving ? p.savedText : '#fff',
                        }}>
                            {saving ? '✓ Saved & Restarting...' : 'Save & Restart'}
                        </button>
                    </div>
                </>
            )}

            {/* ── HELP TAB ── */}
            {tab === 'help' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    <HelpCard title="How to use" p={p}>
                        <HelpRow p={p}><Kbd p={p}>Ctrl+Shift+M</Kbd><span>Hold to record, release to transcribe.</span></HelpRow>
                        <HelpRow p={p}><Kbd p={p}>Ctrl+Shift+M</Kbd><span>In real-time mode: toggle listening on/off.</span></HelpRow>
                    </HelpCard>

                    <HelpCard title="Modes" p={p}>
                        <HelpRow p={p}>
                            <span style={{ color: p.accent, fontWeight: 700, fontSize: 11, minWidth: 80 }}>Push-to-talk</span>
                            <span>Hold hotkey → speak → release → text is typed at cursor.</span>
                        </HelpRow>
                        <HelpRow p={p}>
                            <span style={{ color: '#7ec87e', fontWeight: 700, fontSize: 11, minWidth: 80 }}>Real-time</span>
                            <span>Toggle on → speak freely, VAD auto-detects pauses.</span>
                        </HelpRow>
                    </HelpCard>

                    <HelpCard title="Tips" p={p}>
                        <HelpRow p={p}><span>• <b>base</b> model offers the best speed/accuracy balance.</span></HelpRow>
                        <HelpRow p={p}><span>• Forcing a language significantly improves accuracy.</span></HelpRow>
                        <HelpRow p={p}><span>• First launch downloads the model (~150 MB for base).</span></HelpRow>
                        <HelpRow p={p}><span>• CUDA mode requires a compatible NVIDIA GPU.</span></HelpRow>
                    </HelpCard>

                    {/* GitHub */}
                    <button onClick={() => openUrl(GITHUB_URL)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        background: p.helpBg, border: `1px solid ${p.helpBorder}`, borderRadius: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'opacity .15s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <GithubIcon color={p.accent} size={16} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: p.text }}>View on GitHub</span>
                            <span style={{ fontSize: 10.5, color: p.linkColor }}>github.com/aralde/local-whisper</span>
                        </div>
                    </button>

                </div>
            )}
        </div>
    );
};

/* ── Sub-components ─────────────────────────────── */

const Group = ({ label, children, p }: { label: string; children: React.ReactNode; p: P }) => (
    <div style={{ marginBottom: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: p.sectionLabel, padding: '8px 16px 3px' }}>{label}</div>
        {children}
    </div>
);

const Row = ({ label, hint, children, p }: { label: string; hint?: string; children: React.ReactNode; p: P }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px', borderBottom: `1px solid ${p.border}`, gap: 10, minHeight: 38 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: p.text, whiteSpace: 'nowrap' }}>{label}</span>
            {hint && <span style={{ fontSize: 10.5, color: p.textMuted }}>{hint}</span>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
);

const Sel = ({ value, onChange, opts, p }: { value: string; onChange: (v: string) => void; opts: { v: string; l: string }[]; p: P }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: p.selectBg, border: `1px solid ${p.border2}`, borderRadius: 6,
        color: p.text, fontSize: 12, padding: '4px 8px', minWidth: 110, maxWidth: 140,
        outline: 'none', cursor: 'pointer', transition: 'background .25s,color .25s',
    }}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
);

const Tog = ({ checked, onChange, p }: { checked: boolean; onChange: (v: boolean) => void; p: P }) => (
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked} style={{
        position: 'relative', width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? p.accent : p.toggleOff, transition: 'background .2s', padding: 0, flexShrink: 0,
    }}>
        <span style={{
            position: 'absolute', top: 2, left: 0, width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'transform .2s',
            transform: checked ? 'translateX(18px)' : 'translateX(2px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }} />
    </button>
);

const HelpCard = ({ title, children, p }: { title: string; children: React.ReactNode; p: P }) => (
    <div style={{ background: p.helpBg, border: `1px solid ${p.helpBorder}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: p.sectionLabel }}>{title}</div>
        {children}
    </div>
);

const HelpRow = ({ children, p }: { children: React.ReactNode; p: P }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, color: p.helpText, flexWrap: 'wrap' }}>
        {children}
    </div>
);

const Kbd = ({ children, p }: { children: React.ReactNode; p: P }) => (
    <span style={{
        fontFamily: 'monospace', fontSize: 10, fontWeight: 600, background: p.helpCode,
        color: p.text, borderRadius: 4, padding: '1px 5px', border: `1px solid ${p.helpBorder}`,
        whiteSpace: 'nowrap', flexShrink: 0,
    }}>
        {children}
    </span>
);

const GithubIcon = ({ color, size }: { color: string; size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.867 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.031 1.531 1.031.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.203 2.397.1 2.65.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.135 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
);
