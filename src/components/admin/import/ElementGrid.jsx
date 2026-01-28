'use client';

/**
 * ElementGrid - Displays elements in a grid of small boxes
 */
export default function ElementGrid({ elements, onElementClick }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
      {elements.map((element) => (
        <button
          key={element.id}
          onClick={() => onElementClick(element)}
          className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none transition-all min-h-[80px]"
        >
          <span className="text-2xl mb-1">{element.emoji}</span>
          <span className="text-xs font-medium text-center leading-tight line-clamp-2">
            {element.name}
          </span>
        </button>
      ))}
    </div>
  );
}
