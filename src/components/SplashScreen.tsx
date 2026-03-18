import { useEffect, useState } from 'react';

interface SplashScreenProps {
    onDone: () => void;
}

export const SplashScreen = ({ onDone }: SplashScreenProps) => {
    const [phase, setPhase] = useState<'visible' | 'fading'>('visible');
    const [dots, setDots] = useState('');

    // Animated dots: "." → ".." → "..." → ""
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    // Start fade after 2.2s, call onDone after fade (0.6s)
    useEffect(() => {
        const fadeTimer = setTimeout(() => setPhase('fading'), 2200);
        const doneTimer = setTimeout(() => onDone(), 2800);
        return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    }, [onDone]);

    return (
        <div style={{
            ...styles.container,
            opacity: phase === 'fading' ? 0 : 1,
        }}>
            {/* Logo */}
            <div style={styles.logoWrap}>
                {/* Outer glow ring */}
                <div style={styles.glowRing} />
                <img
                    src="/logo.png"
                    alt="WhisperHook logo"
                    style={styles.logoImg}
                />
            </div>

            {/* App name */}
            <div style={styles.appName}>WhisperHook</div>

            {/* Status */}
            <div style={styles.status}>Starting{dots}</div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 9999,
        transition: 'opacity 0.6s ease',
        userSelect: 'none',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    logoWrap: {
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        inset: -6,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,188,212,0.25) 0%, transparent 70%)',
        animation: 'splashPulse 1.8s ease-in-out infinite',
    },
    logoImg: {
        width: 82,
        height: 82,
        borderRadius: 20,
        objectFit: 'cover' as const,
        boxShadow: '0 0 28px rgba(0,188,212,0.35), 0 0 8px rgba(0,188,212,0.2)',
    },
    appName: {
        fontSize: 22,
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: '-0.3px',
        marginTop: 4,
    },
    status: {
        fontSize: 13,
        color: '#4a5568',
        letterSpacing: '0.5px',
        minWidth: 90,
        textAlign: 'center',
    },
};
