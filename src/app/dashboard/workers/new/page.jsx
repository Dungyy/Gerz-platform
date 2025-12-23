'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, AlertCircle } from 'lucide-react'

export default function InviteWorkerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  })

  const [sendSMS, setSendSMS] = useState(false)

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        send_sms: sendSMS && formData.phone,
      }

      console.log('📤 Sending worker invitation:', payload)

      const response = await fetchWithAuth('/api/workers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to invite worker')
      }

      console.log('✅ Invitation response:', data)

      alert(`✅ Worker invitation sent to ${formData.full_name}!`)
      router.push('/dashboard/workers')
    } catch (err) {
      console.error('Error inviting worker:', err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Invite Worker</h1>
          <p className="text-gray-600 mt-1">Add a maintenance worker to your team</p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">How worker invitations work:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Worker receives an email with a secure link</li>
                <li>They set their password and access the system</li>
                <li>You can assign maintenance requests to them</li>
                <li>They can update request status and communicate with tenants</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Worker Information */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="john.smith@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Invitation link will be sent to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone (optional)
              </label>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                For SMS notifications about assigned requests
              </p>
            </div>

            {/* SMS Toggle */}
            {formData.phone && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="send-sms"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="rounded h-5 w-5"
                />
                <label htmlFor="send-sms" className="text-sm cursor-pointer">
                  <span className="font-medium">Send SMS invitation</span>
                  <p className="text-gray-600">
                    Send a text message in addition to email
                  </p>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}