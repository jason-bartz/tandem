'use client';

export default function StatsBar({
  time,
  mistakes,
  solved,
  isSmallPhone = false,
  isMobilePhone = false,
}) {
  return (
    <div
      className={`flex justify-between sm:justify-evenly ${
        isSmallPhone
          ? 'gap-2 mb-3 p-2'
          : isMobilePhone
            ? 'gap-3 mb-4 p-3'
            : 'gap-4 sm:gap-6 md:gap-8 mb-6 p-4'
      } bg-light-sand dark:bg-gray-800 rounded-2xl score-display max-w-md mx-auto`}
    >
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold text-dark-text dark:text-gray-200`}
        >
          {time}
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } text-gray-text dark:text-gray-400 mt-1`}
        >
          Time
        </div>
      </div>
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold text-dark-text dark:text-gray-200`}
        >
          {mistakes}/4
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } text-gray-text dark:text-gray-400 mt-1`}
        >
          Mistakes
        </div>
      </div>
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold text-dark-text dark:text-gray-200`}
        >
          {solved}/4
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } text-gray-text dark:text-gray-400 mt-1`}
        >
          Solved
        </div>
      </div>
    </div>
  );
}
