/**
 * WhatsApp default profile picture — exact match to the current WhatsApp design:
 * Light grey circle, white head, white rounded shoulders with subtle inner shadow.
 */
export default function DefaultAvatar({ size = '100%' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="100" fill="#adb5bd" />

      {/* Head */}
      <circle cx="100" cy="75" r="32" fill="white" />

      {/* Shoulders / body — rounded trapezoid clipped to circle */}
      <clipPath id="wa-clip">
        <circle cx="100" cy="100" r="100" />
      </clipPath>
      <ellipse cx="100" cy="170" rx="52" ry="38" fill="white" clipPath="url(#wa-clip)" />

      {/* Subtle shadow under head onto body — matches the soft drop shadow in the image */}
      <ellipse cx="103" cy="109" rx="28" ry="6" fill="rgba(0,0,0,0.08)" clipPath="url(#wa-clip)" />
    </svg>
  );
}
