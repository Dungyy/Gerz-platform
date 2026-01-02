"use client";

import { useState } from "react";
import { useSubscriptionLimit } from "@/components/modals/upgrade-prompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api-helper";
import { toast } from "sonner";
import { Home, Plus } from "lucide-react";

export function AddUnitModal({ isOpen, onClose, propertyId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const { checkLimit, UpgradePrompt } = useSubscriptionLimit();
  const [formData, setFormData] = useState({
    unit_number: "",
    floor: "",
    bedrooms: 1,
    bathrooms: 1,
    square_feet: "",
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.unit_number.trim()) {
      toast.error("Unit number is required");
      return;
    }

    // ✅ Check subscription limit for units
    const canAdd = await checkLimit("units");
    if (!canAdd) {
      return; // Upgrade prompt shows automatically
    }

    setLoading(true);

    try {
      const payload = {
        property_id: propertyId,
        unit_number: formData.unit_number.trim(),
        floor: formData.floor ? parseInt(formData.floor, 10) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.square_feet
          ? parseInt(formData.square_feet, 10)
          : null,
      };

      const response = await fetchWithAuth("/api/units", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create unit");
      }

      toast.success(`Unit ${formData.unit_number} created successfully`);

      // Reset form
      setFormData({
        unit_number: "",
        floor: "",
        bedrooms: 1,
        bathrooms: 1,
        square_feet: "",
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating unit:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 grid place-items-center">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Add New Unit</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <Input
                name="unit_number"
                placeholder="e.g., 101, A-5, 2B"
                value={formData.unit_number}
                onChange={handleChange}
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Floor</label>
                <Input
                  name="floor"
                  type="number"
                  placeholder="1"
                  value={formData.floor}
                  onChange={handleChange}
                  className="h-10"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bedrooms</label>
                <Input
                  name="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Bathrooms
                </label>
                <Input
                  name="bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Square Feet
                </label>
                <Input
                  name="square_feet"
                  type="number"
                  min="0"
                  placeholder="850"
                  value={formData.square_feet}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 gap-2">
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Unit
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Add upgrade prompt */}
      <UpgradePrompt />
    </>
  );
}