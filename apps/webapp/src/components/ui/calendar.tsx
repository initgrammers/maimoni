import { ChevronLeft, ChevronRight } from 'lucide-react';
import type * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="rdp-container">
      <style>{`
        .rdp-container .rdp-month_grid {
          width: 100%;
          border-collapse: collapse;
        }
        .rdp-container .rdp-weekdays {
          display: flex;
          justify-content: space-between;
        }
        .rdp-container .rdp-week {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: 0.5rem;
        }
        .rdp-container .rdp-day {
          width: 2.75rem;
          height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rdp-container .rdp-caption_label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rdp-container .rdp-dropdowns {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .rdp-container .rdp-dropdown_root {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .rdp-container .rdp-dropdown {
          appearance: none;
          background: #f1f5f9;
          border: none;
          border-radius: 12px;
          padding: 8px 12px;
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          min-width: 80px;
        }
        .rdp-container .rdp-dropdown:hover {
          background: #e2e8f0;
        }
        .rdp-container .rdp-dropdown:active {
          transform: scale(0.95);
        }
      `}</style>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn('p-6', className)}
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2035, 11)}
        classNames={{
          months:
            'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
          month: 'space-y-4',
          month_caption: 'flex justify-center pt-1 relative items-center mb-8',
          caption_label: 'hidden', // Hide the static label when dropdowns are active
          dropdowns: 'rdp-dropdowns',
          dropdown_root: 'rdp-dropdown_root',
          dropdown: 'rdp-dropdown',
          nav: 'space-x-1 flex items-center',
          button_previous: cn(
            'h-12 w-12 bg-white border border-slate-200 flex items-center justify-center rounded-2xl opacity-90 hover:opacity-100 transition-all active:scale-95 shadow-sm absolute left-1 z-10',
          ),
          button_next: cn(
            'h-12 w-12 bg-white border border-slate-200 flex items-center justify-center rounded-2xl opacity-90 hover:opacity-100 transition-all active:scale-95 shadow-sm absolute right-1 z-10',
          ),
          month_grid: 'rdp-month_grid',
          weekdays: 'rdp-weekdays',
          weekday:
            'text-slate-400 rounded-md w-11 font-bold text-[0.7rem] uppercase tracking-widest text-center',
          week: 'rdp-week',
          day: cn(
            'rdp-day font-semibold aria-selected:opacity-100 rounded-2xl hover:bg-slate-100 transition-all active:scale-90 relative',
          ),
          day_button: 'h-full w-full flex items-center justify-center',
          range_end: 'day-range-end',
          selected:
            'bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white shadow-lg shadow-slate-200',
          today:
            'bg-slate-100 text-slate-900 font-bold border border-slate-200',
          outside:
            'day-outside text-slate-300 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-300 aria-selected:opacity-30',
          disabled: 'text-slate-300 opacity-50',
          range_middle:
            'aria-selected:bg-slate-100 aria-selected:text-slate-900',
          hidden: 'invisible',
          ...classNames,
        }}
        components={{
          Chevron: (props) => {
            if (props.orientation === 'left') {
              return <ChevronLeft className="h-6 w-6 text-slate-600" />;
            }
            return <ChevronRight className="h-6 w-6 text-slate-600" />;
          },
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
