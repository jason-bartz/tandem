import React from 'react';

const FixedButtonBar = ({ children, highContrast = false }) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 pb-safe z-10"
      role="toolbar"
      aria-label="Game controls"
    >
      {/* Gradient overlay for better button visibility */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          highContrast
            ? 'bg-gradient-to-t from-hc-background via-hc-background/80 to-transparent'
            : 'bg-gradient-to-t from-[#0f0f1e] via-[#0f0f1e]/85 to-transparent'
        }`}
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          maskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
        }}
      />
      <div className="relative flex gap-3 sm:gap-4 justify-center pt-4 pb-4 sm:pb-6 px-4">
        {children}
      </div>
    </div>
  );
};

export default React.memo(FixedButtonBar);
