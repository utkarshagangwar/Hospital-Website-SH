'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from '@/components/icons';
import { useFloatingPosition } from '@/utils/useFloatingPosition';
import './CustomTimePicker.css';

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // :00, :05, ... :55
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const PERIODS = ['AM', 'PM'];

// value/onChange use 24-hour "HH:mm" (same shape a native <input type="time"> produces)
function parseTime(value) {
    if (!value) return null;
    const [hStr, mStr] = value.split(':');
    const hour24 = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);
    if (Number.isNaN(hour24) || Number.isNaN(minute)) return null;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, period };
}

function toValue(hour12, minute, period) {
    let hour24 = hour12 % 12;
    if (period === 'PM') hour24 += 12;
    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplay(hour12, minute, period) {
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

// Same trigger + self-drawn popover pattern as CustomSelect/CustomDatePicker,
// but time needs three independent parts, so each column commits its own
// change immediately without closing the panel (closing after every click
// would force reopening it three times to set one time).
export default function CustomTimePicker({
    id,
    value,
    onChange,
    placeholder = 'Select a time',
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const reactId = useId();
    const triggerId = id || reactId;
    const floatingStyle = useFloatingPosition(isOpen, triggerRef, panelRef);

    const parsed = parseTime(value);
    const hour12 = parsed?.hour12 ?? 9;
    const minute = parsed?.minute ?? 0;
    const period = parsed?.period ?? 'AM';

    useEffect(() => {
        if (!isOpen) return;
        // Portaled panel is no longer a DOM descendant of rootRef — must be
        // checked separately, or every click inside it counts as "outside".
        const handleClickOutside = (e) => {
            if (rootRef.current?.contains(e.target)) return;
            if (panelRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const commit = (nextHour, nextMinute, nextPeriod) => {
        onChange(toValue(nextHour, nextMinute, nextPeriod));
    };

    const handlePanelKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    return (
        <div className={`custom-time-root${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
            <button
                type="button"
                id={triggerId}
                ref={triggerRef}
                className="custom-time-trigger"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
            >
                <Clock size={16} className="custom-time-icon" />
                <span className={`custom-time-value${!parsed ? ' is-placeholder' : ''}`}>
                    {parsed ? formatDisplay(hour12, minute, period) : placeholder}
                </span>
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={panelRef}
                    className="custom-time-panel"
                    role="dialog"
                    aria-label="Choose a time"
                    onKeyDown={handlePanelKeyDown}
                    style={floatingStyle || { visibility: 'hidden', position: 'fixed', top: 0, left: 0 }}
                >
                    <div className="custom-time-columns">
                        <div className="custom-time-col">
                            {HOURS.map((h) => (
                                <button
                                    type="button"
                                    key={h}
                                    className={`custom-time-cell${h === hour12 ? ' is-selected' : ''}`}
                                    onClick={() => commit(h, minute, period)}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                        <div className="custom-time-col">
                            {MINUTES.map((m) => (
                                <button
                                    type="button"
                                    key={m}
                                    className={`custom-time-cell${m === minute ? ' is-selected' : ''}`}
                                    onClick={() => commit(hour12, m, period)}
                                >
                                    {String(m).padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                        <div className="custom-time-col custom-time-col-period">
                            {PERIODS.map((p) => (
                                <button
                                    type="button"
                                    key={p}
                                    className={`custom-time-cell${p === period ? ' is-selected' : ''}`}
                                    onClick={() => commit(hour12, minute, p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="custom-time-panel-footer">
                        <button type="button" className="custom-time-done-btn" onClick={() => setIsOpen(false)}>Done</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
