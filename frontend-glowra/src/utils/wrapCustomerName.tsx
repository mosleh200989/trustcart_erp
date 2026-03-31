import React from 'react';

/**
 * Wraps a customer name so that each line has at most `maxLen` characters.
 * Breaks at word boundaries. Returns JSX with <br /> between lines.
 */
export function wrapCustomerName(name: string | null | undefined, maxLen = 12): React.ReactNode {
  if (!name) return '-';
  if (name.length <= maxLen) return name;

  const words = name.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine && (currentLine + ' ' + word).length > maxLen) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}
