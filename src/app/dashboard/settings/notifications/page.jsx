'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Mail, MessageSquare, Save } from 'lucide-react'

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [phoneEdit, setPhoneEdit] = useState(false)
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)
    setNewPhone(profileData?.phone || '')

    let { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!prefs) {
      // Create default preferences
      const { data: newPrefs } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single()
      prefs = newPrefs
    }

    setPreferences(prefs)
    setLoading(false)
  }

  async function updatePreference(field, value) {
    const { error } = await supabase
      .from('notification_preferences')
      .update({ [field]: value })
      .eq('user_id', profile.id)

    if (!error) {
      setPreferences({ ...preferences, [field]: value })
    }
  }

  async function updatePhone() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: newPhone })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, phone: newPhone })
      setPhoneEdit(false)
      alert('Phone number updated successfully!')
    } else {
      alert('Error updating phone number')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-gray-600 mt-1">Manage how you receive notifications</p>
      </div>

      {/* Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            {phoneEdit ? (
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
                <Button onClick={updatePhone} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setPhoneEdit(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-medium">{profile?.phone || 'No phone number'}</span>
                <Button size="sm" onClick={() => setPhoneEdit(true)}>
                  Edit
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Required for SMS notifications
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <p className="font-medium">Enable SMS Notifications</p>
              <p className="text-sm text-gray-600">Receive text message updates</p>
            </div>
            <input
              type="checkbox"
              checked={profile?.sms_notifications}
              onChange={async (e) => {
                const { error } = await supabase
                  .from('profiles')
                  .update({ sms_notifications: e.target.checked })
                  .eq('id', profile.id)
                if (!error) {
                  setProfile({ ...profile, sms_notifications: e.target.checked })
                }
              }}
              disabled={!profile?.phone}
              className="rounded h-5 w-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="New Request"
            description="Notify when a new request is submitted"
            checked={preferences?.email_new_request}
            onChange={(v) => updatePreference('email_new_request', v)}
          />
          <NotificationToggle
            label="Status Updates"
            description="Notify when request status changes"
            checked={preferences?.email_status_update}
            onChange={(v) => updatePreference('email_status_update', v)}
          />
          <NotificationToggle
            label="Assignments"
            description="Notify when requests are assigned"
            checked={preferences?.email_assignment}
            onChange={(v) => updatePreference('email_assignment', v)}
          />
          <NotificationToggle
            label="Comments"
            description="Notify about new comments"
            checked={preferences?.email_comment}
            onChange={(v) => updatePreference('email_comment', v)}
          />
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      {profile?.phone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NotificationToggle
              label="Status Updates"
              description="Text when request status changes"
              checked={preferences?.sms_status_update}
              onChange={(v) => updatePreference('sms_status_update', v)}
              disabled={!profile?.sms_notifications}
            />
            <NotificationToggle
              label="Emergency Alerts"
              description="Text for urgent requests"
              checked={preferences?.sms_emergency}
              onChange={(v) => updatePreference('sms_emergency', v)}
              disabled={!profile?.sms_notifications}
            />
            {profile.role !== 'tenant' && (
              <>
                <NotificationToggle
                  label="New Requests"
                  description="Text when new request submitted"
                  checked={preferences?.sms_new_request}
                  onChange={(v) => updatePreference('sms_new_request', v)}
                  disabled={!profile?.sms_notifications}
                />
                <NotificationToggle
                  label="Assignments"
                  description="Text when request assigned to you"
                  checked={preferences?.sms_assignment}
                  onChange={(v) => updatePreference('sms_assignment', v)}
                  disabled={!profile?.sms_notifications}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function NotificationToggle({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className={`font-medium ${disabled ? 'text-gray-400' : ''}`}>{label}</p>
        <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded h-5 w-5"
      />
    </div>
  )
}