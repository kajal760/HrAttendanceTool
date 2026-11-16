"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BirthdayConfetti.module.css";

interface BirthdayConfettiProps {
  name: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
}

const COLORS = ["#f94144", "#f3722c", "#f9c74f", "#90be6d", "#43aa8b", "#577590", "#f8961e", "#ea4c89"];
const DURATION_MS = 4500;
const PARTICLE_COUNT = 140;

// A short confetti burst for the signed-in employee's own birthday, plus a
// small dismissible card - distinct from BirthdayBanner's app-wide callout
// (which everyone sees, naming whoever's birthday it is). This one is just
// for the person it's actually about, so it only renders when `name` is
// passed (the layout only does that for the signed-in employee's own day).
// Plain canvas, no charting/animation library - a one-off burst doesn't
// need one.
export default function BirthdayConfetti({ name }: BirthdayConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardVisible, setCardVisible] = useState(true);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frameId: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx!.restore();
      }
      if (elapsed < DURATION_MS) {
        frameId = requestAnimationFrame(tick);
      } else {
        setAnimating(false);
      }
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {animating && <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}
      {cardVisible && (
        <div className={styles.card} role="status">
          <span className={styles.emoji} aria-hidden="true">
            🎂
          </span>
          <div>
            <div className={styles.title}>Happy Birthday, {name.split(" ")[0]}!</div>
            <div className={styles.subtitle}>Wishing you a fantastic day from everyone at HumSetu.</div>
          </div>
          <button type="button" className={styles.dismiss} onClick={() => setCardVisible(false)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </>
  );
}
