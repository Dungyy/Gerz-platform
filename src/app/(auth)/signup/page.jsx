'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Search, CheckCircle2, User, Wrench, ArrowLeft, ArrowRight } from 'lucide-react'
import Navbar from "@/components/layout/navbar";
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchingOrgs, setSearchingOrgs] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrg, setSelectedOrg] = useState(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    organization_name: '',
    phone: '',
    org_search_query: '',
  })

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function searchOrganizations(query) {
    if (!query || query.length < 2) {
      setOrganizations([])
      return
    }

    setSearchingOrgs(true)
    try {
      const response = await fetch(`/api/organizations/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data)
      }
    } catch (error) {
      console.error('Error searching organizations:', error)
    } finally {
      setSearchingOrgs(false)
    }
  }

  function handleOrgSearch(e) {
    const query = e.target.value
    setFormData({ ...formData, org_search_query: query })
    
    const timeoutId = setTimeout(() => {
      searchOrganizations(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  function selectOrganization(org) {
    setSelectedOrg(org)
    setFormData({ ...formData, org_search_query: org.name })
    setOrganizations([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (accountType === 'worker' && !selectedOrg) {
        toast.error('Please select your organization')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          }
        }
      })

      if (authError) throw authError

      const userId = authData.user.id
      let organizationId

      if (accountType === 'owner') {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organization_name,
            owner_id: userId,
          })
          .select()
          .single()

        if (orgError) throw orgError
        organizationId = orgData.id
      } else if (accountType === 'worker') {
        organizationId = selectedOrg.id
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          organization_id: organizationId,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          role: accountType,
          sms_notifications: !!formData.phone,
        })

      if (profileError) throw profileError

      await supabase.from('notification_preferences').insert({
        user_id: userId,
        sms_new_request: !!formData.phone,
        sms_status_update: !!formData.phone,
        sms_emergency: !!formData.phone,
      })

      toast.success(`✅ Account created successfully!`)
      router.push('/dashboard')

    } catch (error) {
      console.error('Signup error:', error)
      toast.error(`❌ Signup failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // STEP 1: Choose Account Type
  if (step === 1) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          {/* Background accents */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute right-[-140px] top-[180px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="max-w-4xl w-full">
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2 mb-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background font-bold">
                  d
                </div>
                <div className="leading-tight text-left">
                  <div className="font-semibold">dingy.app</div>
                  <div className="text-xs text-muted-foreground">
                    Maintenance Requests
                  </div>
                </div>
              </Link>
              <h1 className="text-4xl font-bold tracking-tight mt-6">
                Welcome to dingy.app
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                Choose your account type to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Owner/Manager */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-foreground/20"
                onClick={() => {
                  setAccountType("owner");
                  setStep(2);
                }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-blue-500/10 mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">
                    Property Owner/Manager
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center text-sm mb-4">
                    Manage properties, tenants, and maintenance requests
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Create and manage properties</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Invite tenants and workers</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Track maintenance requests</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Assign work to maintenance staff</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6">
                    Continue as Owner/Manager
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Maintenance Worker */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-foreground/20"
                onClick={() => {
                  setAccountType("worker");
                  setStep(2);
                }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-green-500/10 mx-auto mb-4">
                    <Wrench className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Maintenance Worker</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center text-sm mb-4">
                    Join your organization and manage maintenance tasks
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>View assigned maintenance requests</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Update request status in real-time</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Communicate with tenants</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Self-assign available work</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6 bg-green-600 hover:bg-green-700">
                    Continue as Worker
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-6">
              <p className="text-muted-foreground text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Fill Details
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-140px] bottom-[-160px] h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            {accountType === 'owner' ? (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 mx-auto mb-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/10 mx-auto mb-3">
                <Wrench className="h-6 w-6 text-green-600" />
              </div>
            )}
            <CardTitle className="text-2xl">
              Create {accountType === 'owner' ? 'Owner' : 'Worker'} Account
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="full_name"
                placeholder="John Smith"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone (Optional)
              </label>
              <Input
                type="tel"
                name="phone"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                For SMS notifications about maintenance requests
              </p>
            </div>

            {accountType === 'owner' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="organization_name"
                  placeholder="My Property Management LLC"
                  value={formData.organization_name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {accountType === 'worker' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Organization <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="org_search_query"
                    placeholder="Search for your organization..."
                    value={formData.org_search_query}
                    onChange={handleOrgSearch}
                    className="pl-10"
                    required={!selectedOrg}
                  />
                </div>

                {selectedOrg && (
                  <div className="mt-2 p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{selectedOrg.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {selectedOrg.organization_code}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrg(null)
                          setFormData({ ...formData, org_search_query: '' })
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {!selectedOrg && organizations.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => selectOrganization(org)}
                        className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 transition-colors"
                      >
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground">Code: {org.organization_code}</p>
                      </button>
                    ))}
                  </div>
                )}

                {!selectedOrg && formData.org_search_query && !searchingOrgs && organizations.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No organizations found. Check with your manager for the correct organization name.
                  </p>
                )}

                {searchingOrgs && (
                  <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Ask your property manager for the organization name or code
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || (accountType === 'worker' && !selectedOrg)}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}