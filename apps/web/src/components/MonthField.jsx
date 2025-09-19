import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const dateToYM = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const ymToDate = (ym) => {
  if (!ym) return new Date();
  const [y, m] = ym.split("-").map(Number);
  return new Date(y || new Date().getFullYear(), m ? m - 1 : 0, 1);
};

export default function MonthField({ value, onChange, placeholder, aria }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleMonthPick = (date) => {
    const ym = dateToYM(date);
    onChange({ target: { value: ym } });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        className={`input input-month ${value ? "has-value" : ""}`}
        type="text"
        readOnly
        value={value || ""}
        onClick={() => setOpen((v) => !v)}
        aria-label={aria}
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute z-50 mt-2 rounded-lg border border-slate-200 bg-white shadow-lg">
          <Calendar
            onClickMonth={handleMonthPick}
            value={ymToDate(value)}
            defaultValue={ymToDate(value)}
            maxDetail="year"
            minDetail="decade"
            view="year"
          />
        </div>
      )}
    </div>
  );
}