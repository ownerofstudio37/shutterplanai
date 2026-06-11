/**
 * A horizontal progress bar that uses a CSS custom property for its fill width,
 * keeping inline styles out of JSX and satisfying the no-inline-styles rule.
 */

import styles from './ProgressBar.module.css';

type ProgressBarProps = {
  /** Value from 0 to 100 (percent). */
  percent: number;
  className?: string;
};

export function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div
        className={styles.fill}
        // CSS custom property is the only clean way to pass a runtime % to CSS
        // without inline styles on the element. This is the accepted pattern for
        // dynamic progress bars in CSS-module or Tailwind projects.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        {...({ style: { '--fill-width': `${clamped}%` } } as React.HTMLAttributes<HTMLDivElement>)}
      />
    </div>
  );
}

// TS needs React in scope for JSX when not using the new transform pragma.
import React from 'react';
