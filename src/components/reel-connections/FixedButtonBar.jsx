import React from 'react';

const FixedButtonBar = ({ children }) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 pb-safe z-10 pt-4"
      role="toolbar"
      aria-label="Game controls"
    >
      <div className="flex gap-3 sm:gap-4 justify-center pb-4 sm:pb-6 px-4">{children}</div>
    </div>
  );
};

export default React.memo(FixedButtonBar);
