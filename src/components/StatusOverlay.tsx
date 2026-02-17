import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const StatusOverlay = () => {
    const [status, setStatus] = useState("ready");
    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        console.log("StatusOverlay mounted");
        const unlistenStatus = listen('app-status', (event) => {
            setStatus(event.payload as string);
        });
        const unlistenText = listen('transcription', (event) => {
            setTranscript(event.payload as string);
            setTimeout(() => setTranscript(""), 3000);
        });

        return () => {
            unlistenStatus.then(f => f());
            unlistenText.then(f => f());
        };
    }, []);

    useEffect(() => {
        if (status === 'done') {
            const timer = setTimeout(() => {
                setStatus('ready');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    // if (status === "ready" && !transcript) return null;

    const handleDoubleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'recording') {
            await invoke('stop_recording');
        } else if (status === 'ready') {
            await invoke('start_recording');
        }
    };

    const handleMouseDown = async (e: React.MouseEvent) => {
        if (e.button === 0) {
            await getCurrentWindow().startDragging();
        }
    };

    return (
        <div className="flex items-center justify-center w-full h-full bg-transparent pointer-events-none select-none">
            {/* Avatar Circle */}
            <div 
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                className={`
                relative flex flex-col items-center justify-center 
                w-32 h-32 rounded-full 
                transition-transform duration-200 cursor-grab active:cursor-grabbing pointer-events-auto
                border-4
                ${status === 'recording' ? 'bg-red-600 border-white animate-breathing-red' : 
                  status === 'transcribing' ? 'bg-blue-600 border-white/50 animate-pulse shadow-[0_0_40px_rgba(37,99,235,0.8)]' : 
                  status === 'loading_model' ? 'bg-yellow-500 border-white/50 animate-pulse' :
                  status === 'done' ? 'bg-green-600 border-white/50 shadow-[0_0_30px_rgba(22,163,74,0.6)]' :
                  'bg-black/80 border-white/20 hover:bg-black/90'}
            `}>
                
                {status === 'loading_model' && (
                    <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}

                {status === 'ready' && (
                    <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}

                {status === 'recording' && (
                    <div className="flex flex-col items-center" data-tauri-drag-region>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                )}
                
                {status === 'transcribing' && (
                     <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                )}
                
                {status === 'done' && (
                    <svg data-tauri-drag-region xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        </div>
    );
};
