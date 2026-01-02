// =====================================================
// FILE: src/components/upgrade-prompt.jsx
// Upgrade modal and subscription limit hook
// =====================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Check, X } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-helper'

// =====================================================
// CONFIGURATION
// =====================================================

const RESOURCE_MESSAGES = {
  properties: {
    title: 'Property Limit Reached',
    description: 'You\'ve reached your property limit for the current plan.',
  },
  units: {
    title: 'Unit Limit Reached',
    description: 'You\'ve reached your unit limit for the current plan.',
  },
  tenants: {
    title: 'Tenant Limit Reached',
    description: 'You\'ve reached your tenant limit for the current plan.',
  },
  workers: {
    title: 'Worker Limit Reached',
    description: 'You\'ve reached your worker limit (managers + maintenance) for the current plan.',
  },
  sms: {
    title: 'SMS Not Available',
    description: 'SMS notifications are only available on Professional and Enterprise plans.',
  },
}

const RECOMMENDED_TIERS = {
      free: {
    name: 'free',
    price: '$0/mo',
    features: [
      '1 property',
      '5 units',
      '5 tenants',
    ],
  },
  starter: {
    name: 'Starter',
    price: '$29/mo',
    features: [
      '3 properties',
      '50 units',
      '50 tenants',
      'Priority support',
      'Custom branding',
    ],
  },
  professional: {
    name: 'Professional',
    price: '$79/mo',
    features: [
      '10 properties',
      '200 units',
      '200 tenants',
      'SMS notifications (2000/mo)',
      'Advanced analytics',
      'API access',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$199/mo',
    features: [
      'Unlimited properties',
      'Unlimited units',
      'Unlimited tenants',
      'Unlimited SMS',
      'Dedicated support',
      'Custom integrations',
    ],
  },
}

// =====================================================
// UPGRADE PROMPT COMPONENT
// =====================================================

export function UpgradePrompt({ 
  isOpen, 
  onClose, 
  resourceType = 'properties', 
  currentTier = 'free' 
}) {
  const message = RESOURCE_MESSAGES[resourceType] || RESOURCE_MESSAGES.properties
  const tierInfo = RECOMMENDED_TIERS[currentTier.toLowerCase()] || RECOMMENDED_TIERS.free

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">{message.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {message.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Recommended Tier Card */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border-2 border-blue-200 dark:border-blue-800 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{tierInfo.name}</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {tierInfo.price}
                </p>
              </div>
              <Badge className="bg-blue-500 hover:bg-blue-600">
                Recommended
              </Badge>
            </div>
            
            <ul className="space-y-2">
              {tierInfo.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link href="/dashboard/subscription" className="flex-1">
              <Button className="w-full gap-2">
                <TrendingUp className="h-4 w-4" />
                View All Plans
              </Button>
            </Link>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// SUBSCRIPTION LIMIT HOOK
// =====================================================

export function useSubscriptionLimit() {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [limitResource, setLimitResource] = useState('properties')
  const [currentTier, setCurrentTier] = useState('free')

  /**
   * Check if user can add more of a resource type
   * Shows upgrade prompt automatically if limit reached
   * @param {string} resourceType - 'properties', 'units', 'tenants', 'workers', 'sms'
   * @returns {Promise<boolean>} - true if allowed, false if at limit
   */
  async function checkLimit(resourceType) {
    try {
      // Check limit via API
      const response = await fetchWithAuth('/api/subscription/check-limit', {
        method: 'POST',
        body: JSON.stringify({ resource_type: resourceType }),
      })

      const data = await response.json()

      if (!data.allowed) {
        // Get current subscription to show correct tier
        const subResponse = await fetchWithAuth('/api/subscription')
        const subData = await subResponse.json()
        
        setCurrentTier(subData.tier?.name || 'free')
        setLimitResource(resourceType)
        setShowUpgradePrompt(true)
        
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking limit:', error)
      // Fail open - allow the action if check fails
      return true
    }
  }

  /**
   * Manually show upgrade prompt for a resource
   * @param {string} resourceType - Resource type
   * @param {string} tier - Current tier name
   */
  function showUpgrade(resourceType, tier = 'free') {
    setLimitResource(resourceType)
    setCurrentTier(tier)
    setShowUpgradePrompt(true)
  }

  /**
   * Close upgrade prompt
   */
  function hideUpgrade() {
    setShowUpgradePrompt(false)
  }

  // Component to render
  const UpgradePromptComponent = () => (
    <UpgradePrompt
      isOpen={showUpgradePrompt}
      onClose={hideUpgrade}
      resourceType={limitResource}
      currentTier={currentTier}
    />
  )

  return {
    checkLimit,
    showUpgrade,
    hideUpgrade,
    showUpgradePrompt,
    setShowUpgradePrompt,
    UpgradePrompt: UpgradePromptComponent,
  }
}