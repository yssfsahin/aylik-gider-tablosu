import React, { useEffect, useRef, useState } from "react";

const GradientBackground = () => {
  const interactiveRef = useRef(null);
  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);
  const [isSafari, setIsSafari] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  // requestAnimationFrame ile daha akıcı animasyon
  useEffect(() => {
    const tick = () => {
      setCurX((prev) => prev + (tgX - prev) / 20);
      setCurY((prev) => prev + (tgY - prev) / 20);
      if (interactiveRef.current) {
        interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [curX, curY, tgX, tgY]);

  const handleMouseMove = (event) => {
    if (interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(40deg,rgb(108,0,162),rgb(0,17,82))]"
    >
      {/* SVG filter (Safari için fallback var) */}
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className={`gradients-container h-full w-full ${isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]"}`}>
        <div className="absolute w-[80%] h-[80%] top-[10%] left-[10%] [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(18,113,255,0.8)_0,_rgba(18,113,255,0)_50%)_no-repeat] animate-first" />
        <div className="absolute w-[80%] h-[80%] top-[10%] left-[10%] [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(221,74,255,0.8)_0,_rgba(221,74,255,0)_50%)_no-repeat] animate-second" />
        <div className="absolute w-[80%] h-[80%] top-[10%] left-[10%] [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(100,220,255,0.8)_0,_rgba(100,220,255,0)_50%)_no-repeat] animate-third" />
        <div className="absolute w-[80%] h-[80%] top-[10%] left-[10%] [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(200,50,50,0.8)_0,_rgba(200,50,50,0)_50%)_no-repeat] animate-fourth opacity-70" />
        <div className="absolute w-[80%] h-[80%] top-[10%] left-[10%] [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(180,180,50,0.8)_0,_rgba(180,180,50,0)_50%)_no-repeat] animate-fifth" />

        {/* mouse izleyen katman */}
        <div
          ref={interactiveRef}
          className="absolute w-full h-full -top-1/2 -left-1/2 opacity-70 [mix-blend-mode:hard-light] [background:radial-gradient(circle_at_center,_rgba(140,100,255,0.8)_0,_rgba(140,100,255,0)_50%)_no-repeat]"
        />
      </div>
    </div>
  );
};

export default GradientBackground;