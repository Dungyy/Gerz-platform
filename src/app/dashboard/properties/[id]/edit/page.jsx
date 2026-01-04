"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { fetchWithAuth } from "@/lib/api-helper";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, AlertCircle, Upload, X, Loader2, Building2, User } from "lucide-react";
import { toast } from "sonner";

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const imageInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [property, setProperty] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    property_type: "apartment",
    year_built: "",
    description: "",
    manager_id: null,
  });

  useEffect(() => {
    if (!params?.id) return;
    loadCurrentProfile();
    loadProperty();
  }, [params.id]);

  async function loadCurrentProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', user.id)
        .single();

      setCurrentProfile(profileData);

      // Load available managers if user is owner
      if (profileData?.role === 'owner') {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('organization_id', profileData.organization_id)
          .in('role', ['owner', 'manager'])
          .order('full_name');

        setAvailableManagers(managers || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function loadProperty() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "GET",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load property");
      }

      setProperty(data);
      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip_code || data.zip || "",
        property_type: data.property_type || "apartment",
        year_built: data.year_built || "",
        description: data.description || "",
        manager_id: data.manager_id || null,
      });
    } catch (err) {
      console.error("Error loading property:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    try {
      setUploadingImage(true);

      // Delete old image if exists
      if (property?.photo_url) {
        const oldPath = property.photo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('property-images')
            .remove([`${currentProfile.organization_id}/${oldPath}`]);
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentProfile.organization_id}/${fileName}`;

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      // Update property with new image URL
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ photo_url: publicUrl }),
      });

      if (!response.ok) {
        toast.error('Failed to update property image');
        return;
      }

      // Update local state
      setProperty(prev => ({ ...prev, photo_url: publicUrl }));

      toast.success('Property image updated successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!property?.photo_url) return;

    try {
      setUploadingImage(true);

      // Delete from storage
      const oldPath = property.photo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('property-images')
          .remove([`${currentProfile.organization_id}/${oldPath}`]);
      }

      // Update property
      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ photo_url: null }),
      });

      if (!response.ok) {
        toast.error('Failed to remove image');
        return;
      }

      setProperty(prev => ({ ...prev, photo_url: null }));
      setImagePreview(null);

      toast.success('Property image removed successfully!');
    } catch (error) {
      console.error('Remove image error:', error);
      toast.error('Error removing image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        zip_code: formData.zip,
      };

      // Only include manager_id if user is owner
      if (currentProfile?.role === 'owner') {
        // Convert empty string to null for unassigning
        updateData.manager_id = formData.manager_id || null;
      } else {
        delete updateData.manager_id;
      }

      const response = await fetchWithAuth(`/api/properties/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update property");
      }

      toast.success("Property updated successfully!");
      router.push(`/dashboard/properties/${params.id}`);
    } catch (err) {
      console.error("Error updating property:", err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Card className="shadow-sm border-red-500/20 bg-red-500/5">
          <CardContent className="py-4 text-red-700 text-sm">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = currentProfile?.role === 'owner';

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            Edit Property
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update property information
          </p>
        </div>
      </div>

      {/* Info Box */}
      <Card className="shadow-sm border-blue-500/20 bg-blue-500/5 overflow-x-hidden">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm flex-1 min-w-0">
              <p className="font-semibold mb-1">Note</p>
              <p className="text-muted-foreground">
                Changes to the property will be saved immediately. Units can be
                managed from the property detail page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Image */}
        <Card className="shadow-sm overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Property Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Image Display */}
              <div className="relative mx-auto sm:mx-0">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                  {imagePreview || property?.photo_url ? (
                    <Image
                      src={imagePreview || property.photo_url}
                      alt={formData.name || 'Property'}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>

                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 w-full">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>

                  {(property?.photo_url || imagePreview) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB. Recommended: 1200x800px
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card className="shadow-sm overflow-x-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  placeholder="Property Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <Input
                  name="address"
                  placeholder="Street Address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <Input
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <Input
                  name="zip"
                  placeholder="ZIP Code"
                  value={formData.zip}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Property Type
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="apartment">Apartment Building</option>
                  <option value="house">Single Family Home</option>
                  <option value="condo">Condo</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Year Built
                </label>
                <Input
                  type="number"
                  name="year_built"
                  placeholder="Year Built"
                  value={formData.year_built}
                  onChange={handleChange}
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  name="description"
                  placeholder="Optional description of the property..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manager Assignment (Owner Only) */}
        {isOwner && (
          <Card className="shadow-sm overflow-x-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Property Manager
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign a manager to oversee this property
              </p>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Assigned Manager
                </label>
                <select
                  name="manager_id"
                  value={formData.manager_id || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="">No manager assigned</option>
                  {availableManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Only owners and managers can be assigned as property managers
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={saving || uploadingImage}
            className="gap-2 w-full sm:w-auto"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving || uploadingImage}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}