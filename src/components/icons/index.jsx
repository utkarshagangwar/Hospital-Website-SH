// Hand-drawn line-icon set for Shivaji Hospital — replaces the Material Icons
// ligature font and ad-hoc inline SVGs that were scattered across pages.
// Consistent grid, stroke weight, and rounded joins so the whole site reads
// as one authored icon system rather than a stock icon-font.

const base = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

function Svg({ size = 24, className, children, ...rest }) {
    return (
        <svg width={size} height={size} className={className} {...base} {...rest}>
            {children}
        </svg>
    );
}

export function Pulse(props) {
    // Cardiology — the hospital's own cardiac motif
    return (
        <Svg {...props}>
            <path d="M2 13h3.2l1.7-4.1 2.6 10.4 2-7.2 1.3 1.9h2.9l1.3-2.9 1.1 2.9H22" />
        </Svg>
    );
}

export function Stethoscope(props) {
    return (
        <Svg {...props}>
            <path d="M6 3.5v5.7a4.5 4.5 0 0 0 9 0V3.5" />
            <path d="M8 3.5H5.7M12.5 3.5h-2.3" />
            <path d="M15 9.2v2.4a4.7 4.7 0 1 1-4.9 4.7" />
            <circle cx="18.4" cy="7.6" r="1.4" />
        </Svg>
    );
}

export function Droplet(props) {
    return (
        <Svg {...props}>
            <path d="M12 3c3.6 3.9 6.5 7.5 6.5 10.8A6.5 6.5 0 0 1 5.5 13.8C5.5 10.5 8.4 6.9 12 3z" />
        </Svg>
    );
}

export function Calendar(props) {
    return (
        <Svg {...props}>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.6" />
            <path d="M3.5 9.7h17" />
            <path d="M8 3v3.4M16 3v3.4" />
            <path d="M8.2 14.3l1.9 1.9 4-4.2" />
        </Svg>
    );
}

export function Phone(props) {
    return (
        <Svg {...props}>
            <path d="M6.6 4.2c-1.3.7-2.2 2-2.2 3.6 0 6.6 6.2 12.1 12.5 12.1 1.7 0 3-1 3.7-2.2l-4.4-3.4-1.6 1.5c-1.9-1-3.7-2.7-4.6-4.6l1.5-1.6-3.3-4.4-1.6-1z" />
        </Svg>
    );
}

export function WhatsApp(props) {
    return (
        <Svg {...props} strokeWidth={1.6}>
            <path d="M7 20l-4 1 1.1-3.9A8.4 8.4 0 1 1 7 20z" />
            <path d="M8.5 8.6c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.5s.7 1.7.8 1.8c.1.2.1.4 0 .6-.1.2-.2.3-.4.5-.2.2-.4.4-.2.7.2.4.9 1.4 1.9 2.2 1.3 1.1 2.2 1.3 2.6 1.1.2-.1.4-.4.5-.7.1-.2.3-.3.5-.2.2.1 1.5.7 1.7.8.2.1.4.2.4.3 0 .2 0 .9-.4 1.4-.4.5-1.4 1-2.4.9-1.9-.2-4-1.2-5.5-2.9-1.1-1.2-1.8-2.5-2-3.8-.1-.9.1-1.7.5-2.2z" />
        </Svg>
    );
}

export function MapPin(props) {
    return (
        <Svg {...props}>
            <path d="M12 3.2c3.6 0 6.6 2.8 6.6 6.7 0 5.2-6.6 11.1-6.6 11.1S5.4 15.1 5.4 9.9c0-3.9 3-6.7 6.6-6.7z" />
            <circle cx="12" cy="9.7" r="2.4" />
        </Svg>
    );
}

export function ShieldCheck(props) {
    return (
        <Svg {...props}>
            <path d="M12 3.3l7 2.6v4.8c0 5-3.1 8.4-7 9.9-3.9-1.5-7-4.9-7-9.9V5.9l7-2.6z" />
            <path d="M9 12l2.3 2.3 4-4.3" />
        </Svg>
    );
}

export function Star(props) {
    return (
        <Svg {...props}>
            <path d="M12 3.4l2.3 4.9 5.3.6-4 3.7 1.1 5.3L12 15.2l-4.7 2.7 1.1-5.3-4-3.7 5.3-.6z" />
        </Svg>
    );
}

export function Heart(props) {
    return (
        <Svg {...props}>
            <path d="M12 20.2s-7.8-4.8-7.8-10.4A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 7.8 2.9c0 5.6-7.8 10.4-7.8 10.4z" />
        </Svg>
    );
}

export function Activity(props) {
    // distinct from Pulse — used for "facilities / modern equipment"
    return (
        <Svg {...props}>
            <path d="M4 20V13M9 20V8M14 20v-9M19 20v-5" />
        </Svg>
    );
}

export function Clock(props) {
    return (
        <Svg {...props}>
            <circle cx="12" cy="12" r="8.4" />
            <path d="M12 7.6V12l3 2" />
        </Svg>
    );
}

