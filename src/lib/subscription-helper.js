// =====================================================
// FILE: src/lib/subscription-helper.js
// Helper functions for subscription checks
// =====================================================

import { fetchWithAuth } from './api-helper'

/**
 * Check if organization can add more of a resource type
 * @param {string} resourceType - 'properties', 'units', 'tenants', 'workers', 'sms'
 * @returns {Promise<boolean>} - true if allowed, false if at limit
 */
export async function checkSubscriptionLimit(resourceType) {
  try {
    const response = await fetchWithAuth('/api/subscription/check-limit', {
      method: 'POST',
      body: JSON.stringify({ resource_type: resourceType }),
    })
    
    const data = await response.json()
    return data.allowed === true
  } catch (error) {
    console.error('Error checking subscription limit:', error)
    // Fail open - allow the action if check fails
    return true
  }
}

/**
 * Get current subscription details, usage, and limits
 * @returns {Promise<Object|null>} - Subscription data or null if error
 */
export async function getSubscription() {
  try {
    const response = await fetchWithAuth('/api/subscription', {
      method: 'GET',
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch subscription')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

/**
 * Get usage percentage for a resource
 * @param {number} current - Current usage
 * @param {number|null} max - Maximum allowed (null = unlimited)
 * @returns {number} - Percentage (0-100)
 */
export function getUsagePercentage(current, max) {
  if (max === null || max === undefined) return 0
  if (max === 0) return 100
  return Math.round((current / max) * 100)
}

/**
 * Check if at limit for a resource
 * @param {number} current - Current usage
 * @param {number|null} max - Maximum allowed
 * @returns {boolean} - true if at limit
 */
export function isAtLimit(current, max) {
  if (max === null || max === undefined) return false
  return current >= max
}

/**
 * Get status color for usage
 * @param {number} current - Current usage
 * @param {number|null} max - Maximum allowed
 * @returns {string} - 'green', 'yellow', 'red'
 */
export function getUsageStatus(current, max) {
  if (max === null || max === undefined) return 'green'
  const percentage = getUsagePercentage(current, max)
  
  if (percentage >= 100) return 'red'
  if (percentage >= 80) return 'yellow'
  return 'green'
}