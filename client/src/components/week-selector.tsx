import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekSelectorProps {
  currentWeek: string;
  dateRange: string;
  onPrevious: () => void;
  onNext: () => void;
  onCurrentWeek: () => void;
  isCurrentWeek: boolean;
}

export function WeekSelector({ currentWeek, dateRange, onPrevious, onNext, onCurrentWeek, isCurrentWeek }: WeekSelectorProps) {
  return (
    <div className="bg-white border-b border-neutral-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            className="p-2 rounded-full hover:bg-neutral-50 transition-colors"
            onClick={onPrevious}
          >
            <ChevronLeft className="w-5 h-5 text-neutral-700" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-medium text-neutral-700">{currentWeek}</h2>
            <p className="text-sm text-neutral-500">{dateRange}</p>
          </div>
          <button 
            className="p-2 rounded-full hover:bg-neutral-50 transition-colors"
            onClick={onNext}
          >
            <ChevronRight className="w-5 h-5 text-neutral-700" />
          </button>
        </div>
        
        {/* Current Week Button */}
        {!isCurrentWeek && (
          <div className="flex justify-center mt-3">
            <button
              onClick={onCurrentWeek}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              Go to Current Week
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
