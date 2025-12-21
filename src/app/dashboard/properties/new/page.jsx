'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function NewPropertyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        propertyType: '',
        bedrooms: '',
        bathrooms: '',
        squareFeet: '',
        price: '',
        description: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/properties', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/dashboard/properties');
            }
        } catch (error) {
            console.error('Error creating property:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Add New Property</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input
                        type="text"
                        name="name"
                        placeholder="Property Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="col-span-2 p-2 border rounded"
                    />
                    <input
                        type="text"
                        name="address"
                        placeholder="Address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        className="col-span-2 p-2 border rounded"
                    />
                    <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded"
                    />
                    <input
                        type="text"
                        name="state"
                        placeholder="State"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded"
                    />
                    <input
                        type="text"
                        name="zipCode"
                        placeholder="Zip Code"
                        value={formData.zipCode}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded"
                    />
                    <select
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded"
                    >
                        <option value="">Select Type</option>
                        <option value="house">House</option>
                        <option value="apartment">Apartment</option>
                        <option value="condo">Condo</option>
                        <option value="commercial">Commercial</option>
                    </select>
                    <input
                        type="number"
                        name="bedrooms"
                        placeholder="Bedrooms"
                        value={formData.bedrooms}
                        onChange={handleChange}
                        className="p-2 border rounded"
                    />
                    <input
                        type="number"
                        name="bathrooms"
                        placeholder="Bathrooms"
                        value={formData.bathrooms}
                        onChange={handleChange}
                        className="p-2 border rounded"
                    />
                    <input
                        type="number"
                        name="squareFeet"
                        placeholder="Square Feet"
                        value={formData.squareFeet}
                        onChange={handleChange}
                        className="p-2 border rounded"
                    />
                    <input
                        type="number"
                        name="price"
                        placeholder="Price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        className="p-2 border rounded"
                    />
                    <textarea
                        name="description"
                        placeholder="Description"
                        value={formData.description}
                        onChange={handleChange}
                        className="col-span-2 p-2 border rounded"
                        rows="4"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Property'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}