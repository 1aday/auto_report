# Next.js + shadcn/ui + Data Stack

A modern, comprehensive web application built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui components, and a complete data stack for building powerful data-driven applications.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for beautiful, accessible components
- **Supabase** for backend and database
- **TanStack Query** for data fetching and caching
- **TanStack Table** for powerful data tables
- **TanStack Virtual** for virtualized rendering
- **Visx** for beautiful charts and data visualization
- **Framer Motion** for animations and micro-interactions
- **Export functionality** (CSV/Excel)
- **Data formatting** utilities
- **ESLint** for code quality
- **Dark mode** support
- **Responsive design**

## 📦 Installed Packages

### Core Framework
- **Next.js 15.4.5** - React framework with App Router
- **React 19.1.0** - Latest React version
- **TypeScript** - Type safety

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful component library
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

### Data Layer
- **@supabase/supabase-js** - Supabase client for backend
- **@tanstack/react-query** - Data fetching and caching
- **@tanstack/react-table** - Powerful table component
- **@tanstack/react-virtual** - Virtualized rendering

### Data Visualization
- **@visx/visx** - Data visualization library (D3-based)
- **d3-format** - Number formatting utilities
- **date-fns** - Date manipulation library

### Export & Utilities
- **papaparse** - CSV parsing and export
- **xlsx** - Excel file handling
- **zod** - Runtime schema validation
- **clsx** - Conditional className utility
- **tailwind-merge** - Tailwind class merging

### UI Components
- **@radix-ui/react-dialog** - Dialog component
- **@radix-ui/react-tooltip** - Tooltip component
- **@radix-ui/react-label** - Label component

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Navigate to the project:**
   ```bash
   cd shadcn-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Adding More Components

To add more shadcn/ui components:

```bash
npm run add-component [component-name]
```

### Popular Components to Add:
```bash
# Data Display
npm run add-component badge
npm run add-component separator
npm run add-component progress

# Forms
npm run add-component select
npm run add-component checkbox
npm run add-component radio-group
npm run add-component textarea

# Navigation
npm run add-component navigation-menu
npm run add-component breadcrumb

# Feedback
npm run add-component alert
npm run add-component toast
```

## 📊 Data Stack Usage

### Supabase Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### TanStack Query Setup
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})
```

### TanStack Table Example
```typescript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
]

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
})
```

### Visx Chart Example
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from '@visx/visx'

const data = [
  { x: 0, y: 10 },
  { x: 1, y: 20 },
  { x: 2, y: 15 },
]

<LineChart data={data} width={400} height={300}>
  <XAxis dataKey="x" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="y" stroke="#8884d8" />
</LineChart>
```

## 🎯 Project Structure

```
shadcn-web/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── globals.css      # Global styles with Tailwind
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page with component showcase
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── table.tsx
│   │   └── data/            # Data-specific components
│   │       ├── charts/
│   │       ├── tables/
│   │       └── forms/
│   ├── lib/
│   │   ├── utils.ts         # Utility functions
│   │   ├── supabase.ts      # Supabase client
│   │   └── query-client.ts  # TanStack Query client
│   └── types/               # TypeScript type definitions
├── components.json          # shadcn/ui configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🎨 Customization

### Colors and Theme
- Edit `src/app/globals.css` to modify CSS variables
- Update `components.json` to change the base color
- Modify `tailwind.config.ts` for custom Tailwind configuration

### Component Styling
- All shadcn/ui components are in `src/components/ui/`
- Modify component files directly to customize styles
- Use Tailwind classes for additional styling

## 📚 Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [Visx Documentation](https://airbnb.io/visx/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables for Supabase
4. Deploy automatically

### Other Platforms
- **Netlify**: Use `npm run build` and deploy the `out` directory
- **Railway**: Connect your GitHub repository
- **Docker**: Use the provided Dockerfile

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
npm run add-component # Add shadcn/ui components
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Happy coding! 🎉**

*Built with ❤️ using Next.js, shadcn/ui, and the modern data stack*
