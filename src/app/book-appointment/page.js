'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { addAppointment, initializeData, getAppointments } from '@/utils/hospitalData';
import { jsPDF } from 'jspdf';

export default function BookAppointment() {
    const [hospitalData, setHospitalData] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [bookingDetails, setBookingDetails] = useState(null);
    const [existingAppointments, setExistingAppointments] = useState([]);
    const timeoutRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        gender: '',
        doctor: '',
        date: '',
        timeSlot: '',
        visitType: 'New',
        reason: '',
    });

    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const data = initializeData();
        setHospitalData(data);
        const appointments = getAppointments();
        setExistingAppointments(appointments);
    }, []);

    const formatTime = (time24) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${hour12}:${minutes} ${period}`;
    };

    const isTimeSlotBooked = (timeSlot, date, doctorId) => {
        return existingAppointments.some(apt =>
            apt.date === date &&
            apt.time === timeSlot
        );
    };

    const generateTimeSlots = (opdSchedule, selectedDate) => {
        if (!opdSchedule) return [];

        const slots = [];
        const { morningSlot, eveningSlot } = opdSchedule;

        if (morningSlot && morningSlot.start && morningSlot.end) {
            const [startHour, startMin] = morningSlot.start.split(':').map(Number);
            const [endHour, endMin] = morningSlot.end.split(':').map(Number);

            let currentHour = startHour;
            let currentMin = startMin;

            while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
                const time24 = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
                const formattedTime = formatTime(time24);
                const isBooked = selectedDate ? isTimeSlotBooked(formattedTime, selectedDate, formData.doctor) : false;

                slots.push({
                    value: formattedTime,
                    label: `${formattedTime} (Morning)`,
                    period: 'Morning',
                    disabled: isBooked
                });

                currentMin += 30;
                if (currentMin >= 60) {
                    currentMin = 0;
                    currentHour++;
                }
            }
        }

        if (eveningSlot && eveningSlot.start && eveningSlot.end) {
            const [startHour, startMin] = eveningSlot.start.split(':').map(Number);
            const [endHour, endMin] = eveningSlot.end.split(':').map(Number);

            let currentHour = startHour;
            let currentMin = startMin;

            while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
                const time24 = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
                const formattedTime = formatTime(time24);
                const isBooked = selectedDate ? isTimeSlotBooked(formattedTime, selectedDate, formData.doctor) : false;

                slots.push({
                    value: formattedTime,
                    label: `${formattedTime} (Evening)`,
                    period: 'Evening',
                    disabled: isBooked
                });

                currentMin += 30;
                if (currentMin >= 60) {
                    currentMin = 0;
                    currentHour++;
                }
            }
        }

        return slots;
    };

    const isDateAvailable = (dateString) => {
        if (!selectedDoctor) return false;

        const schedule = selectedDoctor.opdSchedule || {
            workingDays: [1, 2, 3, 4, 5, 6]
        };

        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = date.getDay();

        return schedule.workingDays.includes(dayOfWeek);
    };

    const getAvailableDates = () => {
        if (!selectedDoctor) return [];

        const schedule = selectedDoctor.opdSchedule || {
            workingDays: [1, 2, 3, 4, 5, 6],
            morningSlot: { start: '09:00', end: '14:00' },
            eveningSlot: { start: '17:00', end: '20:00' }
        };

        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 90; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            if (schedule.workingDays.includes(dayOfWeek)) {
                dates.push({
                    value: dateString,
                    label: date.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    dayOfWeek: dayOfWeek
                });
            }
        }

        return dates;
    };

    const handleDoctorChange = (doctorId) => {
        const doctor = hospitalData?.doctors.find(d => d.id === parseInt(doctorId));
        console.log('Selected doctor:', doctor);
        console.log('Doctor schedule:', doctor?.opdSchedule);
        setSelectedDoctor(doctor);
        setFormData({ ...formData, doctor: doctorId, timeSlot: '', date: '' });
        setAvailableTimeSlots([]);
    };

    const handleDateChange = (selectedDate) => {
        setFormData({ ...formData, date: selectedDate, timeSlot: '' });

        if (selectedDoctor) {
            const schedule = selectedDoctor.opdSchedule || {
                workingDays: [1, 2, 3, 4, 5, 6],
                morningSlot: { start: '09:00', end: '14:00' },
                eveningSlot: { start: '17:00', end: '20:00' }
            };

            const slots = generateTimeSlots(schedule, selectedDate);
            setAvailableTimeSlots(slots);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isDateAvailable(formData.date)) {
            alert('Doctor is not available on the selected date. Please choose another date.');
            return;
        }

        if (isTimeSlotBooked(formData.timeSlot, formData.date, formData.doctor)) {
            alert('This time slot is already booked. Please select another time.');
            return;
        }

        addAppointment({
            patient: formData.name,
            date: formData.date,
            time: formData.timeSlot,
            type: formData.reason || 'General Consultation',
            fees: 300,
            paid: 0,
            doctorId: formData.doctor
        });

        setBookingDetails({
            name: formData.name,
            mobile: formData.mobile,
            doctor: selectedDoctor.name,
            date: new Date(formData.date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            time: formData.timeSlot,
            type: formData.visitType,
            reason: formData.reason || 'General Consultation'
        });

        setSubmitted(true);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleCloseConfirmation();
        }, 30000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCloseConfirmation = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSubmitted(false);
        setBookingDetails(null);
        setFormData({
            name: '',
            mobile: '',
            gender: '',
            doctor: '',
            date: '',
            timeSlot: '',
            visitType: 'New',
            reason: '',
        });
        setSelectedDoctor(null);
        setAvailableTimeSlots([]);
        const appointments = getAppointments();
        setExistingAppointments(appointments);
    };

    const generateReceiptHTML = () => {
        if (!bookingDetails) return '';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Appointment Receipt - Shivaji Hospital</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a2e; background: #fff; }
                    .receipt { max-width: 500px; margin: 0 auto; border: 2px solid #14b8a6; border-radius: 16px; padding: 32px; }
                    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #14b8a6; padding-bottom: 20px; }
                    .header h1 { color: #14b8a6; font-size: 22px; margin-bottom: 4px; }
                    .header p { color: #666; font-size: 13px; }
                    .success-title { text-align: center; margin-bottom: 20px; }
                    .success-title h2 { color: #14b8a6; font-size: 18px; }
                    .details { margin-bottom: 20px; }
                    .details h3 { font-size: 16px; margin-bottom: 12px; color: #1a1a2e; }
                    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #666; font-weight: 500; }
                    .value { color: #1a1a2e; font-weight: 600; text-align: right; }
                    .fee { margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb; }
                    .fee .value { color: #14b8a6; font-size: 18px; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
                    .footer p { color: #666; font-size: 12px; margin-bottom: 4px; }
                    @media print { body { padding: 20px; } .receipt { border: 1px solid #ccc; } }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <h1>Shivaji Hospital</h1>
                        <p>Appointment Receipt</p>
                    </div>
                    <div class="success-title">
                        <h2>✓ Appointment Confirmed</h2>
                    </div>
                    <div class="details">
                        <h3>Booking Details</h3>
                        <div class="row"><span class="label">Patient Name:</span><span class="value">${bookingDetails.name}</span></div>
                        <div class="row"><span class="label">Mobile Number:</span><span class="value">${bookingDetails.mobile}</span></div>
                        <div class="row"><span class="label">Doctor:</span><span class="value">${bookingDetails.doctor}</span></div>
                        <div class="row"><span class="label">Date:</span><span class="value">${bookingDetails.date}</span></div>
                        <div class="row"><span class="label">Time:</span><span class="value">${bookingDetails.time}</span></div>
                        <div class="row"><span class="label">Visit Type:</span><span class="value">${bookingDetails.type}</span></div>
                        <div class="row"><span class="label">Reason:</span><span class="value">${bookingDetails.reason}</span></div>
                        <div class="row fee"><span class="label">Consultation Fee:</span><span class="value">₹300</span></div>
                    </div>
                    <div class="footer">
                        <p><strong>Note:</strong> Please arrive 10 minutes before your scheduled time.</p>
                        <p>For any changes, call us at 9044952554</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const handlePrintReceipt = () => {
        const receiptWindow = window.open('', '_blank', 'width=600,height=700');
        if (receiptWindow) {
            receiptWindow.document.write(generateReceiptHTML());
            receiptWindow.document.close();
            setTimeout(() => { receiptWindow.print(); }, 300);
        }
    };

    const handleDownloadReceipt = () => {
        if (!bookingDetails) return;

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 25;

        // Border
        doc.setDrawColor(20, 184, 166);
        doc.setLineWidth(0.8);
        doc.roundedRect(margin - 5, 15, contentWidth + 10, 175, 4, 4, 'S');

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(20, 184, 166);
        doc.text('Shivaji Hospital', pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Appointment Receipt', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.setDrawColor(20, 184, 166);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Confirmed badge - draw a checkmark circle
        const circleX = pageWidth / 2 - 30;
        const circleY = y - 1;
        const circleR = 4;
        doc.setFillColor(20, 184, 166);
        doc.circle(circleX, circleY, circleR, 'F');
        // Draw checkmark inside the circle
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.line(circleX - 1.5, circleY, circleX - 0.3, circleY + 1.5);
        doc.line(circleX - 0.3, circleY + 1.5, circleX + 2, circleY - 1.5);
        // Text next to checkmark
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 184, 166);
        doc.text('Appointment Confirmed', circleX + circleR + 3, y);
        y += 12;

        // Booking Details header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(26, 26, 46);
        doc.text('Booking Details', margin, y);
        y += 8;

        // Detail rows
        const details = [
            ['Patient Name', bookingDetails.name],
            ['Mobile Number', bookingDetails.mobile],
            ['Doctor', bookingDetails.doctor],
            ['Date', bookingDetails.date],
            ['Time', bookingDetails.time],
            ['Visit Type', bookingDetails.type],
            ['Reason', bookingDetails.reason],
        ];

        doc.setFontSize(11);
        details.forEach(([label, value]) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(label + ':', margin, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(26, 26, 46);
            doc.text(value || '-', pageWidth - margin, y, { align: 'right' });
            y += 3;
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.2);
            doc.line(margin, y, pageWidth - margin, y);
            y += 7;
        });

        // Fee row
        y += 2;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, y - 4, pageWidth - margin, y - 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(12);
        doc.text('Consultation Fee:', margin, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 184, 166);
        doc.setFontSize(14);
        doc.text('Rs. 300', pageWidth - margin, y, { align: 'right' });
        y += 12;

        // Footer note
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Note: Please arrive 10 minutes before your scheduled time.', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('For any changes, call us at 9044952554', pageWidth / 2, y, { align: 'center' });

        // Save
        const fileName = `Receipt_${bookingDetails.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    if (!hospitalData) {
        return <div>Loading...</div>;
    }

    const getDayName = (dayNumber) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayNumber];
    };

    const availableDates = getAvailableDates();

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container" style={{ maxWidth: '700px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-4">Book an Appointment</h1>
                    <p className="text-center text-secondary mb-6">
                        Fill out the form below and we'll get back to you shortly to confirm your appointment.
                    </p>

                    {submitted && bookingDetails && (
                        <div className="success-card card" style={{ marginBottom: 'var(--space-6)' }}>
                            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                                <div className="success-icon">✓</div>
                                <h2 style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-2)' }}>
                                    Appointment Booked Successfully!
                                </h2>
                                <p className="text-secondary">
                                    Your appointment has been confirmed. We'll contact you shortly.
                                </p>
                            </div>

                            <div className="booking-details">
                                <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>
                                    Booking Details
                                </h3>
                                <div className="detail-row">
                                    <span className="detail-label">Patient Name:</span>
                                    <span className="detail-value">{bookingDetails.name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Mobile Number:</span>
                                    <span className="detail-value">{bookingDetails.mobile}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Doctor:</span>
                                    <span className="detail-value">{bookingDetails.doctor}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Date:</span>
                                    <span className="detail-value">{bookingDetails.date}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Time:</span>
                                    <span className="detail-value">{bookingDetails.time}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Visit Type:</span>
                                    <span className="detail-value">{bookingDetails.type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Reason:</span>
                                    <span className="detail-value">{bookingDetails.reason}</span>
                                </div>
                                <div className="detail-row" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                                    <span className="detail-label">Consultation Fee:</span>
                                    <span className="detail-value" style={{ fontWeight: '600', color: 'var(--color-teal)' }}>₹300</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-accent-blue)', borderRadius: 'var(--radius-lg)' }}>
                                <p className="text-secondary" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                                    <strong>Note:</strong> Please arrive 10 minutes before your scheduled time.
                                    For any changes, call us at <a href="tel:9044952554" style={{ color: 'var(--color-teal)' }}>9044952554</a>
                                </p>
                            </div>

                            <div className="receipt-actions">
                                <button type="button" className="btn-receipt btn-print" onClick={handlePrintReceipt}>
                                    <span className="btn-receipt-icon">🖨️</span> Print Receipt
                                </button>
                                <button type="button" className="btn-receipt btn-download" onClick={handleDownloadReceipt}>
                                    <span className="btn-receipt-icon">📥</span> Download Receipt
                                </button>
                                <button type="button" className="btn-receipt btn-close-confirm" onClick={handleCloseConfirmation}>
                                    <span className="btn-receipt-icon">📋</span> Book Another
                                </button>
                            </div>
                        </div>
                    )}

                    {!submitted && (
                        <div className="card appointment-form-card">
                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="name">Full Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="mobile">Mobile Number *</label>
                                        <input
                                            type="tel"
                                            id="mobile"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleChange}
                                            pattern="[0-9]{10}"
                                            placeholder="10-digit mobile number"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="gender">Gender</label>
                                        <div className="custom-select">
                                            <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="visitType">Visit Type *</label>
                                        <div className="custom-select">
                                            <select id="visitType" name="visitType" value={formData.visitType} onChange={handleChange} required>
                                                <option value="New">New Patient</option>
                                                <option value="Follow-up">Follow-up</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="doctor">Select Doctor *</label>
                                    <div className="custom-select">
                                        <select
                                            id="doctor"
                                            name="doctor"
                                            value={formData.doctor}
                                            onChange={(e) => handleDoctorChange(e.target.value)}
                                            required
                                        >
                                            <option value="">Choose a doctor</option>
                                            {hospitalData.doctors.map((doctor) => (
                                                <option key={doctor.id} value={doctor.id}>
                                                    {doctor.name} - {doctor.specializations.join(', ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedDoctor && (
                                        <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--color-accent-blue)', borderRadius: 'var(--radius-lg)' }}>
                                            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', margin: 0, marginBottom: 'var(--space-1)' }}>
                                                <strong>Available Days:</strong> {selectedDoctor.opdSchedule ? selectedDoctor.opdSchedule.workingDays.map(day => getDayName(day)).join(', ') : 'Mon-Sat'}
                                            </p>
                                            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                                                <strong>OPD Hours:</strong> {
                                                    selectedDoctor.opdSchedule ?
                                                        `${formatTime(selectedDoctor.opdSchedule.morningSlot?.start || '09:00')} - ${formatTime(selectedDoctor.opdSchedule.morningSlot?.end || '14:00')}, ${formatTime(selectedDoctor.opdSchedule.eveningSlot?.start || '17:00')} - ${formatTime(selectedDoctor.opdSchedule.eveningSlot?.end || '20:00')}`
                                                        : selectedDoctor.opdHours || '9 AM - 2 PM, 5 PM - 8 PM'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="date">Preferred Date *</label>
                                        <div className="custom-select">
                                            <select
                                                id="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                disabled={!selectedDoctor || availableDates.length === 0}
                                                required
                                            >
                                                <option value="">Select a date</option>
                                                {availableDates.map((date) => (
                                                    <option key={date.value} value={date.value}>
                                                        {date.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {!selectedDoctor && (
                                            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                                                Please select a doctor first
                                            </p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="timeSlot">Preferred Time Slot *</label>
                                        <div className="custom-select">
                                            <select
                                                id="timeSlot"
                                                name="timeSlot"
                                                value={formData.timeSlot}
                                                onChange={handleChange}
                                                disabled={!formData.date || availableTimeSlots.length === 0}
                                                required
                                            >
                                                <option value="">Select time slot</option>
                                                {availableTimeSlots.map((slot, index) => (
                                                    <option
                                                        key={index}
                                                        value={slot.value}
                                                        disabled={slot.disabled}
                                                    >
                                                        {slot.label} {slot.disabled ? '(Booked)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {!formData.date && (
                                            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                                                Please select a date first
                                            </p>
                                        )}
                                        {formData.date && availableTimeSlots.length === 0 && (
                                            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', color: '#f44336' }}>
                                                No time slots available. Please update doctor's OPD schedule in admin panel.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reason">Reason for Visit</label>
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="Briefly describe your symptoms or reason for consultation..."
                                    ></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 'var(--space-3)' }}>
                                    Submit Appointment Request
                                </button>

                                <p className="text-secondary text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
                                    For urgent matters, please call us directly at <a href="tel:9044952554">9044952554</a>
                                </p>
                            </form>
                        </div>
                    )}
                </div>
            </section>

            <style jsx>{`
                .receipt-actions {
                    display: flex;
                    gap: var(--space-3);
                    margin-top: var(--space-4);
                    flex-wrap: wrap;
                }

                .btn-receipt {
                    flex: 1;
                    min-width: 140px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-lg);
                    font-weight: 600;
                    font-size: var(--text-sm);
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s ease;
                }

                .btn-receipt:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-md);
                }

                .btn-receipt:active {
                    transform: translateY(0);
                }

                .btn-receipt-icon {
                    font-size: var(--text-base);
                }

                .btn-print {
                    background: var(--color-teal);
                    color: white;
                }

                .btn-print:hover {
                    background: #0d9488;
                }

                .btn-download {
                    background: white;
                    color: var(--color-teal);
                    border-color: var(--color-teal);
                }

                .btn-download:hover {
                    background: #f0fdfa;
                }

                .btn-close-confirm {
                    background: white;
                    color: var(--color-text-secondary);
                    border-color: var(--color-border);
                }

                .btn-close-confirm:hover {
                    background: #f5f5f5;
                    color: var(--color-text-primary);
                }

                .appointment-form-card {
                    padding: var(--space-8);
                }

                .success-card {
                    background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
                    border: 2px solid var(--color-teal);
                    padding: var(--space-6);
                }

                .success-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--color-teal);
                    color: white;
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 48px;
                    margin: 0 auto var(--space-3);
                    box-shadow: var(--shadow-lg);
                }

                .booking-details {
                    background: white;
                    padding: var(--space-4);
                    border-radius: var(--radius-lg);
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-2) 0;
                    border-bottom: 1px solid var(--color-border);
                }

                .detail-row:last-child {
                    border-bottom: none;
                }

                .detail-label {
                    color: var(--color-text-secondary);
                    font-weight: 500;
                }

                .detail-value {
                    color: var(--color-text-primary);
                    font-weight: 600;
                    text-align: right;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                @media (max-width: 768px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    
                    .appointment-form-card {
                        padding: var(--space-4);
                    }

                    .detail-row {
                        flex-direction: column;
                        gap: var(--space-1);
                    }

                    .detail-value {
                        text-align: left;
                    }
                }

                .custom-select {
                    position: relative;
                }

                .custom-select::after {
                    content: '▼';
                    position: absolute;
                    right: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: var(--color-teal);
                    font-size: var(--text-sm);
                }

                .custom-select select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    width: 100%;
                    padding-right: var(--space-8);
                    cursor: pointer;
                    background: var(--color-white);
                }

                .custom-select select:disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                input:focus,
                select:focus,
                textarea:focus {
                    border-color: var(--color-teal);
                    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
                    outline: none;
                }

                .form-group label {
                    font-weight: 600;
                    color: var(--color-text-primary);
                    margin-bottom: var(--space-2);
                }
            `}</style>
        </div>
    );
}
