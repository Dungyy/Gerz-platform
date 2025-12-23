'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2, Search, CheckCircle, User, Wrench } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Choose role, 2: Fill details
  const [accountType, setAccountType] = useState('') // 'owner', 'worker'
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
    
    // Debounce search
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
      // Validate worker has selected an org
      if (accountType === 'worker' && !selectedOrg) {
        alert('Please select your organization')
        setLoading(false)
        return
      }

      console.log('📝 Creating account:', accountType)

      // 1. Sign up the user
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
      console.log('✅ User created:', userId)

      let organizationId

      if (accountType === 'owner') {
        // 2a. Create organization for owner
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
        console.log('✅ Organization created:', organizationId)

      } else if (accountType === 'worker') {
        // 2b. Use selected organization for worker
        organizationId = selectedOrg.id
        console.log('✅ Using organization:', organizationId)
      }

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          organization_id: organizationId,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          role: accountType, // 'owner' or 'worker'
          sms_notifications: !!formData.phone,
        })

      if (profileError) throw profileError

      console.log('✅ Profile created')

      // 4. Create notification preferences
      await supabase.from('notification_preferences').insert({
        user_id: userId,
        sms_new_request: !!formData.phone,
        sms_status_update: !!formData.phone,
        sms_emergency: !!formData.phone,
      })

      console.log('✅ Notification preferences created')

      alert(`✅ Account created successfully! ${accountType === 'owner' ? 'You can now add properties and invite tenants.' : 'You can now view and manage maintenance requests.'}`)
      router.push('/dashboard')

    } catch (error) {
      console.error('Signup error:', error)
      alert(`❌ Signup failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // STEP 1: Choose Account Type
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Gerz
            </h1>
            <p className="text-gray-600 text-lg">
              Choose your account type to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Owner/Manager */}
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-blue-500"
              onClick={() => {
                setAccountType('owner')
                setStep(2)
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Property Owner/Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center mb-4">
                  Manage properties, tenants, and maintenance requests
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Create and manage properties</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Invite tenants and workers</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Track maintenance requests</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Assign work to maintenance staff</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" size="lg">
                  Continue as Owner/Manager
                </Button>
              </CardContent>
            </Card>

            {/* Maintenance Worker */}
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-green-500"
              onClick={() => {
                setAccountType('worker')
                setStep(2)
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
                  <Wrench className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Maintenance Worker</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center mb-4">
                  Join your organization and manage maintenance tasks
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>View assigned maintenance requests</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Update request status in real-time</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Communicate with tenants</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Self-assign available work</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-green-600 hover:bg-green-700" size="lg">
                  Continue as Worker
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // STEP 2: Fill Details
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setStep(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ← Back
            </button>
          </div>
          <CardTitle className="text-2xl text-center">
            {accountType === 'owner' ? (
              <>
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                Create Owner Account
              </>
            ) : (
              <>
                <Wrench className="h-8 w-8 text-green-600 mx-auto mb-2" />
                Create Worker Account
              </>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
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

            {/* Email */}
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

            {/* Password */}
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
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            {/* Phone (Optional) */}
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
              <p className="text-xs text-gray-500 mt-1">
                For SMS notifications about maintenance requests
              </p>
            </div>

            {/* Organization Name (Owner Only) */}
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

            {/* Organization Search (Worker Only) */}
            {accountType === 'worker' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Organization <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    name="org_search_query"
                    placeholder="Search for your organization..."
                    value={formData.org_search_query}
                    onChange={handleOrgSearch}
                    className="pl-10"
                    required={!selectedOrg}
                  />
                </div>

                {/* Selected Organization */}
                {selectedOrg && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">{selectedOrg.name}</p>
                          <p className="text-xs text-green-700">Code: {selectedOrg.organization_code}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrg(null)
                          setFormData({ ...formData, org_search_query: '' })
                        }}
                        className="text-sm text-green-700 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Organization Search Results */}
                {!selectedOrg && organizations.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => selectOrganization(org)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                      >
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-xs text-gray-600">Code: {org.organization_code}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {!selectedOrg && formData.org_search_query && !searchingOrgs && organizations.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No organizations found. Check with your manager for the correct organization name.
                  </p>
                )}

                {/* Loading */}
                {searchingOrgs && (
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  💡 Ask your property manager for the organization name or code
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || (accountType === 'worker' && !selectedOrg)}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-gray-600">
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