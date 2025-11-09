interface IconProps {
  className?: string;
}

export function SaveMoneyIcon({ className = "w-8 h-8" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 8.5C14.5 8.5 13.5 7 12 7C10.5 7 9 8 9 9.5C9 11.5 12 11.5 12 13.5C12 15 10.5 16 9 16C7.5 16 6.5 14.5 6.5 14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5V7M12 16V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
