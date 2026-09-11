import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface InfoTooltipProps {
  content: React.ReactNode;
  title?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  size = 'sm',
  className = '',
  ariaLabel = 'More information',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: true,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(290, window.innerWidth - 32);

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    const placeAbove = rect.top > 160;
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left, placeAbove });
  };

  const handleOpen = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      handleOpen();
    }
  };

  // Close on outside click, scroll, resize, or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const sizeClass =
    size === 'xs'
      ? 'size-3.5 text-[9px]'
      : size === 'md'
      ? 'size-5 text-[11px]'
      : 'size-4 text-[10px]';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center ${sizeClass} rounded-full bg-white/10 hover:bg-primary/25 border border-white/15 hover:border-primary/50 text-gray-400 hover:text-white font-bold transition-all ml-1.5 shrink-0 align-middle select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      >
        ?
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              width: 'min(290px, calc(100vw - 32px))',
            }}
            role="tooltip"
            className="z-[9999] p-3.5 rounded-2xl bg-[#121624]/95 backdrop-blur-2xl border border-white/15 text-white shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(113,129,255,0.18)] text-left animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            {title && (
              <p className="font-bold text-[11px] text-white tracking-wide uppercase mb-1.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary inline-block"></span>
                {title}
              </p>
            )}
            <div className="text-gray-300 font-medium text-[11px] leading-relaxed">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default InfoTooltip;
