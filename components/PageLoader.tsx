import React from 'react';

interface PageLoaderProps {
  message?: string;
  submessage?: string;
  inline?: boolean;
  className?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading...',
  submessage,
  inline = false,
  className = '',
}) => {
  const content = (
    <div className={`ga-loader-container ${className}`}>
      <div className="ga-loader-icon-wrapper">
        <div className="ga-loader-glow" />
        <div className="ga-loader-orbit" />
        <div className="ga-loader-orbit-inner" />
        <div className="ga-loader-favicon-box">
          <img
            src="/images/apple-touch-icon.png"
            alt="Guardian Angel DMS"
            className="ga-loader-favicon-img"
            loading="eager"
          />
        </div>
      </div>

      <div className="ga-loader-bar-wrap">
        <div className="ga-loader-bar-fill" />
      </div>

      <div className="ga-loader-brand">
        <span className="ga-loader-brand-dot" />
        <span className="ga-loader-brand-title">Guardian Angel DMS</span>
      </div>

      {message && <p className="ga-loader-message">{message}</p>}
      {submessage && <p className="text-[11px] text-gray-500 mt-1">{submessage}</p>}
    </div>
  );

  if (inline) {
    return <div className="flex items-center justify-center p-8">{content}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-center p-6 select-none animate-in fade-in duration-200">
      {content}
    </div>
  );
};

export default PageLoader;
