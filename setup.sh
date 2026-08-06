#!/bin/bash
# AuctionPro - One-click setup & start script
# Run this from the auctionpro/ root folder in Git Bash / VS Code terminal

set -e
echo "=============================="
echo "  AuctionPro Setup Starting"
echo "=============================="

# ---------- BACKEND ----------
echo ""
echo "[1/4] Setting up Python backend..."
cd backend

python -m venv .venv
source .venv/Scripts/activate

pip install --quiet fastapi uvicorn motor "pydantic[email]" python-dotenv \
    bcrypt pyjwt stripe python-socketio python-multipart \
    python-jose passlib requests

# Ensure JWT_SECRET is set in .env
if ! grep -q "^JWT_SECRET=" .env 2>/dev/null; then
  echo "" >> .env
  echo "JWT_SECRET=local-dev-secret-change-in-production" >> .env
  echo "  -> Added JWT_SECRET to backend/.env"
fi

echo "  -> Backend dependencies installed!"
cd ..

# ---------- FRONTEND ----------
echo ""
echo "[2/4] Setting up React frontend..."
cd frontend

# Write craco.config.js if missing
cat > craco.config.js << 'EOF'
const path = require('path');
module.exports = {
  webpack: { alias: { '@': path.resolve(__dirname, 'src') } },
  style: { postcssOptions: { plugins: [require('tailwindcss'), require('autoprefixer')] } },
};
EOF

# Write tailwind.config.js if missing
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

# Write postcss.config.js if missing
cat > postcss.config.js << 'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
EOF

# Write public/index.html if missing
mkdir -p public
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0a0a0f" />
    <meta name="description" content="AuctionPro - Live Sports Player Auction Platform" />
    <title>AuctionPro</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

# Write src/index.js if missing
mkdir -p src
cat > src/index.js << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false } },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
EOF

# Write src/lib/utils.js if missing
mkdir -p src/lib
cat > src/lib/utils.js << 'EOF'
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
EOF

# Write dialog.jsx if missing
mkdir -p src/components/ui
cat > src/components/ui/dialog.jsx << 'EOF'
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" /><span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
const DialogFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />);
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
EOF

# Write alert-dialog.jsx if missing
cat > src/components/ui/alert-dialog.jsx << 'EOF'
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg", className)} {...props} />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
const AlertDialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
const AlertDialogFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />);
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />);
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />);
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
EOF

# Write hooks/use-toast.js if missing
mkdir -p src/hooks
if [ ! -f src/hooks/use-toast.js ]; then
cat > src/hooks/use-toast.js << 'EOF'
import { useState } from "react";
let listeners = [];
let memoryState = { toasts: [] };
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach(l => l(memoryState));
}
function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST": return { ...state, toasts: [action.toast, ...state.toasts].slice(0, 3) };
    case "REMOVE_TOAST": return { ...state, toasts: state.toasts.filter(t => t.id !== action.toastId) };
    default: return state;
  }
}
let count = 0;
export function toast({ title, description, variant }) {
  const id = ++count + "";
  dispatch({ type: "ADD_TOAST", toast: { id, title, description, variant } });
  setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: id }), 4000);
  return { id };
}
export function useToast() {
  const [state, setState] = useState(memoryState);
  useState(() => { listeners.push(setState); return () => { listeners = listeners.filter(l => l !== setState); }; });
  return { toast, toasts: state.toasts };
}
EOF
fi

# Install npm packages
echo "  -> Installing npm packages (this takes ~2 minutes first time)..."
npm install --legacy-peer-deps --silent
npm install socket.io-client canvas-confetti --legacy-peer-deps --silent

echo "  -> Frontend ready!"
cd ..

echo ""
echo "=============================="
echo "  Setup Complete!"
echo "=============================="
echo ""
echo "Now run:  bash start.sh"
echo ""
