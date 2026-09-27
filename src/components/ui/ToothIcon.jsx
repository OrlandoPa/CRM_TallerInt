// Marca de la clínica: diente con el mismo trazo que los íconos de lucide-react
function ToothIcon({ size = 18, strokeWidth = 1.75, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M7 3C4.8 3 3 4.8 3 7.2c0 2.3.9 3.6 1.5 5.3.6 1.8.7 3.4 1.1 5.6.3 1.7.9 2.9 2 2.9 1.4 0 1.7-1.8 2.1-3.6.3-1.3.7-2.4 2.3-2.4s2 1.1 2.3 2.4c.4 1.8.7 3.6 2.1 3.6 1.1 0 1.7-1.2 2-2.9.4-2.2.5-3.8 1.1-5.6.6-1.7 1.5-3 1.5-5.3C21 4.8 19.2 3 17 3c-1.9 0-3 1-5 1S8.9 3 7 3Z" />
    </svg>
  );
}

export default ToothIcon;
