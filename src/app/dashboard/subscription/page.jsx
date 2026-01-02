'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSubscriptionData()
    
    // Check for success/cancel params
    if (searchParams.get('success')) {
      toast.success('Subscription activated! Welcome aboard! 🎉')
      router.replace('/dashboard/subscription')
    }
    if (searchParams.get('canceled')) {
      toast.info('Checkout canceled. No worries!')
      router.replace('/dashboard/subscription')
    }
  }, [searchParams])

  async function loadSubscriptionData() {
    try {
      setError(null)
      console.log('🔍 Loading subscription data...')
      
      const response = await fetchWithAuth('/api/subscription', { method: 'GET' })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Subscription data loaded:', data)
      setCurrentSubscription(data)
    } catch (error) {
      console.error('❌ Error loading subscription:', error)
      setError(error.message)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(tierName, billingPeriod = 'monthly') {
    setUpgrading(tierName)
    
    try {
      console.log(`🚀 Starting upgrade to ${tierName} (${billingPeriod})`)
      
      const response = await fetchWithAuth('/api/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({ 
          tier_name: tierName,
          billing_period: billingPeriod 
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        console.log('✅ Redirecting to checkout:', data.url)
        window.location.href = data.url
      } else {
        console.error('❌ Checkout failed:', data)
        toast.error(data.error || 'Failed to create checkout')
        setUpgrading(null)
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error)
      toast.error('Failed to start checkout')
      setUpgrading(null)
    }
  }

  async function handleManageBilling() {
    try {
      const response = await fetchWithAuth('/api/subscription/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('Failed to open billing portal')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading subscription...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Subscription</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadSubscriptionData}
              className="mt-4"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const currentTier = currentSubscription?.tier
  const usage = currentSubscription?.usage
  const limits = currentSubscription?.limits

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-blue-500 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Current Plan</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {currentTier?.display_name || 'Free'}
              </p>
            </div>
            <Badge className="bg-blue-500 text-white">
              {currentTier?.name?.toUpperCase() || 'FREE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UsageStat 
              label="Properties" 
              current={usage?.properties || 0} 
              max={limits?.properties} 
            />
            <UsageStat 
              label="Units" 
              current={usage?.units || 0} 
              max={limits?.units} 
            />
            <UsageStat 
              label="Tenants" 
              current={usage?.tenants || 0} 
              max={limits?.tenants} 
            />
            <UsageStat 
              label="Workers" 
              current={usage?.workers || 0} 
              max={limits?.workers} 
            />
          </div>
        </CardContent>
        {currentTier?.name !== 'free' && (
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              className="w-full sm:w-auto"
            >
              Manage Billing
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            name="Starter"
            price="$29"
            period="month"
            description="Perfect for small portfolios"
            features={[
              '3 properties',
              '50 units',
              '20 tenants',
              '2 workers',
              '50 SMS/month',
              'Priority support',
            ]}
            isCurrent={currentTier?.name === 'starter'}
            onUpgrade={() => handleUpgrade('starter')}
            isUpgrading={upgrading === 'starter'}
          />

          <PricingCard
            name="Professional"
            price="$79"
            period="month"
            description="For growing property managers"
            features={[
              '10 properties',
              '200 units',
              '100 tenants',
              '10 workers',
              '500 SMS/month',
              'Advanced analytics',
              'Priority support',
            ]}
            popular
            isCurrent={currentTier?.name === 'professional'}
            onUpgrade={() => handleUpgrade('professional')}
            isUpgrading={upgrading === 'professional'}
          />

          <PricingCard
            name="Enterprise"
            price="$199"
            period="month"
            description="For large organizations"
            features={[
              'Unlimited properties',
              'Unlimited units',
              'Unlimited tenants',
              'Unlimited workers',
              'Unlimited SMS',
              'Custom integrations',
              'Dedicated support',
            ]}
            isCurrent={currentTier?.name === 'enterprise'}
            onUpgrade={() => handleUpgrade('enterprise')}
            isUpgrading={upgrading === 'enterprise'}
          />
        </div>
      </div>
    </div>
  )
}

function UsageStat({ label, current, max }) {
  const percentage = max ? (current / max) * 100 : 0
  const isUnlimited = max === null
  const isNearLimit = percentage >= 80

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm ${isNearLimit ? 'text-orange-600' : 'text-muted-foreground'}`}>
          {current} {isUnlimited ? '' : `/ ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <p className="text-xs text-green-600 dark:text-green-400">Unlimited</p>
      )}
    </div>
  )
}

function PricingCard({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  popular = false, 
  isCurrent, 
  onUpgrade,
  isUpgrading 
}) {
  return (
    <Card className={`relative ${popular ? 'border-blue-500 shadow-lg' : ''} ${isCurrent ? 'border-green-500' : ''}`}>
      {popular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <Badge className="bg-blue-500">Most Popular</Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <Badge className="bg-green-500">Current Plan</Badge>
        </div>
      )}

      <CardHeader className="pt-8">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <div className="mt-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrent ? 'outline' : 'default'}
          disabled={isCurrent || isUpgrading}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : isCurrent ? (
            'Current Plan'
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}