// Hospital Data Management Utility
// This manages all dynamic hospital data using localStorage

const DEFAULT_DATA = {
    opdHours: {
        weekdays: "Monday - Friday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM",
        saturday: "Saturday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM",
        sunday: "Sunday: Closed"
    },
    contact: {
        phone: "9044952554",
        whatsapp: "9044952554",
        email: "shivajiheartcare@gmail.com",
        address: "1/16, Awas Vikas, Farrukhabad, Uttar Pradesh"
    },
    services: [
        {
            id: 1,
            name: "Cardiology",
            description: "Expert cardiac care with advanced diagnostics including ECG, Echo, and stress tests.",
            icon: "/images/cardiology.png"
        },
        {
            id: 2,
            name: "Diabetes Care",
            description: "Comprehensive diabetes management with personalized treatment plans and regular monitoring.",
            icon: null
        },
        {
            id: 3,
            name: "General Medicine",
            description: "Complete healthcare services for common illnesses and preventive care.",
            icon: null
        }
    ],
    doctors: [
        {
            id: 1,
            name: "Dr. Varun Gangwar",
            qualifications: ["MBBS", "PG", "DIP-CARD", "Certified Diabetes Course"],
            specializations: ["Cardiology", "Diabetes Care", "General Medicine"],
            image: "/images/doctor.png",
            opdHours: "Mon-Sat: 9 AM - 2 PM, 5 PM - 8 PM",
            opdSchedule: {
                workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
                morningSlot: { start: "09:00", end: "14:00" }, // 9 AM - 2 PM
                eveningSlot: { start: "17:00", end: "20:00" }  // 5 PM - 8 PM
            }
        }
    ],
    appointments: [
        {
            id: 1,
            patient: "Rajesh Kumar",
            date: "2024-11-23",
            time: "10:00 AM",
            type: "Cardiology",
            fees: 500,
            paid: 500,
            status: "Confirmed"
        },
        {
            id: 2,
            patient: "Priya Sharma",
            date: "2024-11-23",
            time: "11:30 AM",
            type: "Diabetes Care",
            fees: 400,
            paid: 0,
            status: "Pending"
        },
        {
            id: 3,
            patient: "Amit Patel",
            date: "2024-11-24",
            time: "09:00 AM",
            type: "General Medicine",
            fees: 300,
            paid: 300,
            status: "Confirmed"
        },
        {
            id: 4,
            patient: "Sunita Devi",
            date: "2024-11-24",
            time: "02:00 PM",
            type: "Cardiology",
            fees: 500,
            paid: 200,
            status: "Partial"
        }
    ]
};

const STORAGE_KEY = 'shivaji_hospital_data';

// Initialize data if not exists
export const initializeData = () => {
    if (typeof window === 'undefined') return DEFAULT_DATA;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
        return DEFAULT_DATA;
    }
    return JSON.parse(stored);
};

// Get all hospital data
export const getHospitalData = () => {
    if (typeof window === 'undefined') return DEFAULT_DATA;

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_DATA;
};

// Update OPD Hours
export const updateOpdHours = (opdHours) => {
    const data = getHospitalData();
    data.opdHours = opdHours;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
};

// Update Contact Information
export const updateContact = (contact) => {
    const data = getHospitalData();
    data.contact = contact;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
};

// Services Management
export const getServices = () => {
    const data = getHospitalData();
    return data.services || [];
};

export const addService = (service) => {
    const data = getHospitalData();
    const newService = {
        ...service,
        id: Date.now()
    };
    data.services.push(newService);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newService;
};

export const updateService = (id, updates) => {
    const data = getHospitalData();
    const index = data.services.findIndex(s => s.id === id);
    if (index !== -1) {
        data.services[index] = { ...data.services[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data.services[index];
    }
    return null;
};

export const deleteService = (id) => {
    const data = getHospitalData();
    data.services = data.services.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.services;
};

// Doctors Management
export const getDoctors = () => {
    const data = getHospitalData();
    return data.doctors || [];
};

export const addDoctor = (doctor) => {
    const data = getHospitalData();
    const newDoctor = {
        ...doctor,
        id: Date.now()
    };
    data.doctors.push(newDoctor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newDoctor;
};

export const updateDoctor = (id, updates) => {
    const data = getHospitalData();
    const index = data.doctors.findIndex(d => d.id === id);
    if (index !== -1) {
        data.doctors[index] = { ...data.doctors[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data.doctors[index];
    }
    return null;
};

export const deleteDoctor = (id) => {
    const data = getHospitalData();
    data.doctors = data.doctors.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.doctors;
};

// Appointments Management
export const getAppointments = () => {
    const data = getHospitalData();
    return data.appointments || [];
};

export const addAppointment = (appointment) => {
    const data = getHospitalData();
    // Map paymentStatus dropdown values to display labels
    const statusMap = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled' };
    let status;
    if (appointment.paymentStatus && statusMap[appointment.paymentStatus]) {
        status = statusMap[appointment.paymentStatus];
    } else {
        status = appointment.paid >= appointment.fees ? 'Confirmed' :
            appointment.paid > 0 ? 'Partial' : 'Pending';
    }
    const newAppointment = {
        ...appointment,
        id: Date.now(),
        status
    };
    if (!data.appointments) {
        data.appointments = [];
    }
    data.appointments.push(newAppointment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newAppointment;
};

export const updateAppointment = (id, updates) => {
    const data = getHospitalData();
    const index = data.appointments.findIndex(a => a.id === id);
    if (index !== -1) {
        const updated = { ...data.appointments[index], ...updates };
        // Map paymentStatus dropdown values to display labels
        const statusMap = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled' };
        if (updated.paymentStatus && statusMap[updated.paymentStatus]) {
            updated.status = statusMap[updated.paymentStatus];
        } else {
            // Auto-update status based on payment
            if (updated.paid >= updated.fees) {
                updated.status = 'Confirmed';
            } else if (updated.paid > 0) {
                updated.status = 'Partial';
            } else {
                updated.status = 'Pending';
            }
        }
        data.appointments[index] = updated;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data.appointments[index];
    }
    return null;
};

export const deleteAppointment = (id) => {
    const data = getHospitalData();
    data.appointments = data.appointments.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.appointments;
};

// Reset to defaults
export const resetToDefaults = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return DEFAULT_DATA;
};
