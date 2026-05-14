"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

const IMAGE_HOLD_SECONDS = 0; // Waktu tunggu untuk gambar (2 detik)
const CROSSFADE_DURATION = 1.2; // Durasi transisi fade

export function HeroBackground() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const phaseRef = useRef<"image" | "crossfade-to-video" | "video" | "crossfade-to-image">("image");
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    // Transisi fade dari gambar -> video
    // Gambar selalu opacity 1, video yang opacity-nya dinaikkan dari 0 ke 1
    const startVideo = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (phaseRef.current !== "image") return;

        phaseRef.current = "crossfade-to-video";
        video.currentTime = 0;
        video.play().catch(() => { });

        gsap.to(video, {
            opacity: 1,
            duration: CROSSFADE_DURATION,
            ease: "power2.inOut",
            onComplete: () => {
                phaseRef.current = "video";
            },
        });
    }, []);

    // Transisi fade dari video -> gambar
    // Gambar yang ada di bawahnya akan otomatis terlihat saat video perlahan memudar ke opacity 0
    const showImage = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (phaseRef.current !== "video") return;

        phaseRef.current = "crossfade-to-image";

        gsap.to(video, {
            opacity: 0,
            duration: CROSSFADE_DURATION,
            ease: "power2.inOut",
            onComplete: () => {
                video.pause();
                phaseRef.current = "image";
                clearHoldTimer();
                holdTimerRef.current = setTimeout(() => {
                    startVideo();
                }, IMAGE_HOLD_SECONDS * 1000);
            },
        });
    }, [clearHoldTimer, startVideo]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Kondisi awal: video disembunyikan (opacity 0), sedangkan gambar tetap terlihat
        gsap.set(video, { opacity: 0 });

        // Setelah waktu IMAGE_HOLD_SECONDS, mulai transisi pertama ke video
        holdTimerRef.current = setTimeout(() => {
            startVideo();
        }, IMAGE_HOLD_SECONDS * 1000);

        // Monitor waktu pemutaran video
        const onTimeUpdate = () => {
            if (!video.duration || !isFinite(video.duration)) return;

            // Ketika video sudah mencapai durasi 0.7 (70%) putaran
            const playedRatio = video.currentTime / video.duration;
            if (playedRatio >= 0.7 && phaseRef.current === "video") {
                showImage();
            }
        };

        video.addEventListener("timeupdate", onTimeUpdate);

        return () => {
            clearHoldTimer();
            gsap.killTweensOf(video);
            video.removeEventListener("timeupdate", onTimeUpdate);
        };
    }, [clearHoldTimer, startVideo, showImage]);

    return (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
            {/* Gambar sengaja dibuat dengan z-10 dan opacity 1 terus-menerus */}
            <img
                src="/img_hero_header.jpg"
                alt="Hero Background"
                className="absolute inset-0 w-full h-full object-cover z-10"
            />
            {/* Video diletakkan di atas gambar (z-20) */}
            <video
                ref={videoRef}
                src="/vod_hero_header.mp4"
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-20"
            />
        </div>
    );
}
