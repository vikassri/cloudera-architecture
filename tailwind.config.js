/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			inter: ['var(--font-inter)'],
  			mono: ['var(--font-mono)'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  safelist: [
    "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-teal-500", "bg-rose-500",
    "bg-amber-500", "bg-green-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500",
    "bg-yellow-600", "bg-slate-500", "bg-violet-500", "bg-emerald-500",
    "text-blue-500", "text-purple-500", "text-orange-500", "text-teal-500",
    "border-blue-500", "border-purple-500", "border-emerald-500", "border-amber-500",
    "border-blue-500/30", "border-purple-500/30", "border-emerald-500/30", "border-amber-500/30",
    "bg-blue-500/5", "bg-purple-500/5", "bg-emerald-500/5", "bg-amber-500/5",
    "bg-blue-500/10", "bg-purple-500/10", "bg-emerald-500/10", "bg-amber-500/10",
    "bg-blue-500/20", "bg-violet-500/20", "bg-teal-500/20", "bg-emerald-500/20", "bg-indigo-500/20",
    "bg-rose-500/20", "bg-slate-500/20",
    "text-blue-400", "text-purple-400", "text-emerald-400", "text-amber-400",
    "text-cyan-400", "text-orange-400", "text-pink-400", "text-green-400",
    "text-red-400", "text-violet-400", "text-teal-400", "text-rose-400",
    "text-blue-300", "text-purple-300", "text-emerald-300", "text-amber-300",
    "border-blue-500/40", "border-purple-500/40", "border-emerald-500/40", "border-amber-500/40",
    "border-rose-500/40", "border-cyan-500/40",
    "bg-blue-500/5", "bg-purple-500/5", "bg-emerald-500/5", "bg-amber-500/5",
    "bg-rose-500/5", "bg-cyan-500/5",
  ],
  plugins: [require("tailwindcss-animate")],
}