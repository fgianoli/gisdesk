interface RichTextDisplayProps {
  html: string;
  className?: string;
}

export default function RichTextDisplay({ html, className = '' }: RichTextDisplayProps) {
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
