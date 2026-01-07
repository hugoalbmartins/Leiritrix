import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DatePickerPopup({ value, onChange, className, placeholder = "Selecionar data" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempDate, setTempDate] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (value && value instanceof Date && !isNaN(value.getTime())) {
      setSelectedDate(value);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setViewMonth(selectedDate.getMonth());
        setViewYear(selectedDate.getFullYear());
        setTempDate(selectedDate);
      } else {
        const now = new Date();
        setViewMonth(now.getMonth());
        setViewYear(now.getFullYear());
        setTempDate(null);
      }
    }
  }, [isOpen, selectedDate]);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const handleDayClick = (day) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    if (tempDate) {
      onChange?.(tempDate);
      setSelectedDate(tempDate);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    setTempDate(null);
    onChange?.(null);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const displayValue = selectedDate ? formatDate(selectedDate) : placeholder;

  return (
    <>
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2 p-3 rounded-md border border-white/10 bg-[#082d32] hover:border-white/20 transition-colors text-left"
        >
          <CalendarIcon className="h-4 w-4 text-[#c8f31d] flex-shrink-0" />
          <span className={`flex-1 text-sm ${selectedDate ? 'text-white' : 'text-white/50'}`}>
            {displayValue}
          </span>
          {selectedDate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-white/50 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          )}
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#082d32] border-white/10 text-white p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-white text-lg">Selecionar Data</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={viewMonth.toString()} onValueChange={(val) => setViewMonth(parseInt(val))}>
                  <SelectTrigger className="flex-1 h-9 border-white/10 bg-[#0a3940] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10 max-h-60">
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()} className="text-white hover:bg-white/10">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={viewYear.toString()} onValueChange={(val) => setViewYear(parseInt(val))}>
                  <SelectTrigger className="w-[100px] h-9 border-white/10 bg-[#0a3940] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#082d32] border-white/10 max-h-60">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-white hover:bg-white/10">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="text-center text-xs text-white/50 font-medium py-2">
                    {day}
                  </div>
                ))}
                {emptyDays.map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const currentDate = new Date(viewYear, viewMonth, day);
                  const isSelected = isSameDay(currentDate, tempDate);
                  const isToday = isSameDay(currentDate, new Date());
                  const isFuture = isFutureDate(currentDate);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !isFuture && handleDayClick(day)}
                      disabled={isFuture}
                      className={`
                        aspect-square rounded-md text-sm transition-colors
                        ${isFuture
                          ? 'text-white/20 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#c8f31d] text-[#082d32] font-bold'
                          : isToday
                          ? 'bg-white/10 text-white border border-[#c8f31d]'
                          : 'text-white hover:bg-white/10'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!tempDate}
                  className="flex-1 bg-[#c8f31d] text-[#082d32] hover:bg-[#d4ff4d] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Ir
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
