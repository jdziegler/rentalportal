import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">PropertyPilot</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Built for landlords with 1-100 units
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Property management
            <br />
            <span className="text-gray-400">made simple.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Stop juggling spreadsheets and sticky notes. PropertyPilot gives you everything
            you need to manage your rental properties, collect rent, and keep your tenants happy
            &mdash; all in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="bg-gray-900 text-white px-8 py-3.5 rounded-lg text-base font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                Get Started Free
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="text-sm text-gray-400">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-2 shadow-2xl shadow-gray-900/20">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="bg-gray-50 rounded-lg p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <DemoStatCard title="Properties" value="10" />
                <DemoStatCard title="Units" value="47" subtitle="87% occupied" />
                <DemoStatCard title="Income (MTD)" value="$12,450" className="text-green-600" />
                <DemoStatCard title="Active Leases" value="39" />
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Recent Transactions</p>
                  <div className="space-y-2">
                    {[
                      { name: "Rent - Unit 2A", amount: "+$1,850", color: "text-green-600" },
                      { name: "Rent - Unit 3B", amount: "+$1,600", color: "text-green-600" },
                      { name: "Plumbing Repair", amount: "-$340", color: "text-red-600" },
                    ].map((t) => (
                      <div key={t.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t.name}</span>
                        <span className={`font-medium ${t.color}`}>{t.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Leases Expiring Soon</p>
                  <div className="space-y-2">
                    {[
                      { unit: "Unit 1C", tenant: "Sarah M.", days: "5 days" },
                      { unit: "Unit 4A", tenant: "James R.", days: "12 days" },
                      { unit: "Unit 2B", tenant: "Maria L.", days: "28 days" },
                    ].map((l) => (
                      <div key={l.unit} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{l.unit} &middot; {l.tenant}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{l.days}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to manage your rentals</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              From tracking leases to collecting rent, PropertyPilot handles the details so you can focus on growing your portfolio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<path d="M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z" />}
              title="Property & Unit Tracking"
              description="Organize all your properties, units, and amenities in one place. See occupancy rates and vacancy at a glance."
            />
            <FeatureCard
              icon={<path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z" />}
              title="Tenant Management"
              description="Keep tenant contact info, lease history, and payment records organized. Never lose track of who&rsquo;s in which unit."
            />
            <FeatureCard
              icon={<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z" />}
              title="Lease Administration"
              description="Create and manage leases with full terms, rent schedules, and late fee rules. Get alerts before leases expire."
            />
            <FeatureCard
              icon={<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4 4 0 018 13h2a2 2 0 104 0c0 .73-.4 1.4-1.04 1.73l-.5.25A3.98 3.98 0 0011 18.93V17h2v-.07zM12 8a2 2 0 00-2 2H8a4 4 0 018 0h-2a2 2 0 00-2-2z" />}
              title="Financial Tracking"
              description="Record income and expenses, track rent payments, and see your cash flow at a glance with monthly summaries."
            />
            <FeatureCard
              icon={<>
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
              </>}
              title="Online Rent Collection"
              description="Collect rent via ACH or card through Stripe. Tenants pay online, funds go straight to your bank account."
            />
            <FeatureCard
              icon={<path d="M18 1l-6 4H6a2 2 0 00-2 2v2a2 2 0 002 2h1l-2 6h4l2-6h1l6 4V1zM8 9V7h3.17L14 5.53v6.94L11.17 11H8z" />}
              title="Rental Listings"
              description="Create and publish listings for vacant units. Manage applications and find qualified tenants faster."
            />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold">100%</p>
            <p className="text-sm text-gray-400 mt-1">Free to start</p>
          </div>
          <div>
            <p className="text-3xl font-bold">1-100</p>
            <p className="text-sm text-gray-400 mt-1">Units supported</p>
          </div>
          <div>
            <p className="text-3xl font-bold">ACH + Card</p>
            <p className="text-sm text-gray-400 mt-1">Payment methods</p>
          </div>
          <div>
            <p className="text-3xl font-bold">24/7</p>
            <p className="text-sm text-gray-400 mt-1">Online access</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Up and running in minutes</h2>
            <p className="mt-4 text-gray-500">Three steps to a better-managed portfolio.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard step="1" title="Add your properties" description="Enter your properties and units. Import from your existing records or start fresh." />
            <StepCard step="2" title="Set up your leases" description="Create lease agreements, add tenants, and define rent terms and late fee rules." />
            <StepCard step="3" title="Collect rent online" description="Connect Stripe, invite tenants to pay online, and watch the payments roll in." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to simplify your property management?</h2>
          <p className="mt-4 text-gray-500">
            Join landlords who have ditched the spreadsheets. Set up in minutes, no credit card required.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="mt-8 bg-gray-900 text-white px-8 py-3.5 rounded-lg text-base font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
            >
              Get Started Free
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">PropertyPilot</span>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} PropertyPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function DemoStatCard({
  title,
  value,
  subtitle,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`text-xl font-bold mt-1 ${className || "text-gray-900"}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all">
      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          {icon}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
