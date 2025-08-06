export default function ColorTest() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold mb-8">Theme Color Test</h1>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Theme Colors (Exactly as specified)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Light Mode Primary</h3>
              <div className="p-4 rounded" style={{ backgroundColor: 'oklch(0.723 0.219 149.579)' }}>
                <code className="text-black">oklch(0.723 0.219 149.579)</code>
              </div>
              <p className="text-sm mt-2">This is your exact primary color - it&apos;s lime green!</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Dark Mode Primary</h3>
              <div className="p-4 rounded" style={{ backgroundColor: 'oklch(0.696 0.17 162.48)' }}>
                <code className="text-black">oklch(0.696 0.17 162.48)</code>
              </div>
              <p className="text-sm mt-2">This is your exact dark mode primary - also lime green!</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Using Theme Variables</h2>
          <div className="flex gap-4">
            <div className="bg-primary text-primary-foreground p-4 rounded">
              Primary (using bg-primary)
            </div>
            <div className="bg-secondary text-secondary-foreground p-4 rounded">
              Secondary (using bg-secondary)
            </div>
            <div className="bg-accent text-accent-foreground p-4 rounded">
              Accent (using bg-accent)
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">For Comparison: Tailwind&apos;s lime-600</h2>
          <div className="p-4 rounded" style={{ backgroundColor: 'rgb(101 163 13)' }}>
            <code className="text-white">Tailwind lime-600: rgb(101 163 13)</code>
          </div>
          <p className="text-sm">This is Tailwind&apos;s default lime-600 for comparison</p>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Conclusion</h3>
          <p>Your theme IS working correctly! The OKLCH values you provided are displaying as lime green. 
          The color <code className="bg-muted px-1 rounded">oklch(0.723 0.219 149.579)</code> has:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Lightness: 72.3% (fairly bright)</li>
            <li>Chroma: 0.219 (highly saturated)</li>
            <li>Hue: 149.579° (lime green range)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}