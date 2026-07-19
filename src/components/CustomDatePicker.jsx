'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ArrowLeft, ArrowRight } from '@/components/icons';
import { useFloatingPosition } from '@/utils/useFloatingPosition';
import './CustomDatePicker.css';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseISODate(value) {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Fixed 6-week (42-cell) grid so the panel never changes height between months.
// Date's own month/day rollover does the leading/trailing-day math for us.
function buildCalendarCells(year, month) {
    const startWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(year, month, i - startWeekday + 1);
        cells.push({ date, inMonth: date.getMonth() === month });
    }
    return cells;
}

// Same look and interaction language as CustomSelect: a trigger button plus
// a self-drawn popover, so the calendar renders in the site's own design
// instead of the browser's native date-input picker.
export default function CustomDatePicker({
    id,
    value,
    onChange,
    placeholder = 'Select a date',
    disabled = false,
}) {
    const selectedDate = parseISODate(value);
    const today = new Date();
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(selectedDate || today);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const reactId = useId();
    const triggerId = id || reactId;
    const floatingStyle = useFloatingPosition(isOpen, triggerRef, panelRef);

    useEffect(() => {
        if (!isOpen) return;
        // Always open showing the selected month (or the current one)
        setViewDate(selectedDate || today);

        // The panel renders through a portal (see below), so it's no longer
        // a DOM descendant of rootRef — it must be checked separately or
        // every click inside it (a day cell, "Today", "Clear") would look
        // like an outside click and close the panel before that click lands.
        const handleClickOutside = (e) => {
            if (rootRef.current?.contains(e.target)) return;
            if (panelRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const cells = buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth());
    const monthLabel = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const goToMonth = (delta) => {
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const selectDay = (date) => {
        onChange(toISODate(date));
        setIsOpen(false);
    };

    const handlePanelKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    return (
        <div className={`custom-date-root${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
            <button
                type="button"
                id={triggerId}
                ref={triggerRef}
                className="custom-date-trigger"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
            >
                <Calendar size={16} className="custom-date-icon" />
                <span className={`custom-date-value${!selectedDate ? ' is-placeholder' : ''}`}>
                    {selectedDate
                        ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : placeholder}
                </span>
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={panelRef}
                    className="custom-date-panel"
                    role="dialog"
                    aria-label="Choose a date"
                    onKeyDown={handlePanelKeyDown}
                    // Positioned via useFloatingPosition (portaled to <body>,
                    // so it can't be clipped by an ancestor's overflow, and
                    // its top/left are clamped to the viewport instead of
                    // running off-screen). Hidden until the first real
                    // measurement lands so it never flashes at (0, 0).
                    style={floatingStyle || { visibility: 'hidden', position: 'fixed', top: 0, left: 0 }}
                >
                    <div className="custom-date-panel-header">
                        <button type="button" className="custom-date-nav-btn" onClick={() => goToMonth(-1)} aria-label="Previous month">
                            <ArrowLeft size={15} />
                        </button>
                        <span className="custom-date-month-label">{monthLabel}</span>
                        <button type="button" className="custom-date-nav-btn" onClick={() => goToMonth(1)} aria-label="Next month">
                            <ArrowRight size={15} />
                        </button>
                    </div>

                    <div className="custom-date-weekdays">
                        {WEEKDAY_LABELS.map((label) => (
                            <span key={label}>{label}</span>
                        ))}
                    </div>

                    <div className="custom-date-grid">
                        {cells.map(({ date, inMonth }) => {
                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, today);
                            return (
                                <button
                                    type="button"
                                    key={date.toISOString()}
                                    className={[
                                        'custom-date-cell',
                                        !inMonth ? 'is-outside' : '',
                                        isSelected ? 'is-selected' : '',
                                        isToday && !isSelected ? 'is-today' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => selectDay(date)}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="custom-date-panel-footer">
                        <button type="button" className="custom-date-today-btn" onClick={() => selectDay(today)}>Today</button>
                        {value && (
                            <button
                                type="button"
                                className="custom-date-clear-btn"
                                onClick={() => { onChange(''); setIsOpen(false); }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
