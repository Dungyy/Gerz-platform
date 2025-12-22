'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-helper'

export default function NewRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [units, setUnits] = useState([])
  const [photos, setPhotos] = useState([])
  const [formData, setFormData] = useState({
    unit_id: '',
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium',
    entry_allowed: false,
    preferred_date: '',
    preferred_time: 'anytime',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('*, organization_id')
      .eq('id', user.id)
      .single()
    
    setProfile(data)

    const { data: unitsData } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(name, address)
      `)
      .eq('tenant_id', user.id)

    setUnits(unitsData || [])
    
    if (unitsData && unitsData.length === 1) {
      setFormData(prev => ({ ...prev, unit_id: unitsData[0].id }))
    }
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    setUploading(true)

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'requests')

      const response = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.url) {
        setPhotos(prev => [...prev, data.url])
      }
    }

    setUploading(false)
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetchWithAuth('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photo_urls: photos,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/requests/${data.id}`)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Error creating request')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Submit Maintenance Request</h2>
        <p className="text-gray-600 mt-1">Describe the issue and we'll get it resolved</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Unit Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              >
                <option value="">Select your unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.property?.name} - Unit {unit.unit_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g., Leaking kitchen faucet"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                rows={4}
                placeholder="Please describe the issue in detail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC / Heating / Cooling</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural / Walls / Floors</option>
                <option value="pest">Pest Control</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low - Can wait a few days</option>
                <option value="medium">Medium - Should fix soon</option>
                <option value="high">High - Needs attention ASAP</option>
                <option value="emergency">Emergency - Urgent!</option>
              </select>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium mb-2">Photos</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload photos'}
                  </span>
                </label>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {photos.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Entry Permission */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="entry-allowed"
                className="mt-1"
                checked={formData.entry_allowed}
                onChange={(e) => setFormData({ ...formData, entry_allowed: e.target.checked })}
              />
              <label htmlFor="entry-allowed" className="text-sm">
                <span className="font-medium">Permission to enter</span>
                <p className="text-gray-600">
                  Maintenance staff may enter even if I'm not home
                </p>
              </label>
            </div>

            {/* Preferred Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Date</label>
                <Input
                  type="date"
                  value={formData.preferred_date}
                  onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Time</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.preferred_time}
                  onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                >
                  <option value="anytime">Anytime</option>
                  <option value="morning">Morning (8am - 12pm)</option>
                  <option value="afternoon">Afternoon (12pm - 5pm)</option>
                  <option value="evening">Evening (5pm - 8pm)</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}