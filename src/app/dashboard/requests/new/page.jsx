/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, X, AlertCircle, Home } from 'lucide-react'
import { toast } from "sonner";

export default function NewRequestPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium',
    location_details: '',
  })

  useEffect(() => {
    loadUserProfile()
  }, [])

  async function loadUserProfile() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Get profile with unit info
      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          *,
          unit:units!units_tenant_id_fkey(
            id,
            unit_number,
            property:properties(
              id,
              name,
              address,
              city,
              state
            )
          )
        `)
        .eq('id', currentUser.id)
        .single()

      setProfile(profileData)

      // Check if tenant has a unit assigned
      if (profileData?.role === 'tenant' && (!profileData.unit || profileData.unit.length === 0)) {
        toast.error('You do not have a unit assigned. Please contact your property manager.')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)

    try {
      const uploadedImages = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `request-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('maintenance-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('maintenance-images')
          .getPublicUrl(filePath)

        uploadedImages.push(publicUrl)
      }

      setImages([...images, ...uploadedImages])
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index) {
    setImages(images.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const unit = profile.unit[0]
      const property = unit.property

      const requestData = {
        ...formData,
        tenant_id: user.id,
        property_id: property.id,
        unit_id: unit.id,
        organization_id: profile.organization_id,
        status: 'submitted',
        images: images.length > 0 ? images : null,
      }

      console.log('📤 Submitting request:', requestData)

      const response = await fetchWithAuth('/api/requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit request')
      }

      console.log('✅ Request submitted:', data)

      toast.success('✅ Maintenance request submitted successfully!')
      router.push('/dashboard/requests')
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  const unit = profile.unit && profile.unit.length > 0 ? profile.unit[0] : null
  const property = unit?.property

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Submit Maintenance Request</h1>
          <p className="text-gray-600 mt-1">Report an issue in your unit</p>
        </div>
      </div>

      {/* Unit Info */}
      {unit && property && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Submitting for:</p>
                <p className="text-sm text-blue-700 mt-1">
                  {property.name} - Unit {unit.unit_number}
                </p>
                <p className="text-sm text-blue-600">
                  {property.address}, {property.city}, {property.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <Input
                name="title"
                placeholder="e.g., Leaking faucet in kitchen"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural</option>
                <option value="pest">Pest Control</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="low">Low - Can wait a few days</option>
                <option value="medium">Medium - Should be fixed soon</option>
                <option value="high">High - Needs attention quickly</option>
                <option value="emergency">Emergency - Immediate attention needed</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                name="description"
                placeholder="Please describe the issue in detail..."
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                Include as much detail as possible to help us resolve the issue quickly
              </p>
            </div>

            {/* Location Details */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Specific Location (optional)
              </label>
              <Input
                name="location_details"
                placeholder="e.g., Master bathroom, under the sink"
                value={formData.location_details}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Photos (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Photos
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:bg-gray-50">
                    <Upload className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {uploading ? 'Uploading...' : 'Choose Files'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500">
                  Upload photos to help us understand the issue
                </p>
              </div>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>For emergencies (gas leaks, flooding, no heat in winter), call your property manager immediately</li>
                  <li>You'll receive updates via email and/or SMS as your request is processed</li>
                  <li>Please ensure someone is available to provide access to the unit</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={loading || uploading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}