export function Mail(props) {
    return (
        <Svg {...props}>
            <rect x="3.2" y="5.5" width="17.6" height="13" rx="2.4" />
            <path d="M4.5 7l6.6 5a1.6 1.6 0 0 0 1.8 0l6.6-5" />
        </Svg>
    );
}

export function ChevronDown(props) {
    return (
        <Svg {...props}>
            <path d="M5.5 8.5l6.5 6.5 6.5-6.5" />
        </Svg>
    );
}

export function Menu(props) {
    return (
        <Svg {...props}>
            <path d="M4 7h16M4 12h16M4 17h16" />
        </Svg>
    );
}

export function Close(props) {
    return (
        <Svg {...props}>
            <path d="M6 6l12 12M18 6L6 18" />
        </Svg>
    );
}

export function UserCircle(props) {
    return (
        <Svg {...props}>
            <circle cx="12" cy="9" r="3.4" />
            <path d="M5.5 19c1.3-3 3.7-4.6 6.5-4.6s5.2 1.6 6.5 4.6" />
            <circle cx="12" cy="12" r="9" />
        </Svg>
    );
}

export function ArrowLeft(props) {
    return (
        <Svg {...props}>
            <path d="M19 12H5M11 6l-6 6 6 6" />
        </Svg>
    );
}

export function ArrowRight(props) {
    return (
        <Svg {...props}>
            <path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
    );
}

export function Facebook(props) {
    return (
        <Svg {...props}>
            <path d="M14.5 8.3h2.3V5.1h-2.8c-2.3 0-3.6 1.5-3.6 3.7v2.1H8.2v3.2h2.2V21h3.2v-6.9h2.4l.4-3.2h-2.8V9.2c0-.6.2-.9 1-.9z" />
        </Svg>
    );
}

export function Instagram(props) {
    return (
        <Svg {...props}>
            <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
            <circle cx="12" cy="12" r="3.6" />
            <circle cx="17" cy="7" r="0.6" fill="currentColor" />
        </Svg>
    );
}

export function FlaskConical(props) {
    return (
        <Svg {...props}>
            <path d="M9.5 3.5h5M10 3.5v5.6L5.7 17a2 2 0 0 0 1.8 2.9h9c1.5 0 2.5-1.6 1.8-2.9L14 9.1V3.5" />
            <path d="M8 14.5h8" />
        </Svg>
    );
}

export function Printer(props) {
    return (
        <Svg {...props}>
            <path d="M6.5 8.7V4.2h11v4.5" />
            <rect x="3.5" y="8.7" width="17" height="7.6" rx="1.8" />
            <path d="M6.5 14.3h11v5.5h-11z" />
        </Svg>
    );
}

export function Download(props) {
    return (
        <Svg {...props}>
            <path d="M12 3.5v11.6M8 11.4l4 4 4-4" />
            <path d="M4.5 17v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
        </Svg>
    );
}

export function ClipboardList(props) {
    return (
        <Svg {...props}>
            <rect x="5.5" y="4.7" width="13" height="16.3" rx="2.2" />
            <path d="M9 4.2h6a1 1 0 0 1 1 1v1.3h-8V5.2a1 1 0 0 1 1-1z" />
            <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
        </Svg>
    );
}

export function Check(props) {
    return (
        <Svg {...props}>
            <path d="M4.5 12.5l5 5 10-10.5" />
        </Svg>
    );
}

export function ImageIcon(props) {
    return (
        <Svg {...props}>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M4 17.5l5.3-5.3a1.6 1.6 0 0 1 2.3 0l2.6 2.6" />
            <path d="M13 15.8l2.2-2.2a1.6 1.6 0 0 1 2.3 0l2.5 2.5" />
        </Svg>
    );
}

export function Bolt(props) {
    return (
        <Svg {...props}>
            <path d="M12.5 3.2L5.8 13.6h4.6l-1 7.2 7.2-10.9h-4.7z" />
        </Svg>
    );
}

export function Lock(props) {
    return (
        <Svg {...props}>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
            <path d="M7.8 10.5V7.7a4.2 4.2 0 0 1 8.4 0v2.8" />
            <path d="M12 14.3v2.3" />
        </Svg>
    );
}

export function Eye(props) {
    return (
        <Svg {...props}>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.8" />
        </Svg>
    );
}

export function EyeOff(props) {
    return (
        <Svg {...props}>
            <path d="M3.5 3.5l17 17" />
            <path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a15.6 15.6 0 0 1-3.1 3.8M7.4 7.5C5 8.9 2.5 12 2.5 12s3.5 6 9.5 6a9.4 9.4 0 0 0 3-.5" />
            <path d="M9.7 10a2.8 2.8 0 0 0 4 4" />
        </Svg>
    );
}

export function LogIn(props) {
    return (
        <Svg {...props}>
            <path d="M11 4H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H11" />
            <path d="M15.5 16l4-4-4-4" />
            <path d="M19 12H9.5" />
        </Svg>
    );
}

export function Siren(props) {
    return (
        <Svg {...props}>
            <path d="M5 13.5a7 7 0 0 1 14 0V17H5v-3.5z" />
            <path d="M4 17h16M12 6.5V4M8.4 7.4L7 6M15.6 7.4L17 6" />
        </Svg>
    );
}
