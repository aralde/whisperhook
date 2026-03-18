import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Lottie from 'lottie-react';
import recordingAnimation from '../assets/animations/audio_recording.json';
import doneAnimation from '../assets/animations/Audio_finish.json';

export const StatusOverlay = () => {
    const [status, setStatus] = useState("ready");
    const [errorMessage, setErrorMessage] = useState("");
    const [partialText, setPartialText] = useState("");
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const unlistenStatus = listen('app-status', (event) => {
            const s = event.payload as string;
            setStatus(s);
            if (s !== 'error') setErrorMessage("");
            if (s !== 'realtime_active') setPartialText("");
        });

        const unlistenPartial = listen('partial-transcription', (event) => {
            setPartialText(event.payload as string);
            // Clear partial text after 3s of silence
            setTimeout(() => setPartialText(""), 3000);
        });

        const unlistenError = listen('app-error', (event) => {
            setErrorMessage(event.payload as string);
        });

        return () => {
            unlistenStatus.then(f => f());
            unlistenPartial.then(f => f());
            unlistenError.then(f => f());
        };
    }, []);

    useEffect(() => {
        if (status === 'done') {
            const timer = setTimeout(() => setStatus('ready'), 1000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleDoubleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'realtime_active') {
            await invoke('stop_realtime');
        } else if (status === 'recording') {
            await invoke('stop_recording');
        } else if (status === 'ready' || status === 'error') {
            try {
                const settings: any = await invoke('get_settings');
                if (settings.realtime) {
                    await invoke('start_realtime');
                } else {
                    await invoke('start_recording');
                }
            } catch (err) {
                console.error("Failed to get settings", err);
                await invoke('start_recording'); // fallback
            }
        }
    };

    const handleMouseDown = async (e: React.MouseEvent) => {
        if (e.button === 0) {
            await getCurrentWindow().startDragging();
        }
    };

    const getStatusMessage = (s: string) => {
        switch (s) {
            case 'loading_model': return "Loading Model...";
            case 'ready': return "Ready";
            case 'recording': return "Recording...";
            case 'transcribing': return "Transcribing...";
            case 'done': return "Done ✓";
            case 'error': return "Error";
            case 'realtime_active': return partialText ? `"${partialText}"` : "Listening...";
            default: return s;
        }
    };

    const showPopover = isHovered || (status !== 'ready' && status !== 'done');
    const isRealtime = status === 'realtime_active';

    return (
        <div className="flex items-center justify-center w-full h-full bg-transparent pointer-events-none select-none">

            {/* Status Popover */}
            {showPopover && (
                <div className={`
                    absolute top-1/2 mt-14 left-1/2 transform -translate-x-1/2
                    px-3 py-2 rounded-lg shadow-lg
                    text-xs font-medium z-50
                    max-w-[200px] whitespace-normal text-center break-words
                    pointer-events-none
                    ${status === 'error'
                        ? 'bg-gray-800 text-red-300 border border-red-500/30'
                        : isRealtime
                            ? 'bg-gray-800 text-green-300 border border-green-500/30'
                            : 'bg-gray-800 text-white/90 border border-white/10'}
                `}>
                    {status === 'error' ? (errorMessage || 'Unknown error') : getStatusMessage(status)}
                    {/* Arrow pointing up */}
                    <div className={`
                        absolute -top-1 left-1/2 transform -translate-x-1/2 rotate-45 w-2 h-2
                        ${status === 'error'
                            ? 'bg-gray-800 border-l border-t border-red-500/30'
                            : isRealtime
                                ? 'bg-gray-800 border-l border-t border-green-500/30'
                                : 'bg-gray-800 border-l border-t border-white/10'}
                    `}></div>
                </div>
            )}

            <div className="relative flex flex-col items-center gap-2 pointer-events-auto">
                {/* Hotkey Legend */}
                <div className="text-white/50 text-[10px] uppercase font-semibold tracking-wider bg-black/40 px-2 py-0.5 rounded-full shadow-sm select-none pointer-events-none mb-1">
                    Ctrl + Shift + M
                </div>

                {/* Avatar Circle */}
                <div
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`
                        relative flex items-center justify-center
                        w-20 h-20 rounded-full overflow-hidden
                        transition-all duration-200 cursor-grab active:cursor-grabbing pointer-events-auto
                        border-4
                        ${status === 'error'
                            ? 'bg-red-900/20 border-red-500/50'
                            : isRealtime
                                ? 'bg-black/90 border-green-500/50'
                                : 'bg-black/80 border-white/20'}
                    `}
                >
                    {/* Loading spinner */}
                    {status === 'loading_model' && (
                        <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}

                    {/* Microphone icon (ready state) */}
                    {status === 'ready' && (
                        <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )}

                    {/* Error icon */}
                    {status === 'error' && (
                        <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}

                    {/* Real-time active: pulsing green mic */}
                    {isRealtime && (
                        <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )}

                    {/* Recording animation */}
                    {status === 'recording' && (
                        <div className="w-full h-full" data-tauri-drag-region>
                            <Lottie animationData={recordingAnimation} loop={true} />
                        </div>
                    )}

                    {/* Transcribing animation */}
                    {status === 'transcribing' && (
                        <div className="w-full h-full opacity-80" data-tauri-drag-region>
                            <Lottie animationData={recordingAnimation} loop={true} />
                        </div>
                    )}

                    {/* Done animation */}
                    {status === 'done' && (
                        <div className="w-full h-full" data-tauri-drag-region>
                            <Lottie animationData={doneAnimation} loop={false} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
