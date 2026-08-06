import React from 'react';

export function Button({ className = '', variant = 'default', size = 'default', children, ...props }) {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-12 rounded-xl px-8 text-base',
    icon: 'h-9 w-9',
  };

  const style = `${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;
  
  return (
    <button className={style} {...props}>
      {children}
    </button>
  );
}
