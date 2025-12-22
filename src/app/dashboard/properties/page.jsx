'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '@/lib/api-helper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Building2, MapPin, Users, Plus, X, Upload, Download } from 'lucide-react'

export default function PropertiesMergedPage() {
  const router = useRouter()

  // list state
  const [properties, setProperties] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState(null)

  // create form state
  const [creating, setCreating] = useState(false)
  const [orgId, setOrgId] = useState(null)
  const [canCreate, setCanCreate] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: 'apartment',
    year_built: '',
    description: '',
  })

  const [units, setUnits] = useState([
    { unit_number: '101', floor: '1', bedrooms: 1, bathrooms: 1, square_feet: '' },
  ])

  useEffect(() => {
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    await Promise.all([loadOrg(), loadProperties()])
  }

  async function loadOrg() {
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setOrgId(profile?.organization_id || null)

      const allowed = profile?.role === 'owner' || profile?.role === 'manager'
      setCanCreate(Boolean(allowed))
    } catch (err) {
      console.error('loadOrg error:', err)
      setOrgId(null)
      setCanCreate(false)
    }
  }

  async function loadProperties() {
    try {
      setLoadingList(true)
      setError(null)

      const response = await fetchWithAuth('/api/properties', { method: 'GET' })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json().catch(() => [])
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load properties')
      }

      setProperties(Array.isArray(data) ? data : data.properties || [])
    } catch (err) {
      console.error('Error loading properties:', err)
      setError(err.message || 'Failed to load properties')
    } finally {
      setLoadingList(false)
    }
  }

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function resetForm() {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      property_type: 'apartment',
      year_built: '',
      description: '',
    })
    setUnits([{ unit_number: '101', floor: '1', bedrooms: 1, bathrooms: 1, square_feet: '' }])
    setShowBulkImport(false)
  }

  function addUnit() {
    const lastUnit = units[units.length - 1]
    const nextNumber = lastUnit?.unit_number ? String(parseInt(lastUnit.unit_number, 10) + 1) : ''
    setUnits((prev) => [
      ...prev,
      {
        unit_number: nextNumber,
        floor: lastUnit?.floor || '',
        bedrooms: lastUnit?.bedrooms || 1,
        bathrooms: lastUnit?.bathrooms || 1,
        square_feet: lastUnit?.square_feet || '',
      },
    ])
  }

  function removeUnit(index) {
    setUnits((prev) => prev.filter((_, i) => i !== index))
  }

  function updateUnit(index, field, value) {
    setUnits((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function generateUnitsFromRange() {
    const startUnit = prompt('Enter starting unit number (e.g., 101):')
    const endUnit = prompt('Enter ending unit number (e.g., 120):')
    if (!startUnit || !endUnit) return

    const start = parseInt(startUnit, 10)
    const end = parseInt(endUnit, 10)

    if (isNaN(start) || isNaN(end) || start > end) {
      alert('Invalid range')
      return
    }

    const bedrooms = prompt('Default bedrooms:', '1')
    const bathrooms = prompt('Default bathrooms:', '1')
    const squareFeet = prompt('Default square feet (optional):', '')

    const newUnits = []
    for (let i = start; i <= end; i++) {
      const floor = Math.floor(i / 100)
      newUnits.push({
        unit_number: String(i),
        floor: String(floor),
        bedrooms: bedrooms ? Number(bedrooms) : 1,
        bathrooms: bathrooms ? Number(bathrooms) : 1,
        square_feet: squareFeet || '',
      })
    }

    setUnits(newUnits)
    alert(`${newUnits.length} units generated!`)
  }

  function handleCSVImport(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result || '')
      const rows = text.split('\n').filter((row) => row.trim())
      const dataRows = rows.slice(1)

      const importedUnits = dataRows
        .map((row) => {
          const [unit_number, floor, bedrooms, bathrooms, square_feet] = row
            .split(',')
            .map((s) => s.trim())

          return {
            unit_number: unit_number || '',
            floor: floor || '',
            bedrooms: bedrooms ? Number(bedrooms) : 1,
            bathrooms: bathrooms ? Number(bathrooms) : 1,
            square_feet: square_feet || '',
          }
        })
        .filter((u) => u.unit_number)

      if (importedUnits.length) {
        setUnits(importedUnits)
        alert(`${importedUnits.length} units imported!`)
      } else {
        alert('No valid units found in CSV')
      }
    }

    reader.readAsText(file)
    e.target.value = ''
  }

  function downloadTemplate() {
    const csv = `unit_number,floor,bedrooms,bathrooms,square_feet
101,1,1,1,650
102,1,1,1,650
103,1,2,1,850
201,2,1,1,650
202,2,2,1,850`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'units_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!orgId) {
      alert('Missing organization. Please re-login.')
      return
    }

    setCreating(true)
    try {
      const payload = {
        ...formData,
        organization_id: orgId,
        units: units
          .filter((u) => u.unit_number && u.unit_number.trim())
          .map((u) => ({
            ...u,
            bedrooms: u.bedrooms === '' ? null : Number(u.bedrooms),
            bathrooms: u.bathrooms === '' ? null : Number(u.bathrooms),
            square_feet: u.square_feet === '' ? null : Number(u.square_feet),
          })),
      }

      const response = await fetchWithAuth('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        alert('Error: ' + (data.error || 'Failed to create property'))
        return
      }

      alert(`Property created successfully with ${data.units_created ?? payload.units.length} units!`)

      // refresh list + close form
      await loadProperties()
      setShowCreate(false)
      resetForm()
    } catch (err) {
      console.error('Error creating property:', err)
      alert('Error creating property. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (loadingList) return <div className="flex justify-center py-12">Loading...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Properties</h2>
          <p className="text-gray-600 mt-1">{properties.length} properties</p>
        </div>

        {canCreate ? (
          <Button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            {showCreate ? 'Close' : 'Add Property'}
          </Button>
        ) : null}
      </div>

      {error && (
        <div className="text-red-600">Error: {error}</div>
      )}

      {/* Create Form (inline) */}
      {showCreate && canCreate && (
        <div className="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    name="name"
                    placeholder="Property Name *"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="col-span-2"
                  />

                  <Input
                    name="address"
                    placeholder="Street Address *"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="col-span-2"
                  />

                  <Input name="city" placeholder="City *" value={formData.city} onChange={handleChange} required />
                  <Input name="state" placeholder="State *" value={formData.state} onChange={handleChange} required />
                  <Input name="zip" placeholder="ZIP Code *" value={formData.zip} onChange={handleChange} required />

                  <select
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="apartment">Apartment Building</option>
                    <option value="house">Single Family Home</option>
                    <option value="condo">Condo</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed">Mixed Use</option>
                  </select>

                  <Input
                    type="number"
                    name="year_built"
                    placeholder="Year Built"
                    value={formData.year_built}
                    onChange={handleChange}
                  />

                  <Textarea
                    name="description"
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={handleChange}
                    className="col-span-2"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Units */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Units ({units.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkImport((v) => !v)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button type="button" onClick={addUnit} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Unit
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {showBulkImport && (
                  <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50">
                    <h4 className="font-semibold mb-3">Quick Add Multiple Units</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={generateUnitsFromRange}>
                        Generate from Range
                      </Button>

                      <label>
                        <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </span>
                        </Button>
                      </label>

                      <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>

                    <p className="text-xs text-gray-600 mt-2">
                      Generate units 101-120, or import CSV columns: unit_number, floor, bedrooms, bathrooms, square_feet
                    </p>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {units.map((unit, index) => (
                    <div
                      key={index}
                      className="flex gap-3 items-start p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="grid grid-cols-5 gap-2 flex-1">
                        <Input
                          placeholder="Unit #"
                          value={unit.unit_number}
                          onChange={(e) => updateUnit(index, 'unit_number', e.target.value)}
                          required
                          className="text-sm"
                        />
                        <Input
                          placeholder="Floor"
                          value={unit.floor}
                          onChange={(e) => updateUnit(index, 'floor', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Beds"
                          value={unit.bedrooms}
                          onChange={(e) => updateUnit(index, 'bedrooms', e.target.value)}
                          min="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Baths"
                          value={unit.bathrooms}
                          onChange={(e) => updateUnit(index, 'bathrooms', e.target.value)}
                          min="0"
                          step="0.5"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Sq Ft"
                          value={unit.square_feet}
                          onChange={(e) => updateUnit(index, 'square_feet', e.target.value)}
                          min="0"
                          className="text-sm"
                        />
                      </div>

                      {units.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeUnit(index)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={creating || !orgId}>
                {creating ? 'Creating...' : `Create Property with ${units.length} Units`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-4">Add your first property to get started</p>
            {canCreate && (
              <Button type="button" onClick={() => setShowCreate(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Property
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const unitCount = property.units_count ?? property.unit_count ?? property.unitsCount ?? 0

            return (
              <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{property.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {property.property_type || 'Property'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{property.address}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{unitCount} units</span>
                      </div>
                    </div>

                    {property.manager?.full_name && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500">Manager</p>
                        <p className="text-sm font-medium">{property.manager.full_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
